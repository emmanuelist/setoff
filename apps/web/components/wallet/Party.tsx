"use client";

import { getAddress, type Address } from "viem";
import { short } from "@/lib/format";
import { useWallet } from "./WalletProvider";

/** An address, marked "you" when it is the connected wallet, so nobody has to recall hex. */
export function Party({ address }: { address: Address }) {
  const { account } = useWallet();
  const you = account !== null && getAddress(account) === getAddress(address);
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="fig">{short(address)}</span>
      {you && <span className="legend text-ink">you</span>}
    </span>
  );
}
