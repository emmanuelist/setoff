"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAddress, type Address } from "viem";
import { SETOFF_ADDRESS, publicClient } from "@/lib/chain";
import { formatUsdc } from "@/lib/money";
import { setoffAbi } from "@/lib/setoff-abi";
import { TxStatus } from "./TxStatus";
import { ConnectKeys } from "./wallet/ConnectKeys";
import { useSetoffTx } from "./wallet/useSetoffTx";
import { useWallet } from "./wallet/WalletProvider";

export type DebtView = { id: string; creditor: Address; debtor: Address; currency: string; state: "proposed" | "accepted" | "paid" | "cancelled" | "netted"; quoteDue: string | null; cycleId: number };

export function DebtActions({ debt }: { debt: DebtView }) {
  const { account } = useWallet();
  const tx = useSetoffTx();
  const id = BigInt(debt.id);
  const me = account ? getAddress(account) : null;
  const role = me === getAddress(debt.debtor) ? "debtor" : me === getAddress(debt.creditor) ? "creditor" : null;
  // Keyed to the account it was read for, so a reading for another account can never show.
  const [reading, setReading] = useState<{ who: Address; value: bigint } | null>(null);
  const owed = me && role === "creditor" && reading?.who === me ? reading.value : null;
  const [done, setDone] = useState("Done");
  const act = (label: string, fn: "accept" | "cancel" | "pay" | "withdraw", args: readonly unknown[], value?: bigint) => {
    setDone(label);
    return tx.run(fn, args, value);
  };

  useEffect(() => {
    if (!me || role !== "creditor") return;
    let live = true;
    publicClient.readContract({ address: SETOFF_ADDRESS, abi: setoffAbi, functionName: "withdrawable", args: [me] })
      .then((value) => { if (live) setReading({ who: me, value }); })
      .catch(() => {});
    return () => { live = false; };
  }, [me, role, tx.state.phase, debt.state]);

  /** Re-read the quote at the moment of paying, so a moved fixing can't surprise the debtor. */
  async function pay() {
    const [due] = await publicClient.readContract({ address: SETOFF_ADDRESS, abi: setoffAbi, functionName: "quote", args: [id] }).catch(() => [null] as const);
    // A null quote means the contract refused the fixing; the simulation names the refusal.
    await act("Paid at the fixing", "pay", [id], due ?? 0n);
  }

  let body: React.ReactNode;
  if (debt.state === "netted") {
    body = <p className="text-body leading-[1.55] text-graphite">Netted in <Link href={`/cycles/${debt.cycleId}`} className="fig text-ink">cycle {debt.cycleId}</Link>. Only the net moved; payouts are withdrawn from the wallet menu. Nothing is left to do here.</p>;
  } else if (debt.state === "cancelled") {
    body = <p className="text-body leading-[1.55] text-graphite">Cancelled by its creditor before it was endorsed. Nothing is owed.</p>;
  } else if (!me && debt.state === "paid") {
    body = <p className="text-body leading-[1.55] text-graphite">Paid at the fixing. The creditor withdraws the payout from the wallet menu.</p>;
  } else if (!me && debt.cycleId !== 0 && debt.state === "accepted") {
    body = <p className="text-body leading-[1.55] text-graphite">This debt clears in <Link href={`/cycles/${debt.cycleId}`} className="fig text-ink">cycle {debt.cycleId}</Link>, not on its own. Net debtors fund their net there.</p>;
  } else if (!me) {
    body = <ConnectKeys why="Connect the debtor's wallet to endorse or pay this debt, or the creditor's to cancel or withdraw." />;
  } else if (!role) {
    body = <p className="text-body leading-[1.55] text-graphite">This wallet isn&apos;t a party to this debt. Only its debtor can endorse or pay it; only its creditor can cancel it.</p>;
  } else if (debt.cycleId !== 0 && debt.state === "proposed" && role === "debtor") {
    body = (
      <>
        <p className="text-body leading-[1.55]">You&apos;re the debtor. Endorsing joins this debt to <Link href={`/cycles/${debt.cycleId}`} className="fig">cycle {debt.cycleId}</Link>: it clears there at the cutoff, against everything else in the cycle, and you pay only your net.</p>
        <button className="key key-sign w-full sm:w-auto" onClick={() => act("Endorsed", "accept", [id])} disabled={tx.busy}>Endorse into cycle {debt.cycleId}</button>
      </>
    );
  } else if (debt.cycleId !== 0 && debt.state === "accepted") {
    body = <p className="text-body leading-[1.55] text-graphite">This debt clears in <Link href={`/cycles/${debt.cycleId}`} className="fig text-ink">cycle {debt.cycleId}</Link>, not on its own. Net debtors fund their net there; if anyone doesn&apos;t, the cycle is voided and this debt comes back here to be paid directly.</p>;
  } else if (debt.state === "proposed" && role === "debtor") {
    body = (
      <>
        <p className="text-body leading-[1.55]">You&apos;re the debtor. Endorsing says you owe this, in {debt.currency}. You&apos;ll pay at the fixing on the day you pay.</p>
        <button className="key key-sign w-full sm:w-auto" onClick={() => act("Endorsed", "accept", [id])} disabled={tx.busy}>Endorse this debt</button>
      </>
    );
  } else if (debt.state === "proposed" && role === "creditor") {
    body = (
      <>
        <p className="text-body leading-[1.55]">Waiting for the debtor to endorse it. Until then you can withdraw the proposal.</p>
        <button className="key key-sign w-full sm:w-auto" onClick={() => act("Cancelled", "cancel", [id])} disabled={tx.busy}>Cancel this debt</button>
      </>
    );
  } else if (debt.state === "accepted" && role === "debtor") {
    body = (
      <>
        <p className="text-body leading-[1.55]">Pay in native USDC at today&apos;s fixing, re-read the moment you sign. The contract refuses a stale rate, and records the rate it used.</p>
        <button className="key key-sign w-full sm:w-auto" onClick={pay} disabled={tx.busy}>
          Pay{debt.quoteDue ? <> <span className="fig">{formatUsdc(BigInt(debt.quoteDue), 4)} USDC</span></> : " at the fixing"}
        </button>
      </>
    );
  } else if (debt.state === "accepted" && role === "creditor") {
    body = <p className="text-body leading-[1.55] text-graphite">Endorsed. Waiting for the debtor to pay at the fixing.</p>;
  } else if (debt.state === "paid" && role === "creditor" && owed === null) {
    body = <p className="text-body leading-[1.55] text-graphite">Checking your payout…</p>;
  } else if (debt.state === "paid" && role === "creditor") {
    body = owed && owed > 0n ? (
      <>
        <p className="text-body leading-[1.55]">Paid. Your payout is waiting; withdraw it whenever you like.</p>
        <button className="key key-sign w-full sm:w-auto" onClick={() => act("Withdrawn", "withdraw", [])} disabled={tx.busy}>Withdraw <span className="fig">{formatUsdc(owed, 4)} USDC</span></button>
      </>
    ) : <p className="text-body leading-[1.55] text-graphite">Paid, and your payout has been withdrawn.</p>;
  } else if (debt.state === "paid") {
    body = <p className="text-body leading-[1.55] text-graphite">Paid at the fixing. Nothing left to do.</p>;
  } else {
    body = <p className="text-body leading-[1.55] text-graphite">Cancelled. Nothing is owed.</p>;
  }

  return (
    <div className="grid justify-items-start gap-4">
      {role && <p className="legend text-ink">You are the {role}</p>}
      {body}
      <TxStatus state={tx.state} doneLabel={done} />
    </div>
  );
}
