import "server-only";
import { BaseError, ContractFunctionRevertedError, type Address, type Hash, type Hex } from "viem";
import { DEPLOY_BLOCK, DEPLOY_TIMESTAMP, LOG_WINDOW, SETOFF_ADDRESS, publicClient } from "./chain";
import { decodeCurrency, encodeCurrency, isCurrency } from "./money";
import { setoffAbi } from "./setoff-abi";

const contract = { address: SETOFF_ADDRESS, abi: setoffAbi } as const;

/** The same five words on every surface (DATA_CONTRACTS.md). */
export type DebtState = "proposed" | "accepted" | "paid" | "cancelled" | "netted";
const STATES: Record<number, DebtState> = { 1: "proposed", 2: "accepted", 3: "paid", 4: "cancelled", 5: "netted" };

export type CycleState = "open" | "fixed" | "settled" | "void";
const CYCLE_STATES: Record<number, CycleState> = { 1: "open", 2: "fixed", 3: "settled", 4: "void" };

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
  /** 0 is the direct path. */
  cycleId: number;
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
  creditor: Address; proposedAt: bigint; debtor: Address; acceptedAt: bigint; currency: Hex; state: number; closedAt: bigint; amount: bigint; cycleId: number; ref: Hex;
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
    cycleId: d.cycleId,
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

// ── Cycles (milestone 2) ──────────────────────────────────────────────────

export type Cycle = {
  id: bigint;
  opener: Address;
  cutoff: number;
  fundingDeadline: number;
  fixedAt: number | null;
  closedAt: number | null;
  state: CycleState;
  debtors: number;
  funded: number;
  gross: bigint;
  netMoved: bigint;
  held: bigint;
};

export type Position = { party: Address; net: bigint; funded: boolean };

/** What a cycle's debts are worth: at its own fixing once fixed, at the live fixings before. */
export type CycleValues =
  | { basis: "fixing"; values: Map<bigint, bigint> }
  | { basis: "preview"; values: Map<bigint, bigint>; nets: Map<Address, bigint>; gross: bigint; netMoved: bigint }
  | { basis: "refused"; reason: "stale" | "invalid"; currency: string | null };

export type CycleView = {
  cycle: Cycle;
  debts: Debt[];
  positions: Position[];
  fixings: Fixing[];
  valuation: CycleValues;
};

type RawCycle = {
  opener: Address; cutoff: bigint; fundingDeadline: bigint; fixedAt: bigint; closedAt: bigint; state: number;
  debtors: number; funded: number; currencyMask: number; gross: bigint; netMoved: bigint; held: bigint;
};

function toCycle(id: bigint, c: RawCycle): Cycle {
  return {
    id,
    opener: c.opener,
    cutoff: Number(c.cutoff),
    fundingDeadline: Number(c.fundingDeadline),
    fixedAt: c.fixedAt ? Number(c.fixedAt) : null,
    closedAt: c.closedAt ? Number(c.closedAt) : null,
    state: CYCLE_STATES[c.state],
    debtors: c.debtors,
    funded: c.funded,
    gross: c.gross,
    netMoved: c.netMoved,
    held: c.held,
  };
}

export async function readCycleCount(): Promise<bigint> {
  return publicClient.readContract({ ...contract, functionName: "cycleCount" });
}

/** Every cycle, newest first. */
export async function readCycles(limit = 50): Promise<Cycle[]> {
  const count = await readCycleCount();
  const ids: bigint[] = [];
  for (let id = count; id >= 1n && ids.length < limit; id--) ids.push(id);
  const raw = await Promise.all(ids.map((id) => publicClient.readContract({ ...contract, functionName: "cycle", args: [id] })));
  return raw.map((c, i) => toCycle(ids[i], c));
}

/** A cycle with its debts, positions and fixings, and each debt's value from the contract's own toUsdc. */
export async function readCycle(id: bigint): Promise<CycleView | null> {
  const count = await readCycleCount();
  if (id < 1n || id > count) return null;
  const [raw, ids, [parties, positions]] = await Promise.all([
    publicClient.readContract({ ...contract, functionName: "cycle", args: [id] }),
    publicClient.readContract({ ...contract, functionName: "cycleDebts", args: [id] }),
    publicClient.readContract({ ...contract, functionName: "cyclePositions", args: [id] }),
  ]);
  const cycle = toCycle(id, raw);
  const debts = await Promise.all(ids.map((d) => publicClient.readContract({ ...contract, functionName: "debt", args: [d] }).then((x) => toDebt(d, x))));
  const pos: Position[] = parties.map((party, i) => ({ party, net: positions[i].net, funded: positions[i].funded }));

  const currencies = [...new Set(debts.map((d) => d.currency))];
  if (cycle.fixedAt !== null) {
    const stored = await Promise.all(currencies.map((c) => publicClient.readContract({ ...contract, functionName: "cycleFixing", args: [id, encodeCurrency(c as never)] })));
    const values = await Promise.all(
      debts.map((d) => publicClient.readContract({ ...contract, functionName: "toUsdc", args: [d.amount, stored[currencies.indexOf(d.currency)]] })),
    );
    return { cycle, debts, positions: pos, fixings: stored.map(toFixing), valuation: { basis: "fixing", values: new Map(debts.map((d, i) => [d.id, values[i]])) } };
  }

  // Not fixed yet: what it would come to at the live fixings, refused exactly as the fixing would be.
  try {
    const [pParties, nets, gross, netMoved] = await publicClient.readContract({ ...contract, functionName: "preview", args: [id] });
    const live = await Promise.all(currencies.map((c) => publicClient.readContract({ ...contract, functionName: "fixingOf", args: [encodeCurrency(c as never)] })));
    const values = await Promise.all(
      debts.map((d) => publicClient.readContract({ ...contract, functionName: "toUsdc", args: [d.amount, live[currencies.indexOf(d.currency)]] })),
    );
    return {
      cycle, debts, positions: pos, fixings: live.map(toFixing),
      valuation: { basis: "preview", values: new Map(debts.map((d, i) => [d.id, values[i]])), nets: new Map(pParties.map((p, i) => [p, nets[i]])), gross, netMoved },
    };
  } catch (error) {
    const r = refusal(error);
    const reverted = error instanceof BaseError ? error.walk((e) => e instanceof ContractFunctionRevertedError) : null;
    const code = reverted instanceof ContractFunctionRevertedError ? (reverted.data?.args?.[0] as Hex | undefined) : undefined;
    return { cycle, debts, positions: pos, fixings: [], valuation: { basis: "refused", reason: r.reason, currency: code ? decodeCurrency(code) : null } };
  }
}

// ── Where each cycle event happened, so every figure links to its transaction ──

export type Trail = {
  opened: Hash | null;
  fixed: Hash | null;
  funded: { party: Address; usdc: bigint; tx: Hash; block: bigint }[];
  closed: Hash | null;
};

const trails = new Map<bigint, Trail>();

async function blockNear(ts: number): Promise<{ estimate: bigint; head: bigint }> {
  const head = await publicClient.getBlock();
  const perSecond = Number(head.number - DEPLOY_BLOCK) / Math.max(1, Number(head.timestamp) - DEPLOY_TIMESTAMP);
  const estimate = DEPLOY_BLOCK + BigInt(Math.round((ts - DEPLOY_TIMESTAMP) * perSecond));
  return { estimate: estimate > head.number ? head.number : estimate, head: head.number };
}

/** Windows of at most LOG_WINDOW blocks around a time, nearest first. */
async function windowsNear(ts: number): Promise<[bigint, bigint][]> {
  const { estimate, head } = await blockNear(ts);
  const out: [bigint, bigint][] = [];
  for (const shift of [0n, -1n, 1n, -2n, 2n]) {
    let from = estimate - LOG_WINDOW / 2n + shift * LOG_WINDOW;
    if (from < DEPLOY_BLOCK) from = DEPLOY_BLOCK;
    const to = from + LOG_WINDOW - 1n > head ? head : from + LOG_WINDOW - 1n;
    if (from <= to) out.push([from, to]);
  }
  return out;
}

/** The cycle's trail on-chain. Settled and voided trails never change, so they are cached. */
export async function readTrail(view: CycleView): Promise<Trail> {
  const { cycle, debts } = view;
  const cached = trails.get(cycle.id);
  if (cached) return cached;
  const args = { cycleId: cycle.id };
  const first = async (ts: number | null, find: (from: bigint, to: bigint) => Promise<{ transactionHash: Hash }[]>) => {
    if (ts === null) return null;
    for (const [from, to] of await windowsNear(ts)) {
      const logs = await find(from, to);
      if (logs[0]) return logs[0].transactionHash;
    }
    return null;
  };

  const openedNear = debts.length ? Math.min(...debts.map((d) => d.proposedAt)) : null;
  const [opened, fixed, closed] = await Promise.all([
    first(openedNear, (fromBlock, toBlock) => publicClient.getContractEvents({ ...contract, eventName: "CycleOpened", args, fromBlock, toBlock })),
    first(cycle.fixedAt, (fromBlock, toBlock) => publicClient.getContractEvents({ ...contract, eventName: "CycleFixed", args, fromBlock, toBlock })),
    first(cycle.closedAt, (fromBlock, toBlock) =>
      cycle.state === "void"
        ? publicClient.getContractEvents({ ...contract, eventName: "CycleVoided", args, fromBlock, toBlock })
        : publicClient.getContractEvents({ ...contract, eventName: "CycleSettled", args, fromBlock, toBlock })),
  ]);

  // Deposits land between the fixing and the close (or now), in bounded windows.
  const funded: Trail["funded"] = [];
  if (cycle.fixedAt !== null && cycle.funded > 0) {
    const { estimate: fromB, head } = await blockNear(cycle.fixedAt);
    const { estimate: toB } = await blockNear(cycle.closedAt ?? Math.min(cycle.fundingDeadline, Number.MAX_SAFE_INTEGER));
    let from = fromB - LOG_WINDOW / 4n < DEPLOY_BLOCK ? DEPLOY_BLOCK : fromB - LOG_WINDOW / 4n;
    const end = toB + LOG_WINDOW / 4n > head ? head : toB + LOG_WINDOW / 4n;
    for (let i = 0; from <= end && i < 30 && funded.length < cycle.funded; i++) {
      const to = from + LOG_WINDOW - 1n > end ? end : from + LOG_WINDOW - 1n;
      const logs = await publicClient.getContractEvents({ ...contract, eventName: "Funded", args, fromBlock: from, toBlock: to });
      for (const l of logs) funded.push({ party: l.args.party!, usdc: l.args.usdc!, tx: l.transactionHash, block: l.blockNumber });
      from = to + 1n;
    }
  }

  const trail = { opened, fixed, funded, closed };
  if (cycle.state === "settled" || cycle.state === "void") trails.set(cycle.id, trail);
  return trail;
}
