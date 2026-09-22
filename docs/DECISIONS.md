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

## D012 — Skills and templates are inputs, not limits (2026-09-22)

The owner directed that the UI must not be held back by the design skills or the rig
templates, which may be outdated. Their rules are kept only while they make the product
better.

**Why:** v1 of the direction obeyed every rule and read as tables around a number. v2
broke three of them (it added a dark stage, shadows on physical slips, and a looping-free
but heavy authored animation) and made the clearing visible.

## D013 — Toolchain: Arc Foundry, solc 0.8.37, `prague`, a 1-hour fixing grace (2026-09-22)

**Arc Foundry** v0.8.0-1 (Foundry 1.7.1-dev) runs every test with `--network arc`, so the
suite executes under Arc's native-USDC rules rather than plain-ETH semantics. v0.8.0-2
differs from it only in CI and Docker files, and has no Apple Silicon build. The binary's
checksum was verified before install.

**solc 0.8.37** (latest stable) is pinned, with `evm_version = "prague"`. Arc targets
Osaka; Prague bytecode is a strict subset, so no opcode depends on anything newer than
what every Arc node runs.

**`maxFixingAge` = 90,000 s:** Chainlink's 24 h FX heartbeat plus 1 h of grace for a late
update. Anything older is refused. The grace period is short enough that a rate can never
be more than one missed heartbeat stale.

**forge-std v1.16.2** is a pinned git submodule, not a vendored copy.

## D014 — The app reads contract views, not event history; no Tailwind (2026-09-22)

Arc's public RPC caps `eth_getLogs` at **10,000 blocks** (measured), and Arc produces about
100,000 blocks a day. Scanning history per page load would need about 140 calls by
submission.

- **State comes from contract views** (`debtCount`, `debt`, `quote`, `fixingOf`,
  `withdrawable`), batched through Multicall3 at `0xcA11…CA11`.
- **One event is read:** the `Paid` receipt for a single debt, located from the debt's
  own `closedAt` and fetched in one bounded window.
- **Past blocks are final (deterministic finality),** so a receipt read once never
  changes and is cached for the life of the server process.
- **Pages render per request** (`connection()`), so every figure is live chain state,
  never a build-time snapshot.

**No Tailwind.** The design system is bespoke tokens and hand-built components, and the
proven specimen is plain CSS. Tailwind would duplicate every token in a second system.
Tokens live in `app/globals.css`, with CSS Modules per component. *Superseded by D016.*

## D015 — A refusal room, run against the live contract (2026-09-22)

The winning projects share one pattern: the visitor makes the *live* system refuse invalid
actions.

- **Clasp** has a Security Lab: "Attack the wallet. Watch it win."
- **Morrow** has a Proof Room, whose replay is "a read-only `eth_call`".
- **Meritr** makes the live precompile accept a real proof and refuse a forged one.

Setoff's `/refusals` runs twelve attempts as read-only `eth_call`s against the deployed
contract at the latest block, and decodes each revert with the contract's own ABI.

- **Nothing is mocked.** Every result is the contract's own answer.
- **Where an attempt needs the world to be different,** the override is shown on the
  attempt itself. There are three: time moved 26 h forward (a stale fixing), and a 100 USDC
  balance for two callers (so the node can't refuse the call before the contract does).
- **The attempts use real debts:** №0001 (paid) and №0002 (endorsed).
- **A call that never reaches the contract is shown as a failure** on its own row, never
  as a refusal, and running the next attempt never hides it.

## D016 — Rebuild the app on UI libraries, in a skeuomorphic clock room (2026-09-22)

The owner judged the hand-built interface not good enough and asked for skeuomorphism,
minimalism and a bento grid, built on real UI libraries. This supersedes D014's
"no Tailwind, no component library". D014's data rules (contract views, bounded log reads,
per-request rendering) stand.

- **Stack:**
  - Tailwind CSS 4 over the existing tokens, with the framework palette switched off.
  - shadcn/ui on Radix for popover, tooltip and toggle group.
  - Motion for springs and shared layout.
  - NumberFlow for rolling figures, lucide for icons.
  - Styled kits (MUI, Chakra and the like) stay out: they would bring someone else's look.
- **World: the clock room.** The chain is the master clock (live block and chain time on
  every page). Each currency's fixing is a gauge whose needle is the rate's age against the
  contract's own refusal limit, with the red band past it. Debts are cards of
  currency-tinted stock, punched at the chain's time in recorder ribbon:
  - violet for signed acts;
  - red for late or refused;
  - perforated when paid.
- **The mark laws carry over unchanged.** Violet only for signing. Red only for refused or
  returned. Currency colour only for currency.
- **Gradients appear only as physical light on physical objects** (steel bezels, glass,
  key caps), never as colour fields. That keeps PRODUCT.md's "no gradients" commitment
  in spirit.
- **The v3 particle floor** is deferred to milestone 2, where a real cycle gives it data.
  A floor without a real cycle would be decoration.

