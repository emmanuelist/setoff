import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { DebtActions } from "@/components/DebtActions";
import { Gauge } from "@/components/Gauge";
import { Plate } from "@/components/room/Plate";
import { ReceiptRows, Slip } from "@/components/Slip";
import { publicClient, txUrl } from "@/lib/chain";
import { age, lastDigits, pad, short } from "@/lib/format";
import { formatAmount, formatRate } from "@/lib/money";
import { readCycle, readDebt, readFixings, readMaxFixingAge, readQuote, readReceipt, readTrail } from "@/lib/setoff";

export async function generateMetadata({ params }: PageProps<"/debts/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Debt ${id}` };
}

export default async function DebtPage({ params }: PageProps<"/debts/[id]">) {
  await connection();
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) notFound();
  const debt = await readDebt(BigInt(id));
  if (!debt) notFound();

  const [quote, receipt, head, maxAge, reads] = await Promise.all([
    debt.state === "accepted" ? readQuote(debt.id) : Promise.resolve(null),
    readReceipt(debt),
    publicClient.getBlock(),
    readMaxFixingAge(),
    debt.state === "proposed" ? readFixings() : Promise.resolve(null),
  ]);
  const now = Number(head.timestamp);

  // A cycle debt is priced by its cycle: at the cycle's own fixing once fixed.
  const cv = debt.cycleId !== 0 ? await readCycle(BigInt(debt.cycleId)) : null;
  const cycleValue = cv?.valuation.basis === "fixing" ? cv.valuation.values.get(debt.id) ?? null : null;
  const cycleFix = cv && cv.cycle.fixedAt !== null ? cv.fixings.find((f) => f.currency === debt.currency) ?? null : null;
  const settledTx = cv && debt.state === "netted" ? (await readTrail(cv)).closed : null;

  // The gauge shows the fixing that matters for this card: the one it was paid at, or today's.
  const today = reads?.find((r) => r.currency === debt.currency);
  const gauge =
    cycleFix && cv?.cycle.fixedAt ? { ageSec: cycleFix.currency === "USD" ? null : cv.cycle.fixedAt - cycleFix.updatedAt, refused: false, legend: debt.state === "netted" ? "The fixing it cleared at" : "Its cycle's fixing", f: cycleFix }
    : receipt ? { ageSec: receipt.fixing.currency === "USD" ? null : (debt.closedAt ?? 0) - receipt.fixing.updatedAt, refused: false, legend: "The fixing it was paid at", f: receipt.fixing }
    : quote?.ok ? { ageSec: quote.fixing.currency === "USD" ? null : now - quote.fixing.updatedAt, refused: false, legend: "Today's fixing", f: quote.fixing }
    : quote && !quote.ok ? { ageSec: quote.updatedAt ? now - quote.updatedAt : null, refused: true, legend: "Today's fixing", f: null }
    : today?.ok ? { ageSec: today.currency === "USD" ? null : now - today.fixing.updatedAt, refused: false, legend: "Today's fixing", f: today.fixing }
    : null;

  return (
    <main className="px-[var(--gutter)] pt-[var(--seam)]">
      <h1 className="sr">Debt {debt.id.toString()}: {debt.currency} {formatAmount(debt.amount, debt.currency)}, {debt.state}</h1>
      <div className="bento">
        <Plate
          legend={<Link href="/" className="inline-flex items-center gap-1.5 no-underline hover:text-ink"><ArrowLeft className="size-3.5" aria-hidden="true" />Debts</Link>}
          aside={<span className="legend text-ink">Debt <span className="fig tracking-normal">{pad(debt.id, 4)}</span></span>}
          className="col-span-12 lg:col-span-7"
        >
          <div className="well p-2 sm:p-5">
            <Slip debt={debt} quote={quote} receipt={receipt} now={now} cycle={cv ? { id: debt.cycleId, state: cv.cycle.state, fixedAt: cv.cycle.fixedAt, closedAt: cv.cycle.closedAt, usdc: cycleValue } : null} />
          </div>
        </Plate>

        <div className="col-span-12 grid content-start gap-[var(--seam)] lg:col-span-5">
          <Plate legend="Your act">
            <DebtActions
              debt={{
                id: debt.id.toString(),
                creditor: debt.creditor,
                debtor: debt.debtor,
                currency: debt.currency,
                state: debt.state,
                quoteDue: quote?.ok ? quote.due.toString() : null,
                cycleId: debt.cycleId,
              }}
            />
          </Plate>

          {gauge && (
            <Plate legend={gauge.legend} className={`ccy-${debt.currency.toLowerCase()}`}>
              <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,180px)_1fr]">
                <div className="mx-auto w-full max-w-[180px]">
                  <Gauge currency={debt.currency} ageSec={gauge.ageSec} maxAgeSec={maxAge} refused={gauge.refused} />
                </div>
                {receipt ? (
                  <ReceiptRows debt={debt} receipt={receipt} />
                ) : gauge.f && cycleFix ? (
                  <dl className="grid text-[13px]">
                    {([
                      ["Rate", gauge.f.currency === "USD" ? "1 : 1 by definition" : `${formatRate(gauge.f.answer, gauge.f.decimals)} USD per ${gauge.f.currency}`],
                      ...(gauge.f.currency !== "USD" ? [["Feed round", lastDigits(gauge.f.roundId)], ["Age at the fixing", age(gauge.ageSec ?? 0)]] : []),
                      ["Cycle", <Link key="c" href={`/cycles/${debt.cycleId}`}>cycle {debt.cycleId}</Link>],
                      ...(settledTx ? [["Settled in", <a key="s" href={txUrl(settledTx)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">{short(settledTx)}<ArrowUpRight className="size-3" aria-hidden="true" /></a>]] : []),
                    ] as [string, React.ReactNode][]).map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-4 border-b border-rule py-2 last:border-0">
                        <dt className="text-graphite">{k}</dt>
                        <dd className="fig text-right">{v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : gauge.f ? (
                  <dl className="grid text-[13px]">
                    {[
                      ["Rate", gauge.f.currency === "USD" ? "1 : 1 by definition" : `${formatRate(gauge.f.answer, gauge.f.decimals)} USD per ${gauge.f.currency}`],
                      ...(gauge.f.currency !== "USD" ? [["Feed round", lastDigits(gauge.f.roundId)], ["Age now", age(gauge.ageSec ?? 0)]] : []),
                      ["Refused past", `${Math.round(maxAge / 3600)} h`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-4 border-b border-rule py-2 last:border-0">
                        <dt className="text-graphite">{k}</dt>
                        <dd className="fig text-right">{v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-[13.5px] leading-[1.55] text-graphite">
                    The {debt.currency} fixing is older than {Math.round(maxAge / 3600)} hours, so the contract refuses to price this debt. It will again the moment the feed updates.
                  </p>
                )}
              </div>
            </Plate>
          )}
        </div>
      </div>
    </main>
  );
}
