import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { CycleActions } from "@/components/CycleActions";
import { CycleMark } from "@/components/CycleMark";
import { CycleStatement } from "@/components/CycleStatement";
import { CycleTimer } from "@/components/CycleTimer";
import { FixingBoard } from "@/components/FixingBoard";
import { DebtLedger, type Priced } from "@/components/DebtLedger";
import { Plate } from "@/components/room/Plate";
import { Party } from "@/components/wallet/Party";
import { publicClient, txUrl } from "@/lib/chain";
import { pad, short } from "@/lib/format";
import { formatUsdc } from "@/lib/money";
import { readCycle, readMaxFixingAge, readTrail } from "@/lib/setoff";

export async function generateMetadata({ params }: PageProps<"/cycles/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Cycle ${id}` };
}

function TxLink({ hash, children }: { hash: `0x${string}` | null; children: React.ReactNode }) {
  if (!hash) return <span className="text-graphite">{children}</span>;
  return <a href={txUrl(hash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">{children}<ArrowUpRight className="size-3" aria-hidden="true" /></a>;
}

export default async function CyclePage({ params }: PageProps<"/cycles/[id]">) {
  await connection();
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();
  const [view, head, maxAge] = await Promise.all([readCycle(BigInt(id)), publicClient.getBlock(), readMaxFixingAge()]);
  if (!view) notFound();
  const trail = await readTrail(view);
  const { cycle, debts, positions, valuation } = view;
  const now = Number(head.timestamp);

  const values = valuation.basis === "refused" ? new Map<bigint, bigint>() : valuation.values;
  const gross = valuation.basis === "fixing" ? cycle.gross : valuation.basis === "preview" ? valuation.gross : 0n;
  const netMoved = valuation.basis === "fixing" ? cycle.netMoved : valuation.basis === "preview" ? valuation.netMoved : 0n;
  const parties = positions.map((p) => ({
    party: p.party,
    net: valuation.basis === "preview" ? valuation.nets.get(p.party) ?? 0n : p.net,
    funded: p.funded,
  }));
  const priced = new Map<bigint, Priced>(debts.map((d) => [d.id, values.has(d.id) ? { kind: valuation.basis === "fixing" ? "paid" : "quote", usdc: values.get(d.id)! } : null]));
  const openedAt = debts.length ? Math.min(...debts.map((d) => d.proposedAt)) : cycle.cutoff - 600;

  return (
    <main className="px-[var(--gutter)] pt-[var(--seam)]">
      <h1 className="sr">Cycle {id}, {cycle.state}</h1>
      <div className="bento">
        <Plate
          legend={<Link href="/cycles" className="inline-flex items-center gap-1.5 no-underline hover:text-ink"><ArrowLeft className="size-3.5" aria-hidden="true" />Cycles</Link>}
          aside={<span className="flex items-center gap-3"><span className="legend text-ink">Cycle <span className="fig tracking-normal">{pad(cycle.id, 4)}</span></span><CycleMark state={cycle.state} size="sm" /></span>}
          className="col-span-12 lg:col-span-8"
        >
          {debts.length === 0 ? (
            <div className="well grid gap-2 p-6 text-body text-graphite">
              <p>No debt has joined this cycle yet. A creditor bills into it, and the debt joins when its debtor endorses.</p>
            </div>
          ) : valuation.basis === "refused" ? (
            <div className="well grid gap-2 p-6 text-body leading-[1.55] text-graphite">
              <p><span className="print print-late">REFUSED</span> The {valuation.currency ?? "a"} fixing is {valuation.reason === "stale" ? `older than ${Math.round(maxAge / 3600)} hours` : "invalid"}, so the contract won&apos;t price this cycle until the feed updates. The fixing itself would be refused the same way.</p>
            </div>
          ) : (
            <CycleStatement
              debts={debts.map((d) => ({ id: d.id.toString(), currency: d.currency, amount: d.amount, creditor: d.creditor, debtor: d.debtor, usdc: values.get(d.id) ?? 0n }))}
              parties={parties}
              gross={gross}
              netMoved={netMoved}
              basis={valuation.basis}
              fixed={cycle.fixedAt !== null}
            />
          )}
        </Plate>

        <div className="col-span-12 grid content-start gap-[var(--seam)] lg:col-span-4">
          <Plate legend="Schedule" aside={<span className="legend">Chain time</span>}>
            <CycleTimer openedAt={openedAt} cutoff={cycle.cutoff} deadline={cycle.fundingDeadline} fixedAt={cycle.fixedAt} closedAt={cycle.closedAt} state={cycle.state} readAt={now} />
          </Plate>
          <Plate legend="Next act">
            <CycleActions
              readAt={now}
              cycle={{
                id: cycle.id.toString(), state: cycle.state, cutoff: cycle.cutoff, deadline: cycle.fundingDeadline,
                debtors: cycle.debtors, funded: cycle.funded, hasDebts: debts.length > 0,
                positions: positions.map((p) => ({ party: p.party, net: p.net.toString(), funded: p.funded })),
              }}
            />
          </Plate>
          <Plate legend="On the chain" aside="Every step is a transaction">
            <ol className="grid gap-3 text-small">
            <li className="grid grid-cols-[76px_1fr] items-baseline gap-x-3 gap-y-0.5 border-b border-rule pb-3 last:border-0 last:pb-0"><span className="contents"><span className="legend row-span-2">Opened</span></span><TxLink hash={trail.opened}><span className="fig">{trail.opened ? short(trail.opened) : "—"}</span></TxLink><span className="text-caption text-graphite">by <Party address={cycle.opener} /></span></li>
            <li className="grid grid-cols-[76px_1fr] items-baseline gap-x-3 gap-y-0.5 border-b border-rule pb-3 last:border-0 last:pb-0"><span className="contents"><span className="legend row-span-2">Fixed</span></span><TxLink hash={trail.fixed}><span className="fig">{trail.fixed ? short(trail.fixed) : "—"}</span></TxLink><span className="text-caption text-graphite">{cycle.fixedAt ? <>gross <span className="fig">{formatUsdc(cycle.gross, 4)}</span>, net <span className="fig">{formatUsdc(cycle.netMoved, 4)}</span> USDC</> : "not yet"}</span></li>
            <li className="grid grid-cols-[76px_1fr] items-baseline gap-x-3 gap-y-0.5 border-b border-rule pb-3 last:border-0 last:pb-0"><span className="contents">
              <span className="legend row-span-3">Funded</span></span>
              {trail.funded.length === 0 ? <span className="text-graphite">{cycle.fixedAt ? `${cycle.funded} of ${cycle.debtors}` : "not yet"}</span> : trail.funded.map((f) => (
                <TxLink key={f.tx} hash={f.tx}><Party address={f.party} /> <span className="fig">{formatUsdc(f.usdc, 4)}</span> <span className="text-graphite">USDC</span></TxLink>
              ))}
            </li>
            <li className="grid grid-cols-[76px_1fr] items-baseline gap-x-3 gap-y-0.5 border-b border-rule pb-3 last:border-0 last:pb-0"><span className="contents"><span className="legend row-span-2">{cycle.state === "void" ? "Voided" : "Settled"}</span></span><TxLink hash={trail.closed}><span className="fig">{trail.closed ? short(trail.closed) : "—"}</span></TxLink><span className="text-caption text-graphite">{cycle.state === "settled" ? <><span className="fig">{debts.length}</span> debts netted at once</> : cycle.state === "void" ? "every deposit refundable" : "not yet"}</span></li>
            </ol>
          </Plate>
        </div>
        {view.fixings.length > 0 && (
          <FixingBoard
            frozen={cycle.fixedAt !== null}
            now={cycle.fixedAt ?? now}
            maxAge={maxAge}
            reads={view.fixings.map((f) => ({ currency: f.currency, ok: true as const, fixing: f }))}
          />
        )}

        <Plate legend="Debts in this cycle" aside={<span><span className="fig text-ink">{debts.length}</span> of 16 places</span>} className="col-span-12">
          <DebtLedger debts={[...debts].reverse()} priced={priced} next={null} />
        </Plate>

      </div>
    </main>
  );
}
