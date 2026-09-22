"use client";

import { useEffect, useRef, useState } from "react";
import { SETOFF_ADDRESS, addressUrl, publicClient } from "@/lib/chain";
import { short } from "@/lib/format";
import { formatUsdc } from "@/lib/money";
import { setoffAbi } from "@/lib/setoff-abi";
import { TxStatus } from "../TxStatus";
import { useSetoffTx } from "./useSetoffTx";
import { useWallet } from "./WalletProvider";
import s from "./WalletMenu.module.css";

export function WalletMenu() {
  const { wallets, account, onArc, connecting, error, connect, disconnect, ensureArc } = useWallet();
  const tx = useSetoffTx();
  const [open, setOpen] = useState(false);
  // Keyed to the account it was read for, so a reading for another account can never show.
  const [reading, setReading] = useState<{ who: string; value: bigint } | null>(null);
  const owed = account && reading?.who === account ? reading.value : null;
  const root = useRef<HTMLDivElement>(null);

  // What the contract owes this account, read live, and again after any write.
  useEffect(() => {
    if (!account) return;
    let live = true;
    publicClient.readContract({ address: SETOFF_ADDRESS, abi: setoffAbi, functionName: "withdrawable", args: [account] })
      .then((value) => { if (live) setReading({ who: account, value }); })
      .catch(() => {});
    return () => { live = false; };
  }, [account, tx.state.phase]);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className={s.root} ref={root}>
      <button className={s.chip} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog">
        {account ? (
          <>
            {!onArc && <span className={s.warn}>Wrong network</span>}
            <span className="fig">{short(account)}</span>
            {owed != null && owed > 0n && <span className={s.owed}><span className="fig">{formatUsdc(owed, 2)}</span> to withdraw</span>}
          </>
        ) : (
          <span>{connecting ? "Connecting…" : "Connect wallet"}</span>
        )}
      </button>

      {open && (
        <div className={s.panel} role="dialog" aria-label="Wallet">
          {!account ? (
            <>
              <p className={s.title}>Connect a wallet on Arc</p>
              {wallets.length === 0 ? (
                <p className={s.note}>No browser wallet found. Install one such as Rabby or MetaMask, then reload.</p>
              ) : (
                <ul className={s.list}>
                  {wallets.map((w) => (
                    <li key={w.info.uuid}>
                      <button className={s.wallet} onClick={() => connect(w).then(() => setOpen(false))} disabled={connecting}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- the wallet supplies its own data-URI icon */}
                        <img src={w.info.icon} alt="" width={22} height={22} />
                        <span>{w.info.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {error && <p className={s.err} role="alert">{error}</p>}
            </>
          ) : (
            <>
              <p className={s.title}>
                <a href={addressUrl(account)} target="_blank" rel="noreferrer" className="fig">{short(account)} ↗</a>
              </p>
              {!onArc && (
                <div className={s.row}>
                  <span className={s.note}>This wallet is on another network. Setoff runs on Arc mainnet.</span>
                  <button className="btn" onClick={() => ensureArc().catch(() => {})}>Switch to Arc</button>
                </div>
              )}
              <div className={s.row}>
                <span className={s.label}>Withdrawable</span>
                <span className={`fig ${s.big}`}>{owed == null ? "—" : `${formatUsdc(owed, 4)} USDC`}</span>
              </div>
              {owed != null && owed > 0n && (
                <button className="btn" onClick={() => tx.run("withdraw", [])} disabled={tx.busy}>
                  Withdraw <span className="fig">{formatUsdc(owed, 4)} USDC</span>
                </button>
              )}
              <TxStatus state={tx.state} doneLabel="Withdrawn" />
              <button className={`link ${s.disconnect}`} onClick={() => { disconnect(); setOpen(false); }}>Disconnect</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
