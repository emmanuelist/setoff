import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { X } from "lucide-react";
import { RefusalRoom } from "@/components/RefusalRoom";
import { publicClient } from "@/lib/chain";
import { pad } from "@/lib/format";
import { readCycle, readCycles, readDebts, readMaxFixingAge, readQuote } from "@/lib/setoff";

export const metadata: Metadata = { title: "Refusal room" };

/** What the contract refuses, in its own terms; the fixing limit is the contract's, read live. */
const refusedActs = (maxAgeH: number) => [
  "Move money without the payer's own signature and payment.",
  `Price a debt at a rate older than ${maxAgeH} hours, or at an invalid one.`,
  "Let anyone but the debtor endorse or pay a debt.",
  "Take a debt back once the debtor has endorsed it.",
  "Pay out more than it was paid, or push money to anyone.",
  "Settle part of a cycle. Every net debtor funds, or every deposit comes back.",
  "Change its own rules. There is no owner and no admin key.",
];

export default async function Refusals() {
  await connection();
  const [debts, maxAge, head, cycles] = await Promise.all([readDebts(), readMaxFixingAge(), publicClient.getBlock(), readCycles()]);
  const paid = debts.find((d) => d.state === "paid");
  const open = debts.find((d) => d.state === "accepted" && d.cycleId === 0 && d.currency !== "USD");
  const settledCycle = cycles.find((c) => c.state === "settled");
  const settledView = settledCycle ? await readCycle(settledCycle.id) : null;
  const netted = settledView?.debts.find((d) => d.state === "netted");
  const quote = open ? await readQuote(open.id) : null;

  const intro = (
    <div className="grid gap-5">
      <h1 className="text-display leading-[0.95] font-bold tracking-[-0.025em] [font-variation-settings:'wdth'_104]">Try to break it.</h1>
      <p className="max-w-[58ch] text-lead leading-[1.55] text-graphite">
        Every attempt below runs against the live Setoff contract on Arc mainnet as a read-only call. Nothing is signed and nothing is spent.
        The contract answers with the exact reason it refuses, decoded from its own revert data.
        {paid && open && <> They use real records on the contract: <Link href={`/debts/${paid.id}`} className="text-ink">debt <span className="fig">{pad(paid.id, 4)}</span></Link>, already paid; <Link href={`/debts/${open.id}`} className="text-ink">debt <span className="fig">{pad(open.id, 4)}</span></Link>, endorsed and unpaid{settledCycle && netted ? <>; and <Link href={`/cycles/${settledCycle.id}`} className="text-ink">cycle <span className="fig">{pad(settledCycle.id, 4)}</span></Link>, settled, with <Link href={`/debts/${netted.id}`} className="text-ink">debt <span className="fig">{pad(netted.id, 4)}</span></Link>, which it netted</> : null}.</>}
      </p>
    </div>
  );

  const cannot = (
    <section className="plate col-span-12 p-6 sm:p-7 lg:col-span-5" aria-labelledby="cannot">
      <h2 id="cannot" className="legend mb-5">Setoff can&apos;t</h2>
      <ul className="grid gap-3.5">
        {refusedActs(Math.round(maxAge / 3600)).map((c) => (
          <li key={c} className="grid grid-cols-[18px_1fr] gap-2.5 text-body leading-[1.45]">
            <X className="mt-0.5 size-4 text-returned" strokeWidth={2.6} aria-hidden="true" />{c}
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <main className="px-[var(--gutter)] pt-[var(--seam)]">
      <div className="bento">
        {paid && open && quote?.ok ? (
          <RefusalRoom
            head={intro}
            cannot={cannot}
            ctx={{
              paid: { id: paid.id.toString(), debtor: paid.debtor, creditor: paid.creditor },
              open: { id: open.id.toString(), debtor: open.debtor, creditor: open.creditor, currency: open.currency, due: quote.due.toString() },
              settled: settledCycle && netted ? { id: settledCycle.id.toString(), netted: { id: netted.id.toString(), debtor: netted.debtor } } : null,
              now: Number(head.timestamp),
              maxAge,
            }}
          />
        ) : (
          <>
            <section className="plate col-span-12 grid gap-6 p-6 sm:p-9 lg:col-span-7">
              {intro}
              <p className="well px-4 py-3 text-body leading-[1.55] text-graphite">
                The room needs one paid debt and one endorsed, unpaid debt in a feed currency on the contract{quote && !quote.ok ? ", and a fresh fixing for it" : ""}. Nothing here is simulated from scratch, so until those exist there is nothing honest to run.
              </p>
            </section>
            {cannot}
          </>
        )}
      </div>
    </main>
  );
}
