# Decisions

Newest last. A decision is replaced by a new entry, never by editing the old one.

## D001 — Enter Arc Microgrants (2026-09-21)

Twenty grants of 500 USDC, reviewed as entries arrive; deadline 2026-10-14 23:59 ET. The
prize is small, but the lane is open, the cost is small, and a grant leads into the Circle
Grant Program. Evidence: `docs/RESEARCH.md`.

## D002 — Build multi-currency clearing, with milestone 1 as the fallback (2026-09-21)

It scored highest of the five candidates in research. It answers Arc's published critique
(*"familiar workflows… not new financial primitives"*), sits in the lane with zero
competitors, and matches Circle's FX and treasury focus.

**Fallback rule:** if the Phase 2 invariant suite isn't green by **Sep 30**, milestone 2 is
dropped and milestone 1 (currency-priced debts paid directly at a fixing) is submitted on
its own. Milestone 1 is built first, so no work is wasted either way.

## D003 — Name: Setoff; claim fixed verbatim (2026-09-21)

*"Debts in five currencies clear at one on-chain fixing: only the net moves, and either
every party settles or none does."*

In law, set-off is the right to cancel mutual debts against each other. Collision check:
no crypto projects on GitHub, npm name free, no protocol by that name on the web. The claim
is used unchanged in the repo description, the README subtitle, the submission form and
the video's closing line.

The five currencies are USD, EUR, MXN, BRL and JPY: every one has a verified live Chainlink
feed on Arc mainnet, with USD as the base.

## D004 — Solo, under the owner's own name (2026-09-21)

The GitHub account is `emmanuelist`. No pseudonym, so the builder profile the submission
requires is that account.

## D005 — Fund mainnet from Binance on the ARC network (2026-09-21)

Binance's public API showed Arc USDC withdrawals enabled at a 0.02 USDC fee, and there's no
bridge step to get wrong.

- Five wallets were generated locally with `cast wallet new`. Keys live only in `.env`
  (mode 600, gitignored) and are never printed.
- The user sent about 19.96 USDC. Each of the four parties got 1.25, and the deployer keeps
  the rest.
- Real spend for the whole build is expected to be under 0.50 USDC. The rest is working
  balance, to be returned to Binance after decisions on Oct 21.

## D006 — Settle in native USDC only (2026-09-21)

Deposits are payments of native USDC to `payable` functions, and accounting uses the
18-decimal native units. The ERC-20 interface at `0x3600…` never enters contract maths.

**Why:** on Arc, native USDC and its ERC-20 view are one balance with different decimals.
Mixing them is a 10¹² error that Arc's docs warn about. Native payments also remove
approvals and allowances entirely, which is a real reduction in attack surface and only
possible where USDC is native.

## D007 — All payouts are withdrawals (2026-09-21)

Settlement and refunds credit withdrawable balances, and parties withdraw their own. The
contract never pushes value to a list of recipients.

**Why:** on Arc a native transfer can revert even with enough balance (runtime blocklist,
zero address, destroyed account). In an all-or-nothing cycle, a push to one blocked
creditor would revert settlement for everyone, and a hostile party could freeze a cycle
deliberately. With withdrawals, one bad recipient only blocks itself.

## D008 — Rates from Chainlink on Arc; stale rates refused (2026-09-21)

Rates come from Chainlink `AggregatorV3` feeds on Arc mainnet. Each fixing stores the
answer, round ID and update time, and reverts if the update time is older than the
heartbeat plus a grace period. USD debts settle 1:1 in USDC.

**Why:** Pyth lists Arc testnet only; its mainnet address has code but reverts Pyth calls.
StableFX is permissioned. Chainlink has 32 live feeds on Arc, verified by reading them.

## D009 — No backend, no database (2026-09-21)

The chain is the only source of truth. The app reads contract state and events through
viem, and nothing is cached server-side as authoritative.

**Why:** it makes "nothing here is a mockup" true by construction. The rig's
`apps/api` and `packages/db` directories are deliberately absent.

## D010 — Verify contracts through Sourcify (2026-09-21)

`explorer.arc.io`'s API is behind a Cloudflare challenge (403 from the CLI). Sourcify
lists chain 5042 as supported, so we use `forge verify-contract --verifier sourcify`.

## D011 — Demo parties are our own wallets, and we say so (2026-09-21)

The four party wallets belong to the builder. The README and the video say so plainly.
Every contract function is permissionless, so a reviewer can open their own debts and
cycles. The amounts are small and real rather than large and fake.
