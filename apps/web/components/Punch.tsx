"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { utc } from "@/lib/format";

export type PunchRow = { label: string; ts: number | null; who: string; struck?: boolean };

/**
 * The card's punch fields. A field that fills while you watch (after a signed act and a refresh)
 * is printed onto the card: the ribbon strikes, the ink lands. Fields already printed stay still.
 */
export function PunchFields({ rows }: { rows: PunchRow[] }) {
  const [printed] = useState(() => new Set(rows.filter((r) => r.ts).map((r) => r.label)));
  const reduce = useReducedMotion();

  return (
    <ol className="grid border-t border-dashed border-ink/25">
      {rows.map((r) => {
        const fresh = r.ts !== null && !printed.has(r.label) && !reduce;
        return (
          <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 border-b border-dashed border-ink/25 py-3 sm:grid-cols-[130px_minmax(0,1fr)_auto]">
            <span className={`legend ${r.ts ? "text-ink" : ""}`}>{r.label}</span>
            {r.ts ? (
              <motion.span
                className={`print col-span-2 row-start-2 text-small sm:col-span-1 sm:row-start-auto ${r.struck ? "text-graphite" : "print-sign"}`}
                initial={fresh ? { opacity: 0, scale: 1.35, filter: "blur(3px)" } : false}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 700, damping: 26, delay: 0.15 }}
                style={{ transformOrigin: "left center", display: "inline-block" }}
              >
                {utc(r.ts).toUpperCase()}
              </motion.span>
            ) : (
              <span className="fig col-span-2 row-start-2 text-small text-graphite sm:col-span-1 sm:row-start-auto">—</span>
            )}
            <span className="col-start-2 row-start-1 text-right text-caption text-graphite sm:col-start-auto sm:row-start-auto">{r.ts ? r.who : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}

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

/**
 * The perforator, seen working: when a card is paid while you watch, its holes are punched one
 * column at a time before the card settles into its perforated state. On a card that was already
 * paid, nothing runs; the holes are simply there.
 */
export function PerforatorRun({ paid, word = "PAID" }: { paid: boolean; word?: string }) {
  const [wasPaid] = useState(paid);
  const reduce = useReducedMotion();
  if (!paid || wasPaid || reduce) return null;
  const pitch = 6;
  const dots: { x: number; y: number; col: number }[] = [];
  [...word].forEach((ch, n) => DOTS[ch]?.forEach((row, y) => [...row].forEach((b, x) => { if (b === "1") dots.push({ x: n * 6 * pitch + x * pitch + pitch / 2, y: y * pitch + pitch / 2, col: n * 6 + x }); })));
  const w = word.length * 6 * pitch - pitch;
  return (
    <svg viewBox={`0 0 ${w} ${7 * pitch}`} width={w} height={7 * pitch} className="pointer-events-none absolute top-[18px] right-[16px] h-auto w-[56%] sm:top-[22px] sm:right-[24px] sm:w-auto" aria-hidden="true">
      {dots.map((d, i) => (
        <motion.circle key={i} cx={d.x} cy={d.y} r={2.1} fill="var(--ink)" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }} transition={{ duration: 0.5, delay: 0.2 + d.col * 0.035 }} />
      ))}
    </svg>
  );
}
