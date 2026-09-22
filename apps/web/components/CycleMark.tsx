import type { CycleState } from "@/lib/setoff";
import { Perforation } from "./Marks";

/** One mark per cycle state, from the same set as a debt's (DESIGN.md). */
export function CycleMark({ state, size = "md" }: { state: CycleState; size?: "sm" | "md" }) {
  const sm = size === "sm";
  if (state === "settled") return <span className="text-ink"><Perforation word="CLEARED" height={sm ? 15 : 22} title="settled" /></span>;
  if (state === "void") return <span className={`impress impress-late ${sm ? "impress-sm" : ""}`}>Returned</span>;
  return <span className={`legend ${sm ? "text-label" : ""} text-ink`}>{state === "open" ? "Enrolling" : "Fixed"}</span>;
}
