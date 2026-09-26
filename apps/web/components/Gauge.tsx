"use client";

import { useEffect, useId, useRef } from "react";

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
 * The needle's power-on swing, as a spring (stiffness 38, damping 7.5, mass 0.9), sampled once into
 * a CSS easing. Run as a Web Animation on the needle's own layer, the compositor turns it: the dial
 * is drawn once and never repainted for the swing. It used to be a spring on an SVG group, which
 * redrew every dial, drop-shadow filter and all, on every frame for two seconds.
 */
const SWING = (() => {
  const k = 38, c = 7.5, m = 0.9, dt = 1 / 600;
  const xs: number[] = [];
  let x = 0, v = 0, t = 0;
  while (t < 4 && (t < 0.3 || Math.abs(1 - x) > 0.0015 || Math.abs(v) > 0.01)) {
    const a = (-k * (x - 1) - c * v) / m;
    v += a * dt; x += v * dt; t += dt;
    xs.push(x);
  }
  const n = 48;
  const easing = `linear(0, ${Array.from({ length: n }, (_, i) => xs[Math.round(((i + 1) / n) * (xs.length - 1))]!.toFixed(4)).join(", ")})`;
  return { duration: Math.round(t * 1000), easing };
})();
const ROT = (deg: number) => `rotate(${deg.toFixed(2)}deg)`;

/**
 * The fixing gauge: how old a Chainlink fixing is, against the age at which the contract refuses it.
 * Full scale is 1.2 × the limit, so a refused fixing has somewhere to sit: in the red.
 */
export function Gauge({ currency, ageSec, maxAgeSec, refused = false, size, delay = 0.2 }: Props) {
  const maxH = maxAgeSec / 3600;
  const fullH = Math.ceil(maxH * 1.2);
  const angle = (h: number) => START + (Math.min(Math.max(h, 0), fullH) / fullH) * SWEEP;
  const ageH = ageSec == null ? null : ageSec / 3600;
  const needle = ageH == null ? null : angle(refused ? Math.max(ageH, fullH) : ageH);
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  // Numerals every 6 h, stopping short of the limit so the red one never crowds them.
  const majors = [0, 6, 12, 18, 24].filter((h) => h <= maxH - 3);
  const limitH = Math.round(maxH);

  // The ticks as three strokes rather than one line each: the same marks, a fraction of the markup.
  const tick = (h: number, long: boolean) => {
    const [x1, y1] = polar(long ? 68 : 72.5, angle(h));
    const [x2, y2] = polar(80, angle(h));
    return `M${x1} ${y1}L${x2} ${y2}`;
  };
  const hours = Array.from({ length: fullH + 1 }, (_, h) => h).filter((h) => h !== limitH);
  const minor = hours.filter((h) => !majors.includes(h)).map((h) => tick(h, false)).join("");
  const major = hours.filter((h) => majors.includes(h)).map((h) => tick(h, true)).join("");

  const layers = useRef<(HTMLDivElement | null)[]>([]);
  const shown = useRef<number>(START);
  useEffect(() => {
    if (needle == null) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = shown.current;
    shown.current = needle;
    const anims = layers.current.flatMap((el) => {
      if (!el) return [];
      el.style.transform = ROT(needle);
      if (reduce || from === needle) return [];
      const easing = CSS.supports("animation-timing-function", "linear(0, 1)") ? SWING.easing : "cubic-bezier(0.2, 1.25, 0.4, 1)";
      return [el.animate([{ transform: ROT(from) }, { transform: ROT(needle) }], { duration: SWING.duration, easing, delay: delay * 1000, fill: "backwards" })];
    });
    return () => anims.forEach((a) => a.cancel());
  }, [needle, delay]);

  const layer = "absolute inset-0 origin-center";
  const needlePath = `M ${C - 3.2} ${C + 14} L ${C - 1.1} ${C - 72} L ${C + 1.1} ${C - 72} L ${C + 3.2} ${C + 14} Z`;

  return (
    <div className="relative block aspect-square w-full" style={size ? { width: size } : undefined} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="absolute inset-0 size-full">
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
          <radialGradient id={`${id}-sink`} cx="0.5" cy="0.58" r="0.52">
            <stop offset="0.86" stopColor="var(--ink)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--ink)" stopOpacity="0.22" />
          </radialGradient>
        </defs>

        <circle cx={C} cy={C} r="99" fill={`url(#${id}-bezel)`} />
        <circle cx={C} cy={C} r="91" fill={`url(#${id}-lip)`} />
        <circle cx={C} cy={C} r="87.5" fill={`url(#${id}-face)`} />
        <circle cx={C} cy={C} r="87.5" fill={`url(#${id}-sink)`} />

        {/* The refusal band: past the contract's limit, every payment reverts. */}
        <path d={arc(76, angle(maxH), angle(fullH))} fill="none" stroke="var(--returned)" strokeWidth="7" />

        <path d={minor} stroke="var(--ink)" strokeWidth="1.1" />
        <path d={major} stroke="var(--ink)" strokeWidth="2.4" />
        {limitH <= fullH && <path d={tick(limitH, true)} stroke="var(--returned)" strokeWidth="2.4" />}
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
      </svg>

      {needle != null && (
        <>
          {/* The needle's shadow falls down and to the right wherever it points: its own layer,
              offset once, turning in step with the needle. */}
          <div className="absolute inset-0 opacity-30" style={{ transform: "translate(0.5%, 1%)" }}>
            <div ref={(el) => { layers.current[0] = el; }} className={layer} style={{ transform: ROT(START) }}>
              <svg viewBox="0 0 200 200" className="size-full">
                <filter id={`${id}-blur`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4" /></filter>
                <path d={needlePath} fill="var(--ink)" filter={`url(#${id}-blur)`} />
              </svg>
            </div>
          </div>
          <div ref={(el) => { layers.current[1] = el; }} className={layer} style={{ transform: ROT(START) }}>
            <svg viewBox="0 0 200 200" className="size-full">
              <path d={needlePath} fill={refused ? "var(--returned)" : "var(--ink)"} />
            </svg>
          </div>
        </>
      )}

      <svg viewBox="0 0 200 200" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id={`${id}-glass`} x1="0.2" y1="0" x2="0.6" y2="0.7">
            <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx={C} cy={C} r="7" fill="var(--ink)" />
        <circle cx={C} cy={C} r="2.4" fill="var(--steel)" />
        <path d="M 32 78 A 72 72 0 0 1 124 26 A 92 92 0 0 0 32 78 Z" fill={`url(#${id}-glass)`} />
      </svg>
    </div>
  );
}
