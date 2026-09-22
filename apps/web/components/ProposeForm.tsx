"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { decodeEventLog, getAddress, isAddress, stringToHex, type Address } from "viem";
import { SETOFF_ADDRESS } from "@/lib/chain";
import { age } from "@/lib/format";
import { CURRENCIES, encodeCurrency, formatUsdc, parseAmount, toUsdc, type Currency } from "@/lib/money";
import { setoffAbi } from "@/lib/setoff-abi";
import { TxStatus } from "./TxStatus";
import { useSetoffTx } from "./wallet/useSetoffTx";
import { useWallet } from "./wallet/WalletProvider";
import s from "./ProposeForm.module.css";

export type LiveFixing = { currency: string; answer: string; decimals: number; updatedAt: number } | { currency: string; refused: true };

export function ProposeForm({ fixings, now }: { fixings: LiveFixing[]; now: number }) {
  const { account } = useWallet();
  const tx = useSetoffTx();
  const router = useRouter();
  const [debtor, setDebtor] = useState("");
  const [currency, setCurrency] = useState<Currency>("MXN");
  const [amountText, setAmountText] = useState("");
  const [ref, setRef] = useState("");
  const [touched, setTouched] = useState(false);

  const amount = parseAmount(amountText);
  const fixing = fixings.find((f) => f.currency === currency);
  const refBytes = new TextEncoder().encode(ref).length;

  const problems = useMemo(() => {
    const p: Partial<Record<"debtor" | "amount" | "ref", string>> = {};
    if (!isAddress(debtor)) p.debtor = "Enter the debtor's Arc address (0x…).";
    else if (account && getAddress(debtor) === getAddress(account)) p.debtor = "The debtor can't be you.";
    if (amount === null) p.amount = "Enter an amount, with up to six decimals.";
    else if (amount === 0n) p.amount = "Enter an amount above zero.";
    if (refBytes > 32 || /[^\x20-\x7e]/.test(ref)) p.ref = "Up to 32 plain characters.";
    return p;
  }, [debtor, account, amount, ref, refBytes]);
  const valid = Object.keys(problems).length === 0;

  const preview = amount && amount > 0n && fixing && !("refused" in fixing)
    ? toUsdc(amount, currency, BigInt(fixing.answer), fixing.decimals)
    : null;

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched(true);
    if (!valid || amount === null) return;
    const receipt = await tx.run("propose", [getAddress(debtor) as Address, encodeCurrency(currency), amount, stringToHex(ref, { size: 32 })]);
    if (!receipt) return;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== SETOFF_ADDRESS.toLowerCase()) continue;
      try {
        const ev = decodeEventLog({ abi: setoffAbi, data: log.data, topics: log.topics });
        if (ev.eventName === "Proposed") { router.push(`/debts/${ev.args.id}`); return; }
      } catch { /* not a Setoff event */ }
    }
  }

  const show = (k: "debtor" | "amount" | "ref") => (touched ? problems[k] : undefined);

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <label className={s.field}>
        <span className={s.label}>Debtor</span>
        <input className={`fig ${s.input}`} value={debtor} onChange={(e) => setDebtor(e.target.value.trim())} placeholder="0x…" spellCheck={false} autoComplete="off" aria-invalid={!!show("debtor")} aria-describedby="debtor-help" />
        <span id="debtor-help" className={show("debtor") ? s.error : s.help}>{show("debtor") ?? "Who owes you. They endorse the debt from this address."}</span>
      </label>

      <fieldset className={s.field}>
        <legend className={s.label}>Currency</legend>
        <div className={s.currencies} role="radiogroup">
          {CURRENCIES.map((c) => (
            <label key={c} className={`${s.ccy} ccy-${c.toLowerCase()} ${c === currency ? s.on : ""}`}>
              <input type="radio" name="currency" value={c} checked={c === currency} onChange={() => setCurrency(c)} />
              <span>{c}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className={s.field}>
        <span className={s.label}>Amount in {currency}</span>
        <input className={`fig ${s.input} ${s.amount}`} value={amountText} onChange={(e) => setAmountText(e.target.value)} placeholder="0.00" inputMode="decimal" autoComplete="off" aria-invalid={!!show("amount")} aria-describedby="amount-help" />
        <span id="amount-help" className={show("amount") ? s.error : s.help}>
          {show("amount") ?? (
            fixing && "refused" in fixing ? <>The {currency} fixing is stale right now, so this couldn&apos;t be paid until the feed updates.</>
            : preview !== null && fixing && !("refused" in fixing) ? <>≈ <span className="fig">{formatUsdc(preview, 4)} USDC</span> at today&apos;s fixing ({currency === "USD" ? "par" : `${age(now - fixing.updatedAt)} old`}). The debtor pays at the fixing on the day they pay.</>
            : "Priced in the currency you invoiced in. Nothing is converted until it's paid."
          )}
        </span>
      </label>

      <label className={s.field}>
        <span className={s.label}>Reference <span className={s.optional}>optional</span></span>
        <input className={`fig ${s.input}`} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="INV-0002" maxLength={32} autoComplete="off" aria-invalid={!!show("ref")} />
        {show("ref") && <span className={s.error}>{show("ref")}</span>}
      </label>

      <div className={s.submit}>
        <button className="btn" type="submit" disabled={tx.busy}>Propose this debt</button>
        <p className={s.help}>
          {account ? "You sign as the creditor. It counts for nothing until the debtor endorses it." : "Connect your wallet (top right) first — you sign as the creditor."}
        </p>
      </div>
      <TxStatus state={tx.state} tone="statement" doneLabel="Proposed" />
    </form>
  );
}
