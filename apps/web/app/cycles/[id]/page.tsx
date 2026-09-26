import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { CycleActions } from "@/components/CycleActions";
import { CycleMark } from "@/components/CycleMark";
import { CycleStatement } from "@/components/CycleStatement";
import { CycleTimer } from "@/components/CycleTimer";
import { FixingBoard } from "@/components/FixingBoard";
import { DebtLedger, type Priced } from "@/components/DebtLedger";
import { Pending } from "@/components/room/Pending";
import { Plate } from "@/components/room/Plate";
import { Party } from "@/components/wallet/Party";
import { publicClient, txUrl } from "@/lib/chain";
import { pad, short } from "@/lib/format";
import { formatUsdc } from "@/lib/money";
import { readCycle, readCycleCount, readMaxFixingAge, readTrail, type CycleView, type Trail } from "@/lib/setoff";

export async function generateMetadata({ params }: PageProps<"/cycles/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Cycle ${id}` };
}

function TxLink({ hash, children }: { hash: `0x${string}` | null; children: React.ReactNode }) {
  if (!hash) return <span className="text-graphite">{children}</span>;
  return <a href={txUrl(hash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">{children}<ArrowUpRight className="size-3" aria-hidden="true" /></a>;
}

type Reads = { view: Promise<CycleView>; trail: Promise<Trail>; head: ReturnType<typeof publicClient.getBlock>; maxAge: Promise<number> };

/** The statement, and the empty and refused states it also has to carry. */
async function Statement({ r }: { r: Reads }) {
  const [view, maxAge] = await Promise.all([r.view, r.maxAge]);
  const { cycle, debts, positions, valuation } = view;
  if (debts.length === 0) {
    return (
      <div className="well grid gap-2 p-6 text-body text-graphite">
        <p>{cycle.state === "open"
          ? "No debt has joined this cycle yet. A creditor bills into it, and the debt joins when its debtor endorses."
          : "No debt joined this cycle before its cutoff, so it was never priced and never held a deposit."}</p>
      </div>
    );
  }
  if (valuation.basis === "refused") {
    return (
      <div className="well grid gap-2 p-6 text-body leading-[1.55] text-graphite">
        <p><span className="print print-late">REFUSED</span> The {valuation.currency ?? "a"} fixing is {valuation.reason === "stale" ? `older than ${Math.round(maxAge / 3600)} hours` : "invalid"}, so the contract won&apos;t price this cycle until the feed updates. The fixing itself would be refused the same way.</p>
      </div>
    );
  }
  const values = valuation.values;
  return (
    <CycleStatement
      debts={debts.map((d) => ({ id: d.id.toString(), currency: d.currency, amount: d.amount, creditor: d.creditor, debtor: d.debtor, usdc: values.get(d.id) ?? 0n }))}
      parties={positions.map((p) => ({ party: p.party, net: valuation.basis === "preview" ? valuation.nets.get(p.party) ?? 0n : p.net, funded: p.funded }))}
      gross={valuation.basis === "fixing" ? cycle.gross : valuation.gross}
      netMoved={valuation.basis === "fixing" ? cycle.netMoved : valuation.netMoved}
      basis={valuation.basis}
      fixed={cycle.fixedAt !== null}
      outcome={cycle.state === "settled" ? "settled" : cycle.state === "void" ? "void" : "open"}
    />
  );
}

async function StatementPlate({ r }: { r: Reads }) {
  const view = await r.view;
  return (
    <Plate
      legend={<Link href="/cycles" className="inline-flex items-center gap-1.5 no-underline hover:text-ink"><ArrowLeft className="size-3.5" aria-hidden="true" />Cycles</Link>}
      aside={<span className="flex items-center gap-3"><span className="legend text-ink">Cycle <span className="fig tracking-normal">{pad(view.cycle.id, 4)}</span></span><CycleMark state={view.cycle.state} size="sm" /></span>}
      className="col-span-12 lg:col-span-8"
    >
      <Statement r={r} />
    </Plate>
  );
}

/** Schedule, the act it is waiting for, and the transactions it has already taken. */
async function Aside({ r }: { r: Reads }) {
  const [view, trail, head] = await Promise.all([r.view, r.trail, r.head]);
  const { cycle, debts, positions } = view;
  const now = Number(head.timestamp);
  const openedAt = debts.length ? Math.min(...debts.map((d) => d.proposedAt)) : cycle.cutoff - 600;
  return (
    <div className="col-span-12 grid content-start gap-[var(--seam)] lg:col-span-4">
      <Plate id="schedule" legend="Schedule" aside={<span className="legend">Chain time</span>}>
        <CycleTimer openedAt={openedAt} cutoff={cycle.cutoff} deadline={cycle.fundingDeadline} fixedAt={cycle.fixedAt} closedAt={cycle.closedAt} state={cycle.state} readAt={now} />
      </Plate>
      <Plate id="next-act" legend="Next act">
        <CycleActions
          readAt={now}
          cycle={{
            id: cycle.id.toString(), state: cycle.state, cutoff: cycle.cutoff, deadline: cycle.fundingDeadline,
            debtors: cycle.debtors, funded: cycle.funded, hasDebts: debts.length > 0,
            positions: positions.map((p) => ({ party: p.party, net: p.net.toString(), funded: p.funded })),
          }}
        />
      </Plate>
      <Plate id="trail" legend="On the chain" aside="Every step is a transaction">
        <ol className="grid gap-3 text-small">
        <li className="grid grid-cols-[76px_1fr] items-baseline gap-x-3 gap-y-0.5 border-b border-rule pb-3 last:border-0 last:pb-0"><span className="contents"><span className="legend row-span-2">Opened</span></span><TxLink hash={trail.opened}><span className="fig">{trail.opened ? short(trail.opened) : "—"}</span></TxLink><span className="text-caption text-graphite">by <Party address={cycle.opener} /></span></li>
        <li className="grid grid-cols-[76px_1fr] items-baseline gap-x-3 gap-y-0.5 border-b border-rule pb-3 last:border-0 last:pb-0"><span className="contents"><span className="legend row-span-2">Fixed</span></span><TxLink hash={trail.fixed}><span className="fig">{trail.fixed ? short(trail.fixed) : "—"}</span></TxLink><span className="text-caption text-graphite">{cycle.fixedAt ? <>gross <span className="fig">{formatUsdc(cycle.gross, 4)}</span>, net <span className="fig">{formatUsdc(cycle.netMoved, 4)}</span> USDC</> : "not yet"}</span></li>
        {/* Two funding links stack here; 8px between them keeps each a separate touch target. */}
        <li className="grid grid-cols-[76px_1fr] items-baseline gap-x-3 gap-y-2 border-b border-rule pb-3 last:border-0 last:pb-0"><span className="contents">
          <span className="legend row-span-3">Funded</span></span>
          {trail.funded.length === 0 ? <span className="text-graphite">{cycle.fixedAt ? `${cycle.funded} of ${cycle.debtors}` : "not yet"}</span> : trail.funded.map((f) => (
            <TxLink key={f.tx} hash={f.tx}><Party address={f.party} /> <span className="fig">{formatUsdc(f.usdc, 4)}</span> <span className="text-graphite">USDC</span></TxLink>
          ))}
        </li>
        <li className="grid grid-cols-[76px_1fr] items-baseline gap-x-3 gap-y-0.5 border-b border-rule pb-3 last:border-0 last:pb-0"><span className="contents"><span className="legend row-span-2">{cycle.state === "void" ? "Voided" : "Settled"}</span></span><TxLink hash={trail.closed}><span className="fig">{trail.closed ? short(trail.closed) : "—"}</span></TxLink><span className="text-caption text-graphite">{cycle.state === "settled" ? <><span className="fig">{debts.length}</span> debts netted at once</> : cycle.state === "void" ? "every deposit refundable" : "not yet"}</span></li>
        </ol>
      </Plate>
    </div>
  );
}

async function Fixings({ r }: { r: Reads }) {
  const [view, head, maxAge] = await Promise.all([r.view, r.head, r.maxAge]);
  if (view.fixings.length === 0) return null;
  return (
    <FixingBoard
      frozen={view.cycle.fixedAt !== null}
      now={view.cycle.fixedAt ?? Number(head.timestamp)}
      maxAge={maxAge}
      reads={view.fixings.map((f) => ({ currency: f.currency, ok: true as const, fixing: f }))}
    />
  );
}

async function Ledger({ r }: { r: Reads }) {
  const view = await r.view;
  const { debts, valuation } = view;
  const values = valuation.basis === "refused" ? new Map<bigint, bigint>() : valuation.values;
  const priced = new Map<bigint, Priced>(debts.map((d) => [d.id, values.has(d.id) ? { kind: valuation.basis === "fixing" ? "paid" : "quote", usdc: values.get(d.id)! } : null]));
  return (
    <Plate legend="Debts in this cycle" aside={<span><span className="fig text-ink">{debts.length}</span> of 16 places</span>} className="col-span-12">
      <DebtLedger debts={[...debts].reverse()} priced={priced} next={null} />
    </Plate>
  );
}

export default async function CyclePage({ params }: PageProps<"/cycles/[id]">) {
  await connection();
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();
  // One wave decides whether this cycle exists; everything else streams behind it, so the
  // page frame is on screen while the RPC is still answering.
  const count = await readCycleCount();
  if (BigInt(id) < 1n || BigInt(id) > count) notFound();

  const view = readCycle(BigInt(id)).then((v) => { if (!v) notFound(); return v; });
  const r: Reads = { view, trail: view.then(readTrail), head: publicClient.getBlock(), maxAge: readMaxFixingAge() };

  return (
    <main className="px-[var(--gutter)] pt-[var(--seam)]">
      <h1 className="sr">Cycle {id}</h1>
      <div className="bento">
        {/* Each placeholder holds the height its plate lands at, measured per breakpoint on cycles 1
            and 3. A 400px placeholder under a 1000px statement pushed every plate below it down the
            phone's screen when the chain answered, a layout shift of 0.27. */}
        <Suspense fallback={<Pending legend="Cycles" aside={`Cycle ${pad(BigInt(id), 4)}`} className="col-span-12 min-h-[970px] sm:min-h-[785px] lg:col-span-8 lg:min-h-[845px]" rows={5} />}>
          <StatementPlate r={r} />
        </Suspense>

        <Suspense fallback={
          <div className="col-span-12 grid content-start gap-[var(--seam)] lg:col-span-4">
            <Pending legend="Schedule" rows={2} className="min-h-[203px] sm:min-h-[169px] lg:min-h-[211px]" />
            <Pending legend="Next act" rows={2} className="min-h-[141px] sm:min-h-[127px] lg:min-h-[149px]" />
            <Pending legend="On the chain" rows={4} className="min-h-[310px]" />
          </div>
        }>
          <Aside r={r} />
        </Suspense>

        <Suspense fallback={<Pending legend="The fixings it used" className="col-span-12" rows={2} height={150} />}>
          <Fixings r={r} />
        </Suspense>

        <Suspense fallback={<Pending legend="Debts in this cycle" className="col-span-12" rows={4} height={220} />}>
          <Ledger r={r} />
        </Suspense>
      </div>
    </main>
  );
}
