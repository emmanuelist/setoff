import type { Address } from "viem";

export const short = (a: Address | string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const pad = (n: bigint | number, width: number) => String(n).padStart(width, "0");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "22 Sep 2026 14:04 UTC" — always UTC, the chain's clock. */
export function utc(ts: number): string {
  const d = new Date(ts * 1000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${hh}:${mm} UTC`;
}

/** "4.7 h" / "38 min" — the age of a fixing, never rounded to zero. */
export function age(seconds: number): string {
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min`;
  return `${(seconds / 3600).toFixed(1)} h`;
}

export const lastDigits = (n: bigint, count = 6) => `…${n.toString().slice(-count)}`;

/** "14:31:26 UTC": a time on the chain's clock, to the second. */
export function clock(ts: number): string {
  const d = new Date(ts * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`;
}

/**
 * A moment on the chain's clock. Within half a day it is the time alone; further out it carries
 * its date, because a funding deadline decides whether money moves or comes back.
 */
export function stamp(ts: number, now: number): string {
  if (Math.abs(ts - now) <= 12 * 3600) return clock(ts);
  const d = new Date(ts * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

/** "3 min 12 s" / "1 h 04 min" / "2 d 3 h": a span of time, never shown as zero. */
export function span(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${Math.max(1, s)} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")} min`;
  return `${Math.floor(s / 86400)} d ${Math.floor((s % 86400) / 3600)} h`;
}
