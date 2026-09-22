import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { RefusalRoom } from "@/components/RefusalRoom";
import { publicClient } from "@/lib/chain";
import { pad } from "@/lib/format";
import { readDebts, readMaxFixingAge, readQuote } from "@/lib/setoff";
import s from "./page.module.css";

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

  return (
    <main>
      <section className={s.floor}>
        <p className="wide">Refusal room</p>
        <h1 className={s.title}>Try to break it.</h1>
        <p className={s.sub}>
          Every attempt below runs against the live Setoff contract on Arc mainnet as a read-only call. Nothing is signed and nothing is spent.
          The contract answers with the exact reason it refuses, decoded from its own revert data.
        </p>
        <div className={s.cannot}>
          <p className="wide">Setoff can&apos;t</p>
          <ul>{CANNOT.map((c) => <li key={c}><span className={s.x} aria-hidden="true">×</span>{c}</li>)}</ul>
        </div>
      </section>

      <section className="sec">
        <div className="sec-h">
          <div className="wide"><span className="i">01</span>The attempts</div>
          <p>
            {paid && open ? <>They use two real debts on the contract: <Link href={`/debts/${paid.id}`} className="fig">№ {pad(paid.id, 4)}</Link>, already paid, and{" "}
              <Link href={`/debts/${open.id}`} className="fig">№ {pad(open.id, 4)}</Link>, endorsed and unpaid.</> : "Waiting for real debts on the contract."}
          </p>
        </div>
        {paid && open && quote?.ok ? (
          <RefusalRoom
            ctx={{
              paid: { id: paid.id.toString(), debtor: paid.debtor, creditor: paid.creditor },
              open: { id: open.id.toString(), debtor: open.debtor, creditor: open.creditor, currency: open.currency, due: quote.due.toString() },
              now: Number(head.timestamp),
              maxAge,
            }}
          />
        ) : (
          <p className="dim">
            The room needs one paid debt and one endorsed, unpaid debt in a feed currency on the contract{quote && !quote.ok ? ", and a fresh fixing for it" : ""}. Nothing here is simulated from scratch, so until those exist there is nothing honest to run.
          </p>
        )}
      </section>
    </main>
  );
}
