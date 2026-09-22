"use client";

import { useWallet } from "./WalletProvider";

/** The act, where the act is: connect a wallet from inside the plate that needs it. */
export function ConnectKeys({ why }: { why: string }) {
  const { wallets, connect, connecting, error } = useWallet();
  return (
    <div className="grid justify-items-start gap-2.5">
      <p className="max-w-[62ch] text-body leading-[1.55] text-graphite">{why}</p>
      {wallets.length === 0 ? (
        <p className="max-w-[62ch] text-small text-graphite">No browser wallet found. Install one such as Rabby or MetaMask, then reload.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {wallets.slice(0, 3).map((w) => (
            <button key={w.info.uuid} className="key" onClick={() => connect(w)} disabled={connecting}>
              {/* eslint-disable-next-line @next/next/no-img-element -- the wallet supplies its own data-URI icon */}
              <img src={w.info.icon} alt="" width={18} height={18} />
              {connecting ? "Connecting…" : `Connect ${w.info.name}`}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-small text-ink" role="alert">{error}</p>}
    </div>
  );
}
