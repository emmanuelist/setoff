# Setoff — demo video run of show

**Claim in one line:** *Debts in five currencies clear at one on-chain fixing: only the net
moves, and either every party settles or none does.*

**Format:** a recorded video of about **3 minutes**, linked from the README and the
DoraHacks submission. There is no live pitch: reviewers get one link and a few minutes, so
this video *is* the presentation.

**Rules:**

- Lead with feeling, escalate to proof, close on the claim.
- Everything on screen is a real Arc mainnet transaction.
- The demo parties are the builder's own wallets, and the voice-over says so once.

**The moment:** second 40–70, when the gross total perforates and the net figure encodes.
Slow down there. It's the proof component, and it gets the design budget.

---

## Pre-flight (before recording)

- [ ] App deployed; the clearing page open at 1440 in a clean browser profile
- [ ] Four party keys imported into a browser wallet; switching accounts rehearsed
- [ ] Each party funded with ~1.25 USDC; the deployer holds gas
- [ ] **Cycle 1** (the one that settles) debts proposed and endorsed; cutoff set a few
      minutes ahead
- [ ] **Cycle 2** (the one that is returned) prepared with a short funding deadline
- [ ] Every Chainlink feed used is under 24 h old at the cutoff (check the fixing strip)
- [ ] Explorer tabs pre-opened: fixing transaction, settlement transaction, void
      transaction, verified contract on Sourcify
- [ ] Screen recording at 1440×900, cursor highlighted, system notifications off
- [ ] Voice-over script printed; take two full rehearsals before the keeper take

---

## Cold open — the problem (0:00–0:20)

> "At half past three on the 26th of June 1974, German regulators closed Bankhaus
> Herstatt. Banks that had already paid it Deutsche marks never received their dollars.
> Half-settled is the worst state money can be in, and FX settlement risk still carries
> Herstatt's name."

On screen: black, then the Setoff wordmark and the claim, set in the product's own type.

## Act 1 — the clearing (0:20–1:25) ← the moment

1. **Pockets** (0:20–0:40). Four parties, seven debts, five currencies: MXN, EUR, BRL, JPY
   and USD. Each debt is endorsed.
   > "Four parties owe each other in five currencies. Paid gross, that's seven payments and
   > seven currency conversions."

2. **The fixing** (0:40–1:10). **Slow down.** Trigger the fixing. Slips sort into
   pockets, the gross total perforates, and the net figure encodes.
   > "One fixing, from Chainlink's live rates on Arc. Seven debts clear to one payment."

   Hold on the proof line: *Debits = Credits*.

3. **Fund and clear** (1:10–1:25). Switch to the one net debtor and fund. The clearing
   settles: CLEARED perforates, and every creditor's balance becomes withdrawable.
   > "Every creditor is paid in the same transaction. Or no one is."

## Act 2 — the reversal (1:25–2:00)

1. Cycle 2. One debtor doesn't fund, and the deadline passes. Anyone can void it:
   RETURNED UNPAID lands.
   > "One party didn't pay, so nothing moved. Every deposit goes back, and the debts
   > reopen. Nobody is left half-settled."

2. Withdraw a refund on screen.
   > "Refunds and payouts are withdrawals, so one blocked party can never freeze everyone
   > else's money."

## Act 3 — and it's real (2:00–2:35)

- Click through to the explorer: the fixing event (rates, round IDs, update times), the
  settlement transaction, and the void transaction.
- Show the contract verified on Sourcify.
- **Open the refusal room and press "Run every attempt"** (about 15 s). Twelve attempts hit
  the live contract; ten come back REFUSED by name, and the honest two clear. Select
  `StaleFixing` to show the structured result: the real debt, the real debtor, and time
  openly moved 26 h forward.
  > "Every refusal you just watched came from the live contract. Nothing is simulated
  > except the one thing we say we moved: the clock."
  > "USDC is Arc's native currency. Deposits are plain payments, with no token approvals
  > anywhere in the protocol. Finality is instant, so a cleared cycle is final the moment
  > it's included."

## Close — the claim (2:35–3:00)

> "Debts in five currencies clear at one on-chain fixing: only the net moves, and either
> every party settles or none does."

Then one sentence of limits:

> "Creditors receive USDC at the fixing; local-currency settlement waits for StableFX and
> local stablecoins on Arc. The four parties here are my own wallets. It isn't audited."

---

## If something breaks while recording

- **A feed is older than 24 h:** that is the refusal state. Record it as a bonus beat,
  then wait for the next round.
- **An RPC hiccup:** retry. Arc finality is instant, so there's no half-state to recover.
- **Any take with a wallet-popup error:** discard it. Never cut around a failure to
  imply success.
