import { BaseError, decodeErrorResult, encodeFunctionData, type Address, type Hex } from "viem";
import { SETOFF_ADDRESS, publicClient } from "./chain";
import { decodeCurrency, encodeCurrency } from "./money";
import { setoffAbi } from "./setoff-abi";

/** A fixed address that is party to nothing. */
export const STRANGER: Address = "0x000000000000000000000000000000000000dEaD";

export type RoomContext = {
  paid: { id: string; debtor: Address; creditor: Address };
  open: { id: string; debtor: Address; creditor: Address; currency: string; due: string };
  /** A settled cycle and one of the debts it netted, when the contract has one. */
  settled: { id: string; netted: { id: string; debtor: Address } } | null;
  now: number;
  maxAge: number;
};

export type Attempt = {
  key: string;
  group: "The fixing" | "Paying" | "Authority" | "Recording" | "The cycle";
  /** Attempts that need a settled cycle to run against. */
  needsCycle?: boolean;
  title: string;
  detail: string;
  expect: "refused" | "clears";
  /** What had to be different about the world for this attempt, stated openly. */
  override?: string;
  build: (c: RoomContext) => { functionName: string; args: readonly unknown[]; from: Address; value?: bigint; fund?: boolean; timeShift?: number };
};

const rich = 10n ** 20n; // 100 USDC, only inside the simulation, and always disclosed on the attempt

export const ATTEMPTS: Attempt[] = [
  {
    key: "stale", group: "The fixing", expect: "refused",
    title: "Pay at a rate 26 hours old",
    detail: "The debtor pays the endorsed debt, but the rate feed hasn't updated for 26 hours.",
    override: "Block time moved 26 h forward; no new feed round",
    build: (c) => ({ functionName: "pay", args: [BigInt(c.open.id)], from: c.open.debtor, value: BigInt(c.open.due), timeShift: c.maxAge + 3600 }),
  },
  {
    key: "negative", group: "The fixing", expect: "refused",
    title: "Price with a negative rate",
    detail: "Ask the contract to convert EUR 1.00 at a rate of −0.00000005.",
    build: () => ({ functionName: "toUsdc", args: [1_000_000n, { currency: encodeCurrency("EUR"), answer: -5n, decimals: 8, roundId: 1n, updatedAt: 1n }], from: STRANGER }),
  },
  {
    key: "honest", group: "Paying", expect: "clears",
    title: "Pay the honest amount",
    detail: "The debtor pays the endorsed debt exactly what the fixing says it costs.",
    build: (c) => ({ functionName: "pay", args: [BigInt(c.open.id)], from: c.open.debtor, value: BigInt(c.open.due) }),
  },
  {
    key: "short", group: "Paying", expect: "refused",
    title: "Underpay by one unit",
    detail: "The debtor sends the amount due minus 10⁻¹⁸ USDC.",
    build: (c) => ({ functionName: "pay", args: [BigInt(c.open.id)], from: c.open.debtor, value: BigInt(c.open.due) - 1n }),
  },
  {
    key: "stranger-pays", group: "Paying", expect: "refused",
    title: "Pay someone else's debt",
    detail: "A stranger tries to settle the endorsed debt on the debtor's behalf.",
    override: "The stranger holds 100 USDC",
    build: (c) => ({ functionName: "pay", args: [BigInt(c.open.id)], from: STRANGER, value: BigInt(c.open.due), fund: true }),
  },
  {
    key: "twice", group: "Paying", expect: "refused",
    title: "Pay a debt twice",
    detail: "The debtor of a debt that's already paid sends 1 USDC to pay it again.",
    override: "The debtor holds 100 USDC, so the node can't refuse it before the contract does",
    build: (c) => ({ functionName: "pay", args: [BigInt(c.paid.id)], from: c.paid.debtor, value: 10n ** 18n, fund: true }),
  },
  {
    key: "stranger-endorses", group: "Authority", expect: "refused",
    title: "Endorse a debt you don't owe",
    detail: "A stranger tries to endorse a debt on the debtor's behalf.",
    build: (c) => ({ functionName: "accept", args: [BigInt(c.open.id)], from: STRANGER }),
  },
  {
    key: "retract", group: "Authority", expect: "refused",
    title: "Cancel an endorsed debt",
    detail: "The creditor tries to withdraw a debt after the debtor has signed for it.",
    build: (c) => ({ functionName: "cancel", args: [BigInt(c.open.id)], from: c.open.creditor }),
  },
  {
    key: "drain", group: "Authority", expect: "refused",
    title: "Withdraw money you're not owed",
    detail: "A stranger calls withdraw on the contract.",
    build: () => ({ functionName: "withdraw", args: [], from: STRANGER }),
  },
  {
    key: "self", group: "Recording", expect: "refused",
    title: "Bill yourself",
    detail: "Record a debt where the creditor and the debtor are the same address.",
    build: () => ({ functionName: "propose", args: [STRANGER, encodeCurrency("USD"), 1_000_000n, "0x" + "00".repeat(32)], from: STRANGER }),
  },
  {
    key: "gbp", group: "Recording", expect: "refused",
    title: "Bill in a currency without a feed",
    detail: "Record a debt in GBP, which has no Chainlink feed on this contract.",
    build: (c) => ({ functionName: "propose", args: [c.open.debtor, "0x474250", 1_000_000n, "0x" + "00".repeat(32)], from: STRANGER }),
  },
  {
    key: "record", group: "Recording", expect: "clears",
    title: "Record an honest debt",
    detail: "A stranger bills the debtor EUR 1.00. It would become a proposal and nothing more.",
    build: (c) => ({ functionName: "propose", args: [c.open.debtor, encodeCurrency("EUR"), 1_000_000n, "0x" + "00".repeat(32)], from: STRANGER }),
  },
];


/** Attempts against a real settled cycle: all or nothing means nothing can be redone. */
export const CYCLE_ATTEMPTS: Attempt[] = [
  {
    key: "settle-twice", group: "The cycle", expect: "refused", needsCycle: true,
    title: "Settle a cycle twice",
    detail: "Anyone calls settle on a cycle that has already settled, to credit its creditors again.",
    build: (c) => ({ functionName: "settle", args: [BigInt(c.settled!.id)], from: STRANGER }),
  },
  {
    key: "void-settled", group: "The cycle", expect: "refused", needsCycle: true,
    title: "Void a cycle after it settled",
    detail: "Anyone tries to void a settled cycle, to claw its deposits back.",
    build: (c) => ({ functionName: "voidCycle", args: [BigInt(c.settled!.id)], from: STRANGER }),
  },
  {
    key: "fund-late", group: "The cycle", expect: "refused", needsCycle: true,
    title: "Fund a cycle after it closed",
    detail: "Someone sends 1 USDC into a cycle that has already settled.",
    override: "The sender holds 100 USDC",
    build: (c) => ({ functionName: "fund", args: [BigInt(c.settled!.id)], from: STRANGER, value: 10n ** 18n, fund: true }),
  },
  {
    key: "pay-netted", group: "The cycle", expect: "refused", needsCycle: true,
    title: "Pay a netted debt again, directly",
    detail: "The debtor of a debt the cycle already netted tries to pay it on its own.",
    override: "The debtor holds 100 USDC",
    build: (c) => ({ functionName: "pay", args: [BigInt(c.settled!.netted.id)], from: c.settled!.netted.debtor, value: 10n ** 18n, fund: true }),
  },
  {
    key: "no-window", group: "The cycle", expect: "refused",
    title: "Open a cycle with no time to fund",
    detail: "Open a cycle whose funding deadline is five minutes after its cutoff: too short for anyone to fund.",
    build: (c) => ({ functionName: "openCycle", args: [BigInt(c.now + 3600), BigInt(c.now + 3600 + 300)], from: STRANGER }),
  },
];

export type Outcome = {
  key: string;
  at: number; // ms, for the log
  block: string;
  call: { function: string; from: Address; value: string | null; overrides: Record<string, string> };
  result: "refused" | "clears";
  error: { name: string; args: Record<string, string> } | null;
  returned: string | null;
  matched: boolean;
};

function revertData(error: unknown): Hex | null {
  if (!(error instanceof BaseError)) return null;
  const found = error.walk((e) => typeof (e as { data?: unknown }).data === "string" && (e as { data: string }).data.startsWith("0x"));
  const data = (found as { data?: Hex } | null)?.data;
  return data && data.length >= 10 ? data : null;
}

const show = (v: unknown): string => (typeof v === "bigint" ? v.toString() : typeof v === "string" ? v : JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x)));

/** Runs one attempt as a read-only eth_call against the live contract. Nothing is signed. */
export async function runAttempt(attempt: Attempt, c: RoomContext): Promise<Outcome> {
  const b = attempt.build(c);
  const block = await publicClient.getBlock();
  const data = encodeFunctionData({ abi: setoffAbi, functionName: b.functionName as never, args: b.args as never });
  const overrides: Record<string, string> = {};
  if (b.fund) overrides.balance = `${b.from.slice(0, 6)}… holds 100 USDC`;
  if (b.timeShift) overrides.time = `+${Math.round(b.timeShift / 3600)} h (block time ${Number(block.timestamp) + b.timeShift})`;
  const call = { function: `${b.functionName}(${b.args.map((a) => (typeof a === "object" && a !== null ? "…" : show(a))).join(", ")})`, from: b.from, value: b.value != null ? `${b.value} wei` : null, overrides };

  try {
    const res = await publicClient.call({
      account: b.from,
      to: SETOFF_ADDRESS,
      data,
      value: b.value,
      blockNumber: block.number,
      stateOverride: b.fund ? [{ address: b.from, balance: rich }] : undefined,
      blockOverrides: b.timeShift ? { time: block.timestamp + BigInt(b.timeShift) } : undefined,
    });
    return { key: attempt.key, at: Date.now(), block: block.number.toString(), call, result: "clears", error: null, returned: res.data ?? "0x", matched: attempt.expect === "clears" };
  } catch (error) {
    const raw = revertData(error);
    if (!raw) throw error; // a transport failure is not a refusal; say so upstream
    const decoded = decodeErrorResult({ abi: setoffAbi, data: raw });
    const inputs = setoffAbi.find((x) => x.type === "error" && x.name === decoded.errorName)?.inputs ?? [];
    const args: Record<string, string> = {};
    (decoded.args ?? []).forEach((v, i) => {
      const input = inputs[i];
      const names = decoded.errorName === "WrongCycleState" ? ["None", "Open", "Fixed", "Settled", "Void"] : ["None", "Proposed", "Accepted", "Paid", "Cancelled", "Netted"];
      args[input?.name || `arg${i}`] = input?.type === "bytes3" ? decodeCurrency(v as Hex) : input?.name === "state" ? names[Number(v)] ?? show(v) : show(v);
    });
    return { key: attempt.key, at: Date.now(), block: block.number.toString(), call, result: "refused", error: { name: decoded.errorName, args }, returned: null, matched: attempt.expect === "refused" };
  }
}
