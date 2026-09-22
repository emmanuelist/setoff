import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { CycleState, Debt, Quote, Receipt } from "@/lib/setoff";
import { addressUrl, blockUrl, txUrl } from "@/lib/chain";
import { age, lastDigits, short, utc } from "@/lib/format";
import { exactUsdc, formatAmount, formatRate, formatUsdc } from "@/lib/money";
import { ClearBand, StateMark } from "./Marks";
import { PerforatorRun, PunchFields, type PunchRow } from "./Punch";

const DOTS: Record<string, string[]> = {
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
};

/** Real perforation: the word's dots are subtracted from the card, so whatever lies beneath shows through. */
function perforationMask(word = "PAID", pitch = 6, r = 2.1) {
  let x = 0, circles = "";
  for (const ch of word) { DOTS[ch].forEach((row, y) => [...row].forEach((b, i) => { if (b === "1") circles += `<circle cx='${x + i * pitch + pitch / 2}' cy='${y * pitch + pitch / 2}' r='${r}'/>`; })); x += pitch * 6; }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${x - pitch}' height='${7 * pitch}'>${circles}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** The cycle a debt clears in, and what the cycle priced it at once fixed. */
export type SlipCycle = { id: number; state: CycleState; fixedAt: number | null; closedAt: number | null; usdc: bigint | null };

/** A debt, as the card the recorder punches: priced in its own currency, stamped at the chain's time. */
export function Slip({ debt, quote, receipt, now, cycle = null }: { debt: Debt; quote: Quote | null; receipt: Receipt | null; now: number; cycle?: SlipCycle | null }) {
  const ccy = debt.currency.toLowerCase();
  const paid = debt.state === "paid";
  const cancelled = debt.state === "cancelled";
  const netted = debt.state === "netted";
  const inCycle = cycle !== null;
  const style = paid || netted ? ({ "--holes": perforationMask(netted ? "CLEARED" : "PAID") } as React.CSSProperties) : undefined;

  const rows: PunchRow[] = [
    { label: "Proposed", ts: debt.proposedAt, who: "signed by the creditor" },
    { label: "Endorsed", ts: debt.acceptedAt, who: "signed by the debtor" },
    cancelled
      ? { label: "Cancelled", ts: debt.closedAt, who: "withdrawn by the creditor", struck: true }
      : inCycle
        ? { label: "Netted", ts: debt.closedAt, who: `in cycle ${cycle.id}, at its settlement` }
        : { label: "Paid", ts: debt.closedAt, who: "by the debtor, at the fixing" },
  ];

  return (
    <div className="relative">
      <article className={`stock ccy-${ccy} grid gap-5 px-5 pt-5 pb-0 sm:px-8 sm:pt-7 ${paid || netted ? "perforated" : ""}`} style={style} aria-label={`Debt ${debt.id}, ${debt.state}`}>
        <header className="flex min-h-[42px] items-start justify-between gap-4">
          <span className="text-[13px]"><ClearBand id={debt.id} /></span>
          {!paid && !netted && <StateMark state={debt.state} />}
        </header>

        <p className={`fig flex items-baseline gap-3 leading-[0.95] ${cancelled ? "text-graphite" : ""}`}>
          <span className="code text-[clamp(15px,1.6vw,20px)]">{debt.currency}</span>
          <span className={`text-[clamp(46px,6.6vw,88px)] font-medium tracking-[-0.02em] [font-variation-settings:'wdth'_80] ${cancelled ? "struck" : ""}`}>{formatAmount(debt.amount, debt.currency)}</span>
        </p>

        <p className="text-[14px] text-graphite">
          Owed by <a href={addressUrl(debt.debtor)} target="_blank" rel="noreferrer" className="fig whitespace-nowrap text-ink">{short(debt.debtor)}</a> to{" "}
          <a href={addressUrl(debt.creditor)} target="_blank" rel="noreferrer" className="fig whitespace-nowrap text-ink">{short(debt.creditor)}</a>
          {debt.ref && <> · reference <span className="fig text-ink">{debt.ref}</span></>}
        </p>

        <div className="grid justify-items-start gap-1.5">
          {paid && receipt && (
            <>
              <span className="fig text-[24px] font-medium">{formatUsdc(receipt.usdc, 4)} <span className="text-[14px] text-graphite">USDC</span></span>
              <span className="text-[12.5px] text-graphite">paid at the fixing · exactly <span className="fig">{exactUsdc(receipt.usdc)}</span></span>
            </>
          )}
          {inCycle && cycle.usdc !== null && (
            <>
              <span className="fig text-[24px] font-medium">{formatUsdc(cycle.usdc, 4)} <span className="text-[14px] text-graphite">USDC</span></span>
              <span className="text-[12.5px] text-graphite">
                at <Link href={`/cycles/${cycle.id}`} className="text-ink">cycle {cycle.id}</Link>&apos;s fixing · exactly <span className="fig">{exactUsdc(cycle.usdc)}</span>
                {netted ? " · set off against the cycle, only the net moved" : " · it nets when every debtor in the cycle has funded"}
              </span>
            </>
          )}
          {inCycle && cycle.usdc === null && debt.state !== "cancelled" && (
            <span className="text-[13px] text-graphite">
              {debt.state === "proposed" ? "Joins " : "Clears in "}<Link href={`/cycles/${cycle.id}`} className="text-ink">cycle {cycle.id}</Link>
              {debt.state === "proposed" ? " when its debtor endorses it, and is priced at the cycle's fixing." : quote?.ok ? <>, priced at its fixing. At today&apos;s fixing it would be <span className="fig text-ink">{formatUsdc(quote.due, 4)} USDC</span>.</> : ", priced at its fixing."}
            </span>
          )}
          {!inCycle && debt.state === "accepted" && quote?.ok && (
            <>
              <span className="fig text-[24px] font-medium">≈ {formatUsdc(quote.due, 4)} <span className="text-[14px] text-graphite">USDC</span></span>
              <span className="text-[12.5px] text-graphite">at today&apos;s fixing, {age(now - quote.fixing.updatedAt)} old · priced exactly when paid</span>
            </>
          )}
          {!inCycle && debt.state === "accepted" && quote && !quote.ok && (
            <>
              <span className="impress impress-late">Refused</span>
              <span className="text-[12.5px] text-graphite">The {debt.currency} fixing is stale, so the contract won&apos;t price this debt until the feed updates.</span>
            </>
          )}
          {!inCycle && debt.state === "proposed" && <span className="text-[13px] text-graphite">Not priced yet. A debt is priced at the fixing on the day it&apos;s paid.</span>}
          {cancelled && <span className="text-[13px] text-graphite">Cancelled by its creditor before it was endorsed. It was never owed.</span>}
        </div>

        <PunchFields rows={rows} />

        <footer className="flex min-h-[54px] items-center pb-1 text-[12px] text-graphite">
          <ClearBand id={debt.id} usdcWei={receipt?.usdc ?? (netted ? cycle?.usdc ?? null : null)} />
        </footer>
      </article>
      <PerforatorRun paid={paid || netted} word={netted ? "CLEARED" : "PAID"} />
    </div>
  );
}

/** What the contract recorded when the debt was paid: the fixing, its round, its age, and where. */
export function ReceiptRows({ debt, receipt }: { debt: Debt; receipt: Receipt }) {
  const f = receipt.fixing;
  const usd = f.currency === "USD";
  const rows: [string, React.ReactNode][] = [
    ["Rate", usd ? "1 : 1 by definition" : <>{formatRate(f.answer, f.decimals)} <span className="text-graphite">USD per {f.currency}</span></>],
    ...(!usd ? ([["Feed round", <span key="r" title={f.roundId.toString()}>{lastDigits(f.roundId)}</span>], ["Rate age at payment", age((debt.closedAt ?? 0) - f.updatedAt)]] as [string, React.ReactNode][]) : []),
    ["Paid in", <a key="b" href={blockUrl(receipt.blockNumber)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">block {receipt.blockNumber.toLocaleString("en-US")}<ArrowUpRight className="size-3" aria-hidden="true" /></a>],
    ["Transaction", <a key="t" href={txUrl(receipt.txHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">{short(receipt.txHash)}<ArrowUpRight className="size-3" aria-hidden="true" /></a>],
    ["Recorded at", utc(debt.closedAt ?? 0)],
  ];
  return (
    <dl className="grid text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 border-b border-rule py-2 last:border-0">
          <dt className="text-graphite">{k}</dt>
          <dd className="fig text-right">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
