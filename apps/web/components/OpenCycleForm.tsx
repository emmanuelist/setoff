"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { decodeEventLog } from "viem";
import { SETOFF_ADDRESS } from "@/lib/chain";
import { stamp } from "@/lib/format";
import { useChainNow } from "@/lib/head";
import { setoffAbi } from "@/lib/setoff-abi";
import { TxStatus } from "./TxStatus";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { useSetoffTx } from "./wallet/useSetoffTx";
import { useWallet } from "./wallet/WalletProvider";

const LEADS = [{ v: 15 * 60, label: "15 min" }, { v: 60 * 60, label: "1 hour" }, { v: 24 * 3600, label: "1 day" }, { v: 7 * 24 * 3600, label: "1 week" }];
const WINDOWS = [{ v: 10 * 60, label: "10 min" }, { v: 60 * 60, label: "1 hour" }, { v: 24 * 3600, label: "1 day" }, { v: 3 * 24 * 3600, label: "3 days" }];

const choice = "code h-11 min-w-0 rounded-key border-0 bg-[linear-gradient(180deg,var(--enamel),var(--key))] px-2 text-small tracking-[0.04em] text-ink shadow-[inset_0_1px_0_#fff,0_0_0_1px_rgb(29_27_24/0.16),0_2px_0_var(--key-skirt)] hover:bg-[linear-gradient(180deg,var(--enamel),var(--key))] data-[state=on]:translate-y-[2px] data-[state=on]:bg-well data-[state=on]:shadow-[inset_0_2px_4px_rgb(29_27_24/0.2),0_0_0_1.5px_var(--ink)]";

/** Anyone opens a cycle: when enrolment closes, and how long net debtors have to fund. */
export function OpenCycleForm({ readAt }: { readAt: number }) {
  const { account } = useWallet();
  const tx = useSetoffTx();
  const router = useRouter();
  const now = useChainNow(readAt);
  const [lead, setLead] = useState(LEADS[0].v);
  const [window_, setWindow] = useState(WINDOWS[1].v);
  // One anchor for what is shown and what is signed: chain time plus 30 s for the signature.
  const at = now + 30;
  const cutoff = at + lead;
  const deadline = cutoff + window_;

  async function open() {
    const receipt = await tx.run("openCycle", [BigInt(cutoff), BigInt(deadline)]);
    if (!receipt) return;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== SETOFF_ADDRESS.toLowerCase()) continue;
      try {
        const ev = decodeEventLog({ abi: setoffAbi, data: log.data, topics: log.topics });
        if (ev.eventName === "CycleOpened") { router.push(`/cycles/${ev.args.cycleId}`); return; }
      } catch { /* not a Setoff event */ }
    }
  }

  return (
    <div className="grid gap-7">
      <div className="grid gap-2" role="group" aria-labelledby="lead-label">
        <span id="lead-label" className="legend text-ink">Enrolment closes in</span>
        <ToggleGroup type="single" value={String(lead)} onValueChange={(v) => { if (v) setLead(Number(v)); }} spacing={6} className="grid w-full grid-cols-4" aria-label="Enrolment closes in">
          {LEADS.map((l) => <ToggleGroupItem key={l.v} value={String(l.v)} className={choice}>{l.label}</ToggleGroupItem>)}
        </ToggleGroup>
        <span className="text-small text-graphite">Until then, creditors bill into the cycle and debtors endorse. At the cutoff the list is closed.</span>
      </div>

      <div className="grid gap-2" role="group" aria-labelledby="window-label">
        <span id="window-label" className="legend text-ink">Funding window</span>
        <ToggleGroup type="single" value={String(window_)} onValueChange={(v) => { if (v) setWindow(Number(v)); }} spacing={6} className="grid w-full grid-cols-4" aria-label="Funding window">
          {WINDOWS.map((w) => <ToggleGroupItem key={w.v} value={String(w.v)} className={choice}>{w.label}</ToggleGroupItem>)}
        </ToggleGroup>
        <span className="text-small text-graphite">Anyone can fix the cycle from the cutoff until the deadline. If anyone hasn&apos;t funded by then, the cycle is voided and every deposit comes back.</span>
      </div>

      <dl className="well grid gap-2 px-4 py-3.5 text-small sm:grid-cols-2">
        <div className="grid gap-0.5"><dt className="legend">Cutoff</dt><dd className="fig">{stamp(cutoff, now)}</dd><dd className="text-caption text-graphite">about {LEADS.find((l) => l.v === lead)?.label} after you sign</dd></div>
        <div className="grid gap-0.5"><dt className="legend">Funding deadline</dt><dd className="fig">{stamp(deadline, now)}</dd><dd className="text-caption text-graphite">{WINDOWS.find((w) => w.v === window_)?.label} after the cutoff</dd></div>
      </dl>

      <div className="grid justify-items-start gap-3 border-t border-rule pt-6">
        <button className="key key-sign" onClick={open} disabled={tx.busy}>Open this cycle</button>
        <p className="text-small leading-[1.5] text-graphite">
          {account ? "Opening gives you no power over the cycle: anyone can fix, settle or void it when its time comes." : "Connect your wallet (top right) first. Opening gives you no power over the cycle."}
        </p>
        <TxStatus state={tx.state} doneLabel="Opened" />
      </div>
    </div>
  );
}
