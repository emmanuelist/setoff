"use client";

import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { txUrl } from "@/lib/chain";
import { short } from "@/lib/format";
import type { TxPhase } from "./wallet/useSetoffTx";

function Hash({ hash }: { hash: `0x${string}` }) {
  return <a href={txUrl(hash)} target="_blank" rel="noreferrer" className="fig inline-flex items-center gap-0.5 whitespace-nowrap">{short(hash)}<ArrowUpRight className="size-3" aria-hidden="true" /></a>;
}

/** The one shared lifecycle view for every write, printed like the recorder's tape. A flow never strands in "pending". */
export function TxStatus({ state, doneLabel = "Done" }: { state: TxPhase; doneLabel?: string }) {
  if (state.phase === "idle") return null;
  const line = "well flex items-start gap-2.5 px-3.5 py-3 text-[13px] leading-[1.45]";
  const spin = <LoaderCircle className="mt-px size-4 flex-none animate-spin text-graphite" aria-hidden="true" />;
  switch (state.phase) {
    case "checking":
      return <p className={line} role="status">{spin}Checking against the contract…</p>;
    case "signing":
      return <p className={line} role="status">{spin}Confirm in your wallet.</p>;
    case "including":
      return <p className={line} role="status">{spin}<span>Sent. Waiting for inclusion; it is final the moment it lands. <Hash hash={state.hash} /></span></p>;
    case "done":
      return (
        <p className={line} role="status">
          <span className="print print-sign">{doneLabel.toUpperCase()}</span>
          <span>Final in block <span className="fig">{state.receipt.blockNumber.toLocaleString("en-US")}</span> · <Hash hash={state.hash} /></span>
        </p>
      );
    case "failed":
      return (
        <p className={line} role="alert">
          <span className={`print flex-none ${state.refused ? "print-late" : "text-graphite"}`}>{state.refused ? "REFUSED" : "NOT SENT"}</span>
          <span>{state.message}{state.hash && <> · <Hash hash={state.hash} /></>}</span>
        </p>
      );
  }
}
