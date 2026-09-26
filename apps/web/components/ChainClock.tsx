"use client";

import { useEffect, useId, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { useHead } from "@/lib/head";

const C = 120; // the clock's centre in its 240-unit face

/** Back-out easing: the minute hand overshoots its detent a hair and settles, like a slave clock's impulse. */
const impulse = (p: number) => { const s = 2.2; const q = p - 1; return 1 + q * q * ((s + 1) * q + s); };
/** The impulse as a CSS easing, sampled; browsers without linear() get the nearest cubic. */
const IMPULSE = typeof CSS !== "undefined" && CSS.supports("animation-timing-function", "linear(0, 1)")
  ? `linear(${Array.from({ length: 21 }, (_, i) => impulse(i / 20).toFixed(4)).join(", ")})`
  : "cubic-bezier(0.2, 0.9, 0.3, 1.4)";

/** The seconds hand sweeps in 58.5 s and waits at the top for the minute impulse: stop-to-go. */
const SWEEP_S = 58.5;
const ROT = (deg: number) => `rotate(${deg.toFixed(3)}deg)`;
const angles = (t: number) => {
  const mins = Math.floor(t / 60);
  return { minute: (mins % 60) * 6, hour: ((Math.floor(t / 3600) % 12) + (mins % 60) / 60) * 30 };
};

/**
 * Drives the hands from chain time. Each hand is its own layer and only its transform changes, so
 * turning it is the compositor's work: the page is never re-laid-out or repainted for it. The
 * clock used to redraw its whole face, filter and all, on every animation frame, which kept a
 * phone's main thread busy for as long as the page was open.
 *
 * Chain time is the latest block's timestamp carried forward on the monotonic clock. It only ever
 * moves forward: a new block can tell the clock it is behind, never that it is ahead.
 */
function useHands(readAt: number, head: { timestamp: number; seenAt: number } | null) {
  const hands = { hour: useRef<HTMLDivElement>(null), minute: useRef<HTMLDivElement>(null), second: useRef<HTMLDivElement>(null) };
  const shadows = { hour: useRef<HTMLDivElement>(null), minute: useRef<HTMLDivElement>(null), second: useRef<HTMLDivElement>(null) };
  const offset = useRef<number | null>(null);
  const sweep = useRef<Animation[]>([]);
  const resync = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (offset.current === null) offset.current = readAt - performance.now() / 1000;
    const now = () => performance.now() / 1000 + offset.current!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pairs = (k: "hour" | "minute" | "second") => [hands[k].current, shadows[k].current].filter((e): e is HTMLDivElement => !!e);

    // Minute and hour: set, and on the minute, stepped with the impulse.
    const place = (t: number, step: boolean) => {
      const a = angles(t);
      for (const k of ["minute", "hour"] as const) {
        for (const el of pairs(k)) {
          const from = el.style.transform;
          el.style.transform = ROT(a[k]);
          if (step && !reduce && from) el.animate([{ transform: from }, { transform: ROT(a[k]) }], { duration: 350, easing: k === "minute" ? IMPULSE : "ease-out" });
        }
      }
    };

    // Seconds: one endless animation, set to the chain's phase. Reduced motion ticks once a second.
    let ticker = 0;
    const phase = () => ((now() % 60) + 60) % 60;
    if (reduce) {
      const tick = () => { const s = Math.min(Math.floor(phase()) / SWEEP_S, 1) * 360; for (const el of pairs("second")) el.style.transform = ROT(s); };
      tick();
      ticker = window.setInterval(tick, 1000);
    } else {
      sweep.current = pairs("second").map((el) =>
        el.animate([{ transform: ROT(0) }, { transform: ROT(360), offset: SWEEP_S / 60 }, { transform: ROT(360) }], { duration: 60_000, iterations: Infinity }),
      );
    }

    let minuteTimer = 0;
    const onMinute = () => {
      place(now(), true);
      minuteTimer = window.setTimeout(onMinute, (60 - phase()) * 1000 + 20);
    };
    resync.current = () => {
      for (const a of sweep.current) a.currentTime = phase() * 1000;
      place(now(), false);
      window.clearTimeout(minuteTimer);
      minuteTimer = window.setTimeout(onMinute, (60 - phase()) * 1000 + 20);
    };
    resync.current();

    return () => {
      window.clearTimeout(minuteTimer);
      window.clearInterval(ticker);
      for (const a of sweep.current) a.cancel();
      sweep.current = [];
      resync.current = null;
    };
    // The refs are stable; readAt only seeds the clock once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new block: move the clock on if it had fallen behind, by more than a glance would notice.
  useEffect(() => {
    if (!head || offset.current === null) return;
    const seen = head.timestamp - head.seenAt / 1000;
    if (seen - offset.current > 0.25) { offset.current = seen; resync.current?.(); }
  }, [head]);

  return { hands, shadows };
}

/** One hand, drawn on its own layer the size of the face, turning about the centre. */
function Hand({ layer, angle, children, blur }: { layer: React.RefObject<HTMLDivElement | null>; angle: number; children: React.ReactNode; blur?: string }) {
  return (
    // The layer is a div, not the svg: Chrome hands a transform animation to the compositor only on
    // an HTML element. Server-rendered at the angle of the block the page was read at.
    <div ref={layer} className="absolute inset-0 origin-center" style={{ transform: ROT(angle) }}>
      <svg viewBox="0 0 240 240" className="size-full" style={{ color: "var(--ink)" }} aria-hidden="true">
        <g fill="currentColor" filter={blur ? `url(#${blur})` : undefined}>{children}</g>
      </svg>
    </div>
  );
}

const HOUR = <rect x={C - 4.5} y={C - 58} width="9" height="72" />;
const MINUTE = <rect x={C - 3.4} y={C - 88} width="6.8" height="106" />;
const SECOND = <><rect x={C - 1} y={C - 64} width="2" height="92" /><circle cx={C} cy={C - 72} r="7" fill="none" stroke="currentColor" strokeWidth="2.4" /></>;

/** The sixty ticks as two strokes rather than sixty rectangles: the same marks, a fraction of the markup. */
const ticks = (major: boolean) =>
  Array.from({ length: 60 }, (_, i) => i).filter((i) => (i % 5 === 0) === major).map((i) => {
    const a = (i * 6 * Math.PI) / 180;
    const r1 = C - 20, r2 = C - 20 - (major ? 17 : 6);
    const p = (r: number) => `${(C + r * Math.sin(a)).toFixed(2)} ${(C - r * Math.cos(a)).toFixed(2)}`;
    return `M${p(r1)}L${p(r2)}`;
  }).join("");
const MINOR_TICKS = ticks(false), MAJOR_TICKS = ticks(true);

/** The master clock: chain time, read from Arc's own blocks. Every figure on the page answers to it. */
export function ChainClock({ readAt, compact = false }: { readAt: { number: string; timestamp: number }; compact?: boolean }) {
  const head = useHead();
  const [fallback] = useState(() => ({ number: BigInt(readAt.number), timestamp: readAt.timestamp }));
  const { hands, shadows } = useHands(fallback.timestamp, head);
  const block = head?.number ?? fallback.number;
  const id = `cc${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const at = { ...angles(fallback.timestamp), second: Math.min((fallback.timestamp % 60) / SWEEP_S, 1) * 360 };

  return (
    // On a phone the clock is a readout beside its block number; on a wall it is the centrepiece.
    <div className={`flex h-full items-center ${compact ? "gap-4 sm:flex-col sm:gap-3" : "gap-5 sm:flex-col"}`}>
      <div className={`relative aspect-square flex-none ${compact ? "w-[112px] sm:w-full sm:max-w-[168px]" : "w-[128px] sm:w-full sm:max-w-[300px]"}`} role="img" aria-label="Chain clock, UTC, driven by Arc block timestamps">
        <svg viewBox="0 0 240 240" className="absolute inset-0 size-full" aria-hidden="true">
          <defs>
            <linearGradient id={`${id}-bezel`} x1="0.15" y1="0.05" x2="0.85" y2="0.95">
              <stop offset="0" stopColor="var(--steel-hi)" />
              <stop offset="0.48" stopColor="var(--steel)" />
              <stop offset="1" stopColor="var(--steel-lo)" />
            </linearGradient>
            <linearGradient id={`${id}-lip`} x1="0.85" y1="0.95" x2="0.15" y2="0.05">
              <stop offset="0" stopColor="var(--steel-hi)" />
              <stop offset="1" stopColor="var(--steel-lo)" />
            </linearGradient>
            <radialGradient id={`${id}-face`} cx="0.5" cy="0.45" r="0.55">
              <stop offset="0.82" stopColor="var(--enamel)" />
              <stop offset="1" stopColor="var(--enamel-edge)" />
            </radialGradient>
            <radialGradient id={`${id}-sink`} cx="0.5" cy="0.58" r="0.52">
              <stop offset="0.86" stopColor="var(--ink)" stopOpacity="0" />
              <stop offset="1" stopColor="var(--ink)" stopOpacity="0.22" />
            </radialGradient>
          </defs>
          <circle cx={C} cy={C} r="119" fill={`url(#${id}-bezel)`} />
          <circle cx={C} cy={C} r="110" fill={`url(#${id}-lip)`} />
          <circle cx={C} cy={C} r="106" fill={`url(#${id}-face)`} />
          <circle cx={C} cy={C} r="106" fill={`url(#${id}-sink)`} />
          <path d={MINOR_TICKS} stroke="var(--ink)" strokeWidth="1.6" />
          <path d={MAJOR_TICKS} stroke="var(--ink)" strokeWidth="5.2" />
          <text x={C} y={C - 38} textAnchor="middle" className="legend" style={{ fontSize: 11, fill: "var(--ink)" }}>UTC</text>
          <text x={C} y={C + 50} textAnchor="middle" className="legend" style={{ fontSize: 9.5, fill: "var(--ink)" }}>ARC · 5042</text>
        </svg>

        {/* The hands' shadow falls down and to the right whichever way they point, so it turns on
            its own layers, offset once, rather than rotating with the hands. */}
        <div className="absolute inset-0 opacity-[0.28]" style={{ transform: "translate(0.5%, 1%)" }}>
          <svg className="absolute size-0" aria-hidden="true"><filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6" /></filter></svg>
          <Hand layer={shadows.hour} angle={at.hour} blur={`${id}-blur`}>{HOUR}</Hand>
          <Hand layer={shadows.minute} angle={at.minute} blur={`${id}-blur`}>{MINUTE}</Hand>
          <Hand layer={shadows.second} angle={at.second} blur={`${id}-blur`}>{SECOND}</Hand>
        </div>
        <Hand layer={hands.hour} angle={at.hour}>{HOUR}</Hand>
        <Hand layer={hands.minute} angle={at.minute}>{MINUTE}</Hand>
        <Hand layer={hands.second} angle={at.second}>{SECOND}</Hand>

        <svg viewBox="0 0 240 240" className="absolute inset-0 size-full" aria-hidden="true">
          <defs>
            <linearGradient id={`${id}-glass`} x1="0.2" y1="0" x2="0.6" y2="0.7">
              <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle cx={C} cy={C} r="5.5" fill="var(--ink)" />
          <circle cx={C} cy={C} r="2" fill="var(--steel)" />
          <path d="M 38 92 A 86 86 0 0 1 150 30 A 110 110 0 0 0 38 92 Z" fill={`url(#${id}-glass)`} />
        </svg>
      </div>
      <div className="grid w-full min-w-0 justify-items-start gap-1 sm:justify-items-center sm:text-center">
        <span className="legend">Block</span>
        <span className="overflow-hidden">
          <span className="sr">Latest block {block.toLocaleString("en-US")}</span>
          <NumberFlow value={Number(block)} className={`fig leading-none font-medium ${compact ? "text-figure-m" : "text-figure-l"}`} format={{ useGrouping: true }} aria-hidden="true" />
        </span>
        <span className="mt-1 text-small text-graphite">
          {compact ? "Final the moment it lands." : <>This page was read at block <span className="fig text-ink">{Number(readAt.number).toLocaleString("en-US")}</span>. Each block is final the moment it lands.</>}
        </span>
      </div>
    </div>
  );
}

/** The master clock's small readout, on every page. */
export function ChainReadout() {
  const head = useHead();
  return (
    <span className="hidden items-center gap-2.5 text-caption text-graphite md:flex" aria-live="off">
      <span className="legend">Arc 5042</span>
      <span className="well flex h-8 w-[98px] items-center justify-center overflow-hidden px-2.5" role="img" aria-label={head ? `Latest Arc block ${head.number.toLocaleString("en-US")}` : "Reading the latest Arc block"}>
        {head ? <NumberFlow value={Number(head.number)} className="fig text-small text-ink" aria-hidden="true" /> : <span className="fig text-small text-graphite">reading…</span>}
      </span>
    </span>
  );
}
