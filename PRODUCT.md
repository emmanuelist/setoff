# Product

## Platform

Mixed: Solidity contracts live on **Arc mainnet** (chain 5042), plus a web app that reads
everything straight from the chain. There is no backend and no database.

## Users

**Primary: the person who closes the books for a small cross-border business.** Picture an
agency that bills clients in EUR and USD and pays contractors in MXN, BRL and JPY. Every
month they owe money and are owed money in five currencies, and every one of those
payments pays for a currency conversion and a transfer. They want to know one thing: *what
do I actually have to pay, and when is it truly done?* They will record a debt and approve
one payment. They will not learn how netting works, manage token approvals, or trust a
number they can't check.

**Secondary: an Arc reviewer.** They get one link, a repo and a short description, and a few
minutes. To them Setoff is a test of whether Arc can host a new financial primitive, not
just another checkout flow. Everything they see has to be checkable on the Arc explorer.

## Product Purpose

Setoff is a clearing house for debts between a group of parties.

- **Parties record debts** in USD, EUR, MXN, BRL or JPY. The creditor proposes each debt and
  the debtor accepts it, so neither side can invent one.
- **At the cutoff, a cycle fixes exchange rates** from Chainlink's live feeds on Arc and works
  out each party's net position. **Only net debtors pay, and each pays once**, in USDC. Net
  creditors are paid only if **every** debtor has funded. If anyone misses the deadline,
  nothing moves and every deposit is refundable.
- **A single debt can also be paid directly** at the current fixing. That is milestone 1, and
  the fallback if netting doesn't make the Sep 30 checkpoint.

**Impossible today, and why the workarounds fail:**

- Paying every debt gross means N conversions and N transfers, each with fees and float.
- A bank netting centre, or treasury software like Kyriba, needs a relationship, a
  settlement account and days of float. None of that is available to a 5-person agency.
- A spreadsheet can compute the net, but can't guarantee that when you pay your net, the
  others pay theirs. Partial settlement is worse than none: you've paid, and the debt you
  netted against is still open.

Success is a cycle on Arc mainnet where the gross amount owed across five currencies
collapses to a much smaller amount actually moved. Every rate and every leg can be clicked
on the explorer, and a deliberately failed cycle refunds everyone.

## Positioning

**The claim:** *Debts in five currencies clear at one on-chain fixing: only the net moves,
and either every party settles or none does.*

The claim is **proved on-chain, not asserted**. The fixing's rates, feed round IDs and
timestamps are stored on-chain. The gross and net totals are emitted in the settlement
event. The all-or-nothing rule is enforced by the contract, not by a promise.

**Why Arc.** Each of these was verified on mainnet on 2026-09-21:

1. **USDC is the native currency.** Deposits are plain payments to the contract. There are
   no ERC-20 approvals, no standing allowances and no approval-draining attack surface.
   Gas and settlement are the same unit, so a party's full cost is one number.
2. **Chainlink fixes for EUR, MXN, BRL and JPY are live on Arc mainnet** (32 feeds in total).
3. **Deterministic finality.** A leg is final the moment it's included. A netting cycle is
   only as safe as its weakest leg, and no reorg can undo one leg after the others settle.
4. **Built around Arc's value-transfer rules.** On Arc a native transfer can revert even
   with enough balance, for example when the recipient is blocklisted. Setoff pays out by
   letting each party withdraw its own money, so one blocked party can never freeze a
   cycle for everyone.
5. **Roadmap fit.** StableFX and local-currency stablecoins (MXNB, BRLA, JPYC) are coming to
   Arc. Setoff's settlement leg can move from "USDC at the fixing" to "the creditor's own
   currency" without changing the clearing logic.

**The unportability test, answered honestly:** the netting arithmetic would run on any EVM
chain. What wouldn't port unchanged is the settlement design: native-USDC payments with no
approvals, a payout model shaped by Arc's runtime rules, and instant finality. On a chain
where USDC is an ERC-20 token with probabilistic finality, Setoff would need approvals and
confirmation delays, which is a different and weaker product.

## Operating Context

1. The **creditor proposes a debt**: debtor, amount, currency, reference, and either
   "direct" or a cycle ID.
2. The **debtor accepts it** on-chain. Only accepted debts count for anything.
3. **Direct path (milestone 1):** the debtor pays the debt. The contract reads the
   Chainlink feed, refuses a stale rate, charges the USDC equivalent, records the fixing,
   and credits the creditor's withdrawable balance.
4. **Cycle path (milestone 2):** at the cutoff, **anyone can trigger the fixing**. The
   contract reads each currency's feed once and computes every party's net position in
   USDC.
5. **Net debtors fund** their exact net before the funding deadline.
6. **If every debtor has funded**, anyone can settle. Creditors' withdrawable balances are
   credited, and every debt in the cycle is marked netted, all in one transaction.
7. **If the deadline passes with anyone unfunded**, anyone can void the cycle. Deposits
   become refundable, and the debts return to open, payable directly or in a later cycle.
8. Parties **withdraw** their own balances whenever they like.

**Who is trusted for what:**

- Chainlink is trusted for the rate. The contract checks how old it is, and it is recorded.
- Arc validators are trusted for finality.
- Nobody else holds discretion: there is no admin key over funds, and there is no pause
  button over anyone's balance.

## Capabilities and Constraints

**Working and deployed:**

- Five funded wallets on Arc mainnet (deployer plus four demo parties). Transactions are
  logged in `internal/evidence/funding-2026-09-21.md`.
- Contracts: none yet. Phase 1 deploys them.

**Constraints that shape the design:**

- **Chainlink FX feeds have a 24-hour heartbeat and a 0.3–0.5 % deviation threshold.** A
  fixing can lag the market by up to that much. The interface must call it *a fixing*,
  never *a live price*, and show its age.
- **Stale feeds are refused, not approximated.** A fixing older than the heartbeat plus a
  grace period makes the transaction revert, and the interface says why.
- **Native USDC has 18 decimals; its ERC-20 view has 6.** All contract accounting uses the
  18-decimal native units. The ERC-20 view never enters the maths.
- **A native transfer can revert even with sufficient balance** (blocklist, zero address,
  destroyed account). This is why all payouts are withdrawals.
- **Block timestamps can repeat** (they never go backwards, but they don't always
  increase). Deadlines use explicit `>=` and `<` boundaries.
- **Cycles are size-capped** (a bounded number of debts and parties) so the fixing and
  settlement fit comfortably in one block.
- **USD debts settle 1:1 in USDC.** We treat USDC as equal to USD at settlement, and say so.

## Brand Commitments

- **Name: Setoff.** In law, set-off is the right to cancel mutual debts against each other,
  so that only the balance is paid. The name is the mechanism, not a mood.
- **Hard anti-goal:** don't look like crypto. No dark slate with neon, no gradients, no
  glowing "DeFi" cards, no token-ticker styling. Setoff is back-office finance: it should
  read like a clearing statement, not a trading screen. Final direction is set in Phase 0
  (`DESIGN.md`).

## Evidence on Hand

These are real and verifiable, and usable in the interface:

- Live Chainlink reads on Arc mainnet: EUR/USD 1.1486, and MXN/USD, BRL/USD and JPY/USD
  updated within 24 h (`docs/RESEARCH.md`).
- Five funded mainnet wallets, with real transfer transactions costing 0.00044 USDC each.
- Measured costs: a native transfer is about 0.00044 USDC; a contract deploy about 0.04 USDC.

**Absences that must not be papered over:**

- No users. The demo parties are wallets we control, and we say so.
- No audit.
- No StableFX: it's permissioned, so no real currency conversion happens; creditors
  receive USDC at the fixing.
- No local-currency stablecoins yet.
- Amounts are small (dollars, not thousands) because they are real.

## Product Principles

1. **Net or nothing.** A cycle never settles some legs and not others. Partial settlement is
   the failure Setoff exists to prevent, so the interface never shows a cycle as
   "mostly settled".
2. **A fixing is a published rate, not a price.** Every converted number shows the rate,
   the feed round and its age. The least-informed user must never mistake a 20-hour-old
   fixing for a live quote.
3. **Every number is a link.** Rates, legs, totals and states resolve to an on-chain
   transaction or read. Nothing on screen is computed without a source.
4. **Nobody can hold anyone else's money hostage.** Refunds and payouts are withdrawals any
   party can make at any time.
5. **State the limits plainly.**

## Accessibility

WCAG 2.1 AA floor, plus:

- Debit, credit and flat positions are conveyed with a sign, a word and a position, never
  by colour alone.
- Every figure uses tabular numerals with its currency code, not just a symbol ($ is
  ambiguous across currencies).
- All flows can be completed by keyboard, with visible focus, including wallet actions.
- Addresses and hashes are copyable, and are announced by screen readers as their
  shortened form.
