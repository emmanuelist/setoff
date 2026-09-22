"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronDown, Wallet } from "lucide-react";
import { SETOFF_ADDRESS, addressUrl, publicClient } from "@/lib/chain";
import { short } from "@/lib/format";
import { formatUsdc } from "@/lib/money";
import { setoffAbi } from "@/lib/setoff-abi";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { TxStatus } from "../TxStatus";
import { useSetoffTx } from "./useSetoffTx";
import { useWallet } from "./WalletProvider";

export function WalletMenu() {
  const { wallets, account, onArc, connecting, error, connect, disconnect, ensureArc } = useWallet();
  const tx = useSetoffTx();
  const [open, setOpen] = useState(false);
  // Keyed to the account it was read for, so a reading for another account can never show.
  const [reading, setReading] = useState<{ who: string; value: bigint } | null>(null);
  const owed = account && reading?.who === account ? reading.value : null;

  // What the contract owes this account, read live, and again after any write.
  useEffect(() => {
    if (!account) return;
    let live = true;
    publicClient.readContract({ address: SETOFF_ADDRESS, abi: setoffAbi, functionName: "withdrawable", args: [account] })
      .then((value) => { if (live) setReading({ who: account, value }); })
      .catch(() => {});
    return () => { live = false; };
  }, [account, tx.state.phase]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="key key-sm h-10 gap-2" aria-haspopup="dialog">
          <Wallet aria-hidden="true" />
          {account ? (
            <>
              {!onArc && <span className="legend text-ink">Wrong network</span>}
              <span className="fig text-small">{short(account)}</span>
              {owed != null && owed > 0n && <span className="border-l border-rule pl-2 text-caption text-graphite"><span className="fig text-ink">{formatUsdc(owed, 2)}</span> to withdraw</span>}
            </>
          ) : (
            <span>{connecting ? "Connecting…" : "Connect wallet"}</span>
          )}
          <ChevronDown className="text-graphite" aria-hidden="true" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={10} className="plate w-[min(340px,calc(100vw-24px))] gap-4 rounded-plate bg-plate p-5 text-small ring-0" aria-label="Wallet">
        {!account ? (
          <>
            <p className="legend text-ink">Connect a wallet on Arc</p>
            {wallets.length === 0 ? (
              <p className="leading-[1.55] text-graphite">No browser wallet found. Install one such as Rabby or MetaMask, then reload.</p>
            ) : (
              <ul className="well grid gap-1.5 p-1.5">
                {wallets.map((w) => (
                  <li key={w.info.uuid}>
                    <button className="key w-full justify-start" onClick={() => connect(w).then(() => setOpen(false))} disabled={connecting}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- the wallet supplies its own data-URI icon */}
                      <img src={w.info.icon} alt="" width={22} height={22} />
                      <span>{w.info.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {error && <p className="leading-[1.5] text-ink" role="alert">{error}</p>}
          </>
        ) : (
          <>
            <a href={addressUrl(account)} target="_blank" rel="noreferrer" className="fig inline-flex w-fit items-center gap-1 text-body font-medium">
              {short(account)}<ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
            {!onArc && (
              <div className="well grid justify-items-start gap-3 p-3.5">
                <span className="leading-[1.5] text-graphite">This wallet is on another network. Setoff runs on Arc mainnet.</span>
                <button className="key key-sm" onClick={() => ensureArc().catch(() => {})}>Switch to Arc</button>
              </div>
            )}
            <div className="well grid gap-1 px-3.5 py-3">
              <span className="legend">Withdrawable</span>
              <span className="fig text-figure-m">{owed == null ? "—" : `${formatUsdc(owed, 4)} USDC`}</span>
            </div>
            {owed != null && owed > 0n && (
              <button className="key key-sign" onClick={() => tx.run("withdraw", [])} disabled={tx.busy}>
                Withdraw <span className="fig">{formatUsdc(owed, 4)} USDC</span>
              </button>
            )}
            <TxStatus state={tx.state} doneLabel="Withdrawn" />
            <button className="link w-fit text-small text-graphite" onClick={() => { disconnect(); setOpen(false); }}>Disconnect</button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
