import Link from "next/link";
import type { Debt } from "@/lib/setoff";
import { short, utc } from "@/lib/format";
import { formatAmount, formatUsdc } from "@/lib/money";
import { ClearBand, StateMark } from "./Marks";
import s from "./DebtLedger.module.css";

export type Priced = { kind: "paid" | "quote"; usdc: bigint } | { kind: "refused" } | null;

export function DebtLedger({ debts, priced }: { debts: Debt[]; priced: Map<bigint, Priced> }) {
  if (debts.length === 0) {
    return (
      <div className={s.empty}>
        <p>No debts yet. Every debt starts as a proposal from its creditor.</p>
        <Link href="/debts/new" className="btn">Record the first debt</Link>
      </div>
    );
  }
  return (
    <div className={s.ledger} role="table" aria-label="Debts">
      <div className={s.head} role="row">
        <span role="columnheader">Debt</span>
        <span role="columnheader">Creditor → debtor</span>
        <span role="columnheader" className={s.r}>Amount</span>
        <span role="columnheader" className={s.r}>In USDC</span>
        <span role="columnheader">State</span>
        <span role="columnheader" className={s.r}>Last change</span>
      </div>
      {debts.map((d) => {
        const p = priced.get(d.id) ?? null;
        const when = d.closedAt ?? d.acceptedAt ?? d.proposedAt;
        return (
          <Link key={d.id.toString()} href={`/debts/${d.id}`} className={`${s.row} ccy-${d.currency.toLowerCase()}`} role="row">
            <span role="cell" className={s.id}><ClearBand id={d.id} /></span>
            <span role="cell" className={`fig ${s.parties}`}>{short(d.creditor)} <span className={s.arrow}>→</span> {short(d.debtor)}</span>
            <span role="cell" className={`fig ${s.r} ${s.amount}`}><span className={s.code}>{d.currency}</span> {formatAmount(d.amount, d.currency)}</span>
            <span role="cell" className={`fig ${s.r}`}>
              {p?.kind === "paid" && <span className="enc">{formatUsdc(p.usdc)}</span>}
              {p?.kind === "quote" && <span className={s.quote} title="Live quote at the current fixing">≈ {formatUsdc(p.usdc)}</span>}
              {p?.kind === "refused" && <span className="stamp refused" style={{ fontSize: 10 }}>Refused</span>}
              {!p && <span className="dim">—</span>}
            </span>
            <span role="cell" className={s.state}><StateMark state={d.state} size="sm" /></span>
            <span role="cell" className={`${s.r} ${s.when}`}>{utc(when)}</span>
          </Link>
        );
      })}
    </div>
  );
}
