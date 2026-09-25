"use client";

import { span, stamp } from "@/lib/format";
import { useChainNow } from "@/lib/head";

type Props = {
  openedAt: number;
  cutoff: number;
  deadline: number;
  fixedAt: number | null;
  closedAt: number | null;
  state: "open" | "fixed" | "settled" | "void";
  readAt: number;
};

/** Where the cycle stands on the chain's clock: a track from opening to the funding deadline. */
export function CycleTimer({ openedAt, cutoff, deadline, fixedAt, closedAt, state, readAt }: Props) {
  const now = useChainNow(readAt);
  const at = closedAt ?? now;
  const start = Math.min(openedAt, cutoff - 60);
  const pos = (t: number) => Math.min(100, Math.max(0, ((t - start) / Math.max(1, deadline - start)) * 100));

  const stage =
    state === "settled" ? { word: "Settled", line: `at ${stamp(closedAt ?? 0, now)}. Every net debtor funded, so every debt was netted at once.` }
    : state === "void"
      // Only a cycle that was fixed can have been underfunded. One voided without a
      // fixing never priced a debt or held a deposit, and must not say otherwise.
      ? fixedAt
        ? { word: "Voided", line: `at ${stamp(closedAt ?? 0, now)}. Someone didn't fund, so every deposit became refundable.` }
        : { word: "Voided", line: `at ${stamp(closedAt ?? 0, now)}. It was never fixed, so nothing was priced and no deposit was ever held.` }
    : now >= deadline ? { word: "Past its deadline", line: "Someone hasn't funded. Anyone can void it now, and every deposit comes back." }
    : state === "fixed" ? { word: "Fixed", line: `Net debtors fund until the deadline, in ${span(deadline - now)}.` }
    : now >= cutoff ? { word: "At the cutoff", line: `Enrolment is closed. Anyone can fix it now; funding closes in ${span(deadline - now)}.` }
    : { word: "Enrolling", line: `Debts can join until the cutoff, in ${span(cutoff - now)}.` };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-heading font-semibold">{stage.word}</span>
        <span className="text-small text-graphite">{stage.line}</span>
      </div>
      <div className="relative pt-1 pb-7" aria-hidden="true">
        <div className="well relative h-3.5 overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-[linear-gradient(180deg,var(--steel),var(--steel-lo))] opacity-60" style={{ width: `${pos(at)}%` }} />
        </div>
        {[{ t: cutoff, label: `Cutoff ${stamp(cutoff, now)}` }, { t: deadline, label: `Deadline ${stamp(deadline, now)}` }].map((m, i) => (
          <div key={m.label} className="absolute top-0 flex flex-col items-center" style={{ left: `${pos(m.t)}%`, transform: `translateX(${i === 1 ? "-100%" : "-50%"})` }}>
            <span className={`h-5.5 w-0.5 bg-ink ${i === 1 ? "self-end" : ""}`} />
            <span className={`fig mt-1 text-label whitespace-nowrap text-graphite ${i === 1 ? "self-end" : ""}`}>{m.label}</span>
          </div>
        ))}
        {fixedAt !== null && <span className="absolute top-1 h-3.5 w-0.5 bg-endorse" style={{ left: `${pos(fixedAt)}%` }} title={`Fixed ${stamp(fixedAt, now)}`} />}
        <span
          className="absolute top-[-3px] h-5 w-3 -translate-x-1/2 rounded-[3px] bg-[linear-gradient(180deg,var(--enamel),var(--plate))] shadow-[inset_0_1px_0_#fff,0_0_0_1px_rgb(29_27_24/0.25),0_2px_3px_rgb(29_27_24/0.3)] transition-[left] duration-1000 ease-linear"
          style={{ left: `${pos(at)}%` }}
        />
      </div>
      <p className="sr">{stage.word}. {stage.line} Cutoff {stamp(cutoff, now)}, funding deadline {stamp(deadline, now)}.</p>
    </div>
  );
}
