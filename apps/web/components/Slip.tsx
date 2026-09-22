import type { Debt, Quote, Receipt } from "@/lib/setoff";
import { addressUrl, blockUrl, txUrl } from "@/lib/chain";
import { age, lastDigits, short, utc } from "@/lib/format";
import { exactUsdc, formatAmount, formatRate, formatUsdc } from "@/lib/money";
import { ClearBand, StateMark } from "./Marks";
import s from "./Slip.module.css";

const DOTS: Record<string, string[]> = {
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
};

/** Real perforation: the word's dots are subtracted from the slip, so whatever lies beneath shows through. */
function perforationMask(word = "CLEARED", pitch = 6, r = 2.1) {
  let x = 0, circles = "";
  for (const ch of word) { DOTS[ch].forEach((row, y) => [...row].forEach((b, i) => { if (b === "1") circles += `<circle cx='${x + i * pitch + pitch / 2}' cy='${y * pitch + pitch / 2}' r='${r}'/>`; })); x += pitch * 6; }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${x - pitch}' height='${7 * pitch}'>${circles}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function Slip({ debt, quote, receipt, now }: { debt: Debt; quote: Quote | null; receipt: Receipt | null; now: number }) {
  const ccy = debt.currency.toLowerCase();
  const paid = debt.state === "paid";
  const style = paid ? ({ "--holes": perforationMask() } as React.CSSProperties) : undefined;
  const fixedUsdc = receipt?.usdc ?? null;

  return (
    <div className={s.bed}>
      <article className={`${s.slip} ccy-${ccy} ${paid ? s.perforated : ""} ${debt.state === "cancelled" ? s.cancelled : ""}`} style={style} aria-label={`Debt ${debt.id}, ${debt.state}`}>
        <header className={s.top}>
          <span className="wide">Debt</span>
          <span className={s.mark}>{!paid && <StateMark state={debt.state} />}</span>
        </header>

        <p className={`fig ${s.amount}`}><span className={s.code}>{debt.currency}</span>{formatAmount(debt.amount, debt.currency)}</p>

        <p className={s.parties}>
          Owed by <a href={addressUrl(debt.debtor)} target="_blank" rel="noreferrer" className="fig">{short(debt.debtor)}</a> to{" "}
          <a href={addressUrl(debt.creditor)} target="_blank" rel="noreferrer" className="fig">{short(debt.creditor)}</a>
          {debt.ref && <> · reference <span className="fig">{debt.ref}</span></>}
        </p>

        <div className={s.usdc}>
          {paid && receipt && <><span className={`fig enc ${s.usdcFig}`}>{formatUsdc(receipt.usdc, 4)} USDC</span><span className={s.usdcNote}>paid at the fixing · exactly <span className="fig">{exactUsdc(receipt.usdc)}</span></span></>}
          {debt.state === "accepted" && quote?.ok && <><span className={`fig ${s.usdcFig}`}>≈ {formatUsdc(quote.due, 4)} USDC</span><span className={s.usdcNote}>at today&apos;s fixing, {age(now - quote.fixing.updatedAt)} old · priced exactly when paid</span></>}
          {debt.state === "accepted" && quote && !quote.ok && <><span className="stamp refused">Refused</span><span className={s.usdcNote}>The {debt.currency} fixing is stale, so the contract won&apos;t price this debt until the feed updates.</span></>}
          {debt.state === "proposed" && <span className={s.usdcNote}>Not priced yet. A debt is priced at the fixing on the day it&apos;s paid.</span>}
          {debt.state === "cancelled" && <span className={s.usdcNote}>Cancelled by its creditor before it was endorsed. It was never owed.</span>}
        </div>

        <footer className={s.foot}><ClearBand id={debt.id} usdcWei={fixedUsdc} /></footer>
      </article>

      {receipt && (
        <dl className={s.receipt} aria-label="Fixing receipt">
          <div><dt>Rate</dt><dd className="fig">{receipt.fixing.currency === "USD" ? "1 : 1 by definition" : `${formatRate(receipt.fixing.answer, receipt.fixing.decimals)} USD per ${receipt.fixing.currency}`}</dd></div>
          {receipt.fixing.currency !== "USD" && <div><dt>Feed round</dt><dd className="fig" title={receipt.fixing.roundId.toString()}>{lastDigits(receipt.fixing.roundId)}</dd></div>}
          {receipt.fixing.currency !== "USD" && <div><dt>Rate age at payment</dt><dd className="fig">{age((debt.closedAt ?? 0) - receipt.fixing.updatedAt)}</dd></div>}
          <div><dt>Paid in</dt><dd><a href={blockUrl(receipt.blockNumber)} target="_blank" rel="noreferrer" className="fig">block {receipt.blockNumber.toLocaleString("en-US")}</a></dd></div>
          <div><dt>Transaction</dt><dd><a href={txUrl(receipt.txHash)} target="_blank" rel="noreferrer" className="fig">{short(receipt.txHash)} ↗</a></dd></div>
        </dl>
      )}
    </div>
  );
}

export function Timeline({ debt }: { debt: Debt }) {
  const rows: [string, number | null, string][] = [
    ["Proposed", debt.proposedAt, "by the creditor"],
    ["Endorsed", debt.acceptedAt, "by the debtor"],
    [debt.state === "cancelled" ? "Cancelled" : "Paid", debt.closedAt, debt.state === "cancelled" ? "by the creditor" : "by the debtor, at the fixing"],
  ];
  return (
    <ol className={s.timeline}>
      {rows.map(([label, ts, who]) => (
        <li key={label} className={ts ? s.reached : ""}>
          <span className={s.tick} aria-hidden="true" />
          <span className={s.tlLabel}>{label}</span>
          <span className={`fig ${s.tlTime}`}>{ts ? utc(ts) : "—"}</span>
          {ts ? <span className={s.tlWho}>{who}</span> : null}
        </li>
      ))}
    </ol>
  );
}
