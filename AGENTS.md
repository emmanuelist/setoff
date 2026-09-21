# Setoff — build rules

Debts in five currencies clear at one on-chain fixing: only the net moves, and either every party settles or none does.

This file is the operating contract for every session. If a rule here conflicts with
something inferred from the code, this file wins, and say so rather than quietly following
the code.

**Read next, in this order:**

1. `AGENT_PROGRESS.md` — the phases, the current phase, and open issues.
2. `PRODUCT.md` — product canon.
3. `docs/DECISIONS.md` — why things are the way they are.
4. `docs/RESEARCH.md` — the event, the rubric, and the verified Arc facts.

The built visual system is recorded in `DESIGN.md`, which supersedes any design language
described elsewhere. The frontend's data seam is `DATA_CONTRACTS.md`.

Event: **Arc Microgrants** (Circle, DoraHacks). Hard deadline 2026-10-14 23:59 ET; target
submission 2026-10-07. Solo builder; GitHub `emmanuelist`.

## This is not the stack you know

**Arc is not Ethereum.** USDC is the native currency (18 decimals natively, 6 through its
ERC-20 view, one shared balance). Native transfers can revert even with enough balance.
Block timestamps can repeat. Finality is instant. Read "Arc facts" below before writing any
contract or chain code.

**The libraries have moved on too.** APIs, conventions and file structure may all differ
from your training data. Read the installed type definitions (`node_modules/<pkg>/**/*.d.ts`)
or the guide in `node_modules/<pkg>/dist/docs/` before writing code, and heed deprecation
notices. Never write an SDK call you have not verified against installed types or official
docs.

## Repo layout

```text
packages/contracts  Foundry: Setoff contracts, tests, deploy scripts   [phases 1–2]
apps/web            Next.js frontend, reads the chain via viem          [phases 1, 3–4]
docs/               RESEARCH, DECISIONS, EVIDENCE, RUNOFSHOW
scripts/            check-design.mjs
internal/           strategy, competitor notes, raw evidence — gitignored, never commit
```

There is **no `apps/api` and no `packages/db`**: the chain is the only store (D009).

## Pinned versions

Fill in the rest from what actually installs in Phase 1, and state the prohibition.

| | |
| --- | --- |
| Node | 26.7.0 locally (≥ 22 required) |
| Foundry | 1.4.4-stable |
| viem | 2.56.8 — ships `arc` (5042) in `viem/chains`; do not hand-define the chain |
| Solidity / `evm_version` | **Unpinned — open issue 4.** Arc targets Osaka; verify against Arc's deploy tutorial before the first mainnet deploy |
| Next.js / React / Tailwind | Pin at Phase 1 scaffold (`create-next-app@latest`) |
| TypeScript | 5.x |

## Arc facts

All verified on mainnet on 2026-09-21; see `docs/RESEARCH.md`.

- Chain **5042**. RPC `https://rpc.mainnet.arc.io` (open, no key). Explorer
  `https://explorer.arc.io`.
- **Gas is paid in USDC.** `maxFeePerGas` must be ≥ **20 Gwei** or the transaction hangs.
- **Native USDC has 18 decimals. The ERC-20 view at `0x3600…0000` has 6. They are the SAME
  balance.** Contract accounting uses native units only (D006). Never mix `msg.value` with
  `balanceOf()`.
- **One transfer emits two `Transfer` logs:** one from `0xffff…fffe` (18 decimals) and one
  from `0x3600…` (6 decimals). An indexer reads exactly one of them.
- **A native transfer can revert even with sufficient balance** (runtime blocklist, zero
  address, destroyed account). Hence withdrawals only (D007).
- **Block timestamps are non-decreasing, not strictly increasing.** Write deadlines with
  explicit `>=` and `<`.
- **Finality is instant and deterministic.** Don't wait for confirmations; don't show
  "pending finality".
- **Chainlink `AggregatorV3` proxies** (heartbeat 86,400 s):

  | Pair | Proxy |
  | --- | --- |
  | EUR / USD | `0xDd5B15443cd733D3966a50a3E48cB7DF9Fb5DE0D` |
  | MXN / USD | `0x302eaa6cd6f7AdDdc973fAC2Bb8fa32e9Ce19f21` |
  | BRL / USD | `0x3406DB72AC5136b89eba6808CFcaD83aF523B3C2` |
  | JPY / USD | `0xF9Fc1C20C82d774A3787845E73E41BCbF7F38F25` |

  Read `decimals()` from the feed; never assume it.
- **Don't use:** Pyth (testnet only), StableFX (permissioned), APS privacy (not live),
  ERC-8183 (testnet only).
- **Verification:** `forge verify-contract --verifier sourcify` (D010). The explorer API
  is behind Cloudflare.

## Rules

1. **No mocks, no fake data, no demo mode.** Every rendered value comes from the chain:
   contract state, events, or a Chainlink read. The chain is authoritative for everything.
2. **Verify every SDK call** against installed types or official docs before writing it.
   If a method can't be verified, stop and say so.
3. **Phase-gated.** Build the current phase only, then stop for confirmation. Phases are
   in `AGENT_PROGRESS.md`.
4. **Every write is a transaction, and the UI shows the mined receipt.** Never show an
   optimistic object as if it were done.
5. **Tests cover failure paths:** stale feed, unfunded cycle, blocklist-style reverting
   recipient, repeated timestamps, rounding at the cap.
6. **No secrets in the repo, and no secrets in output.** Keys live only in `.env` (mode
   600). Load them with `set -a; . ./.env; set +a`. **Never `cat`, `echo` or log a
   `*_PRIVATE_KEY`.** Redact it from any error output.
7. **Never scope-cut silently.** Present tradeoffs on technical merit. The only planned
   cut is D002's Sep 30 checkpoint.
8. **Mainnet costs real money.** Keep demo amounts at $0.50–$2. Run every mainnet write
   against a fork (`anvil --fork-url`) first.
9. **Commits are authored by `emmanuelist <emmanuel.paul75@yahoo.com>`** with short,
   imperative, sentence-case subjects and no trailers. Group each commit by what it is.

## Contract conventions

- Native USDC only: `payable` deposits, withdrawal balances, no ERC-20 approvals anywhere.
- No admin key over user funds and no pause over balances. Anything else that needs an
  owner must be justified in DECISIONS.md.
- Every fixing stores the answer, round ID and update time per currency, and emits them.
- Invariants are written before the functions they protect: nets sum to zero at every
  fixing; payouts never exceed receipts; no partial settlement; void refunds every
  deposit.
- Cycles are size-capped so the fixing and settlement fit in one block.

## Frontend conventions

- Direction is set in Phase 0 and recorded in `DESIGN.md`. Tokens live in the app's global
  stylesheet.
- **No component library.** Hand-build against tokens. Headless primitives are allowed for
  behaviour only.
- Token names are semantic and product-flavoured (debit, credit, flat, fixing, void…).
  Never `gray-100`.
- Fonts through the framework's font loader only. **Never add font-CDN `<link>` tags.**
- Every animation checks `prefers-reduced-motion`; timelines are killed on cleanup.
- Async calls wrap in `try/catch` with a shared error component. A failure must never
  strand a flow in a permanent in-flight state.
- **Money at the UI boundary** is a `bigint` in native units (18 decimals) or in the
  currency's minor units. Format for display only. A float never touches money.
- One **signature component** carries the thesis: the cycle statement (gross owed →
  net moved). It gets the design budget, and the video points at it.

## Verification before any gate

```bash
cd packages/contracts && forge build && forge test   # invariants included
npm run lint        # zero warnings
npm run typecheck
npm run build
```

All green. UI work additionally isn't done until it's rendered at 1440 and 390 and
inspected.
