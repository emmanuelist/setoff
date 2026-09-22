"use client";

import { useCallback, useState } from "react";
import { SETOFF_ADDRESS, addressUrl } from "@/lib/chain";
import { short } from "@/lib/format";
import { ATTEMPTS, runAttempt, type Attempt, type Outcome, type RoomContext } from "@/lib/attempts";
import s from "./RefusalRoom.module.css";

const GROUPS: Attempt["group"][] = ["The fixing", "Paying", "Authority", "Recording"];

function Result({ o }: { o: Outcome }) {
  if (o.result === "refused" && o.error) {
    return <span className={s.result}><span className="stamp refused">Refused</span><span className={`fig ${s.errName}`}>{o.error.name}</span></span>;
  }
  return <span className={s.result}><span className={`enc ${s.clears}`}>Clears</span></span>;
}

export function RefusalRoom({ ctx }: { ctx: RoomContext }) {
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [log, setLog] = useState<Outcome[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  // A failure sticks to its own attempt: running the next one must never hide it.
  const [failures, setFailures] = useState<Record<string, string>>({});

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
    for (const a of ATTEMPTS) { await run(a); }
  }, [run]);

  const ran = Object.values(outcomes);
  const surprises = ran.filter((o) => !o.matched).length;
  const failed = Object.keys(failures).length;
  const current = selected ? outcomes[selected] : log[0];
  const currentAttempt = current ? ATTEMPTS.find((a) => a.key === current.key) : null;

  return (
    <div className={s.room}>
      <div className={s.attempts}>
        <div className={s.bar}>
          <button className={s.runAll} onClick={runAll} disabled={running !== null}>{running ? "Running…" : "Run every attempt"}</button>
          <span className={s.tally} aria-live="polite">
            <span className="fig">{ran.length}</span> of <span className="fig">{ATTEMPTS.length}</span> run ·{" "}
            <span className={surprises ? s.bad : ""}><span className="fig">{surprises}</span> {surprises === 1 ? "surprise" : "surprises"}</span>
            {failed > 0 && <> · <span className={s.bad}><span className="fig">{failed}</span> couldn&apos;t run</span></>}
          </span>
        </div>
        {GROUPS.map((g) => (
          <section key={g} className={s.group} aria-label={g}>
            <h3 className="wide">{g}</h3>
            {ATTEMPTS.filter((a) => a.group === g).map((a) => {
              const o = outcomes[a.key];
              return (
                <div key={a.key} className={`${s.attempt} ${selected === a.key ? s.on : ""}`}>
                  <button className={s.pick} onClick={() => o && setSelected(a.key)} aria-label={`Show the result for: ${a.title}`} disabled={!o} />
                  <div className={s.text}>
                    <p className={s.title}>{a.title}</p>
                    <p className={s.detail}>{a.detail}</p>
                    <p className={s.expect}>Rule: {a.expect === "refused" ? "the contract must refuse this" : "the contract must accept this"}</p>
                    {a.override && <p className={s.override}>Simulated: {a.override}</p>}
                    {failures[a.key] && <p className={s.failure} role="alert">{failures[a.key]}</p>}
                  </div>
                  <div className={s.side}>
                    {o ? <Result o={o} /> : <span className={s.pending}>Not run</span>}
                    <button className={s.run} onClick={() => run(a)} disabled={running !== null}>{running === a.key ? "…" : o ? "Again" : "Run"}</button>
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </div>

      <aside className={s.panel}>
        <div className={s.panelHead}>
          <span className="wide">Structured result</span>
          {current && (current.result === "refused" ? <span className="stamp refused" style={{ fontSize: 10 }}>Refused</span> : <span className={`enc ${s.clears}`}>Clears</span>)}
        </div>
        {current && currentAttempt ? (
          <>
            <p className={s.panelTitle}>{currentAttempt.title}</p>
            <pre className={s.json}>{JSON.stringify({
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
          </>
        ) : (
          <p className={s.empty}>Run an attempt. The contract&apos;s own answer appears here, decoded from its revert data.</p>
        )}

        <div className={s.logHead}><span className="wide">Log</span><span className="fig">{log.length}</span></div>
        {log.length === 0 ? <p className={s.empty}>Nothing run yet.</p> : (
          <ol className={s.log}>
            {log.map((o) => {
              const a = ATTEMPTS.find((x) => x.key === o.key);
              return (
                <li key={`${o.key}-${o.at}`}>
                  <span className={`fig ${s.logBlock}`}>#{o.block}</span>
                  <span className={s.logTitle}>{a?.title}</span>
                  <span className={`fig ${o.result === "refused" ? s.logRefused : s.logClears}`}>{o.error ? o.error.name : "clears"}</span>
                </li>
              );
            })}
          </ol>
        )}
        <p className={s.foot}>Against <a href={addressUrl(SETOFF_ADDRESS)} target="_blank" rel="noreferrer" className="fig">{short(SETOFF_ADDRESS)}</a> on Arc mainnet, at the latest block of each run.</p>
      </aside>
    </div>
  );
}
