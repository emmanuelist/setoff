import type { DebtState } from "@/lib/setoff";
import { pad } from "@/lib/format";
import { formatUsdc } from "@/lib/money";

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
  // The machine line is read out plainly: a label on a bare span is not announced.
  return (
    <span className="band">
      <span className="sr">Debt {pad(id, 4)}{usdcWei != null && `, fixed at ${formatUsdc(usdcWei)} USDC`}</span>
      <span className="contents" aria-hidden="true">
        <ItemMark /><span>{pad(id, 4)}</span><ItemMark />
        {usdcWei != null && (
          <>
            <span style={{ width: "0.6em" }} />
            <AmountMark /><span>{pad(usdcWei / 10n ** 12n, 8)}</span><AmountMark />
          </>
        )}
      </span>
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

/**
 * A 5×7 dot-matrix word: the perforation a clearing room punched through a paid item. Every hole is
 * a zero-length stroke with a round cap, so a word is one path: "CLEARED" was 105 circles, sent
 * twice (in the HTML and in React's payload), on every card that carried it.
 */
export function Perforation({ word = "CLEARED", height = 24, title }: { word?: string; height?: number; title?: string }) {
  const pitch = 4;
  let d = "";
  [...word].forEach((ch, n) => GLYPHS[ch]?.forEach((row, y) => [...row].forEach((b, x) => { if (b === "1") d += `M${n * 6 * pitch + x * pitch + pitch / 2} ${y * pitch + pitch / 2}h0`; })));
  const w = word.length * 6 * pitch - pitch;
  return (
    <svg viewBox={`0 0 ${w} ${7 * pitch}`} height={height} width={(w * height) / (7 * pitch)} role="img" aria-label={title ?? word.toLowerCase()}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2.7} strokeLinecap="round" />
    </svg>
  );
}

/** One mark per state, the same everywhere: what the recorder put on the card. */
export function StateMark({ state, size = "md" }: { state: DebtState; size?: "sm" | "md" }) {
  const sm = size === "sm";
  if (state === "accepted") return <span className={`impress impress-sign ${sm ? "impress-sm" : ""}`}>Endorsed</span>;
  if (state === "paid") return <span className="text-ink"><Perforation word="PAID" height={sm ? 15 : 24} title="paid" /></span>;
  // Netted in a cycle: cleared against the others, like a cheque in the clearing.
  if (state === "netted") return <span className="text-ink"><Perforation word="CLEARED" height={sm ? 15 : 24} title="netted" /></span>;
  const quiet = `legend ${sm ? "text-label" : ""}`;
  if (state === "cancelled") return <span className={`${quiet} struck`}>Cancelled</span>;
  return <span className={quiet}>Proposed</span>;
}

/** The mark: a dial of ticks around one hub. Five currencies, one fixing. */
export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 22 22" width={size} height={size} aria-hidden="true">
      <circle cx="11" cy="11" r="9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeDasharray=".1 4.2" strokeLinecap="round" />
      <circle cx="11" cy="11" r="3.2" fill="currentColor" />
    </svg>
  );
}
