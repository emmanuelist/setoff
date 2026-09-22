import type { Metadata } from "next";
import { connection } from "next/server";
import { ProposeForm, type LiveFixing } from "@/components/ProposeForm";
import { publicClient } from "@/lib/chain";
import { readCycles, readFixings, readMaxFixingAge } from "@/lib/setoff";

export const metadata: Metadata = { title: "Record a debt" };

export default async function NewDebt({ searchParams }: PageProps<"/debts/new">) {
  await connection();
  const [reads, head, maxAge, cycles, sp] = await Promise.all([readFixings(), publicClient.getBlock(), readMaxFixingAge(), readCycles(), searchParams]);
  const now = Number(head.timestamp);
  // Only cycles still open for enrolment are offered.
  const open = cycles.filter((c) => c.state === "open" && now < c.cutoff).map((c) => ({ id: c.id.toString(), cutoff: c.cutoff }));
  const asked = typeof sp.cycle === "string" ? sp.cycle : null;
  const initialCycle = asked && open.some((c) => c.id === asked) ? asked : null;
  const fixings: LiveFixing[] = reads.map((r) =>
    r.ok
      ? { currency: r.currency, answer: r.fixing.answer.toString(), decimals: r.fixing.decimals, updatedAt: r.fixing.updatedAt }
      : { currency: r.currency, refused: true, updatedAt: r.updatedAt },
  );

  return (
    <main className="px-[var(--gutter)] pt-[var(--seam)]">
      <div className="bento">
        <ProposeForm
          fixings={fixings}
          now={now}
          maxAge={maxAge}
          cycles={open}
          initialCycle={initialCycle}
          intro={
            <div className="grid gap-4">
              <h1 className="max-w-[18ch] text-[clamp(32px,3.8vw,50px)] leading-[1.02] font-bold tracking-[-0.02em] [font-variation-settings:'wdth'_108]">
                Bill in the currency you invoiced in.
              </h1>
              <p className="max-w-[58ch] text-[15px] leading-[1.55] text-graphite">
                You&apos;re the creditor. The debtor endorses it, then pays in native USDC at the Chainlink fixing on the day they pay. Nothing is converted until then.
              </p>
            </div>
          }
        />
      </div>
    </main>
  );
}
