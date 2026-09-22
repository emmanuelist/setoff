import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight } from "lucide-react";
import { CycleMark } from "@/components/CycleMark";
import { ContractBand } from "@/components/Marks";
import { Plate } from "@/components/room/Plate";
import { SETOFF_ADDRESS, publicClient } from "@/lib/chain";
import { clock, pad, utc } from "@/lib/format";
import { formatUsdc, roundDecimal } from "@/lib/money";
import { setoffAbi } from "@/lib/setoff-abi";
import { readCycles } from "@/lib/setoff";
import { formatUnits } from "viem";

export const metadata: Metadata = { title: "Cycles" };

export default async function Cycles() {
  await connection();
  const [cycles, head] = await Promise.all([readCycles(), publicClient.getBlock()]);
  const counts = await Promise.all(
    cycles.map((c) => publicClient.readContract({ address: SETOFF_ADDRESS, abi: setoffAbi, functionName: "cycleDebts", args: [c.id] }).then((ids) => ids.length)),
  );
  const now = Number(head.timestamp);

  return (
    <main className="px-[var(--gutter)] pt-[var(--seam)]">
      <div className="bento">
        <section className="plate col-span-12 grid gap-6 p-6 sm:p-9 lg:col-span-7">
          <h1 className="max-w-[16ch] text-[clamp(34px,4.4vw,58px)] leading-[1.0] font-bold tracking-[-0.022em] [font-variation-settings:'wdth'_108]">Only the net moves.</h1>
          <p className="max-w-[58ch] text-[15.5px] leading-[1.55] text-graphite">
            A cycle clears many debts at once. At its cutoff, one Chainlink read prices every debt in it, each party&apos;s debts are set off against each other, and only the nets move. Either every net debtor funds and the whole cycle settles, or the deadline passes and every deposit comes back.
          </p>
          <Link href="/cycles/new" className="key key-ink w-fit">Open a cycle <ArrowRight aria-hidden="true" /></Link>
        </section>
        <Plate legend="What a cycle can't do" className="col-span-12 lg:col-span-5">
          <ul className="grid gap-3 text-[14px] leading-[1.45]">
            <li>Take a debt its debtor didn&apos;t endorse into the cycle.</li>
            <li>Settle some parties and not others. It is all of them, or none.</li>
            <li>Hold a deposit past a failed deadline. Every one becomes withdrawable.</li>
            <li>Price a debt at a stale rate. A fixing older than 25 hours is refused.</li>
          </ul>
        </Plate>

        <Plate legend="Every cycle" aside={<span><span className="fig text-ink">{cycles.length}</span> on the contract, newest first</span>} className="col-span-12">
          {cycles.length === 0 ? (
            <div className="well grid justify-items-start gap-4 p-6">
              <p className="text-[14px] text-graphite">No cycle has been opened yet. Anyone can open one; debts join it when their debtors endorse them.</p>
              <Link href="/cycles/new" className="key key-ink">Open the first cycle</Link>
            </div>
          ) : (
            <div className="well grid gap-2 p-2">
              {cycles.map((c, i) => {
                const pctOff = c.gross > 0n ? roundDecimal(formatUnits(((c.gross - c.netMoved) * 1000n) / c.gross, 1), 1) : null;
                const when = c.state === "open" ? (now < c.cutoff ? `cutoff ${clock(c.cutoff)}` : `fixable until ${clock(c.fundingDeadline)}`)
                  : c.state === "fixed" ? `funding until ${clock(c.fundingDeadline)}` : utc(c.closedAt ?? 0);
                return (
                  <Link key={c.id.toString()} href={`/cycles/${c.id}`} className="stock grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 no-underline transition-[transform,box-shadow] duration-200 ease-spring hover:-translate-y-[3px] md:grid-cols-[120px_120px_minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <span className="text-[12px]"><ContractBand label={pad(c.id, 4)} /></span>
                    <span className="justify-self-end md:justify-self-start"><CycleMark state={c.state} size="sm" /></span>
                    <span className="text-[13px] text-graphite"><span className="fig text-ink">{counts[i]}</span> {counts[i] === 1 ? "debt" : "debts"} · <span className="fig">{when}</span></span>
                    <span className="text-[13px]">
                      {c.fixedAt ? <><span className="fig">{formatUsdc(c.gross, 4)}</span> <span className="text-graphite">owed →</span> <span className="fig">{formatUsdc(c.netMoved, 4)}</span> <span className="text-graphite">moves ({pctOff}% set off)</span></> : <span className="text-graphite">Not fixed yet</span>}
                    </span>
                    <ArrowRight className="hidden size-4 text-graphite md:block" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          )}
        </Plate>
      </div>
    </main>
  );
}
