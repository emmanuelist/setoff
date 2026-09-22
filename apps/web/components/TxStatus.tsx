"use client";

import { txUrl } from "@/lib/chain";
import { short } from "@/lib/format";
import type { TxPhase } from "./wallet/useSetoffTx";
import s from "./TxStatus.module.css";

/** The one shared lifecycle view for every write. A flow can never strand in "pending". */
export function TxStatus({ state, doneLabel = "Done", tone = "floor" }: { state: TxPhase; doneLabel?: string; tone?: "floor" | "statement" }) {
  if (state.phase === "idle") return null;
  const cls = `${s.status} ${tone === "statement" ? s.statement : ""}`;
  switch (state.phase) {
    case "checking":
      return <p className={cls} role="status"><span className={s.pulse} />Checking against the contract…</p>;
    case "signing":
      return <p className={cls} role="status"><span className={s.pulse} />Confirm in your wallet.</p>;
    case "including":
      return <p className={cls} role="status"><span className={s.pulse} />Sent. Waiting for inclusion — final the moment it lands. <a href={txUrl(state.hash)} target="_blank" rel="noreferrer" className="fig">{short(state.hash)} ↗</a></p>;
    case "done":
      return <p className={`${cls} ${s.done}`} role="status">{doneLabel}. Final in block <span className="fig">{state.receipt.blockNumber.toString()}</span> · <a href={txUrl(state.hash)} target="_blank" rel="noreferrer" className="fig">{short(state.hash)} ↗</a></p>;
    case "failed":
      return <p className={`${cls} ${s.failed}`} role="alert">{state.message}{state.hash && <> · <a href={txUrl(state.hash)} target="_blank" rel="noreferrer" className="fig">{short(state.hash)} ↗</a></>}</p>;
  }
}
