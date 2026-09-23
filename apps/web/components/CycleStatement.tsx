"use client";

import { useEffect, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { RotateCcw } from "lucide-react";
import type { Address } from "viem";
import { Party } from "./wallet/Party";
import { formatAmount, formatUsdc, roundDecimal } from "@/lib/money";
import { formatUnits } from "viem";

export type StatementDebt = { id: string; currency: string; amount: bigint; creditor: Address; debtor: Address; usdc: bigint };
export type StatementParty = { party: Address; net: bigint; funded: boolean };

/** An exact decimal string at 4 places, handed to NumberFlow so no float touches the figure. */
const figure = (wei: bigint) => roundDecimal(formatUnits(wei, 18), 4) as `${number}`;

type Side = { currency: string; usdc: bigint }[];

function sides(party: Address, debts: StatementDebt[]) {
  const owes: Side = [];
  const owed: Side = [];
  for (const d of debts) {
    if (d.debtor === party) owes.push({ currency: d.currency, usdc: d.usdc });
    if (d.creditor === party) owed.push({ currency: d.currency, usdc: d.usdc });
  }
  const sum = (s: Side) => s.reduce((t, x) => t + x.usdc, 0n);
  return { owes, owed, owesTotal: sum(owes), owedTotal: sum(owed) };
}

/** Width as a percentage of one half of the beam, from a bigint ratio: exact to 0.01 %. */
const pct = (v: bigint, max: bigint) => (max === 0n ? 0 : Number((v * 10000n) / max) / 100);

/**
 * The cycle statement: gross owed in several currencies, set off at one fixing, collapsing to
 * the net that actually moves. The counter and every beam run from the gross to the net once
 * the statement comes into view; the set-off can be replayed.
 */
export function CycleStatement({
  debts, parties, gross, netMoved, basis, fixed, outcome = "open", compact = false,
}: {
  debts: StatementDebt[];
  parties: StatementParty[];
  gross: bigint;
  netMoved: bigint;
  basis: "fixing" | "preview";
  fixed: boolean;
  /** What became of the cycle. A voided cycle moved nothing, and must never say it did. */
  outcome?: "open" | "settled" | "void";
  compact?: boolean;
}) {
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { once: true, amount: 0.4 });
  const [setOff, setSetOff] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setSetOff(true), reduce ? 0 : 900);
    return () => clearTimeout(t);
  }, [inView, reduce, run]);

  const rows = parties.map((p) => ({ ...p, ...sides(p.party, debts) }));
  const max = rows.reduce((m, r) => (r.owesTotal > m ? r.owesTotal : r.owedTotal > m ? r.owedTotal : m), 0n);
  const currencies = [...new Set(debts.map((d) => d.currency))];
  const setOffPct = gross === 0n ? "0.0" : roundDecimal(formatUnits(((gross - netMoved) * 1000n) / gross, 1), 1);
  const replay = () => { setSetOff(false); setRun((n) => n + 1); };

  return (
    <div ref={root} id="statement" className="grid gap-7">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        {/* The unit sits on the figure's baseline and says what the figure is at each moment. */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <NumberFlow
            value={figure(setOff ? netMoved : gross)}
            format={{ minimumFractionDigits: 4, maximumFractionDigits: 4 }}
            transformTiming={{ duration: reduce ? 0 : 1400, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
            spinTiming={{ duration: reduce ? 0 : 1400, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
            className={`fig leading-none font-medium tracking-[-0.02em] ${compact ? "text-figure-xl" : "text-figure-hero"}`}
            aria-hidden="true"
          />
          <span className="text-lead leading-tight text-graphite sm:text-heading" aria-hidden="true">
            {setOff
              ? outcome === "void" ? <>USDC would have moved,<br className="sm:hidden" /> had every party funded</>
              : outcome === "settled" ? "USDC moved"
              : "USDC moves"
              : <>USDC owed, gross,<br className="sm:hidden" /> in {currencies.length} {currencies.length === 1 ? "currency" : "currencies"}</>}
          </span>
          <p className="sr">
            {formatUsdc(gross, 4)} USDC was owed gross across {currencies.length} currencies; {setOffPct}% of it set off, leaving {formatUsdc(netMoved, 4)} USDC{outcome === "void" ? " that would have moved, had every party funded. The cycle was voided and every deposit refunded." : outcome === "settled" ? " that moved." : " to move."}
          </p>
        </div>
        <div className="grid justify-items-start gap-2 text-small text-graphite sm:justify-items-end sm:text-right">
          <span><span className="fig text-ink">{formatUsdc(gross, 4)}</span> owed · <span className="fig text-ink">{formatUsdc(netMoved, 4)}</span> {outcome === "void" ? "never moved" : outcome === "settled" ? "moved" : "moves"} · <span className="fig text-ink">{setOffPct}%</span> set off</span>
          <span>{outcome === "void" ? "Voided: a net debtor never funded, so every deposit was refunded and nothing moved." : basis === "fixing" ? "Priced at the cycle's one fixing." : "At today's fixings, if it were fixed now. Nothing is priced until the fixing."}</span>
          {!reduce && <button id="replay" type="button" className="key key-sm" onClick={replay} disabled={!setOff}><RotateCcw aria-hidden="true" />Replay the set-off</button>}
        </div>
      </div>

      <div id="beams" className="well grid gap-1 p-3 sm:p-4" aria-hidden="true">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-x-4 pb-1 text-label sm:grid-cols-[108px_minmax(0,1fr)_132px]">
          <span className="hidden sm:block" />
          <span className="flex justify-between"><span className="legend">Owes</span><span className="legend">Is owed</span></span>
          <span className="legend hidden text-right sm:block">Net</span>
        </div>
        {rows.map((r, i) => {
          const net = r.owedTotal - r.owesTotal;
          const delay = 0.12 * i;
          const word = net > 0n ? "credit" : net < 0n ? "debit" : "flat";
          return (
            <div key={r.party} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-t border-dashed border-ink/15 py-2.5 first:border-0 sm:grid-cols-[108px_minmax(0,1fr)_132px]">
              <span className="text-caption text-graphite"><Party address={r.party} /></span>
              <div className="relative col-span-2 row-start-2 h-6 sm:col-span-1 sm:row-start-auto">
                <span className="absolute inset-y-[-3px] left-1/2 w-px bg-ink/40" />
                <Beam side="owes" segments={r.owes} max={max} setOff={setOff} net={net < 0n ? -net : 0n} reduce={!!reduce} delay={delay} />
                <Beam side="owed" segments={r.owed} max={max} setOff={setOff} net={net > 0n ? net : 0n} reduce={!!reduce} delay={delay} />
              </div>
              <span className="text-right">
                <span className="fig block text-small transition-opacity duration-500" style={{ opacity: setOff ? 1 : 0.4, transitionDelay: `${(setOff ? delay + 0.5 : 0) * 1000}ms` }}>{net > 0n ? "+" : net < 0n ? "−" : ""}{formatUsdc(net < 0n ? -net : net, 4)}</span>
                <span className="legend text-label">
                  {word}
                  {fixed && net < 0n && <> · <span className={r.funded ? "text-ink" : ""}>{r.funded ? "funded" : "unfunded"}</span></>}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Beam colour is never the only carrier of currency: the key names each one. */}
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-graphite" aria-hidden="true">
        {currencies.map((c) => (
          <span key={c} className={`ccy-${c.toLowerCase()} inline-flex items-center gap-1.5`}>
            <span className="size-3 rounded-[2px] bg-[var(--t)] shadow-[inset_0_0_0_1px_rgb(29_27_24/0.2)]" />
            <span className="code text-label">{c}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="hatch h-3 w-4" />set off</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-4 bg-ink" />net, in USDC</span>
      </p>
      {!compact && (
        <ul className="flex flex-wrap gap-2" aria-label="Gross owed in each currency">
          {currencies.map((c) => {
            const inC = debts.filter((d) => d.currency === c);
            const amount = inC.reduce((t, d) => t + d.amount, 0n);
            const usdc = inC.reduce((t, d) => t + d.usdc, 0n);
            return (
              <li key={c} className={`stock ccy-${c.toLowerCase()} flex items-baseline gap-2 px-3 py-2 text-small`}>
                <span className="code text-label">{c}</span>
                <span className="fig">{formatAmount(amount, c)}</span>
                <span className="text-graphite">→</span>
                <span className="fig">{formatUsdc(usdc, 4)}</span>
                <span className="text-caption text-graphite">USDC</span>
              </li>
            );
          })}
        </ul>
      )}

      {/* A table ignores the 1px box, so the hidden wrapper is a div. */}
      <div className="sr"><table>
        <caption>Positions at the {basis === "fixing" ? "fixing" : "current fixings"}</caption>
        <thead><tr><th>Party</th><th>Owes</th><th>Is owed</th><th>Net</th>{fixed && <th>Funding</th>}</tr></thead>
        <tbody>
          {rows.map((r) => {
            const net = r.owedTotal - r.owesTotal;
            const legs = (side: "debtor" | "creditor") => debts.filter((d) => d[side] === r.party).map((d) => `${d.currency} ${formatAmount(d.amount, d.currency)} = ${formatUsdc(d.usdc, 4)} USDC`).join("; ") || "nothing";
            return (
              <tr key={r.party}>
                <td>{r.party}</td>
                <td>{legs("debtor")}; total {formatUsdc(r.owesTotal, 4)} USDC</td>
                <td>{legs("creditor")}; total {formatUsdc(r.owedTotal, 4)} USDC</td>
                <td>{net > 0n ? `credit ${formatUsdc(net, 4)} USDC` : net < 0n ? `debit ${formatUsdc(-net, 4)} USDC` : "flat"}</td>
                {fixed && <td>{net < 0n ? (r.funded ? "funded" : "unfunded") : "nothing to fund"}</td>}
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </div>
  );
}

/**
 * One half of a party's beam. The gross stands in currency stock until the set-off, then
 * retracts to the zero line: what survives is the net, in ink, and a hatched ghost holds the
 * span it vacated, so the cancellation is a thing you can see rather than a figure you're told.
 */
function Beam({ side, segments, max, setOff, net, reduce, delay }: { side: "owes" | "owed"; segments: Side; max: bigint; setOff: boolean; net: bigint; reduce: boolean; delay: number }) {
  const left = side === "owes"; // debits grow leftward from the zero line, credits rightward
  const ease = [0.16, 1, 0.3, 1] as const;
  const total = segments.reduce((t, s) => t + s.usdc, 0n);
  const grossPct = pct(total, max);
  // The stock keeps its own segment widths and simply retracts toward the zero line.
  const survives = total === 0n ? 0 : Number((net * 10000n) / total) / 10000;
  return (
    <div className={`absolute inset-y-0 w-1/2 ${left ? "right-1/2" : "left-1/2"}`}>
      <motion.span
        className="hatch absolute inset-y-[3px]"
        style={{ width: `${grossPct}%`, [left ? "right" : "left"]: 0 }}
        initial={false}
        animate={{ opacity: setOff ? 1 : 0 }}
        transition={{ duration: reduce ? 0 : 0.5, ease, delay: reduce ? 0 : delay + 0.45 }}
      />
      <motion.div
        className={`absolute inset-y-0 flex ${left ? "right-0 flex-row-reverse" : "left-0 flex-row"}`}
        style={{ width: `${grossPct}%`, transformOrigin: left ? "right center" : "left center" }}
        initial={false}
        animate={{ scaleX: setOff ? survives : 1 }}
        transition={{ duration: reduce ? 0 : 1.1, ease, delay: reduce ? 0 : delay }}
      >
        {segments.map((s, i) => (
          <span
            key={i}
            className={`ccy-${s.currency.toLowerCase()} h-full bg-[var(--t)] shadow-[inset_0_0_0_1px_rgb(29_27_24/0.14)]`}
            style={{ width: total === 0n ? "0%" : `${pct(s.usdc, total)}%` }}
          />
        ))}
      </motion.div>
      <motion.span
        className={`absolute top-1/2 h-3 -translate-y-1/2 bg-ink ${left ? "right-0" : "left-0"}`}
        initial={false}
        animate={{ width: setOff ? `${pct(net, max)}%` : "0%" }}
        transition={{ duration: reduce ? 0 : 1.1, ease, delay: reduce ? 0 : delay }}
      />
    </div>
  );
}
