import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SOURCIFY } from "@/lib/chain";
import { ChainReadout } from "./ChainClock";
import { Wordmark } from "./Marks";
import { Nav } from "./Nav";
import { WalletMenu } from "./wallet/WalletMenu";

export function Masthead() {
  return (
    <header className="px-[var(--gutter)] pt-[var(--gutter)]">
      <div className="plate flex flex-wrap items-center gap-x-5 gap-y-3 px-3 py-3 sm:px-4">
        <Link href="/" aria-label="Setoff, home" className="flex items-center gap-2.5 pl-1 text-[19px] font-extrabold tracking-[-0.01em] no-underline [font-variation-settings:'wdth'_112]">
          <Wordmark />Setoff
        </Link>
        <div className="order-last w-full sm:order-none sm:w-auto"><Nav /></div>
        <a href={SOURCIFY} target="_blank" rel="noreferrer" className="hidden items-center gap-1 text-[13px] text-graphite no-underline hover:text-ink lg:inline-flex">
          Verified contract <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </a>
        <div className="ml-auto flex items-center gap-4">
          <ChainReadout />
          <WalletMenu />
        </div>
      </div>
    </header>
  );
}
