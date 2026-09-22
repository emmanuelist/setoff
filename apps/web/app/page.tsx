import Link from "next/link";
import { connection } from "next/server";
import { DebtLedger, type Priced } from "@/components/DebtLedger";
import { FixingBoard } from "@/components/FixingBoard";
import { StateMark } from "@/components/Marks";
import { SOURCIFY, publicClient } from "@/lib/chain";
import { formatUsdc } from "@/lib/money";
import { readDebts, readFixings, readMaxFixingAge, readQuote, readReceipt } from "@/lib/setoff";
import s from "./page.module.css";

export default async function Home() {
  await connection(); // every figure is read at request time, never frozen at build
  const [reads, debts, maxAge, head] = await Promise.all([readFixings(), readDebts(), readMaxFixingAge(), publicClient.getBlock()]);
  const now = Number(head.timestamp);

  const priced = new Map<bigint, Priced>();
  await Promise.all(
    debts.map(async (d) => {
      if (d.state === "paid") {
        const r = await readReceipt(d);
        priced.set(d.id, r ? { kind: "paid", usdc: r.usdc } : null);
      } else if (d.state === "accepted") {
        const q = await readQuote(d.id);
        priced.set(d.id, q.ok ? { kind: "quote", usdc: q.due } : { kind: "refused" });
      }
    }),
  );
  const paid = debts.filter((d) => d.state === "paid");
  const settled = paid.reduce((sum, d) => { const p = priced.get(d.id); return p?.kind === "paid" ? sum + p.usdc : sum; }, 0n);

  return (
    <main>
      <section className={s.floor}>
        <div className={s.copy}>
          <p className="wide">Live on Arc mainnet · Milestone 1</p>
          <h1 className={s.claim}>Debts in five currencies clear at one on-chain fixing.</h1>
          <p className={s.sub}>
            Only the net moves, and either every party settles or none does. Live now: a debt priced in USD, EUR, MXN, BRL or JPY,
            endorsed by its debtor and paid in native USDC at the Chainlink fixing. Netting cycles are next.
          </p>
          <div className={s.cta}>
            <Link href="/debts/new" className="btn lit">Record a debt</Link>
            <a href={SOURCIFY} target="_blank" rel="noreferrer" className={s.secondary}>Read the verified contract ↗</a>
          </div>
        </div>
        <dl className={s.stats}>
          <div><dt>Debts recorded</dt><dd className="fig">{debts.length}</dd></div>
          <div><dt>Paid at a fixing</dt><dd className="fig">{paid.length}</dd></div>
          <div><dt>USDC settled</dt><dd className="fig">{formatUsdc(settled, 4)}</dd></div>
          <div><dt>Chain block</dt><dd className="fig">{head.number.toLocaleString("en-US")}</dd></div>
        </dl>
        <div className={s.boardWrap}>
          <div className={s.boardHead}>
            <span className="wide">The fixing</span>
            <span>One Chainlink read per currency, live. A read older than <span className="fig">{Math.round(maxAge / 3600)} h</span> is refused, never approximated.</span>
          </div>
          <FixingBoard reads={reads} now={now} maxAge={maxAge} />
        </div>
      </section>

      <section className="sec">
        <div className="sec-h">
          <div className="wide"><span className="i">01</span>Debts</div>
          <p>Every debt on the contract, newest first. Read live from Arc; nothing here is cached as truth.</p>
        </div>
        <DebtLedger debts={debts} priced={priced} />
      </section>

      <section className="sec">
        <div className="sec-h">
          <div className="wide"><span className="i">02</span>Try to break it</div>
          <p>Stale rates, underpayment, the wrong payer, a double payment: run them against the live contract and watch each one refused by name.</p>
        </div>
        <Link href="/refusals" className={s.teaser}>
          <span className={s.teaserTitle}>Open the refusal room</span>
          <span className={s.teaserSub}>Twelve attempts, read-only calls against mainnet. Nothing is signed, nothing is spent.</span>
          <span className={`fig ${s.teaserArrow}`} aria-hidden="true">→</span>
        </Link>
      </section>

      <section className="sec">
        <div className="sec-h">
          <div className="wide"><span className="i">03</span>How a debt clears</div>
          <p>Four transactions. On Arc each one is final the moment it lands.</p>
        </div>
        <ol className={s.steps}>
          <li><span className={`fig ${s.n}`}>1</span><h3>Propose</h3><p>The creditor records what they&apos;re owed, in the currency they priced it in. It counts for nothing yet.</p><StateMark state="proposed" size="sm" /></li>
          <li><span className={`fig ${s.n}`}>2</span><h3>Endorse</h3><p>The debtor signs for it. Neither side can invent a debt the other didn&apos;t agree to.</p><StateMark state="accepted" size="sm" /></li>
          <li><span className={`fig ${s.n}`}>3</span><h3>Pay at the fixing</h3><p>The debtor pays in native USDC at the live Chainlink rate. A stale rate is refused, and the fixing used is recorded on-chain.</p><StateMark state="paid" size="sm" /></li>
          <li><span className={`fig ${s.n}`}>4</span><h3>Withdraw</h3><p>The creditor withdraws. Payouts are pulled, never pushed, so no one account can block anyone else&apos;s money.</p><span className="enc" style={{ fontSize: 13 }}>USDC</span></li>
        </ol>
      </section>
    </main>
  );
}
