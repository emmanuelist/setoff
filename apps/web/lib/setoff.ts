import "server-only";
import { BaseError, ContractFunctionRevertedError, type Address, type Hash, type Hex } from "viem";
import { DEPLOY_BLOCK, DEPLOY_TIMESTAMP, LOG_WINDOW, SETOFF_ADDRESS, publicClient } from "./chain";
import { decodeCurrency, encodeCurrency, isCurrency } from "./money";
import { setoffAbi } from "./setoff-abi";

const contract = { address: SETOFF_ADDRESS, abi: setoffAbi } as const;

/** The same five words on every surface (DATA_CONTRACTS.md). */
export type DebtState = "proposed" | "accepted" | "paid" | "cancelled";
const STATES: Record<number, DebtState> = { 1: "proposed", 2: "accepted", 3: "paid", 4: "cancelled" };

export type Fixing = {
  currency: string;
  answer: bigint;
  decimals: number;
  roundId: bigint;
  updatedAt: number; // 0 for USD: par by definition
};

export type FixingRead =
  | { currency: string; ok: true; fixing: Fixing }
  | { currency: string; ok: false; reason: "stale" | "invalid"; updatedAt: number | null };

export type Debt = {
  id: bigint;
  creditor: Address;
  debtor: Address;
  currency: string;
  amount: bigint;
  ref: string;
  refHex: Hex;
  state: DebtState;
  proposedAt: number;
  acceptedAt: number | null;
  closedAt: number | null;
};

export type Quote = { ok: true; due: bigint; fixing: Fixing } | { ok: false; reason: "stale" | "invalid"; updatedAt: number | null };

export type Receipt = {
  txHash: Hash;
  blockNumber: bigint;
  payer: Address;
  usdc: bigint;
  fixing: Fixing;
};

const toFixing = (f: { currency: Hex; answer: bigint; decimals: number; roundId: bigint; updatedAt: bigint }): Fixing => ({
  currency: decodeCurrency(f.currency),
  answer: f.answer,
  decimals: f.decimals,
  roundId: f.roundId,
  updatedAt: Number(f.updatedAt),
});

/** Turns a StaleFixing / InvalidAnswer / InvalidUpdatedAt revert into a named refusal. */
function refusal(error: unknown): { reason: "stale" | "invalid"; updatedAt: number | null } {
  const reverted = error instanceof BaseError ? error.walk((e) => e instanceof ContractFunctionRevertedError) : null;
  if (reverted instanceof ContractFunctionRevertedError && reverted.data) {
    const { errorName, args } = reverted.data;
    if (errorName === "StaleFixing") return { reason: "stale", updatedAt: Number(args?.[1] as bigint) };
    if (errorName === "InvalidUpdatedAt") return { reason: "invalid", updatedAt: Number(args?.[1] as bigint) };
    if (errorName === "InvalidAnswer") return { reason: "invalid", updatedAt: null };
  }
  throw error;
}

function decodeRef(hex: Hex): string {
  const bytes = hex.slice(2).match(/../g) ?? [];
  const chars = bytes.map((b) => parseInt(b, 16)).filter((c) => c !== 0);
  const printable = chars.length > 0 && chars.every((c) => c >= 0x20 && c < 0x7f);
  return printable ? String.fromCharCode(...chars) : "";
}

function toDebt(id: bigint, d: {
  creditor: Address; proposedAt: bigint; debtor: Address; acceptedAt: bigint; currency: Hex; state: number; closedAt: bigint; amount: bigint; ref: Hex;
}): Debt {
  return {
    id,
    creditor: d.creditor,
    debtor: d.debtor,
    currency: decodeCurrency(d.currency),
    amount: d.amount,
    ref: decodeRef(d.ref),
    refHex: d.ref,
    state: STATES[d.state],
    proposedAt: Number(d.proposedAt),
    acceptedAt: d.acceptedAt ? Number(d.acceptedAt) : null,
    closedAt: d.closedAt ? Number(d.closedAt) : null,
  };
}

export async function readMaxFixingAge(): Promise<number> {
  return Number(await publicClient.readContract({ ...contract, functionName: "maxFixingAge" }));
}

/** One live read per supported currency. A stale or invalid feed is a refusal, never a number. */
export async function readFixings(): Promise<FixingRead[]> {
  const codes = (await publicClient.readContract({ ...contract, functionName: "currencies" })).map(decodeCurrency);
  const reads = await Promise.all(
    codes.map(async (currency): Promise<FixingRead> => {
      if (!isCurrency(currency)) return { currency, ok: false, reason: "invalid", updatedAt: null };
      try {
        const f = await publicClient.readContract({ ...contract, functionName: "fixingOf", args: [encodeCurrency(currency)] });
        return { currency, ok: true, fixing: toFixing(f) };
      } catch (error) {
        return { currency, ok: false, ...refusal(error) };
      }
    }),
  );
  return reads;
}

export async function readDebtCount(): Promise<bigint> {
  return publicClient.readContract({ ...contract, functionName: "debtCount" });
}

/** Every debt, newest first. Milestone 1 volumes are small; beyond 200 this pages. */
export async function readDebts(limit = 200): Promise<Debt[]> {
  const count = await readDebtCount();
  const first = count > BigInt(limit) ? count - BigInt(limit) + 1n : 1n;
  const ids: bigint[] = [];
  for (let id = count; id >= first; id--) ids.push(id);
  const debts = await Promise.all(ids.map((id) => publicClient.readContract({ ...contract, functionName: "debt", args: [id] })));
  return debts.map((d, i) => toDebt(ids[i], d));
}

export async function readDebt(id: bigint): Promise<Debt | null> {
  const count = await readDebtCount();
  if (id < 1n || id > count) return null;
  return toDebt(id, await publicClient.readContract({ ...contract, functionName: "debt", args: [id] }));
}

export async function readQuote(id: bigint): Promise<Quote> {
  try {
    const [due, fixing] = await publicClient.readContract({ ...contract, functionName: "quote", args: [id] });
    return { ok: true, due, fixing: toFixing(fixing) };
  } catch (error) {
    return { ok: false, ...refusal(error) };
  }
}

export async function readWithdrawable(party: Address): Promise<bigint> {
  return publicClient.readContract({ ...contract, functionName: "withdrawable", args: [party] });
}

const receipts = new Map<bigint, Receipt>();

/**
 * The fixing a paid debt was settled at lives in its Paid event. The log is found from the
 * debt's own closedAt, in one bounded window: past blocks are final, so it's cached forever.
 */
export async function readReceipt(debt: Debt): Promise<Receipt | null> {
  if (debt.state !== "paid" || debt.closedAt === null) return null;
  const cached = receipts.get(debt.id);
  if (cached) return cached;

  const head = await publicClient.getBlock();
  const blocksPerSecond = Number(head.number - DEPLOY_BLOCK) / Math.max(1, Number(head.timestamp) - DEPLOY_TIMESTAMP);
  const estimate = DEPLOY_BLOCK + BigInt(Math.round((debt.closedAt - DEPLOY_TIMESTAMP) * blocksPerSecond));

  for (const shift of [0n, -1n, 1n, -2n, 2n]) {
    let from = estimate - LOG_WINDOW / 2n + shift * LOG_WINDOW;
    if (from < DEPLOY_BLOCK) from = DEPLOY_BLOCK;
    let to = from + LOG_WINDOW - 1n;
    if (to > head.number) to = head.number;
    if (from > to) continue;
    const logs = await publicClient.getContractEvents({ ...contract, eventName: "Paid", args: { id: debt.id }, fromBlock: from, toBlock: to });
    const log = logs[0];
    if (log && log.args.usdc !== undefined) {
      const a = log.args;
      const receipt: Receipt = {
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        payer: a.payer!,
        usdc: a.usdc!,
        fixing: { currency: decodeCurrency(a.currency!), answer: a.answer!, decimals: a.feedDecimals!, roundId: a.roundId!, updatedAt: Number(a.updatedAt!) },
      };
      receipts.set(debt.id, receipt);
      return receipt;
    }
  }
  return null;
}
