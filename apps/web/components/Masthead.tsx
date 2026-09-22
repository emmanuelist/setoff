import Link from "next/link";
import { SOURCIFY } from "@/lib/chain";
import { Wordmark } from "./Marks";
import { WalletMenu } from "./wallet/WalletMenu";
import s from "./Masthead.module.css";

export function Masthead() {
  return (
    <header className={s.mast}>
      <Link href="/" className={s.wordmark} aria-label="Setoff, home"><Wordmark />Setoff</Link>
      <nav className={s.nav} aria-label="Primary">
        <Link href="/">Debts</Link>
        <Link href="/debts/new">Record a debt</Link>
        <a href={SOURCIFY} target="_blank" rel="noreferrer">Contract ↗</a>
      </nav>
      <div className={s.right}>
        <span className={s.net}>Arc mainnet <span className="fig">5042</span></span>
        <WalletMenu />
      </div>
    </header>
  );
}
