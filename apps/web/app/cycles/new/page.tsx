import type { Metadata } from "next";
import { connection } from "next/server";
import { OpenCycleForm } from "@/components/OpenCycleForm";
import { Plate } from "@/components/room/Plate";
import { publicClient } from "@/lib/chain";

export const metadata: Metadata = { title: "Open a cycle" };

export default async function NewCycle() {
  await connection();
  const head = await publicClient.getBlock();
  return (
    <main className="px-[var(--gutter)] pt-[var(--seam)]">
      <div className="bento">
        <section className="plate col-span-12 grid content-start gap-7 p-6 sm:p-9 lg:col-span-7">
          <div className="grid gap-4">
            <h1 className="max-w-[18ch] text-display leading-[1.02] font-bold tracking-[-0.02em] [font-variation-settings:'wdth'_108]">Set the cutoff, then let the debts come in.</h1>
            <p className="max-w-[58ch] text-lead leading-[1.55] text-graphite">
              A cycle is only a schedule. Debts join it one by one, each endorsed by its debtor. At the cutoff one fixing prices them all, and only the nets move.
            </p>
          </div>
          <OpenCycleForm readAt={Number(head.timestamp)} />
        </section>
        <Plate legend="The rules it runs on" className="col-span-12 self-start lg:col-span-5">
          <dl className="grid text-small">
            {[
              ["Debts per cycle", "16 at most"],
              ["Parties per cycle", "8 at most"],
              ["Funding window", "10 minutes to 30 days"],
              ["Rates", "one Chainlink read per currency, at the fixing"],
              ["Stale rate", "refused past 25 h; retry until the deadline"],
              ["Payouts", "withdrawals, never pushed"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 border-b border-rule py-2.5 last:border-0">
                <dt className="text-graphite">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </Plate>
      </div>
    </main>
  );
}
