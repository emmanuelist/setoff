import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NoSuchDebt() {
  return (
    <main className="px-[var(--gutter)] pt-[var(--seam)]">
      <section className="plate grid min-h-[40svh] content-center justify-items-start gap-5 p-6 sm:p-10">
        <span className="legend">No such debt</span>
        <h1 className="text-title font-bold tracking-[-0.015em]">The contract has no debt with that number.</h1>
        <div className="well grid h-24 w-full max-w-[420px] place-items-center text-small text-graphite">An empty slot in the rack.</div>
        <Link href="/" className="key"><ArrowLeft aria-hidden="true" />See every debt</Link>
      </section>
    </main>
  );
}
