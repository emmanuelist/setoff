"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { getAddress, type Address } from "viem";
import { SETOFF_ADDRESS, publicClient } from "@/lib/chain";
import { clock } from "@/lib/format";
import { formatUsdc } from "@/lib/money";
import { setoffAbi } from "@/lib/setoff-abi";
import { ConnectKeys } from "./wallet/ConnectKeys";
import { useWallet } from "./wallet/WalletProvider";

export type PositionDebt = { id: string; creditor: Address; debtor: Address; state: string; cycleId: number; usdc: string | null };
export type PositionCycle = { id: string; state: "open" | "fixed"; fundingDeadline: number; positions: { party: Address; net: string; funded: boolean }[]; basis: "fixing" | "preview" };

/** One line of the position: what it is, what it comes to, and where to act on it. */
function Row({ label, value, href, note }: { label: string; value: string; href?: string; note?: string }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-rule py-2.5 last:border-0">
      <span className="text-body">{href ? <Link href={href} className="inline-flex items-center gap-1">{label}<ArrowRight className="size-3.5" aria-hidden="true" /></Link> : label}</span>
      <span className="fig text-right text-body">{value}</span>
      {note && <span className="col-span-2 text-caption text-graphite">{note}</span>}
    </li>
  );
}

/**
 * What the connected wallet owes and is owed, net, across every open debt and cycle: the one
 * question the book-closer came with. Every figure comes from the page's live reads, and the
 * withdrawable balance from the contract.
 */
export function YourPosition({ debts, cycles }: { debts: PositionDebt[]; cycles: PositionCycle[] }) {
  const { account } = useWallet();
  const me = account ? getAddress(account) : null;
  const [reading, setReading] = useState<{ who: string; value: bigint } | null>(null);
  const withdrawable = me && reading?.who === me ? reading.value : null;

  useEffect(() => {
    if (!me) return;
    let live = true;
    publicClient.readContract({ address: SETOFF_ADDRESS, abi: setoffAbi, functionName: "withdrawable", args: [me] })
      .then((value) => { if (live) setReading({ who: me, value }); })
      .catch(() => {});
    return () => { live = false; };
  }, [me]);

  if (!me) {
    return <ConnectKeys why="Connect a wallet to see what you owe and are owed, net, across every debt and cycle on the contract." />;
  }

  const is = (a: Address) => getAddress(a) === me;
  const direct = debts.filter((d) => d.cycleId === 0 && d.state === "accepted");
  const owe = direct.filter((d) => is(d.debtor));
  const owed = direct.filter((d) => is(d.creditor));
  const sum = (ds: PositionDebt[]) => ds.reduce((t, d) => t + (d.usdc ? BigInt(d.usdc) : 0n), 0n);
  const toEndorse = debts.filter((d) => d.state === "proposed" && is(d.debtor));
  const mine = cycles.map((c) => ({ c, p: c.positions.find((n) => is(n.party)) })).filter((x) => x.p);

  const nothing = owe.length + owed.length + toEndorse.length + mine.length === 0 && (withdrawable ?? 0n) === 0n;
  if (nothing) {
    return <p className="text-body leading-[1.55] text-graphite">Nothing is open for this wallet: no endorsed debt it owes or is owed, no cycle it is in, and nothing to withdraw.</p>;
  }

  return (
    <ul className="grid">
      {owe.length > 0 && <Row label={`You owe, directly, on ${owe.length} ${owe.length === 1 ? "debt" : "debts"}`} value={`≈ ${formatUsdc(sum(owe), 4)} USDC`} href={`/debts/${owe[0].id}`} note="At today's fixing; each is priced exactly when you pay it." />}
      {owed.length > 0 && <Row label={`Owed to you, directly, on ${owed.length} ${owed.length === 1 ? "debt" : "debts"}`} value={`≈ ${formatUsdc(sum(owed), 4)} USDC`} href={`/debts/${owed[0].id}`} />}
      {toEndorse.length > 0 && <Row label={`Waiting for your endorsement`} value={`${toEndorse.length}`} href={`/debts/${toEndorse[0].id}`} note="A creditor has billed you; nothing counts until you endorse it." />}
      {mine.map(({ c, p }) => {
        const net = BigInt(p!.net);
        const word = net < 0n ? (p!.funded ? "funded" : "to fund") : net > 0n ? "to receive" : "flat";
        return (
          <Row
            key={c.id}
            label={`Cycle ${c.id}: your net ${word}`}
            value={net === 0n ? "0" : `${net < 0n ? "−" : "+"}${formatUsdc(net < 0n ? -net : net, 4)} USDC`}
            href={`/cycles/${c.id}`}
            note={c.basis === "preview" ? `At today's fixings, if it were fixed now. Funding closes ${clock(c.fundingDeadline)}.` : net < 0n && !p!.funded ? `Fund before ${clock(c.fundingDeadline)}, or the cycle is voided and every deposit comes back.` : undefined}
          />
        );
      })}
      {withdrawable !== null && withdrawable > 0n && <Row label="Waiting for you to withdraw" value={`${formatUsdc(withdrawable, 4)} USDC`} note="Withdraw it from the wallet menu, whenever you like." />}
    </ul>
  );
}
