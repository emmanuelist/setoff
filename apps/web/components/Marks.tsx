import type { DebtState } from "@/lib/setoff";
import { pad } from "@/lib/format";

/** Original clear-band glyphs, inspired by (and not claiming to be) E-13B. */
function CycleMark() {
  return <svg viewBox="0 0 10 14" aria-hidden="true"><rect width="3" height="14" /><rect x="5.5" y="2" width="3.5" height="3.5" /><rect x="5.5" y="8.5" width="3.5" height="3.5" /></svg>;
}
function ItemMark() {
  return <svg viewBox="0 0 12 14" aria-hidden="true"><rect width="2.5" height="14" /><rect x="4.5" width="2.5" height="14" /><rect x="9" y="5.25" width="3" height="3.5" /></svg>;
}
function AmountMark() {
  return <svg viewBox="0 0 10 14" aria-hidden="true"><rect y="3" width="3" height="11" /><rect x="5" width="3.5" height="3.5" /><rect x="5" y="6" width="3.5" height="8" /></svg>;
}

/** The machine line: item ID, and the fixed amount in micro-USDC once there is one. */
export function ClearBand({ id, usdcWei }: { id: bigint; usdcWei?: bigint | null }) {
  return (
    <span className="band" aria-label={`Debt ${id}`}>
      <ItemMark /><span>{pad(id, 4)}</span><ItemMark />
      {usdcWei != null && (
        <>
          <span style={{ width: "0.6em" }} />
          <AmountMark /><span>{pad(usdcWei / 10n ** 12n, 8)}</span><AmountMark />
        </>
      )}
    </span>
  );
}

export function ContractBand({ label }: { label: string }) {
  return <span className="band"><CycleMark /><span>{label}</span><CycleMark /></span>;
}

const GLYPHS: Record<string, string[]> = {
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
};

/** A 5×7 dot-matrix word: the perforation a clearing room punched through a paid item. */
export function Perforation({ word = "CLEARED", height = 24, title }: { word?: string; height?: number; title?: string }) {
  const pitch = 4;
  const dots: [number, number][] = [];
  [...word].forEach((ch, n) => GLYPHS[ch]?.forEach((row, y) => [...row].forEach((b, x) => { if (b === "1") dots.push([n * 6 * pitch + x * pitch + pitch / 2, y * pitch + pitch / 2]); })));
  const w = word.length * 6 * pitch - pitch;
  return (
    <svg viewBox={`0 0 ${w} ${7 * pitch}`} height={height} width={(w * height) / (7 * pitch)} role="img" aria-label={title ?? word.toLowerCase()}>
      {dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.35} fill="currentColor" />)}
    </svg>
  );
}

/** One mark per state, the same everywhere (DESIGN.md §1). */
export function StateMark({ state, size = "md" }: { state: DebtState; size?: "sm" | "md" }) {
  if (state === "accepted") return <span className="stamp endorsed" style={size === "sm" ? { fontSize: 10.5, padding: "4px 7px 3px" } : undefined}>Endorsed</span>;
  if (state === "paid") return <Perforation word="PAID" height={size === "sm" ? 16 : 26} title="paid" />;
  if (state === "cancelled") return <span className="dim struck" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Cancelled</span>;
  return <span className="dim" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Proposed</span>;
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 22 22" width={size} height={size} aria-hidden="true">
      <circle cx="11" cy="11" r="9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeDasharray=".1 4.2" strokeLinecap="round" />
      <circle cx="11" cy="11" r="3.2" fill="currentColor" />
    </svg>
  );
}
