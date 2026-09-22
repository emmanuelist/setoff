import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { X } from "lucide-react";
import { RefusalRoom } from "@/components/RefusalRoom";
import { publicClient } from "@/lib/chain";
import { pad } from "@/lib/format";
import { readDebts, readMaxFixingAge, readQuote } from "@/lib/setoff";

export const metadata: Metadata = { title: "Refusal room" };

const CANNOT = [
  "Move money without the payer's own signature and payment.",
  "Price a debt at a rate older than 25 hours, or at an invalid one.",
  "Let anyone but the debtor endorse or pay a debt.",
  "Take a debt back once the debtor has endorsed it.",
  "Pay out more than it was paid, or push money to anyone.",
  "Change its own rules. There is no owner and no admin key.",
];

export default async function Refusals() {
  await connection();
  const [debts, maxAge, head] = await Promise.all([readDebts(), readMaxFixingAge(), publicClient.getBlock()]);
  const paid = debts.find((d) => d.state === "paid");
  const open = debts.find((d) => d.state === "accepted" && d.currency !== "USD");
  const quote = open ? await readQuote(open.id) : null;

  const intro = (
    <div className="grid gap-5">
      <h1 className="text-[clamp(44px,6vw,84px)] leading-[0.95] font-bold tracking-[-0.025em] [font-variation-settings:'wdth'_104]">Try to break it.</h1>
      <p className="max-w-[58ch] text-[15.5px] leading-[1.55] text-graphite">
        Every attempt below runs against the live Setoff contract on Arc mainnet as a read-only call. Nothing is signed and nothing is spent.
        The contract answers with the exact reason it refuses, decoded from its own revert data.
        {paid && open && <> The attempts use two real debts: <Link href={`/debts/${paid.id}`} className="text-ink">debt <span className="fig">{pad(paid.id, 4)}</span></Link>, already paid, and <Link href={`/debts/${open.id}`} className="text-ink">debt <span className="fig">{pad(open.id, 4)}</span></Link>, endorsed and unpaid.</>}
      </p>
    </div>
  );

  const cannot = (
    <section className="plate col-span-12 p-6 sm:p-7 lg:col-span-5" aria-labelledby="cannot">
      <h2 id="cannot" className="legend mb-5">Setoff can&apos;t</h2>
      <ul className="grid gap-3.5">
        {CANNOT.map((c) => (
          <li key={c} className="grid grid-cols-[18px_1fr] gap-2.5 text-[14px] leading-[1.45]">
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
              now: Number(head.timestamp),
              maxAge,
            }}
          />
        ) : (
          <>
            <section className="plate col-span-12 grid gap-6 p-6 sm:p-9 lg:col-span-7">
              {intro}
              <p className="well px-4 py-3 text-[14px] leading-[1.55] text-graphite">
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
