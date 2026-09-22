import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DebtActions } from "@/components/DebtActions";
import { Slip, Timeline } from "@/components/Slip";
import { publicClient } from "@/lib/chain";
import { pad } from "@/lib/format";
import { formatAmount } from "@/lib/money";
import { readDebt, readQuote, readReceipt } from "@/lib/setoff";
import s from "./page.module.css";

export async function generateMetadata({ params }: PageProps<"/debts/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Debt ${id}` };
}

export default async function DebtPage({ params }: PageProps<"/debts/[id]">) {
  await connection();
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) notFound();
  const debt = await readDebt(BigInt(id));
  if (!debt) notFound();

  const [quote, receipt, head] = await Promise.all([
    debt.state === "accepted" ? readQuote(debt.id) : Promise.resolve(null),
    readReceipt(debt),
    publicClient.getBlock(),
  ]);

  return (
    <main>
      <div className={s.crumbs}>
        <Link href="/">Debts</Link> <span aria-hidden="true">/</span> <span className="fig">№ {pad(debt.id, 4)}</span>
      </div>
      <section className={s.layout}>
        <div>
          <h1 className="sr">Debt {debt.id.toString()}: {debt.currency} {formatAmount(debt.amount, debt.currency)}, {debt.state}</h1>
          <Slip debt={debt} quote={quote} receipt={receipt} now={Number(head.timestamp)} />
        </div>
        <aside className={s.side}>
          <Timeline debt={debt} />
          <DebtActions
            debt={{
              id: debt.id.toString(),
              creditor: debt.creditor,
              debtor: debt.debtor,
              currency: debt.currency,
              state: debt.state,
              quoteDue: quote?.ok ? quote.due.toString() : null,
            }}
          />
        </aside>
      </section>
    </main>
  );
}
