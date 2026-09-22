"use client";

import { useEffect, useState } from "react";
import { getAddress, type Address } from "viem";
import { SETOFF_ADDRESS, publicClient } from "@/lib/chain";
import { formatUsdc } from "@/lib/money";
import { setoffAbi } from "@/lib/setoff-abi";
import { TxStatus } from "./TxStatus";
import { useSetoffTx } from "./wallet/useSetoffTx";
import { useWallet } from "./wallet/WalletProvider";
import s from "./DebtActions.module.css";

export type DebtView = { id: string; creditor: Address; debtor: Address; currency: string; state: "proposed" | "accepted" | "paid" | "cancelled"; quoteDue: string | null };

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
  if (!me) {
    body = <p className={s.note}>Connect the debtor&apos;s wallet to endorse or pay this debt, or the creditor&apos;s to cancel or withdraw.</p>;
  } else if (!role) {
    body = <p className={s.note}>This wallet isn&apos;t a party to this debt. Only its debtor can endorse or pay it; only its creditor can cancel it.</p>;
  } else if (debt.state === "proposed" && role === "debtor") {
    body = (
      <>
        <p className={s.lead}>You&apos;re the debtor. Endorsing says you owe this, in {debt.currency}. You&apos;ll pay at the fixing on the day you pay.</p>
        <button className="btn" onClick={() => act("Endorsed", "accept", [id])} disabled={tx.busy}>Endorse this debt</button>
      </>
    );
  } else if (debt.state === "proposed" && role === "creditor") {
    body = (
      <>
        <p className={s.lead}>Waiting for the debtor to endorse it. Until then you can withdraw the proposal.</p>
        <button className="btn" onClick={() => act("Cancelled", "cancel", [id])} disabled={tx.busy}>Cancel this debt</button>
      </>
    );
  } else if (debt.state === "accepted" && role === "debtor") {
    body = (
      <>
        <p className={s.lead}>Pay in native USDC at the live fixing. The contract refuses a stale rate, and records the rate it used.</p>
        <button className="btn" onClick={pay} disabled={tx.busy}>
          Pay{debt.quoteDue ? <> <span className="fig">{formatUsdc(BigInt(debt.quoteDue), 4)} USDC</span></> : " at the fixing"}
        </button>
      </>
    );
  } else if (debt.state === "accepted" && role === "creditor") {
    body = <p className={s.note}>Endorsed. Waiting for the debtor to pay at the fixing.</p>;
  } else if (debt.state === "paid" && role === "creditor" && owed === null) {
    body = <p className={s.note}>Checking your payout…</p>;
  } else if (debt.state === "paid" && role === "creditor") {
    body = owed && owed > 0n ? (
      <>
        <p className={s.lead}>Paid. Your payout is waiting; withdraw it whenever you like.</p>
        <button className="btn" onClick={() => act("Withdrawn", "withdraw", [])} disabled={tx.busy}>Withdraw <span className="fig">{formatUsdc(owed, 4)} USDC</span></button>
      </>
    ) : <p className={s.note}>Paid, and your payout has been withdrawn.</p>;
  } else if (debt.state === "paid") {
    body = <p className={s.note}>Paid at the fixing. Nothing left to do.</p>;
  } else {
    body = <p className={s.note}>Cancelled. Nothing is owed.</p>;
  }

  return (
    <div className={s.panel}>
      {role && <p className={s.role}><span className="wide">You are the {role}</span></p>}
      {body}
      <TxStatus state={tx.state} tone="statement" doneLabel={done} />
    </div>
  );
}
