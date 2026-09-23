import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ChainClock } from "@/components/ChainClock";
import { CycleMark } from "@/components/CycleMark";
import { CycleStatement } from "@/components/CycleStatement";
import { DebtLedger, type Priced } from "@/components/DebtLedger";
import { FixingBoard } from "@/components/FixingBoard";
import { Perforation } from "@/components/Marks";
import { Pending } from "@/components/room/Pending";
import { Plate } from "@/components/room/Plate";
import { YourPosition, type PositionCycle, type PositionDebt } from "@/components/YourPosition";
import { SETOFF_V1_ADDRESS, SOURCIFY, addressUrl, publicClient } from "@/lib/chain";
import { pad, short } from "@/lib/format";
import { formatUnits } from "viem";
import { formatUsdc } from "@/lib/money";
import { readCycle, readCycles, readDebts, readFixings, readMaxFixingAge, readQuote, readReceipt } from "@/lib/setoff";

/** The two paths a debt can take, in the words the rest of the app uses for them. */
const DIRECT = [
  { n: 1, name: "Propose", who: "The creditor signs", body: "Records what they're owed, in the currency they invoiced in. It counts for nothing yet.", mark: <span className="legend">Proposed</span> },
  { n: 2, name: "Endorse", who: "The debtor signs", body: "Agrees it's owed. Neither side can invent a debt the other didn't accept.", mark: <span className="impress impress-sign impress-sm">Endorsed</span> },
  { n: 3, name: "Pay at the fixing", who: "The debtor signs", body: "Pays native USDC at today's Chainlink fixing: the rate the feed last published, never a live quote. A stale one is refused, and the one used is recorded.", mark: <Perforation word="PAID" height={15} title="paid" /> },
  { n: 4, name: "Withdraw", who: "The creditor signs", body: "Pulls the payout. Nothing is pushed, so one blocked account can't hold anyone else's money.", mark: <span className="legend text-ink">USDC out</span> },
];

const CYCLE = [
  { n: 1, name: "Enrol", who: "Both sign", body: "A creditor bills into an open cycle, and the debt joins when its debtor endorses it. Enrolment closes at the cutoff.", mark: <span className="legend">Enrolling</span> },
  { n: 2, name: "Fix", who: "Anyone signs", body: "At the cutoff, one Chainlink read per currency prices every debt in the cycle. That one published rate is the fixing.", mark: <span className="legend text-ink">Fixed</span> },
  { n: 3, name: "Fund", who: "Net debtors sign", body: "Each party's debts are set off against what it is owed, and only the difference, its net, is left. Only net debtors pay, once, before the deadline.", mark: <span className="legend text-ink">Funded</span> },
  { n: 4, name: "Settle, or void", who: "Anyone signs", body: "If every net debtor funded, one transaction credits the creditors and nets every debt. If anyone didn't, the cycle is voided and every deposit comes back.", mark: <Perforation word="CLEARED" height={15} title="settled" /> },
];

const LIMITS = [
  "The four parties are wallets we control, for the demo. Every function is open, so anyone can record their own debts and cycles.",
  "No audit. The contract has no owner and no admin key, but nobody else has reviewed it.",
  "No currency changes hands. Debts are priced in five currencies and settled in USDC at the fixing; nobody receives pesos or yen.",
  "Amounts are dollars, not thousands, because this is real money on mainnet.",
];

/**
 * Every read the page needs, started at once and awaited by nobody here. A public RPC charges a
 * round trip per wave, so the calls all go out together; each plate then awaits only its own
 * slice inside a Suspense boundary, and the shell paints without waiting for any of them.
 */
function reads() {
  const base = Promise.all([readFixings(), readDebts(), readMaxFixingAge(), publicClient.getBlock(), readCycles(10)]);

  // The latest cycle that has been fixed is the one worth showing: its statement is real.
  // The signature plate leads with a cycle that actually cleared, because that is the claim.
  // A voided cycle is the truth too, but it belongs on its own page, not as the headline.
  const latest = base.then(([, , , , allCycles]) => {
    const best = allCycles.find((c) => c.state === "settled") ?? allCycles.find((c) => c.fixedAt !== null);
    return best ? readCycle(best.id) : null;
  });

  // A cycle's debts are priced at its fixing; everything else is quoted or has a receipt.
  const priced = Promise.all([base, latest]).then(async ([[, debts], view]) => {
    const values = new Map<bigint, bigint>();
    if (view && view.valuation.basis === "fixing") for (const [k, v] of view.valuation.values) values.set(k, v);
    const out = new Map<bigint, Priced>();
    await Promise.all(
      debts.map(async (d) => {
        if (d.state === "netted" || (d.cycleId !== 0 && values.has(d.id))) {
          const v = values.get(d.id);
          out.set(d.id, v !== undefined ? { kind: "paid", usdc: v } : null);
        } else if (d.state === "paid") {
          const r = await readReceipt(d);
          out.set(d.id, r ? { kind: "paid", usdc: r.usdc } : null);
        } else if (d.state === "accepted") {
          const q = await readQuote(d.id);
          out.set(d.id, q.ok ? { kind: "quote", usdc: q.due } : { kind: "refused" });
        }
      }),
    );
    return { debts, priced: out, values };
  });

  return { base, latest, priced };
}

type Reads = ReturnType<typeof reads>;

/** What this contract has actually done: every debt it holds, and every dollar that moved. */
async function Tally({ r }: { r: Reads }) {
  const [[, , , , allCycles], { debts, priced }] = await Promise.all([r.base, r.priced]);
  const paid = debts.filter((d) => d.state === "paid");
  const netted = debts.filter((d) => d.state === "netted");
  const paidDirect = paid.reduce((sum, d) => { const p = priced.get(d.id); return p?.kind === "paid" ? sum + p.usdc : sum; }, 0n);
  const settled = allCycles.filter((c) => c.state === "settled");
  const movedTotal = paidDirect + settled.reduce((t, c) => t + c.netMoved, 0n);
  const grossTotal = paidDirect + settled.reduce((t, c) => t + c.gross, 0n);
  const spared = grossTotal === 0n ? 0n : ((grossTotal - movedTotal) * 1000n) / grossTotal;
  return (
    <>
      {[
        { k: "Debts settled", v: String(paid.length + netted.length) },
        { k: "Gross owed", v: formatUsdc(grossTotal, 2) },
        { k: "USDC moved", v: formatUsdc(movedTotal, 2) },
        { k: "Set off", v: `${formatUnits(spared, 1)}%` },
      ].map((f) => (
        <div key={f.k} className="grid gap-1 sm:row-span-2 sm:grid-rows-subgrid">
          <dt className="legend">{f.k}</dt>
          <dd className="fig self-end text-figure-m leading-none">{f.v}</dd>
        </div>
      ))}
    </>
  );
}

/** The signature plate: a real cycle's gross collapsing to the net that moved. */
async function LatestCycle({ r }: { r: Reads }) {
  const [[, , , head], view, { values }] = await Promise.all([r.base, r.latest, r.priced]);
  if (!view) {
    return (
      <Plate legend="Chain clock" aside={<span className="legend">UTC</span>} className="mounted col-span-12 justify-center sm:px-[30px] lg:col-span-6">
        <ChainClock readAt={{ number: head.number.toString(), timestamp: Number(head.timestamp) }} />
      </Plate>
    );
  }
  return (
    <Plate
      legend={<Link href={`/cycles/${view.cycle.id}`} className="-my-2 inline-flex items-center gap-1.5 py-2 no-underline hover:text-ink">Latest cycle · <span className="fig tracking-normal">{pad(view.cycle.id, 4)}</span><ArrowRight className="size-3.5" aria-hidden="true" /></Link>}
      aside={<CycleMark state={view.cycle.state} size="sm" />}
      className="col-span-12 lg:col-span-6"
    >
      <CycleStatement
        compact
        debts={view.debts.map((d) => ({ id: d.id.toString(), currency: d.currency, amount: d.amount, creditor: d.creditor, debtor: d.debtor, usdc: values.get(d.id) ?? 0n }))}
        parties={view.positions}
        gross={view.cycle.gross}
        netMoved={view.cycle.netMoved}
        basis="fixing"
        fixed
        outcome={view.cycle.state === "settled" ? "settled" : view.cycle.state === "void" ? "void" : "open"}
      />
    </Plate>
  );
}

async function Fixings({ r }: { r: Reads }) {
  const [[fixings, , maxAge, head], view] = await Promise.all([r.base, r.latest]);
  const now = Number(head.timestamp);
  return (
    <FixingBoard
      reads={fixings}
      now={now}
      maxAge={maxAge}
      lead={
        view ? (
          <div className="plate mounted flex flex-col gap-3 p-4 max-sm:col-span-2 sm:px-5" role="group" aria-label="Chain clock">
            <div className="flex items-center justify-between gap-2">
              <span className="legend">Chain clock</span>
              <span className="legend">UTC</span>
            </div>
            <ChainClock compact readAt={{ number: head.number.toString(), timestamp: now }} />
          </div>
        ) : undefined
      }
    />
  );
}

/** The only plate whose content depends on who is looking. */
async function Position({ r }: { r: Reads }) {
  const [[, , , , allCycles], { debts, priced }] = await Promise.all([r.base, r.priced]);
  const running = allCycles.filter((c) => c.state === "open" || c.state === "fixed");
  const cycles: PositionCycle[] = (await Promise.all(running.map((c) => readCycle(c.id).then((v) => ({ c, v })))))
    .flatMap(({ c, v }) => {
      if (!v || v.valuation.basis === "refused") return [];
      const nets = v.valuation;
      return [{
        id: c.id.toString(),
        state: (c.state === "fixed" ? "fixed" : "open") as "fixed" | "open",
        fundingDeadline: c.fundingDeadline,
        basis: nets.basis,
        positions: v.positions.map((p) => ({ party: p.party, net: (nets.basis === "preview" ? nets.nets.get(p.party) ?? 0n : p.net).toString(), funded: p.funded })),
      }];
    });
  const positionDebts: PositionDebt[] = debts.map((d) => {
    const p = priced.get(d.id);
    return { id: d.id.toString(), creditor: d.creditor, debtor: d.debtor, state: d.state, cycleId: d.cycleId, usdc: p && p.kind !== "refused" ? p.usdc.toString() : null };
  });
  return (
    <Plate legend="Your position" aside={<span className="legend">Read live</span>} className="col-span-12">
      <YourPosition debts={positionDebts} cycles={cycles} />
    </Plate>
  );
}

async function Ledger({ r }: { r: Reads }) {
  const { debts, priced } = await r.priced;
  const paid = debts.filter((d) => d.state === "paid");
  const netted = debts.filter((d) => d.state === "netted");
  const paidDirect = paid.reduce((sum, d) => { const p = priced.get(d.id); return p?.kind === "paid" ? sum + p.usdc : sum; }, 0n);
  return (
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
  );
}

export default async function Home() {
  await connection(); // every figure is read at request time, never frozen at build
  const r = reads();

  return (
    <main className="px-[var(--gutter)] pt-[var(--seam)]">
      <div className="bento">
        <section className="plate col-span-12 flex flex-col gap-7 p-6 sm:p-8 lg:col-span-6">
          <div className="grid gap-5">
            <h1 className="max-w-[15ch] text-display font-bold tracking-[-0.022em] [font-variation-settings:'wdth'_108]">
              Debts in five currencies clear at one <span className="whitespace-nowrap">on-chain</span> fixing.
            </h1>
            <p className="max-w-[52ch] text-lead text-graphite">
              Only the net moves, and either every party settles or none does. Live on Arc mainnet: debts priced in USD, EUR, MXN, BRL or JPY, endorsed by their debtors, then paid in native USDC at the Chainlink fixing, or cleared together in a cycle.
            </p>
          </div>

          {/* Labels wrap at narrow columns; subgrid keeps every figure on one baseline. */}
          <dl className="mt-auto grid grid-cols-2 gap-x-6 gap-y-6 border-y border-rule py-5 sm:grid-cols-4 sm:grid-rows-[auto_auto] sm:gap-y-2">
            <Suspense fallback={["Debts settled", "Gross owed", "USDC moved", "Set off"].map((k) => (
              <div key={k} className="grid gap-1 sm:row-span-2 sm:grid-rows-subgrid" aria-busy="true">
                <dt className="legend">{k}</dt>
                <dd className="fig self-end text-figure-m leading-none text-faint">—</dd>
              </div>
            ))}>
              <Tally r={r} />
            </Suspense>
          </dl>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/debts/new" className="key key-ink">Record a debt <ArrowRight aria-hidden="true" /></Link>
            <Link href="/cycles/new" className="key">Open a cycle <ArrowRight aria-hidden="true" /></Link>
          </div>
        </section>

        <Suspense fallback={<Pending legend="Latest cycle" className="col-span-12 lg:col-span-6" rows={5} height={300} />}>
          <LatestCycle r={r} />
        </Suspense>

        <Suspense fallback={<Pending legend="Today's fixings" className="col-span-12" rows={2} height={150} />}>
          <Fixings r={r} />
        </Suspense>

        <Suspense fallback={<Pending legend="Your position" aside="Read live" className="col-span-12" rows={2} />}>
          <Position r={r} />
        </Suspense>

        <Suspense fallback={<Pending legend="Debts" className="col-span-12 lg:col-span-8" rows={7} height={360} />}>
          <Ledger r={r} />
        </Suspense>

        <div className="col-span-12 grid content-start gap-[var(--seam)] lg:col-span-4">
          <Plate className="gap-5">
            <h2 className="text-title font-bold tracking-[-0.015em] [font-variation-settings:'wdth'_108]">Try to break it.</h2>
            <p className="text-body leading-[1.55] text-graphite">
              Stale rates, underpayment, the wrong payer, a cycle settled twice: every attempt runs against the live contract, read-only, and is refused by name.
            </p>
            <p className="text-small leading-[1.6] text-graphite">
              It answers in its own words:{" "}
              {["StaleFixing", "Underpaid", "NotDebtor", "WrongCycleState"].map((e, i, all) => (
                <span key={e}><span className="fig text-ink">{e}</span>{i < all.length - 1 ? ", " : "."}</span>
              ))}
            </p>
            <Link href="/refusals" className="key w-fit">Open the refusal room <ArrowRight aria-hidden="true" /></Link>
          </Plate>

          <Plate legend="Stated plainly" className="gap-3">
            <ul className="grid gap-2.5 text-small leading-[1.5] text-graphite">
              {LIMITS.map((l) => <li key={l}>{l}</li>)}
              <li>
                This is milestone 2&apos;s contract. Milestone 1&apos;s, <a href={addressUrl(SETOFF_V1_ADDRESS)} target="_blank" rel="noreferrer" className="fig text-ink">{short(SETOFF_V1_ADDRESS)}</a>, stays on-chain as its own record, and has no cycles.
              </li>
            </ul>
            <a href={SOURCIFY} target="_blank" rel="noreferrer" className="key key-sm w-fit">Read the verified contract <ArrowUpRight aria-hidden="true" /></a>
          </Plate>
        </div>

        <Plate legend="How a debt clears" aside="Two paths. Every step is one transaction, final the moment it lands" className="col-span-12 gap-5">
          {[{ title: "On its own", steps: DIRECT }, { title: "In a cycle, against everything else", steps: CYCLE }].map((path) => (
            <section key={path.title} className="grid gap-2.5">
              <h3 className="legend text-ink">{path.title}</h3>
              <ol className="stock grid sm:grid-cols-2 lg:grid-cols-4">
                {path.steps.map((s) => (
                  <li key={s.n} className="grid content-start gap-2.5 border-dashed border-ink/25 p-5 max-lg:[&:nth-child(n+3)]:border-t sm:max-lg:even:border-l lg:[&+&]:border-l max-sm:[&+&]:border-t">
                    <span className="flex h-7 items-center justify-between gap-3">
                      <span className="fig text-caption text-graphite">{s.n} / 4</span>
                      {s.mark}
                    </span>
                    <span className="text-heading font-semibold">{s.name}</span>
                    <span className="legend">{s.who}</span>
                    <span className="text-body leading-[1.55] text-graphite">{s.body}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </Plate>
      </div>
    </main>
  );
}
