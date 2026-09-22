"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { decodeEventLog, getAddress, isAddress, stringToHex, type Address } from "viem";
import { SETOFF_ADDRESS } from "@/lib/chain";
import Link from "next/link";
import { age, short, stamp } from "@/lib/format";
import { useChainNow } from "@/lib/head";
import { CURRENCIES, encodeCurrency, formatAmount, formatUsdc, parseAmount, toUsdc, type Currency } from "@/lib/money";
import { setoffAbi } from "@/lib/setoff-abi";
import { Gauge } from "./Gauge";
import { PunchFields } from "./Punch";
import { TxStatus } from "./TxStatus";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { useSetoffTx } from "./wallet/useSetoffTx";
import { useWallet } from "./wallet/WalletProvider";

export type LiveFixing = { currency: string; answer: string; decimals: number; updatedAt: number } | { currency: string; refused: true; updatedAt: number | null };

const DRAFT = "setoff.debt-draft";

type Draft = { debtor?: string; currency?: Currency; amountText?: string; ref?: string };

const readDraft = () => { try { return sessionStorage.getItem(DRAFT); } catch { return null; } };
const listeners = new Set<() => void>();
function subscribeDraft(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function writeDraft(d: Draft) {
  try {
    if (d.debtor || d.amountText || d.ref) sessionStorage.setItem(DRAFT, JSON.stringify(d));
    else sessionStorage.removeItem(DRAFT);
  } catch { /* private mode, or no storage */ }
  listeners.forEach((l) => l());
}
export function clearDraft() { writeDraft({}); }

const clearsKey = "h-11 rounded-key border-0 bg-[linear-gradient(180deg,var(--enamel),var(--key))] px-3.5 text-small font-semibold text-ink shadow-[inset_0_1px_0_#fff,0_0_0_1px_rgb(29_27_24/0.16),0_2px_0_var(--key-skirt)] hover:bg-[linear-gradient(180deg,var(--enamel),var(--key))] data-[state=on]:translate-y-[2px] data-[state=on]:bg-well data-[state=on]:shadow-[inset_0_2px_4px_rgb(29_27_24/0.2),0_0_0_1.5px_var(--ink)] disabled:opacity-45";

const field = "well fig h-12 w-full px-3.5 text-lead outline-none placeholder:text-graphite focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink aria-invalid:shadow-[inset_0_0_0_2px_var(--ink)]";

export function ProposeForm({ fixings, now, maxAge, intro, cycles, initialCycle }: {
  fixings: LiveFixing[];
  now: number;
  maxAge: number;
  intro: ReactNode;
  cycles: { id: string; cutoff: number }[];
  initialCycle: string | null;
}) {
  const { account } = useWallet();
  const tx = useSetoffTx();
  const router = useRouter();
  // The draft lives in this browser's session, read through an external store so the restore
  // needs no setState in an effect and hydration stays honest (server sees no draft).
  const saved = useSyncExternalStore(subscribeDraft, readDraft, () => null);
  const draft = useMemo<Draft>(() => {
    try {
      const d = saved ? (JSON.parse(saved) as Draft) : {};
      return { ...d, currency: d.currency && (CURRENCIES as readonly string[]).includes(d.currency) ? d.currency : undefined };
    } catch { return {}; }
  }, [saved]);
  const [edited, setEdited] = useState<Draft | null>(null);
  const form: Required<Draft> = {
    debtor: edited?.debtor ?? draft.debtor ?? "",
    currency: edited?.currency ?? draft.currency ?? "MXN",
    amountText: edited?.amountText ?? draft.amountText ?? "",
    ref: edited?.ref ?? draft.ref ?? "",
  };
  const { debtor, currency, amountText, ref } = form;
  const change = (patch: Partial<Draft>) => {
    const next = { ...form, ...patch };
    setEdited(next);
    writeDraft(next);
  };
  const setDebtor = (v: string) => change({ debtor: v });
  const setCurrency = (v: Currency) => change({ currency: v });
  const setAmountText = (v: string) => change({ amountText: v });
  const setRef = (v: string) => change({ ref: v });
  const [touched, setTouched] = useState(false);
  const [clears, setClears] = useState<string>(initialCycle ?? "direct");
  const chainNow = useChainNow(now);
  const cycle = clears === "direct" ? null : cycles.find((c) => c.id === clears) ?? null;
  const cycleClosed = cycle !== null && chainNow >= cycle.cutoff;

  const amount = parseAmount(amountText);
  const fixing = fixings.find((f) => f.currency === currency);
  const refBytes = new TextEncoder().encode(ref).length;

  // Left to the compiler to memoize: the fields come from one draft object.
  const problems = (() => {
    const p: Partial<Record<"debtor" | "amount" | "ref", string>> = {};
    if (!isAddress(debtor)) p.debtor = "Enter the debtor's Arc address (0x…).";
    else if (account && getAddress(debtor) === getAddress(account)) p.debtor = "The debtor can't be you.";
    if (amount === null) p.amount = "Enter an amount, with up to six decimals.";
    else if (amount === 0n) p.amount = "Enter an amount above zero.";
    if (refBytes > 32 || /[^\x20-\x7e]/.test(ref)) p.ref = "Up to 32 plain characters.";
    return p;
  })();
  const blocked = cycleClosed;
  const valid = Object.keys(problems).length === 0;

  const live = fixing && !("refused" in fixing) ? fixing : null;
  const preview = amount && amount > 0n && live ? toUsdc(amount, currency, BigInt(live.answer), live.decimals) : null;
  const fixingAge = live ? (currency === "USD" ? null : now - live.updatedAt) : fixing && "refused" in fixing && fixing.updatedAt ? now - fixing.updatedAt : null;

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched(true);
    if (!valid || amount === null || blocked) return;
    const args = [getAddress(debtor) as Address, encodeCurrency(currency), amount, stringToHex(ref, { size: 32 })] as const;
    const receipt = cycle ? await tx.run("proposeInCycle", [BigInt(cycle.id), ...args]) : await tx.run("propose", args);
    if (!receipt) return;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== SETOFF_ADDRESS.toLowerCase()) continue;
      try {
        const ev = decodeEventLog({ abi: setoffAbi, data: log.data, topics: log.topics });
        if (ev.eventName === "Proposed") {
          clearDraft();
          router.push(`/debts/${ev.args.id}`);
          return;
        }
      } catch { /* not a Setoff event */ }
    }
  }

  const show = (k: "debtor" | "amount" | "ref") => (touched ? problems[k] : undefined);
  const help = (k: "debtor" | "amount" | "ref", fallback: ReactNode) => (
    <span id={`${k}-help`} className={`text-small leading-[1.5] ${show(k) ? "font-semibold text-ink" : "text-graphite"}`}>{show(k) ?? fallback}</span>
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
                className={`ccy-${c.toLowerCase()} code h-12 min-w-0 rounded-key border-0 bg-[var(--t)] px-0 text-caption tracking-[0.04em] text-[var(--c)] sm:text-small sm:tracking-[0.08em] shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_0_0_1px_rgb(29_27_24/0.14),0_2px_0_var(--key-skirt),0_6px_10px_-6px_rgb(29_27_24/0.35)] transition-[transform,box-shadow] duration-100 hover:bg-[var(--t)] hover:text-[var(--c)] data-[state=on]:translate-y-[2px] data-[state=on]:bg-[var(--t)] data-[state=on]:shadow-[inset_0_2px_4px_rgb(29_27_24/0.22),0_0_0_1.5px_var(--c)]`}
              >
                {c}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <label className="grid gap-2">
          <span className="legend text-ink">Amount in {currency}</span>
          <input className={`${field} h-16 text-figure-l`} value={amountText} onChange={(e) => setAmountText(e.target.value)} placeholder="0.00" inputMode="decimal" autoComplete="off" aria-invalid={!!show("amount")} aria-describedby="amount-help" />
          {help("amount", "Priced in the currency you invoiced in. Nothing is converted until it's paid.")}
        </label>

        <div className="grid gap-2" role="group" aria-labelledby="clears-label">
          <span id="clears-label" className="legend text-ink">Where it clears</span>
          <ToggleGroup type="single" value={clears} onValueChange={(v) => { if (v) setClears(v); }} spacing={6} className="flex w-full flex-wrap" aria-label="Where it clears">
            <ToggleGroupItem value="direct" className={clearsKey}>Directly</ToggleGroupItem>
            {cycles.map((c) => (
              <ToggleGroupItem key={c.id} value={c.id} disabled={chainNow >= c.cutoff} className={clearsKey}>
                Cycle {c.id} <span className="fig text-label font-normal text-graphite">· cutoff {stamp(c.cutoff, chainNow)}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <span className={`text-small leading-[1.5] ${cycleClosed ? "font-semibold text-ink" : "text-graphite"}`}>
            {cycleClosed ? `Cycle ${cycle?.id} has reached its cutoff; it takes no more debts. Choose another, or clear directly.`
              : cycle ? `It joins cycle ${cycle.id} when the debtor endorses it, and clears there at the cutoff against everything else in the cycle.`
              : <>Paid on its own, at the fixing on the day the debtor pays.{cycles.length === 0 && <> No cycle is open for debts right now; <Link href="/cycles/new">open one</Link>.</>}</>}
          </span>
        </div>

        <label className="grid gap-2">
          <span className="legend text-ink">Reference <span className="text-graphite normal-case tracking-normal [font-variation-settings:'wdth'_100]">optional</span></span>
          <input className={field} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. INV-2026-014" maxLength={32} autoComplete="off" aria-invalid={!!show("ref")} aria-describedby="ref-help" />
          {show("ref") && help("ref", null)}
        </label>

        <div className="grid justify-items-start gap-3 border-t border-rule pt-6">
          <button className="key key-sign" type="submit" disabled={tx.busy || blocked}>{cycle ? `Propose into cycle ${cycle.id}` : "Propose this debt"}</button>
          <p className="text-small leading-[1.5] text-graphite">
            {account ? "You sign as the creditor. It counts for nothing until the debtor endorses it." : "Connect your wallet (top right) first; you sign as the creditor."}
          </p>
          <TxStatus state={tx.state} doneLabel="Proposed" />
        </div>
      </form>

      <aside className="plate col-span-12 flex flex-col gap-5 self-start p-5 sm:p-6 lg:sticky lg:top-[var(--seam)] lg:col-span-5" aria-label="The card you are proposing">
        <h2 className="legend">The card you&apos;re proposing</h2>
        <div className={`stock ccy-${currency.toLowerCase()} grid gap-4 px-6 pt-6`}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-small text-graphite">Numbered when you sign</span>
            <span className="legend">Proposed</span>
          </div>
          <p className="fig flex items-baseline gap-2.5 leading-none">
            <span className="code text-lead">{currency}</span>
            <span className={`text-figure-xl font-medium tracking-[-0.02em] [font-variation-settings:'wdth'_80] ${amount ? "" : "text-faint"}`}>
              {amount ? formatAmount(amount, currency) : currency === "JPY" ? "0" : "0.00"}
            </span>
          </p>
          <p className="text-body text-graphite">
            Owed by {isAddress(debtor) ? <span className="fig text-ink">{short(debtor)}</span> : <span className="text-ink">the debtor</span>} to {account ? <span className="fig text-ink">{short(account)}</span> : <span className="text-ink">you</span>}
            {ref && <> · reference <span className="fig text-ink">{ref}</span></>}
          </p>
          <p className="text-small leading-[1.5]">
            {fixing && "refused" in fixing ? (
              <><span className="print print-late">REFUSED</span> <span className="text-graphite">The {currency} fixing is stale right now, so this couldn&apos;t be paid until the feed updates.</span></>
            ) : preview !== null ? (
              <><span className="fig text-heading">≈ {formatUsdc(preview, 4)} USDC</span> <span className="text-graphite">at today&apos;s fixing. {cycle ? `Priced exactly at cycle ${cycle.id}'s fixing, and set off there.` : "The debtor pays at the fixing on the day they pay."}</span></>
            ) : (
              <span className="text-graphite">Enter an amount to see it at today&apos;s fixing.</span>
            )}
          </p>
          <div className="-mx-6 px-6 pb-2">
            <PunchFields rows={[
              { label: "Proposed", ts: null, who: "" },
              { label: "Endorsed", ts: null, who: "" },
              { label: cycle ? "Netted" : "Paid", ts: null, who: "" },
            ]} />
          </div>
        </div>

        <div className={`ccy-${currency.toLowerCase()} grid grid-cols-[112px_1fr] items-center gap-4`}>
          <Gauge key={currency} currency={currency} ageSec={fixingAge} maxAgeSec={maxAge} refused={!!fixing && "refused" in fixing} />
          <p className="text-small leading-[1.55] text-graphite">
            {currency === "USD" ? "USD settles 1 : 1 in USDC. No feed is read." : fixingAge !== null ? <>Today&apos;s {currency} fixing is <span className="fig text-ink">{age(fixingAge)}</span> old. The contract refuses one older than <span className="fig text-ink">{Math.round(maxAge / 3600)} h</span>.</> : "This feed's answer is invalid right now."}
          </p>
        </div>
      </aside>
    </>
  );
}
