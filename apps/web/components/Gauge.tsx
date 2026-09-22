"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";

const C = 100;
const SWEEP = 240; // the scale runs from 8 o'clock round to 4, leaving the foot of the face for the rate window
const START = -SWEEP / 2;

type Props = {
  /** The currency whose feed this is; its code on the face is the only currency colour on the dial. */
  currency: string;
  /** Age of the fixing in seconds, or null for USD (par, no feed). */
  ageSec: number | null;
  /** The contract's refusal limit, read live (maxFixingAge). */
  maxAgeSec: number;
  refused?: boolean;
  size?: number;
  /** Delay before the needle's power-on sweep; every dial on a wall shares one, like one impulse. */
  delay?: number;
};

// Rounded, so the server's and the browser's trigonometry print the same attributes.
const r2 = (n: number) => Math.round(n * 100) / 100;
const polar = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [r2(C + r * Math.cos(a)), r2(C + r * Math.sin(a))] as const;
};
const arc = (r: number, from: number, to: number) => {
  const [x1, y1] = polar(r, from);
  const [x2, y2] = polar(r, to);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
};

/**
 * The fixing gauge: how old a Chainlink fixing is, against the age at which the contract refuses it.
 * Full scale is 1.2 × the limit, so a refused fixing has somewhere to sit: in the red.
 */
export function Gauge({ currency, ageSec, maxAgeSec, refused = false, size, delay = 0.2 }: Props) {
  const reduce = useReducedMotion();
  const maxH = maxAgeSec / 3600;
  const fullH = Math.ceil(maxH * 1.2);
  const angle = (h: number) => START + (Math.min(Math.max(h, 0), fullH) / fullH) * SWEEP;
  const ageH = ageSec == null ? null : ageSec / 3600;
  const needle = ageH == null ? null : angle(refused ? Math.max(ageH, fullH) : ageH);
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  // Numerals every 6 h, stopping short of the limit so the red one never crowds them.
  const majors = [0, 6, 12, 18, 24].filter((h) => h <= maxH - 3);

  return (
    <svg viewBox="0 0 200 200" width={size} className="block aspect-square w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bezel`} x1="0.15" y1="0.05" x2="0.85" y2="0.95">
          <stop offset="0" stopColor="var(--steel-hi)" />
          <stop offset="0.5" stopColor="var(--steel)" />
          <stop offset="1" stopColor="var(--steel-lo)" />
        </linearGradient>
        <linearGradient id={`${id}-lip`} x1="0.85" y1="0.95" x2="0.15" y2="0.05">
          <stop offset="0" stopColor="var(--steel-hi)" />
          <stop offset="1" stopColor="var(--steel-lo)" />
        </linearGradient>
        <radialGradient id={`${id}-face`} cx="0.5" cy="0.44" r="0.56">
          <stop offset="0.8" stopColor="var(--enamel)" />
          <stop offset="1" stopColor="var(--enamel-edge)" />
        </radialGradient>
        <linearGradient id={`${id}-glass`} x1="0.2" y1="0" x2="0.6" y2="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-sink`} cx="0.5" cy="0.58" r="0.52">
          <stop offset="0.86" stopColor="var(--ink)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--ink)" stopOpacity="0.22" />
        </radialGradient>
        <filter id={`${id}-lift`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="1" dy="2" stdDeviation="1.4" floodColor="var(--ink)" floodOpacity="0.3" />
        </filter>
      </defs>

      <circle cx={C} cy={C} r="99" fill={`url(#${id}-bezel)`} />
      <circle cx={C} cy={C} r="91" fill={`url(#${id}-lip)`} />
      <circle cx={C} cy={C} r="87.5" fill={`url(#${id}-face)`} />
      <circle cx={C} cy={C} r="87.5" fill={`url(#${id}-sink)`} />

      {/* The refusal band: past the contract's limit, every payment reverts. */}
      <path d={arc(76, angle(maxH), angle(fullH))} fill="none" stroke="var(--returned)" strokeWidth="7" />

      {Array.from({ length: fullH + 1 }, (_, h) => {
        const major = majors.includes(h);
        const limit = h === Math.round(maxH);
        const [x1, y1] = polar(major || limit ? 68 : 72.5, angle(h));
        const [x2, y2] = polar(80, angle(h));
        return <line key={h} x1={x1} y1={y1} x2={x2} y2={y2} stroke={limit ? "var(--returned)" : "var(--ink)"} strokeWidth={major || limit ? 2.4 : 1.1} />;
      })}
      {majors.map((h) => {
        const [x, y] = polar(56, angle(h));
        return <text key={h} x={x} y={y + 4} textAnchor="middle" className="fig" style={{ fontSize: 11.5, fill: "var(--ink)" }}>{h}</text>;
      })}
      {(() => {
        const [x, y] = polar(56, angle(maxH));
        return <text x={x} y={y + 4} textAnchor="middle" className="fig" style={{ fontSize: 11.5, fill: "var(--returned)", fontWeight: 600 }}>{Math.round(maxH)}</text>;
      })()}

      {/* The needle never sweeps below the hub, so the face's print lives there, and only there. */}
      <text x={C} y={C + 30} textAnchor="middle" className="code" style={{ fontSize: 15, fill: "var(--c)" }}>{currency}</text>

      {needle != null && (
        <motion.g
          filter={`url(#${id}-lift)`}
          initial={reduce ? false : { rotate: START }}
          animate={{ rotate: needle }}
          transition={{ type: "spring", stiffness: 38, damping: 7.5, mass: 0.9, delay }}
        >
          {/* An unpainted ring the size of the face keeps the group's box centred on the hub. */}
          <circle cx={C} cy={C} r="84" fill="none" />
          <path d={`M ${C - 3.2} ${C + 14} L ${C - 1.1} ${C - 72} L ${C + 1.1} ${C - 72} L ${C + 3.2} ${C + 14} Z`} fill={refused ? "var(--returned)" : "var(--ink)"} />
        </motion.g>
      )}
      <circle cx={C} cy={C} r="7" fill="var(--ink)" />
      <circle cx={C} cy={C} r="2.4" fill="var(--steel)" />
      <path d="M 32 78 A 72 72 0 0 1 124 26 A 92 92 0 0 0 32 78 Z" fill={`url(#${id}-glass)`} />
    </svg>
  );
}
