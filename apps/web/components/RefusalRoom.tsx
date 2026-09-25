"use client";

import { useCallback, useMemo, useState } from "react";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, LoaderCircle, Play, RotateCcw } from "lucide-react";
import { SETOFF_ADDRESS, addressUrl } from "@/lib/chain";
import { short } from "@/lib/format";
import { ATTEMPTS, CYCLE_ATTEMPTS, runAttempt, type Attempt, type Outcome, type RoomContext } from "@/lib/attempts";

const GROUPS: Attempt["group"][] = ["The fixing", "Paying", "Authority", "Recording", "The cycle"];

function Result({ o }: { o: Outcome }) {
  if (o.result === "refused" && o.error) {
    return (
      <span className="grid justify-items-end gap-1">
        <span className="impress impress-late impress-sm">Refused</span>
        <span className="print print-late text-caption">{o.error.name}</span>
      </span>
    );
  }
  return <span className="print text-caption text-ink">CLEARS</span>;
}

/** Every attempt runs against the live contract as a read-only eth_call. The tape prints what the contract said. */
export function RefusalRoom({ ctx, head, cannot }: { ctx: RoomContext; head: React.ReactNode; cannot: React.ReactNode }) {
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [log, setLog] = useState<Outcome[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  // A failure sticks to its own attempt: running the next one must never hide it.
  const [failures, setFailures] = useState<Record<string, string>>({});
  const reduce = useReducedMotion();
  // Cycle attempts that need a settled cycle run only when the contract has one.
  const all = useMemo(() => [...ATTEMPTS, ...CYCLE_ATTEMPTS.filter((a) => !a.needsCycle || ctx.settled)], [ctx]);

  const run = useCallback(async (a: Attempt) => {
    setRunning(a.key);
    setFailures((f) => { const next = { ...f }; delete next[a.key]; return next; });
    try {
      const o = await runAttempt(a, ctx);
      setOutcomes((m) => ({ ...m, [a.key]: o }));
      setLog((l) => [o, ...l]);
      setSelected(a.key);
    } catch (e) {
      const reason = e instanceof Error ? e.message.split("\n")[0] : "no answer";
      setFailures((f) => ({ ...f, [a.key]: `The call never reached the contract (${reason}). No result is assumed; run it again.` }));
    } finally {
      setRunning(null);
    }
  }, [ctx]);

  const runAll = useCallback(async () => {
    for (const a of all) { await run(a); }
  }, [run, all]);

  const ran = Object.values(outcomes);
  const surprises = ran.filter((o) => !o.matched).length;
  const failed = Object.keys(failures).length;
  const current = selected ? outcomes[selected] : log[0];
  const currentAttempt = current ? all.find((a) => a.key === current.key) : null;

  return (
    <>
      <section className="plate col-span-12 flex flex-col justify-between gap-8 p-6 sm:p-9 lg:col-span-7">
        {head}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <button id="run-attempts" className="key key-ink" onClick={runAll} disabled={running !== null}>
            {running ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Play aria-hidden="true" />}
            {running ? "Running…" : "Run every attempt"}
          </button>
          <p id="run-count" className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-small text-graphite" aria-live="polite">
            <span><NumberFlow value={ran.length} className="fig text-figure-m text-ink" /> of <span className="fig">{all.length}</span> run</span>
            <span className={surprises ? "font-semibold text-ink" : ""}><NumberFlow value={surprises} className="fig text-figure-m text-ink" /> off their rule</span>
            {failed > 0 && <span className="font-semibold text-ink"><span className="fig text-figure-m">{failed}</span> couldn&apos;t run</span>}
          </p>
        </div>
      </section>

      {cannot}

      <div className="col-span-12 grid content-start gap-[var(--seam)] lg:col-span-7">
        {GROUPS.map((g) => (
          <section key={g} className="plate p-5 sm:p-6" aria-label={g}>
            <h2 className="legend mb-4">{g}</h2>
            <div className="well grid gap-2 p-2">
              {all.filter((a) => a.group === g).map((a) => {
                const o = outcomes[a.key];
                const on = current?.key === a.key;
                return (
                  <article key={a.key} className={`stock grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 p-4 transition-[transform,box-shadow] duration-200 ease-spring ${on ? "-translate-y-[2px] shadow-[0_0_0_1.5px_var(--ink),0_18px_28px_-20px_rgb(29_27_24/0.7)]" : ""}`}>
                    <div className="grid content-start gap-1.5">
                      <h3 className="text-lead font-semibold">{a.title}</h3>
                      <p className="max-w-[68ch] text-small leading-[1.5] text-graphite">{a.detail}</p>
                      <p className="text-caption text-graphite">Rule: {a.expect === "refused" ? "the contract must refuse this" : "the contract must accept this"}</p>
                      {a.override && <p className="max-w-[68ch] text-caption text-graphite">Simulated: {a.override}</p>}
                      {o && !o.matched && <p className="text-small font-semibold">This result does not match the rule.</p>}
                      {failures[a.key] && <p className="text-small font-semibold" role="alert">{failures[a.key]}</p>}
                    </div>
                    <div className="grid content-between justify-items-end gap-3">
                      {o ? <Result o={o} /> : <span className="legend">Not run</span>}
                      <div className="flex gap-2">
                        {o && !on && <button className="key key-sm" onClick={() => setSelected(a.key)} aria-label={`Show the result for: ${a.title}`}>Show</button>}
                        <button className="key key-sm" onClick={() => run(a)} disabled={running !== null} aria-label={`${o ? "Run again" : "Run"}: ${a.title}`}>
                          {running === a.key ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : o ? <RotateCcw aria-hidden="true" /> : <Play aria-hidden="true" />}
                          {o ? "Again" : "Run"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <aside className="plate col-span-12 self-start p-5 sm:p-6 lg:sticky lg:top-[var(--seam)] lg:col-span-5 lg:col-start-8 lg:row-start-2" id="tape" aria-label="Recorder tape">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="legend">Recorder tape</h2>
          {current && (current.result === "refused" ? <span className="impress impress-late impress-sm">Refused</span> : <span className="print text-caption">CLEARS</span>)}
        </div>
        <div className="well p-2">
          <div className="stock bg-enamel [mask:radial-gradient(circle_4px_at_6px_0,#0000_97%,#000)_0_0/12px_100%_repeat-x] px-4 pt-5 pb-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {current && currentAttempt ? (
                <motion.div key={`${current.key}-${current.at}`} initial={reduce ? false : { y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 32 }}>
                  <p className="mb-3 text-lead font-semibold">{currentAttempt.title}</p>
                  <pre className="fig text-caption leading-[1.6] whitespace-pre-wrap text-ink [overflow-wrap:anywhere]">{JSON.stringify({
                    contract: SETOFF_ADDRESS,
                    kind: "eth_call — read-only, nothing signed",
                    block: Number(current.block),
                    function: current.call.function,
                    from: current.call.from,
                    ...(current.call.value ? { value: current.call.value } : {}),
                    ...(Object.keys(current.call.overrides).length ? { simulated: current.call.overrides } : {}),
                    result: current.result,
                    ...(current.error ? { error: current.error.name, args: current.error.args } : { returned: current.returned }),
                    matchesRule: current.matched,
                  }, null, 2)}</pre>
                </motion.div>
              ) : (
                <p className="text-small leading-[1.55] text-graphite">Run an attempt. The contract&apos;s own answer prints here, decoded from its revert data.</p>
              )}
            </AnimatePresence>

            <div className="mt-5 flex items-center justify-between border-t border-dashed border-ink/25 pt-3">
              <span className="legend">Log</span>
              <span className="fig text-caption text-graphite">{log.length}</span>
            </div>
            {log.length === 0 ? (
              <p className="pt-2 text-small text-graphite">Nothing run yet.</p>
            ) : (
              <ol className="grid max-h-[220px] gap-1 overflow-auto pt-2">
                {log.map((o) => {
                  const a = all.find((x) => x.key === o.key);
                  return (
                    <li key={`${o.key}-${o.at}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-3 text-caption">
                      <span className="fig text-graphite">#{o.block}</span>
                      <span className="truncate">{a?.title}</span>
                      <span className={`print ${o.result === "refused" ? "print-late" : ""}`}>{o.error ? o.error.name : "clears"}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
        <p className="mt-4 text-caption text-graphite">
          Against <a href={addressUrl(SETOFF_ADDRESS)} target="_blank" rel="noreferrer" className="fig inline-flex items-center gap-0.5 text-ink">{short(SETOFF_ADDRESS)}<ArrowUpRight className="size-3" aria-hidden="true" /></a> on Arc mainnet, at the latest block of each run.
        </p>
      </aside>
    </>
  );
}
