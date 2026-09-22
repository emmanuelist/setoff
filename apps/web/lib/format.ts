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
