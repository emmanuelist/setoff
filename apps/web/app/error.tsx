"use client";

import { useEffect } from "react";

/** The shared failure state: if the chain can't be read, say so, and offer a retry. Never a fake figure. */
export default function Failed({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="sec" style={{ display: "grid", gap: 16, justifyItems: "start", minHeight: "50svh", alignContent: "center" }}>
      <span className="stamp returned">Not read</span>
      <h1 style={{ fontSize: 24, fontWeight: 650 }}>Arc didn&apos;t answer this time.</h1>
      <p className="dim" style={{ maxWidth: "60ch" }}>
        Every figure here comes live from the chain, so when the RPC is unreachable there is nothing honest to show. Nothing was changed on-chain.
      </p>
      <button className="btn" onClick={reset}>Read it again</button>
    </main>
  );
}
