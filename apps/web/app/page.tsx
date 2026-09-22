import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ChainClock } from "@/components/ChainClock";
import { DebtLedger, type Priced } from "@/components/DebtLedger";
import { FixingBoard } from "@/components/FixingBoard";
import { Perforation } from "@/components/Marks";
import { Plate } from "@/components/room/Plate";
import { SOURCIFY, publicClient } from "@/lib/chain";
import { formatUsdc } from "@/lib/money";
import { CycleMark } from "@/components/CycleMark";
import { CycleStatement } from "@/components/CycleStatement";
import { pad } from "@/lib/format";
import { readCycle, readCycleCount, readDebts, readFixings, readMaxFixingAge, readQuote, readReceipt, type CycleView } from "@/lib/setoff";

const STEPS = [
  { n: 1, name: "Propose", who: "The creditor signs", body: "Records what they're owed, in the currency they invoiced in. It counts for nothing yet.", mark: <span className="legend">Proposed</span> },
  { n: 2, name: "Endorse", who: "The debtor signs", body: "Agrees it's owed. Neither side can invent a debt the other didn't accept.", mark: <span className="impress impress-sign impress-sm">Endorsed</span> },
  { n: 3, name: "Pay at the fixing", who: "The debtor signs", body: "Pays native USDC at the live Chainlink rate. A stale rate is refused; the one used is recorded.", mark: <Perforation word="PAID" height={15} title="paid" /> },
  { n: 4, name: "Withdraw", who: "The creditor signs", body: "Pulls the payout. Nothing is pushed, so one blocked account can't hold anyone else's money.", mark: <span className="legend text-ink">USDC out</span> },
];

export default async function Home() {
  await connection(); // every figure is read at request time, never frozen at build
  const [reads, debts, maxAge, head, cycleCount] = await Promise.all([readFixings(), readDebts(), readMaxFixingAge(), publicClient.getBlock(), readCycleCount()]);
  const now = Number(head.timestamp);

  // The latest cycle that has been fixed is the one worth showing: its statement is real.
  let latest: CycleView | null = null;
  for (let id = cycleCount; id >= 1n && id > cycleCount - 5n; id--) {
    const v = await readCycle(id);
    if (v && v.valuation.basis === "fixing") { latest = v; break; }
  }
  const cycleValues = new Map<bigint, bigint>();
  if (latest && latest.valuation.basis === "fixing") for (const [k, v] of latest.valuation.values) cycleValues.set(k, v);

  const priced = new Map<bigint, Priced>();
  await Promise.all(
    debts.map(async (d) => {
      if (d.state === "netted" || (d.cycleId !== 0 && cycleValues.has(d.id))) {
        const v = cycleValues.get(d.id);
        priced.set(d.id, v !== undefined ? { kind: "paid", usdc: v } : null);
      } else if (d.state === "paid") {
        const r = await readReceipt(d);
        priced.set(d.id, r ? { kind: "paid", usdc: r.usdc } : null);
      } else if (d.state === "accepted") {
        const q = await readQuote(d.id);
        priced.set(d.id, q.ok ? { kind: "quote", usdc: q.due } : { kind: "refused" });
      }
    }),
  );
  const paid = debts.filter((d) => d.state === "paid");
  const netted = debts.filter((d) => d.state === "netted");
  const paidDirect = paid.reduce((sum, d) => { const p = priced.get(d.id); return p?.kind === "paid" ? sum + p.usdc : sum; }, 0n);

  return (
    <main className="px-[var(--gutter)] pt-[var(--seam)]">
      <div className="bento">
        <section className="plate col-span-12 flex flex-col justify-between gap-10 p-6 sm:p-9 lg:col-span-7 lg:p-11">
          <div className="grid gap-6">
            <h1 className="max-w-[15ch] text-[clamp(38px,5.2vw,68px)] leading-[1.0] font-bold tracking-[-0.022em] [font-variation-settings:'wdth'_108]">
              Debts in five currencies clear at one <span className="whitespace-nowrap">on-chain</span> fixing.
            </h1>
            <p className="max-w-[56ch] text-[16px] leading-[1.55] text-graphite">
              Only the net moves, and either every party settles or none does. Live on Arc mainnet: debts priced in USD, EUR, MXN, BRL or JPY,
              endorsed by their debtors, then paid in native USDC at the Chainlink fixing, or cleared together in a cycle where only the nets move.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/debts/new" className="key key-ink">Record a debt <ArrowRight aria-hidden="true" /></Link>
            <a href={SOURCIFY} target="_blank" rel="noreferrer" className="key">Read the verified contract <ArrowUpRight aria-hidden="true" /></a>
          </div>
        </section>

        <Plate legend="Chain clock" aside={<span className="legend">UTC</span>} className="mounted col-span-12 justify-center sm:px-[30px] sm:col-span-12 lg:col-span-5">
          <ChainClock readAt={{ number: head.number.toString(), timestamp: now }} />
        </Plate>

        <FixingBoard reads={reads} now={now} maxAge={maxAge} />

        {latest && (
          <Plate
            legend={<Link href={`/cycles/${latest.cycle.id}`} className="inline-flex items-center gap-1.5 no-underline hover:text-ink">Latest cycle · <span className="fig tracking-normal">{pad(latest.cycle.id, 4)}</span><ArrowRight className="size-3.5" aria-hidden="true" /></Link>}
            aside={<CycleMark state={latest.cycle.state} size="sm" />}
            className="col-span-12"
          >
            <CycleStatement
              compact
              debts={latest.debts.map((d) => ({ id: d.id.toString(), currency: d.currency, amount: d.amount, creditor: d.creditor, debtor: d.debtor, usdc: cycleValues.get(d.id) ?? 0n }))}
              parties={latest.positions}
              gross={latest.cycle.gross}
              netMoved={latest.cycle.netMoved}
              basis="fixing"
              fixed
            />
          </Plate>
        )}

        <Plate
          legend="Debts"
          aside={
            <span>
              <span className="fig text-ink">{debts.length}</span> on the contract · <span className="fig text-ink">{paid.length}</span> paid directly (<span className="fig text-ink">{formatUsdc(paidDirect, 4)}</span> USDC) · <span className="fig text-ink">{netted.length}</span> netted in cycles
            </span>
          }
          className="col-span-12 lg:col-span-8"
        >
          <DebtLedger debts={debts} priced={priced} next={(debts[0]?.id ?? 0n) + 1n} />
        </Plate>

        <Plate className="col-span-12 gap-5 lg:col-span-4">
          <h2 className="text-[28px] leading-[1.05] font-bold tracking-[-0.015em] [font-variation-settings:'wdth'_108]">Try to break it.</h2>
          <p className="text-[14px] leading-[1.55] text-graphite">
            Stale rates, underpayment, the wrong payer, a cycle settled twice: every attempt runs against the live contract, read-only, and is refused by name.
          </p>
          {/* Names the contract can refuse with, not results: results print only in the room, from a real call. */}
          <p className="text-[13px] leading-[1.6] text-graphite">
            It answers in its own words:{" "}
            {["StaleFixing", "Underpaid", "NotDebtor", "WrongState"].map((e, i, all) => (
              <span key={e}><span className="fig text-ink">{e}</span>{i < all.length - 1 ? ", " : "."}</span>
            ))}
          </p>
          <Link href="/refusals" className="key mt-auto w-fit">Open the refusal room <ArrowRight aria-hidden="true" /></Link>
        </Plate>

        <Plate legend="How a debt clears" aside="Four transactions, each final the moment it lands" className="col-span-12">
          <ol className="stock grid sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="grid content-start gap-2.5 border-dashed border-ink/25 p-5 max-lg:[&:nth-child(n+3)]:border-t sm:max-lg:even:border-l lg:[&+&]:border-l max-sm:[&+&]:border-t">
                <span className="flex h-7 items-center justify-between gap-3">
                  <span className="fig text-[12px] text-graphite">{s.n} / 4</span>
                  {s.mark}
                </span>
                <span className="text-[17px] font-semibold">{s.name}</span>
                <span className="legend">{s.who}</span>
                <span className="text-[13.5px] leading-[1.55] text-graphite">{s.body}</span>
              </li>
            ))}
          </ol>
        </Plate>
      </div>
    </main>
  );
}
