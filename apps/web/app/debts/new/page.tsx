import type { Metadata } from "next";
import { connection } from "next/server";
import { ProposeForm, type LiveFixing } from "@/components/ProposeForm";
import { publicClient } from "@/lib/chain";
import { readFixings } from "@/lib/setoff";
import s from "./page.module.css";

export const metadata: Metadata = { title: "Record a debt" };

export default async function NewDebt() {
  await connection();
  const [reads, head] = await Promise.all([readFixings(), publicClient.getBlock()]);
  const fixings: LiveFixing[] = reads.map((r) =>
    r.ok
      ? { currency: r.currency, answer: r.fixing.answer.toString(), decimals: r.fixing.decimals, updatedAt: r.fixing.updatedAt }
      : { currency: r.currency, refused: true },
  );

  return (
    <main className={s.page}>
      <header className={s.head}>
        <p className="wide dim">Record a debt</p>
        <h1 className={s.title}>Bill in the currency you invoiced in.</h1>
        <p className={s.sub}>
          You&apos;re the creditor. The debtor endorses it, then pays in native USDC at the Chainlink fixing on the day they pay.
          Nothing is converted until then.
        </p>
      </header>
      <ProposeForm fixings={fixings} now={Number(head.timestamp)} />
    </main>
  );
}
