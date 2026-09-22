"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { decodeEventLog, getAddress, isAddress, stringToHex, type Address } from "viem";
import { SETOFF_ADDRESS } from "@/lib/chain";
import { age, short } from "@/lib/format";
import { CURRENCIES, encodeCurrency, formatAmount, formatUsdc, parseAmount, toUsdc, type Currency } from "@/lib/money";
import { setoffAbi } from "@/lib/setoff-abi";
import { Gauge } from "./Gauge";
import { PunchFields } from "./Punch";
import { TxStatus } from "./TxStatus";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { useSetoffTx } from "./wallet/useSetoffTx";
import { useWallet } from "./wallet/WalletProvider";

export type LiveFixing = { currency: string; answer: string; decimals: number; updatedAt: number } | { currency: string; refused: true; updatedAt: number | null };

const field = "well fig h-12 w-full px-3.5 text-[15px] outline-none placeholder:text-graphite focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink aria-invalid:shadow-[inset_0_0_0_2px_var(--ink)]";

export function ProposeForm({ fixings, now, maxAge, intro }: { fixings: LiveFixing[]; now: number; maxAge: number; intro: ReactNode }) {
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

  const live = fixing && !("refused" in fixing) ? fixing : null;
  const preview = amount && amount > 0n && live ? toUsdc(amount, currency, BigInt(live.answer), live.decimals) : null;
  const fixingAge = live ? (currency === "USD" ? null : now - live.updatedAt) : fixing && "refused" in fixing && fixing.updatedAt ? now - fixing.updatedAt : null;

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
  const help = (k: "debtor" | "amount" | "ref", fallback: ReactNode) => (
    <span id={`${k}-help`} className={`text-[12.5px] leading-[1.5] ${show(k) ? "font-semibold text-ink" : "text-graphite"}`}>{show(k) ?? fallback}</span>
  );

  return (
    <>
      <form className="plate col-span-12 grid content-start gap-7 p-6 sm:p-9 lg:col-span-7" onSubmit={submit} noValidate>
        {intro}

        <label className="grid gap-2">
          <span className="legend text-ink">Debtor</span>
          <input className={field} value={debtor} onChange={(e) => setDebtor(e.target.value.trim())} placeholder="0x…" spellCheck={false} autoComplete="off" aria-invalid={!!show("debtor")} aria-describedby="debtor-help" />
          {help("debtor", "Who owes you. They endorse the debt from this address.")}
        </label>

        <div className="grid gap-2" role="group" aria-labelledby="ccy-label">
          <span id="ccy-label" className="legend text-ink">Currency</span>
          <ToggleGroup
            type="single"
            value={currency}
            onValueChange={(v) => { if (v) setCurrency(v as Currency); }}
            spacing={6}
            className="grid w-full grid-cols-5"
            aria-label="Currency"
          >
            {CURRENCIES.map((c) => (
              <ToggleGroupItem
                key={c}
                value={c}
                className={`ccy-${c.toLowerCase()} code h-12 min-w-0 rounded-key border-0 bg-[var(--t)] px-0 text-[12px] tracking-[0.04em] text-[var(--c)] sm:text-[13px] sm:tracking-[0.08em] shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_0_0_1px_rgb(29_27_24/0.14),0_2px_0_var(--key-skirt),0_6px_10px_-6px_rgb(29_27_24/0.35)] transition-[transform,box-shadow] duration-100 hover:bg-[var(--t)] hover:text-[var(--c)] data-[state=on]:translate-y-[2px] data-[state=on]:bg-[var(--t)] data-[state=on]:shadow-[inset_0_2px_4px_rgb(29_27_24/0.22),0_0_0_1.5px_var(--c)]`}
              >
                {c}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <label className="grid gap-2">
          <span className="legend text-ink">Amount in {currency}</span>
          <input className={`${field} h-16 text-[26px]`} value={amountText} onChange={(e) => setAmountText(e.target.value)} placeholder="0.00" inputMode="decimal" autoComplete="off" aria-invalid={!!show("amount")} aria-describedby="amount-help" />
          {help("amount", "Priced in the currency you invoiced in. Nothing is converted until it's paid.")}
        </label>

        <label className="grid gap-2">
          <span className="legend text-ink">Reference <span className="text-graphite normal-case tracking-normal [font-variation-settings:'wdth'_100]">optional</span></span>
          <input className={field} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="INV-0002" maxLength={32} autoComplete="off" aria-invalid={!!show("ref")} aria-describedby="ref-help" />
          {show("ref") && help("ref", null)}
        </label>

        <div className="grid justify-items-start gap-3 border-t border-rule pt-6">
          <button className="key key-sign" type="submit" disabled={tx.busy}>Propose this debt</button>
          <p className="text-[12.5px] leading-[1.5] text-graphite">
            {account ? "You sign as the creditor. It counts for nothing until the debtor endorses it." : "Connect your wallet (top right) first; you sign as the creditor."}
          </p>
          <TxStatus state={tx.state} doneLabel="Proposed" />
        </div>
      </form>

      <aside className="plate col-span-12 flex flex-col gap-5 self-start p-5 sm:p-6 lg:sticky lg:top-[var(--seam)] lg:col-span-5" aria-label="The card you are proposing">
        <h2 className="legend">The card you&apos;re proposing</h2>
        <div className={`stock ccy-${currency.toLowerCase()} grid gap-4 px-6 pt-6`}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12.5px] text-graphite">Numbered when you sign</span>
            <span className="legend">Proposed</span>
          </div>
          <p className="fig flex items-baseline gap-2.5 leading-none">
            <span className="code text-[16px]">{currency}</span>
            <span className={`text-[clamp(38px,4.4vw,56px)] font-medium tracking-[-0.02em] [font-variation-settings:'wdth'_80] ${amount ? "" : "text-faint"}`}>
              {amount ? formatAmount(amount, currency) : currency === "JPY" ? "0" : "0.00"}
            </span>
          </p>
          <p className="text-[13.5px] text-graphite">
            Owed by <span className="fig text-ink">{isAddress(debtor) ? short(debtor) : "the debtor"}</span> to <span className="fig text-ink">{account ? short(account) : "you"}</span>
            {ref && <> · reference <span className="fig text-ink">{ref}</span></>}
          </p>
          <p className="text-[13px] leading-[1.5]">
            {fixing && "refused" in fixing ? (
              <><span className="print print-late">REFUSED</span> <span className="text-graphite">The {currency} fixing is stale right now, so this couldn&apos;t be paid until the feed updates.</span></>
            ) : preview !== null ? (
              <><span className="fig text-[17px]">≈ {formatUsdc(preview, 4)} USDC</span> <span className="text-graphite">at today&apos;s fixing. The debtor pays at the fixing on the day they pay.</span></>
            ) : (
              <span className="text-graphite">Enter an amount to see it at today&apos;s fixing.</span>
            )}
          </p>
          <div className="-mx-6 px-6 pb-2">
            <PunchFields rows={[
              { label: "Proposed", ts: null, who: "" },
              { label: "Endorsed", ts: null, who: "" },
              { label: "Paid", ts: null, who: "" },
            ]} />
          </div>
        </div>

        <div className={`ccy-${currency.toLowerCase()} grid grid-cols-[112px_1fr] items-center gap-4`}>
          <Gauge key={currency} currency={currency} ageSec={fixingAge} maxAgeSec={maxAge} refused={!!fixing && "refused" in fixing} />
          <p className="text-[12.5px] leading-[1.55] text-graphite">
            {currency === "USD" ? "USD settles 1 : 1 in USDC. No feed is read." : fixingAge !== null ? <>Today&apos;s {currency} fixing is <span className="fig text-ink">{age(fixingAge)}</span> old. The contract refuses one older than <span className="fig text-ink">{Math.round(maxAge / 3600)} h</span>.</> : "This feed's answer is invalid right now."}
          </p>
        </div>
      </aside>
    </>
  );
}
