"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

/** The shared failure state: if the chain can't be read, say so, and offer a retry. Never a fake figure. */
export default function Failed({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="px-[var(--gutter)] pt-[var(--seam)]">
      <section className="plate grid min-h-[50svh] content-center justify-items-start gap-5 p-6 sm:p-10">
        <span className="legend">Not read</span>
        <h1 className="text-title font-bold tracking-[-0.015em]">Arc didn&apos;t answer this time.</h1>
        <p className="max-w-[60ch] text-lead leading-[1.55] text-graphite">
          Every figure here comes live from the chain, so when the RPC is unreachable there is nothing honest to show. Nothing was changed on-chain.
        </p>
        <button className="key key-ink" onClick={reset}><RotateCcw aria-hidden="true" />Read it again</button>
      </section>
    </main>
  );
}
