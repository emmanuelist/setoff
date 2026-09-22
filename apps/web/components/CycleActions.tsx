"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { getAddress, type Address } from "viem";
import { useChainNow } from "@/lib/head";
import { formatUsdc } from "@/lib/money";
import { TxStatus } from "./TxStatus";
import { useSetoffTx } from "./wallet/useSetoffTx";
import { useWallet } from "./wallet/WalletProvider";

export type CycleActionView = {
  id: string;
  state: "open" | "fixed" | "settled" | "void";
  cutoff: number;
  deadline: number;
  debtors: number;
  funded: number;
  hasDebts: boolean;
  positions: { party: Address; net: string; funded: boolean }[];
};

const text = "text-[14px] leading-[1.55]";

/**
 * The act the cycle is waiting for, offered to whoever may make it, at the moment the contract
 * will accept it. Fixing, settling and voiding are open to anyone; funding is each net debtor's.
 */
export function CycleActions({ cycle, readAt }: { cycle: CycleActionView; readAt: number }) {
  const { account } = useWallet();
  const tx = useSetoffTx();
  const now = useChainNow(readAt);
  const [done, setDone] = useState("Done");
  const id = BigInt(cycle.id);
  const me = account ? getAddress(account) : null;
  const mine = me ? cycle.positions.find((p) => getAddress(p.party) === me) : undefined;
  const myNet = mine ? BigInt(mine.net) : 0n;
  const act = (label: string, fn: "fixCycle" | "fund" | "settle" | "voidCycle", value?: bigint) => {
    setDone(label);
    return tx.run(fn, [id], value);
  };

  const fullyFunded = cycle.state === "fixed" && cycle.funded === cycle.debtors;
  let body: React.ReactNode;

  if (cycle.state === "settled") {
    body = <p className={`${text} text-graphite`}>Settled. Every net creditor&apos;s payout is waiting as a withdrawal, in the wallet menu.</p>;
  } else if (cycle.state === "void") {
    body = <p className={`${text} text-graphite`}>Voided. Every deposit is withdrawable by whoever made it, and every debt is back on the direct path, still endorsed.</p>;
  } else if (cycle.state === "open" && now < cycle.cutoff) {
    body = (
      <>
        <p className={text}>Open for debts until the cutoff. A creditor bills into this cycle, and the debt joins it when its debtor endorses.</p>
        <Link href={`/debts/new?cycle=${cycle.id}`} className="key key-ink">Record a debt into this cycle <ArrowRight aria-hidden="true" /></Link>
      </>
    );
  } else if (cycle.state === "open" && now < cycle.deadline && cycle.hasDebts) {
    body = (
      <>
        <p className={text}>The cutoff has passed. Anyone can fix the cycle now: one Chainlink read per currency, and every party&apos;s net stored with it.</p>
        <button className="key key-sign" onClick={() => act("Fixed", "fixCycle")} disabled={tx.busy}>Fix the cycle</button>
      </>
    );
  } else if (cycle.state === "fixed" && fullyFunded) {
    body = (
      <>
        <p className={text}>Every net debtor has funded. Anyone can settle: every net creditor is credited and every debt netted, in one transaction.</p>
        <button className="key key-sign" onClick={() => act("Settled", "settle")} disabled={tx.busy}>Settle the cycle</button>
      </>
    );
  } else if (cycle.state === "fixed" && now < cycle.deadline && mine && myNet < 0n && !mine.funded) {
    body = (
      <>
        <p className={text}>You&apos;re a net debtor. Fund your net once, in native USDC. If anyone else doesn&apos;t fund by the deadline, it comes back to you in full.</p>
        <button className="key key-sign" onClick={() => act("Funded", "fund", -myNet)} disabled={tx.busy}>Fund <span className="fig">{formatUsdc(-myNet, 4)} USDC</span></button>
      </>
    );
  } else if (cycle.state === "fixed" && now < cycle.deadline) {
    body = (
      <p className={`${text} text-graphite`}>
        {cycle.funded} of {cycle.debtors} net {cycle.debtors === 1 ? "debtor has" : "debtors have"} funded.
        {mine ? (myNet < 0n ? " You have funded yours." : " You owe no net here; there is nothing for you to fund.") : " Connect a net debtor's wallet to fund its net."}
      </p>
    );
  } else if (now >= cycle.deadline) {
    body = (
      <>
        <p className={text}>The funding deadline has passed{cycle.state === "fixed" ? " with someone unfunded" : " without a fixing"}. Anyone can void the cycle: every deposit becomes withdrawable, and every debt returns to the direct path.</p>
        <button className="key key-sign" onClick={() => act("Voided", "voidCycle")} disabled={tx.busy}>Void the cycle</button>
      </>
    );
  } else {
    body = <p className={`${text} text-graphite`}>No debt joined this cycle before its cutoff, so there is nothing to fix. It can be voided after its deadline.</p>;
  }

  return (
    <div className="grid justify-items-start gap-4">
      {body}
      <TxStatus state={tx.state} doneLabel={done} />
    </div>
  );
}
