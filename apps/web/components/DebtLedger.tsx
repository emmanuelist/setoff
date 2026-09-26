import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Debt } from "@/lib/setoff";
import { pad, utc } from "@/lib/format";
import { formatAmount, formatUsdc } from "@/lib/money";
import { ClearBand, StateMark } from "./Marks";
import { Party } from "./wallet/Party";

export type Priced = { kind: "paid" | "quote"; usdc: bigint } | { kind: "refused" } | null;

const COLS = "md:grid-cols-[96px_minmax(0,1fr)_118px_104px_96px_128px]";

/** "22 Sep 08:42 UTC": the rack's short form; the card itself prints the full date. */
const when = (ts: number) => { const [d, m, , t, z] = utc(ts).split(" "); return `${d} ${m} ${t} ${z}`; };

/** The rack: every debt on the contract as a card standing in its slot, newest first. */
export function DebtLedger({ debts, priced, next }: { debts: Debt[]; priced: Map<bigint, Priced>; next: bigint | null }) {
  if (debts.length === 0) {
    return (
      <div className="well grid justify-items-start gap-4 p-6">
        <p className="max-w-[46ch] text-body text-graphite">No debts yet. Every debt starts as a proposal from its creditor, and counts for nothing until its debtor endorses it.</p>
        <Link href="/debts/new" className="key key-ink">Record the first debt</Link>
      </div>
    );
  }
  return (
    <div role="table" aria-label="Debts" className="flex flex-1 flex-col">
      <div role="row" className={`hidden gap-4 px-4 pb-2 md:grid ${COLS}`}>
        <span role="columnheader" className="legend">Debt</span>
        <span role="columnheader" className="legend">Creditor, debtor</span>
        <span role="columnheader" className="legend text-right">Amount</span>
        <span role="columnheader" className="legend text-right">In USDC</span>
        <span role="columnheader" className="legend">State</span>
        <span role="columnheader" className="legend text-right">Last change</span>
      </div>
      <div role="rowgroup" className="well grid content-start gap-2 p-2">
        {debts.map((d) => {
          const p = priced.get(d.id) ?? null;
          const last = d.closedAt ?? d.acceptedAt ?? d.proposedAt;
          return (
            <div
              key={d.id.toString()}
              role="row"
              className={`stock ccy-${d.currency.toLowerCase()} group relative grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-[transform,box-shadow] duration-200 ease-spring hover:-translate-y-[3px] hover:shadow-[0_0_0_1px_rgb(29_27_24/0.1),0_22px_30px_-20px_rgb(29_27_24/0.65)] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink md:gap-4 ${COLS}`}
            >
              <span role="cell" className="text-caption">
                <Link href={`/debts/${d.id}`} className="no-underline outline-none after:absolute after:inset-0 after:content-['']" aria-label={`Debt ${pad(d.id, 4)}, ${d.currency} ${formatAmount(d.amount, d.currency)}, ${d.state}`}>
                  <ClearBand id={d.id} />
                </Link>
              </span>
              {/* Each address stays whole; on a narrow card the pair breaks at the arrow. */}
              <span role="cell" className="fig row-start-3 flex min-w-0 flex-wrap items-center gap-x-1.5 text-caption text-graphite md:row-start-auto">
                <Party address={d.creditor} />
                <ArrowRight className="size-3 flex-none text-graphite" aria-label="owed by" />
                <Party address={d.debtor} />
              </span>
              <span role="cell" className="col-span-2 row-start-2 flex items-baseline gap-2 md:col-span-1 md:row-start-auto md:justify-end">
                <span className="code text-label">{d.currency}</span>
                <span className={`fig text-figure-l leading-none font-medium md:text-lead ${d.state === "cancelled" ? "struck text-graphite" : ""}`}>{formatAmount(d.amount, d.currency)}</span>
              </span>
              <span role="cell" className="fig col-start-2 row-start-3 text-right text-small md:col-start-auto md:row-start-auto">
                {p?.kind === "paid" && <span>{formatUsdc(p.usdc)}<span className="text-label text-graphite md:hidden"> USDC</span></span>}
                {p?.kind === "quote" && <span className="text-graphite" title="Quote at the current fixing; priced exactly when paid">≈ {formatUsdc(p.usdc)}<span className="text-label md:hidden"> USDC</span></span>}
                {p?.kind === "refused" && <span className="impress impress-late impress-sm">Refused</span>}
                {!p && <span className="text-graphite">—</span>}
              </span>
              <span role="cell" className="col-start-2 row-start-1 justify-self-end md:col-start-auto md:row-start-auto md:justify-self-start"><StateMark state={d.state} size="sm" /></span>
              <span role="cell" className="fig hidden text-right text-caption text-graphite md:block" title={utc(last)}>{when(last)}</span>
            </div>
          );
        })}
        {/* The empty slot is a row of the table too, one cell wide, so the rowgroup holds only rows. */}
        {next !== null && <div role="row" className="contents"><div role="cell" className="contents">
          <Link href="/debts/new" className="flex min-h-[58px] flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-card py-3 border border-dashed border-ink/25 px-4 text-small text-graphite no-underline transition-colors hover:border-ink/50 hover:text-ink">
            <span>The next slot: debt <span className="fig text-ink">{pad(next, 4)}</span>, numbered when its creditor signs.</span>
            <span className="inline-flex items-center gap-1.5 font-semibold whitespace-nowrap text-ink">Record it <ArrowRight className="size-3.5" aria-hidden="true" /></span>
          </Link>
        </div></div>}
      </div>
    </div>
  );
}
