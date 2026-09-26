# DoraHacks: the Details field

Paste the block below into **Details** on the BUIDL form. It is kept here so it stays
versioned with the figures it quotes; every number in it comes from `film/facts.json`, which
is read off the contract by `npm run film:facts`.

It has to stand on its own. A reviewer reads it inside DoraHacks and may never click through
to the repo, so it repeats the proof rather than pointing at it.

---

**Debts in five currencies clear at one on-chain fixing: only the net moves, and either every party settles or none does.**

Live on Arc mainnet. There is no backend and no database: the chain is the only store, and every figure in the app is a contract read, an event, or a Chainlink answer. Nothing below is a mockup.

**[Demo film, 1:43](https://youtu.be/7cHp11TsOQE)** · **[Live app](https://setoff-omega.vercel.app)** · **[Repo](https://github.com/emmanuelist/setoff)** · **[Contract, Sourcify verified](https://explorer.arc.io/address/0x8A78B1F880eA21dAe046Ff22De9Ccc21027680d6)**

## The problem

Four businesses owing each other in USD, EUR, MXN, BRL and JPY make four payments and buy currency four times, when only the difference needs to move. Netting them is easy arithmetic. The hard part is trust: nobody will act on a net they cannot verify, and no party will pay first, because half-settled is the worst state money can be in. That risk still carries the name of Bankhaus Herstatt, which failed mid-settlement in 1974.

## Proof, on-chain and clickable

**A cycle that settled.** Five debts in five currencies. **4.8718 USDC owed gross, 0.2669 USDC moved, 94.5% set off**, every debt netted in [one transaction](https://explorer.arc.io/tx/0x6f840be9a2501cb80d4223ca7690577b987522c1bf5b7513a418c45f0d0ba10d).

**A cycle that did not.** Two net debtors; one funded, one never did. At the deadline [anyone could void it](https://explorer.arc.io/tx/0x5ec942bfc6c3f551fed264e1477c9b11a098f233708de501242d15564d360e3b), and the funded party's **0.4279625 USDC came back to the wei**: its balance fell by exactly its four transactions' gas, and all three debts returned to the direct path still endorsed. That is the "or none does" half of the claim, on-chain rather than in a test.

**The refusal room.** 17 attempts run against the live contract as read-only calls: stale rates, underpayment, paying someone else's debt, settling a cycle twice. 15 must be refused *by name*, 2 honest controls must clear. The contract answers in its own words, decoded from its revert data: `StaleFixing`, `Underpaid`, `NotDebtor`, `WrongCycleState`.

Every mainnet transaction, with gas and receipts, is in the repo's `docs/EVIDENCE.md`.

## How it works

A debt is recorded by its creditor in the currency it was invoiced in, and counts for nothing until the debtor endorses it. Debts enrol into a cycle until a cutoff. At the cutoff, **one Chainlink read per currency** prices every debt, and that single published rate is the fixing, stored with its round ID. Each party's debts are set off against what it is owed, leaving only its net. Only net debtors fund, once, before the deadline. If all of them do, one transaction credits every net creditor and nets every debt. If even one does not, the cycle is voided and every deposit is refunded in full.

Three properties do the work, each an invariant before it is a function: nets sum to exactly zero at every fixing, so there is no rounding dust; a cycle is settled or void, never partly either; and payouts are withdrawals, never pushes.

## Why Arc specifically

The netting arithmetic would run on any EVM chain. The settlement design would not.

- **USDC is the native currency.** Deposits are plain payments. No ERC-20 approvals, no allowance surface, and gas is paid in the same unit as the debt.
- **A native transfer can revert even with sufficient balance** on Arc, so every payout is a withdrawal and one blocklisted account can only ever block itself.
- **Finality is instant**, which is what makes "either every party settles or none does" enforceable rather than probabilistic.
- **Block timestamps are non-decreasing, not strictly increasing**, so every deadline is written with explicit `>=` and `<`.

Move this to a chain where USDC is an ERC-20 with probabilistic finality and it needs approvals and confirmation delays, which is a different and weaker product.

## Tests

56 passing across 4 suites, with fuzz at 1,024 runs and **7 invariants** at 256 runs over 16,384 calls each. The invariant handler is instrumented to prove it reaches the states it claims to test: across a run it hit `settle` 916 times and `voidCycle` 973 times, so the no-partial-settlement and refund invariants are exercised rather than vacuously true. Failure paths are the point: a stale feed, a negative rate, an unfunded cycle, a recipient that reverts on receipt, repeated block timestamps, rounding at the cap.

## Limits

No audit. The four parties are wallets I control, though every function is open. No currency changes hands: debts are priced in five currencies and settled in USDC at the fixing, so nobody receives pesos or yen. Amounts are dollars rather than thousands, because this is real money on mainnet. Cycles are capped at 16 debts and 8 parties so a fixing fits in one block.

## Worth taking further

Netting is how CLS settles FX and how every clearing house works. What has not existed is a version where the parties can check the net themselves and nobody has to go first. That needs one agreed price, atomic settlement, and no privileged operator, all at once. This is a small working instance of exactly that.

The real version needs local-currency payout, which StableFX and MXNB, BRLA and JPYC make possible without changing the clearing logic, because the netting already happens in a common unit. It needs a way to enrol counterparties who are not already on-chain. It needs a cycle bigger than one block without losing atomicity, which is the first thing I would work on. And it needs an audit before anything with a real balance sheet touches it.


---

# The Submission step

Kept with the Details body so every answer stays next to the figures it quotes.

**Link to your live deployment on Arc mainnet**

```
https://setoff-omega.vercel.app
```

**Arc mainnet contract address or a transaction hash we can verify**

```
Contract: 0x8A78B1F880eA21dAe046Ff22De9Ccc21027680d6
https://explorer.arc.io/address/0x8A78B1F880eA21dAe046Ff22De9Ccc21027680d6
Sourcify exact match (runtime and creation): https://sourcify.dev/server/v2/contract/5042/0x8A78B1F880eA21dAe046Ff22De9Ccc21027680d6

A cycle that settled, five debts netted in one transaction:
https://explorer.arc.io/tx/0x6f840be9a2501cb80d4223ca7690577b987522c1bf5b7513a418c45f0d0ba10d

A cycle that was voided, the funded deposit refunded in full:
https://explorer.arc.io/tx/0x5ec942bfc6c3f551fed264e1477c9b11a098f233708de501242d15564d360e3b
```

**In two sentences, what does your project do?**

```
Debts in five currencies clear at one on-chain fixing: only the net moves, and either every party settles or none does. Each debt is endorsed by the party who owes it, priced once at a single Chainlink fixing on Arc mainnet, and settled in one transaction, or voided with every deposit refunded if any party fails to fund.
```

**What does it use Arc for?**

```
Arc is the settlement layer, and the design depends on it. USDC is Arc's native currency, so net debtors fund with plain native payments: no ERC-20 approvals, no allowances, and gas paid in the same unit as the debt. Payouts are withdrawals because an Arc native transfer can revert even with sufficient balance, so one blocked account can only ever block itself. Instant finality is what makes all-or-nothing settlement enforceable rather than probabilistic. Prices come from the Chainlink EUR, MXN, BRL and JPY feeds live on Arc, and every fixing stores its answer, round ID and update time on-chain.
```

**Anything else we should see?**

```
The refusal room, https://setoff-omega.vercel.app/refusals. Press "Run every attempt" and 17 attempts run against the live contract as read-only calls: 15 must be refused by name, and 2 honest controls must clear.

The voided cycle, https://setoff-omega.vercel.app/cycles/3, is the half of the claim that tests usually skip. One net debtor never funded, the cycle was voided at the deadline, and the funded party's 0.4279625 USDC came back to the wei.

Every mainnet transaction, with gas and receipts, is in docs/EVIDENCE.md. 56 contract tests including 7 invariants, instrumented to prove they actually reach settle and void. Milestone 1's contract, 0xcbEb5Cf09d311f69D7FdF71F80A6BfE513333ce7, stays on-chain as its own record.

Limits, stated plainly: no audit, the four demo parties are my own wallets, and creditors are paid in USDC at the fixing rather than in local currency.
```
