import type { FixingRead } from "@/lib/setoff";
import { age, lastDigits, utc } from "@/lib/format";
import { formatRate } from "@/lib/money";
import s from "./FixingBoard.module.css";

/** One live Chainlink read per currency, with its age against the refusal limit. */
export function FixingBoard({ reads, now, maxAge }: { reads: FixingRead[]; now: number; maxAge: number }) {
  return (
    <div className={s.board}>
      {reads.map((r) => {
        const cls = `${s.cell} ccy-${r.currency.toLowerCase()}`;
        if (r.ok && r.currency === "USD") {
          return (
            <div key="USD" className={cls}>
              <span className={s.code}>USD</span>
              <span className={s.par}>1 : 1 by definition</span>
              <span className={s.meta}>USDC settles USD at par</span>
            </div>
          );
        }
        if (!r.ok) {
          return (
            <div key={r.currency} className={cls}>
              <span className={s.code}>{r.currency}</span>
              <span className="stamp refused" style={{ justifySelf: "start" }}>Refused</span>
              <span className={s.meta}>{r.reason === "stale" && r.updatedAt ? `Last updated ${age(now - r.updatedAt)} ago — over the ${age(maxAge)} limit` : "The feed's answer is invalid"}</span>
            </div>
          );
        }
        const f = r.fixing;
        const old = now - f.updatedAt;
        return (
          <div key={f.currency} className={cls} title={`${f.currency} / USD, updated ${utc(f.updatedAt)}, round ${f.roundId}`}>
            <span className={s.code}>{f.currency}</span>
            <span className={`fig ${s.rate}`}>{formatRate(f.answer, f.decimals)}</span>
            <span className={s.meta}>USD per {f.currency} · round <span className="fig">{lastDigits(f.roundId)}</span></span>
            <span className={s.meta}><span className="fig">{age(old)}</span> old / <span className="fig">{Math.round(maxAge / 3600)} h</span></span>
            <span className={s.age} aria-hidden="true"><i style={{ width: `${Math.min(100, (old / maxAge) * 100).toFixed(1)}%` }} /></span>
          </div>
        );
      })}
    </div>
  );
}
