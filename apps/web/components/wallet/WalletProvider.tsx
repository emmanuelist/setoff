"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createWalletClient, custom, getAddress, numberToHex, type Address, type EIP1193Provider, type WalletClient } from "viem";
import { arc } from "viem/chains";

/** EIP-6963: every installed wallet announces itself, instead of racing for window.ethereum. */
type Announced = { info: { uuid: string; name: string; icon: string; rdns: string }; provider: EIP1193Provider };

type WalletState = {
  wallets: Announced[];
  wallet: Announced | null;
  account: Address | null;
  chainId: number | null;
  onArc: boolean;
  connecting: boolean;
  error: string | null;
  connect: (w: Announced) => Promise<void>;
  disconnect: () => void;
  ensureArc: () => Promise<void>;
  client: () => WalletClient | null;
};

const Ctx = createContext<WalletState | null>(null);
const REMEMBER = "setoff.wallet";

const store = {
  get: () => { try { return localStorage.getItem(REMEMBER); } catch { return null; } },
  set: (v: string) => { try { localStorage.setItem(REMEMBER, v); } catch { /* private mode */ } },
  clear: () => { try { localStorage.removeItem(REMEMBER); } catch { /* private mode */ } },
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<Announced[]>([]);
  const [wallet, setWallet] = useState<Announced | null>(null);
  const [account, setAccount] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restored = useRef(false);

  // Discover wallets.
  useEffect(() => {
    const onAnnounce = (e: Event) => {
      const detail = (e as CustomEvent<Announced>).detail;
      setWallets((ws) => (ws.some((w) => w.info.uuid === detail.info.uuid) ? ws : [...ws, detail]));
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
  }, []);

  // Follow the selected wallet's account and chain.
  useEffect(() => {
    if (!wallet) return;
    const p = wallet.provider;
    const onAccounts = (accs: unknown) => {
      const list = accs as string[];
      setAccount(list[0] ? getAddress(list[0]) : null);
      if (!list[0]) { setWallet(null); store.clear(); }
    };
    const onChain = (id: unknown) => setChainId(Number(id as string));
    p.on("accountsChanged", onAccounts);
    p.on("chainChanged", onChain);
    return () => { p.removeListener("accountsChanged", onAccounts); p.removeListener("chainChanged", onChain); };
  }, [wallet]);

  const adopt = useCallback(async (w: Announced) => {
    const accs = (await w.provider.request({ method: "eth_requestAccounts" })) as string[];
    if (!accs[0]) return false;
    const id = (await w.provider.request({ method: "eth_chainId" })) as string;
    setWallet(w);
    setAccount(getAddress(accs[0]));
    setChainId(Number(id));
    store.set(w.info.rdns);
    return true;
  }, []);

  // Reconnect silently to the wallet used last time, without a prompt.
  useEffect(() => {
    if (restored.current || wallets.length === 0) return;
    const rdns = store.get();
    const w = rdns ? wallets.find((x) => x.info.rdns === rdns) : undefined;
    if (!w) return;
    restored.current = true;
    Promise.all([w.provider.request({ method: "eth_accounts" }), w.provider.request({ method: "eth_chainId" })])
      .then(([accs, id]) => {
        const list = accs as string[];
        if (!list[0]) { store.clear(); return; }
        setWallet(w);
        setAccount(getAddress(list[0]));
        setChainId(Number(id as string));
      })
      .catch(() => store.clear());
  }, [wallets]);

  const connect = useCallback(async (w: Announced) => {
    setConnecting(true);
    setError(null);
    try {
      await adopt(w);
    } catch (e) {
      setError(e instanceof Error && /reject/i.test(e.message) ? "You declined in your wallet." : "The wallet didn't connect.");
    } finally {
      setConnecting(false);
    }
  }, [adopt]);

  const disconnect = useCallback(() => { setWallet(null); setAccount(null); setChainId(null); store.clear(); }, []);

  const ensureArc = useCallback(async () => {
    if (!wallet) throw new Error("No wallet connected.");
    if (chainId === arc.id) return;
    const hexId = numberToHex(arc.id);
    try {
      await wallet.provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
    } catch (e) {
      if ((e as { code?: number }).code !== 4902) throw e;
      await wallet.provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: hexId,
          chainName: "Arc",
          nativeCurrency: arc.nativeCurrency,
          rpcUrls: [...arc.rpcUrls.default.http],
          blockExplorerUrls: [arc.blockExplorers.default.url],
        }],
      });
    }
    setChainId(arc.id);
  }, [wallet, chainId]);

  const client = useCallback(
    () => (wallet && account ? createWalletClient({ account, chain: arc, transport: custom(wallet.provider) }) : null),
    [wallet, account],
  );

  const value = useMemo<WalletState>(
    () => ({ wallets, wallet, account, chainId, onArc: chainId === arc.id, connecting, error, connect, disconnect, ensureArc, client }),
    [wallets, wallet, account, chainId, connecting, error, connect, disconnect, ensureArc, client],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet outside WalletProvider");
  return v;
}
