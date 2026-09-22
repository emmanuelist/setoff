import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Debt } from "@/lib/setoff";
import { pad, short, utc } from "@/lib/format";
import { formatAmount, formatUsdc } from "@/lib/money";
import { ClearBand, StateMark } from "./Marks";

export type Priced = { kind: "paid" | "quote"; usdc: bigint } | { kind: "refused" } | null;

const COLS = "md:grid-cols-[96px_minmax(0,1fr)_118px_104px_96px_128px]";

/** "22 Sep 08:42 UTC": the rack's short form; the card itself prints the full date. */
const when = (ts: number) => { const [d, m, , t, z] = utc(ts).split(" "); return `${d} ${m} ${t} ${z}`; };

/** The rack: every debt on the contract as a card standing in its slot, newest first. */
export function DebtLedger({ debts, priced, next }: { debts: Debt[]; priced: Map<bigint, Priced>; next: bigint }) {
  if (debts.length === 0) {
    return (
      <div className="well grid justify-items-start gap-4 p-6">
        <p className="max-w-[46ch] text-[14px] text-graphite">No debts yet. Every debt starts as a proposal from its creditor, and counts for nothing until its debtor endorses it.</p>
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
            <Link
              key={d.id.toString()}
              href={`/debts/${d.id}`}
              role="row"
              className={`stock ccy-${d.currency.toLowerCase()} group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 no-underline transition-[transform,box-shadow] duration-200 ease-spring hover:-translate-y-[3px] hover:shadow-[0_0_0_1px_rgb(29_27_24/0.1),0_22px_30px_-20px_rgb(29_27_24/0.65)] md:gap-4 ${COLS}`}
            >
              <span role="cell" className="text-[12px]"><ClearBand id={d.id} /></span>
              {/* Each address stays whole; on a narrow card the pair breaks at the arrow. */}
              <span role="cell" className="fig row-start-3 flex min-w-0 flex-wrap items-center gap-x-1.5 text-[12px] text-graphite md:row-start-auto">
                <span className="whitespace-nowrap">{short(d.creditor)}</span>
                <ArrowRight className="size-3 flex-none text-graphite" aria-label="owed by" />
                <span className="whitespace-nowrap">{short(d.debtor)}</span>
              </span>
              <span role="cell" className="col-span-2 row-start-2 flex items-baseline gap-2 md:col-span-1 md:row-start-auto md:justify-end">
                <span className="code text-[11px]">{d.currency}</span>
                <span className={`fig text-[22px] leading-none font-medium md:text-[16px] ${d.state === "cancelled" ? "struck text-graphite" : ""}`}>{formatAmount(d.amount, d.currency)}</span>
              </span>
              <span role="cell" className="fig col-start-2 row-start-3 text-right text-[13px] md:col-start-auto md:row-start-auto">
                {p?.kind === "paid" && <span>{formatUsdc(p.usdc)}</span>}
                {p?.kind === "quote" && <span className="text-graphite" title="Quote at the current fixing; priced exactly when paid">≈ {formatUsdc(p.usdc)}</span>}
                {p?.kind === "refused" && <span className="impress impress-late impress-sm">Refused</span>}
                {!p && <span className="text-graphite">—</span>}
              </span>
              <span role="cell" className="col-start-2 row-start-1 justify-self-end md:col-start-auto md:row-start-auto md:justify-self-start"><StateMark state={d.state} size="sm" /></span>
              <span role="cell" className="fig hidden text-right text-[12px] text-graphite md:block" title={utc(last)}>{when(last)}</span>
            </Link>
          );
        })}
        <Link href="/debts/new" className="flex min-h-[58px] flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-card py-3 border border-dashed border-ink/25 px-4 text-[13px] text-graphite no-underline transition-colors hover:border-ink/50 hover:text-ink">
          <span>The next slot: debt <span className="fig text-ink">{pad(next, 4)}</span>, numbered when its creditor signs.</span>
          <span className="inline-flex items-center gap-1.5 font-semibold whitespace-nowrap text-ink">Record it <ArrowRight className="size-3.5" aria-hidden="true" /></span>
        </Link>
      </div>
    </div>
  );
}
