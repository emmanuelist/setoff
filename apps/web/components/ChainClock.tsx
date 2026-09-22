"use client";

import { useEffect, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { useHead, type Head } from "@/lib/head";

const C = 120; // the clock's centre in its 240-unit face

/** Chain time in seconds, carried forward from the last block seen. Never ahead of it by more than a poll. */
const chainNow = (h: Head) => h.timestamp + (performance.now() - h.seenAt) / 1000;

/** Back-out easing: the minute hand overshoots its detent a hair and settles, like a slave clock's impulse. */
const impulse = (p: number) => { const s = 2.2; const q = p - 1; return 1 + q * q * ((s + 1) * q + s); };

function useHands(head: Head | null, fallback: { number: bigint; timestamp: number } | null) {
  const hour = useRef<SVGGElement>(null);
  const minute = useRef<SVGGElement>(null);
  const second = useRef<SVGGElement>(null);

  useEffect(() => {
    // Until the first poll lands, the clock runs from the block the page itself was read at.
    const seed: Head | null = fallback ? { ...fallback, seenAt: performance.now() } : null;
    let raf = 0;
    const tick = () => {
      const h = head ?? seed;
      if (h) {
        const t = chainNow(h);
        const sec = t % 60;
        const mins = Math.floor(t / 60);
        // Stop-to-go: the seconds hand sweeps in 58.5 s and waits at the top for the minute impulse.
        const secA = Math.min(sec / 58.5, 1) * 360;
        const minA = ((mins % 60) - 1 + impulse(Math.min(sec / 0.35, 1))) * 6;
        const hourA = ((Math.floor(t / 3600) % 12) + (mins % 60) / 60) * 30;
        second.current?.setAttribute("transform", `rotate(${secA.toFixed(2)} ${C} ${C})`);
        minute.current?.setAttribute("transform", `rotate(${minA.toFixed(2)} ${C} ${C})`);
        hour.current?.setAttribute("transform", `rotate(${hourA.toFixed(2)} ${C} ${C})`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [head, fallback]);

  return { hour, minute, second };
}

/** The master clock: chain time, read from Arc's own blocks. Every figure on the page answers to it. */
export function ChainClock({ readAt, compact = false }: { readAt: { number: string; timestamp: number }; compact?: boolean }) {
  const head = useHead();
  const [fallback] = useState(() => ({ number: BigInt(readAt.number), timestamp: readAt.timestamp }));
  const { hour, minute, second } = useHands(head, fallback);
  const block = head?.number ?? fallback.number;

  return (
    // On a phone the clock is a readout beside its block number; on a wall it is the centrepiece.
    <div className={`flex h-full items-center ${compact ? "gap-4 sm:flex-col sm:gap-3" : "gap-5 sm:flex-col"}`}>
      <svg viewBox="0 0 240 240" className={`aspect-square flex-none ${compact ? "w-[112px] sm:w-full sm:max-w-[168px]" : "w-[128px] sm:w-full sm:max-w-[300px]"}`} role="img" aria-label="Chain clock, UTC, driven by Arc block timestamps">
        <defs>
          <linearGradient id="cc-bezel" x1="0.15" y1="0.05" x2="0.85" y2="0.95">
            <stop offset="0" stopColor="var(--steel-hi)" />
            <stop offset="0.48" stopColor="var(--steel)" />
            <stop offset="1" stopColor="var(--steel-lo)" />
          </linearGradient>
          <linearGradient id="cc-lip" x1="0.85" y1="0.95" x2="0.15" y2="0.05">
            <stop offset="0" stopColor="var(--steel-hi)" />
            <stop offset="1" stopColor="var(--steel-lo)" />
          </linearGradient>
          <radialGradient id="cc-face" cx="0.5" cy="0.45" r="0.55">
            <stop offset="0.82" stopColor="var(--enamel)" />
            <stop offset="1" stopColor="var(--enamel-edge)" />
          </radialGradient>
          <linearGradient id="cc-glass" x1="0.2" y1="0" x2="0.6" y2="0.7">
            <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="cc-sink" cx="0.5" cy="0.58" r="0.52">
            <stop offset="0.86" stopColor="var(--ink)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--ink)" stopOpacity="0.22" />
          </radialGradient>
          <filter id="cc-lift" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1.2" dy="2.4" stdDeviation="1.6" floodColor="var(--ink)" floodOpacity="0.28" />
          </filter>
        </defs>
        <circle cx={C} cy={C} r="119" fill="url(#cc-bezel)" />
        <circle cx={C} cy={C} r="110" fill="url(#cc-lip)" />
        <circle cx={C} cy={C} r="106" fill="url(#cc-face)" />
        <circle cx={C} cy={C} r="106" fill="url(#cc-sink)" />
        {Array.from({ length: 60 }, (_, i) => {
          const major = i % 5 === 0;
          return <rect key={i} x={C - (major ? 2.6 : 0.8)} y={20} width={major ? 5.2 : 1.6} height={major ? 17 : 6} fill="var(--ink)" transform={`rotate(${i * 6} ${C} ${C})`} />;
        })}
        <text x={C} y={C - 38} textAnchor="middle" className="legend" style={{ fontSize: 11, fill: "var(--ink)" }}>UTC</text>
        <text x={C} y={C + 50} textAnchor="middle" className="legend" style={{ fontSize: 9.5, fill: "var(--ink)" }}>ARC · 5042</text>
        <g filter="url(#cc-lift)">
          <g ref={hour}><rect x={C - 4.5} y={C - 58} width="9" height="72" fill="var(--ink)" /></g>
          <g ref={minute}><rect x={C - 3.4} y={C - 88} width="6.8" height="106" fill="var(--ink)" /></g>
          <g ref={second}>
            <rect x={C - 1} y={C - 64} width="2" height="92" fill="var(--ink)" />
            <circle cx={C} cy={C - 72} r="7" fill="none" stroke="var(--ink)" strokeWidth="2.4" />
          </g>
          <circle cx={C} cy={C} r="5.5" fill="var(--ink)" />
          <circle cx={C} cy={C} r="2" fill="var(--steel)" />
        </g>
        <path d="M 38 92 A 86 86 0 0 1 150 30 A 110 110 0 0 0 38 92 Z" fill="url(#cc-glass)" />
      </svg>
      <div className="grid w-full min-w-0 justify-items-start gap-1 sm:justify-items-center sm:text-center">
        <span className="legend">Block</span>
        <span className="overflow-hidden" aria-label={`Latest block ${block.toLocaleString("en-US")}`}>
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
      <span className="well flex h-8 items-center overflow-hidden px-2.5" role="img" aria-label={head ? `Latest Arc block ${head.number.toLocaleString("en-US")}` : "Reading the latest Arc block"}>
        {head ? <NumberFlow value={Number(head.number)} className="fig text-small text-ink" aria-hidden="true" /> : <span className="fig text-small text-graphite">reading…</span>}
      </span>
    </span>
  );
}
