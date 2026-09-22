import NumberFlow from "@number-flow/react";
import type { FixingRead } from "@/lib/setoff";
import { age, lastDigits, utc } from "@/lib/format";
import { formatRate } from "@/lib/money";
import { Gauge } from "./Gauge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

/** An exact decimal string: NumberFlow formats it through Intl without ever making it a float. */
const exact = (d: string) => d as `${number}`;
const hhmm = (ts: number) => utc(ts).split(" ").slice(3, 5).join(" ");

/** One gauge per currency, all read in the same request against the contract's live refusal limit. */
export function FixingBoard({ reads, now, maxAge, frozen = false }: { reads: FixingRead[]; now: number; maxAge: number; frozen?: boolean }) {
  return (
    <div className="col-span-12 grid grid-cols-2 gap-[var(--seam)] sm:grid-cols-3 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none">
      {reads.map((r) => <FixingDial key={r.currency} read={r} now={now} maxAge={maxAge} frozen={frozen} />)}
    </div>
  );
}

/** `frozen`: a cycle's fixing, read once; `now` is then the moment it was fixed. */
function FixingDial({ read: r, now, maxAge, frozen }: { read: FixingRead; now: number; maxAge: number; frozen: boolean }) {
  const ccy = `ccy-${r.currency.toLowerCase()}`;
  const usd = r.ok && r.currency === "USD";
  const ageSec = r.ok ? (usd ? null : now - r.fixing.updatedAt) : r.updatedAt ? now - r.updatedAt : null;
  const refused = !r.ok;

  const detail = r.ok
    ? usd ? "USDC settles USD at par" : frozen ? `USD per ${r.currency} · as fixed` : `USD per ${r.currency} · ${hhmm(r.fixing.updatedAt)}`
    : r.reason === "stale" && r.updatedAt ? `Last updated ${age(now - r.updatedAt)} ago` : "The feed's answer is invalid";

  return (
    // On a phone, USD (par, no feed) folds into a strip so the four feeds sit two by two.
    <div className={`plate mounted ${ccy} flex flex-col gap-3 p-4 sm:px-[26px] ${usd ? "max-sm:col-span-2 max-sm:gap-1.5" : ""}`} role="group" aria-label={`${r.currency} fixing`}>
      <div className="flex items-center justify-between gap-2">
        <span className="legend">{r.currency} / USD</span>
        {refused ? (
          <span className="impress impress-late impress-sm">Refused</span>
        ) : usd ? (
          <span className="legend">Par</span>
        ) : (
          <span className="text-[12px] whitespace-nowrap">
            <span className="fig text-ink">{age(ageSec ?? 0)}</span>
            {/* Words are never set in the figure face; on a phone the detail line says "as fixed". */}
            {frozen && <span className="hidden text-[11.5px] text-graphite sm:inline"> at the fixing</span>}
          </span>
        )}
      </div>

      <div className={`relative mx-auto w-full max-w-[210px] ${usd ? "max-sm:hidden" : ""}`}>
        <Gauge currency={r.currency} ageSec={ageSec} maxAgeSec={maxAge} refused={refused} />
        <div className="well absolute top-[72%] left-1/2 flex h-[25px] -translate-x-1/2 items-center px-2 whitespace-nowrap">
          {r.ok ? (
            <NumberFlow
              value={exact(usd ? "1" : formatRate(r.fixing.answer, r.fixing.decimals))}
              format={{ minimumFractionDigits: usd ? 4 : r.fixing.decimals > 6 ? 6 : 4, maximumFractionDigits: 8 }}
              className="fig text-[12.5px] font-medium"
              aria-label={usd ? "1 USD per USD" : `${formatRate(r.fixing.answer, r.fixing.decimals)} USD per ${r.currency}`}
            />
          ) : (
            <span className="print print-late text-[11px] uppercase">No price</span>
          )}
        </div>
      </div>

      <div className="grid gap-0.5 text-[12px] leading-snug text-graphite">
        <span>{detail}</span>
        {r.ok && !usd ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="w-fit cursor-help text-left text-graphite underline decoration-dotted underline-offset-3">
                round <span className="fig">{lastDigits(r.fixing.roundId)}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="fig max-w-[260px] rounded-well bg-ink text-[11.5px] text-on-ink">
              Chainlink round {r.fixing.roundId.toString()}, updated {utc(r.fixing.updatedAt)}. Refused past {Math.round(maxAge / 3600)} h.
            </TooltipContent>
          </Tooltip>
        ) : (
          <span>{usd ? "No feed needed" : `Refused past ${Math.round(maxAge / 3600)} h`}</span>
        )}
      </div>
    </div>
  );
}
