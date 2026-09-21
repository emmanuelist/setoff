# Research — closed 2026-09-21

Conclusions only. Sources: the official DoraHacks rules page (read through a reader
proxy; the site is CAPTCHA-walled), Arc docs (`docs.arc.io`), Circle's launch release and
StableFX docs, Arc's own post-hackathon write-ups, the DoraHacks Circle/Arc ideas post,
DefiLlama, Chainlink's feed directory, GitHub, and **direct calls to Arc mainnet RPC**.
Every chain fact marked *verified* was checked on-chain on 2026-09-21. Raw evidence is in
`internal/evidence/` (gitignored).

## Verdict

**Enter, as a small build.** Budget 1–2 weeks and submit by **Oct 7**. Reviews happen as
entries arrive, and earlier submissions get earlier answers.

Recommended direction: **multi-currency obligation clearing**. Parties record debts to each
other in USD, EUR, MXN, BRL, JPY and other currencies. At a set time the contract fixes
exchange rates from Chainlink, nets everyone's debts, and settles only the differences, in
USDC, all at once or not at all. The fallback is the first milestone of the same build
(FX-denominated obligations), so choosing it wastes nothing. See § Candidates.

## The event

Arc Microgrants, hosted by Circle on DoraHacks. **Twenty grants of 500 USDC** from a
10,000 USDC pool, paid in USDC on Arc. Non-dilutive: no equity, no IP transfer, no
exclusivity. Opened 2026-09-16.

**Deadline: 2026-10-14 23:59 ET (2026-10-15 03:59 UTC).** All decisions are issued by Oct 21.

**Review process:** submissions are screened for completeness and fit. Shortlisted
projects are then scored and decided in batches, and selected builders pass a private
verification step before payout.

**Field size:** 366 hackers had registered by day 5. The public BUIDL gallery shows none,
because submissions are not publicly listed.

**Submission needs:**

- A live deployment on **Arc mainnet** with a link reviewers can open
- A public repo
- A short description of what the project does and what it uses Arc for
- A public GitHub, X or Farcaster profile

**Not eligible:** design mockups, slide decks, testnet-only builds, projects with no Arc
component, and work already funded by a Circle or Arc program.

**Other rules:**

- Pseudonymous submissions are fine.
- One submission per project, but one builder may submit several distinct projects.
- Hackathon continuations are eligible.

**What winners get besides cash:** office hours, introductions, and *"a route into the
Circle Grant Program"*.

## Judging — verbatim

> *"Relevance to Arc, technical credibility, the quality of what you built, and whether
> the project is worth taking further. Promise counts for more than traction here."*

There is no live pitch. Reviewers judge from one link, the repo and a short description,
so **the README and the live app are the entire pitch**. Plan a demo video for the README
even though the form doesn't ask for one.

## Sponsor intent

**Circle's launch release** positions Arc as *"purpose-built for financial markets,
real-time money movement, and agentic economic activity."* It stresses gas paid in USDC,
StableFX for *"24/7 programmable FX"*, and *"Sub-second finality… Final means final."*
The founding validators are BlackRock, DTCC, ICE, Visa, Mastercard, Standard Chartered and
others. The audience is institutional.

**Arc's own post-mortems** of its 2026 hackathons are the most useful source:

- HackMoney 2026: *"97% of submissions incorporated experimental AI agents."*
- Cannes 2026: *"98% centered on agentic economy applications"*. Nanopayments were at the
  core of 4 of the 6 winning projects.
- The critique, verbatim: ***"Most submissions built familiar workflows that use
  stablecoins for settlement, not new financial primitives."***

**Arc Builders Fund** (Circle Ventures, 26+ investors) lists these verticals:

- always-on markets
- RWAs and credit
- **FX infrastructure**
- agent commerce
- IoT/energy/compute

**The DoraHacks Circle/Arc ideas post** proposes four tracks: capital expressway, on-chain
FX, the silicon economy (agents), and inclusion. It names *internal treasury netting*,
*local-first checkout*, an *autonomous multi-currency treasury* and an *FX aggregator*.

**Reading:** Circle's story centres on FX and treasury, and very few builders go there.
Agents are where nearly everyone goes. A new primitive beats a new checkout flow.

## Past Arc winners

| Event | Winners (one line each) |
| --- | --- |
| HackMoney 2026 ($10k) | arctan(x) — cross-chain FX DEX with unified margin · Text-to-Chain — SMS wallet · ArcFlow — payroll float earns yield before paying out · Versus — agent-run creator tokens |
| Cannes 2026 ($15k) | Onda, PayMate, NanoCrawl, ETHastic, VEIL VPN, C.E.S.T.A, Predict It!, PolyPOP — nanopayments, mesh payments, prediction markets |

What won: a single clear claim, a real use of a Circle primitive, and FX or treasury
mechanics that go beyond "pay with USDC".

## Saturation — Arc mainnet, first 11 days

58 Arc repos were created on GitHub since Sep 10. The search wasn't exhaustive, so the
real field is larger. Named list: `internal/competitors.md`.

| Lane | Count | Status |
| --- | --- | --- |
| Payments, invoices, escrow, payouts, subscriptions, tips, claim links | ~15 | **Saturated** |
| x402, nanopayments, pay-per-call APIs, agent payments | ~10 | **Saturated** |
| Receipts, explorers, dashboards, monitors | ~12 | Saturated, low value |
| Launchpads, memes, PoW NFTs | ~10 | Irrelevant to judges |
| Uniswap v4 hooks, swap guards | ~5 | Moderate |
| Dev tooling (CCTP reference, chain kits) | ~4 | Moderate |
| **FX, treasury, netting, lending-composed, reserve-gated** | **0** | **Open** |

The quality bar is high. One serial hackathon winner has two polished entries (57 and 45
commits in 3–4 days), with thesis-style names, custom icons and live mainnet evidence.

## Verified chain facts (mainnet, 2026-09-21)

| Item | Status | How verified |
| --- | --- | --- |
| Chain ID 5042, native USDC | Live | `eth_chainId` |
| Public RPCs (`rpc.mainnet.arc.io`, drpc, blockdaemon, quicknode) | **Open, no key** | `eth_blockNumber` on all four |
| Contract deploys | **Open to anyone** | `eth_estimateGas` for a contract creation from an unfunded address succeeds. The DoraHacks Q&A claim that all RPCs are permissioned is wrong. |
| Gas | 20 Gwei floor; a 2M-gas deploy costs about **$0.04**, a transfer about $0.0004 | `eth_gasPrice` |
| USDC `0x3600…0000` (ERC-20 view, 6 dec; native 18 dec, **same balance**) | Live | bytecode |
| EURC `0xbEf5…21c1`, cirBTC `0x171A…bAA0` | Live | bytecode |
| CCTP v2 (domain 26), Gateway, Permit2 | Live | bytecode |
| Memo `0x5294…e505`, Multicall3From `0x522f…47D0` (caller-preserving batch calls, Arc-only) | Live | bytecode |
| **Chainlink: 32 feeds**, including EUR, JPY, MXN, BRL, KRW, CAD, AUD, ARS vs USD, plus EURC/USD, USDC/USD and cirBTC reserves | **Live** | `latestRoundData`: EUR/USD 1.1486, updated within 24 h. Heartbeat is 24 h, deviation threshold 0.3–0.5 %. |
| ERC-8004 identity and reputation registries | Live at the **canonical** addresses `0x8004A169…` / `0x8004BAa1…` | bytecode. Arc docs list `0x8004A818…`, which is **empty on mainnet**. |
| ERC-8183 AgenticCommerce `0x0747…4583` | **Testnet only** | no code on mainnet |
| Pyth | **Don't use.** Pyth lists Arc testnet only; the mainnet address has code but reverts Pyth calls. | `eth_call` |
| StableFX | **Unavailable to us.** Permissioned, for vetted institutions only. | Circle docs |
| Opt-in privacy (APS) | **Not live** (*"not yet available"*) | Arc docs |
| USYC | Institutions only, $100k minimum, allowlisted | Arc docs |
| DeFi to compose with | Arc TVL $345M: Morpho Blue $189M, Aave V4 $127M, Uniswap V3 $15M / V4 $8M, Aerodrome | DefiLlama |
| viem | 2.56.8 ships `arc` (5042) with all four RPCs | package source |
| Foundry | 1.4.4 installed locally; Arc targets the Osaka EVM | `forge --version` |
| Contract verification | The explorer API returns a Cloudflare 403 from the CLI. **Sourcify supports 5042**, so use `--verifier sourcify`. | HTTP checks |
| Funding a wallet | USDC withdrawals direct to Arc are **enabled** on **Binance** (0.02 USDC fee, 0.1 minimum), **KuCoin** (1 USDC fee, 2 minimum) and **Gate** (0.01 minimum). OKX and Kraken are reported as supported, but I couldn't check them without an API key. Coinbase doesn't support Arc, so withdraw to Base and bridge with CCTP. Lookalike bridges charge 0.5–4 %. | Exchange public APIs, 2026-09-21 |

**EVM traps that will bite** (from Arc's EVM differences page):

- 18 vs 6 decimals on one USDC balance. Never record the 6-decimal view as the credited
  amount.
- **One transfer emits two `Transfer` logs**: one from the system emitter `0xffff…fffe`
  (18 decimals) and one from the USDC contract `0x3600…` (6 decimals). An indexer that
  reads both double-counts. Observed on our own funding tx `0xa393…68c8`
  (block 22,060,222).
- Sending value to the zero address reverts.
- Blocklist reverts consume gas without a receipt.
- Native value sent to a contract isn't guaranteed to arrive.
- Block timestamps are non-decreasing but can repeat.
- The base fee isn't burned.

**Local environment:** the first `npm install` in the agent sandbox failed with an OpenSSL
GCM error. The retry succeeded, so the failure was transient. viem 2.56.8's built-in `arc`
chain was checked end to end: chain ID 5042, the live block number, gas at 21.5 Gwei, and a
Chainlink EUR/USD read of 1.146365. If an install fails, retry before debugging.

## Candidates — scored

Each dimension is scored 1–5; 5 is best.

| # | Candidate | Arc fit | Sponsor intent | Open lane | Buildable in ~2 wk | Demo | Worth taking further | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **1** | **Multi-currency obligation clearing** — obligations in any Chainlink-fixed currency, netted at a published fixing, settled in USDC all at once or not at all | 4 | 5 | 4 | 3 | 5 | 5 | **26** |
| 2 | FX-denominated obligations — invoices priced in MXN/BRL/EUR, paid in USDC at the on-chain fixing (milestone 1 of #1) | 4 | 3 | 5 | 5 | 4 | 3 | 24 |
| 3 | cirBTC reserve circuit breaker — accept cirBTC only while Chainlink proof of reserves covers supply | 5 | 3 | 5 | 4 | 2 | 3 | 22 |
| 4 | Agent spend mandates (x402 + ERC-8004) | 3 | 4 | 1 | 4 | 4 | 3 | 19 |
| 5 | Yield-bearing escrow on Morpho | 2 | 3 | 2 | 4 | 3 | 3 | 17 |

### Why #1

**It's the "new financial primitive" Arc says it isn't getting.** Multilateral netting is
how treasuries and CLS Bank avoid moving gross amounts. On Arc it becomes one permissionless
cycle: many obligations, one fixing, at most one transfer per party.

**Why Arc specifically.** Every piece below was verified on mainnet today:

- Circle's two stablecoins are native, and gas is paid in the settlement asset.
- Chainlink fixes for eight currencies are live.
- Finality is deterministic. A netting cycle is only as safe as its weakest leg, and no
  reorg can undo one leg after the others have settled.
- Arc's roadmap adds local-currency stablecoins through StableFX, which would let a later
  version settle in MXN or BRL stablecoins instead of USDC equivalents.

Stated honestly: the netting math itself would run on any EVM chain. The Arc case rests on
the asset, oracle and finality stack together.

**The beats:**

- **Signature:** "gross owed $X → actually moved $Y". The collapse of the obligation graph
  is the thing the demo points at.
- **Reversal:** one debtor misses the funding deadline, so **nothing moves** and every
  deposit becomes refundable. All at once or not at all.

**Mainnet footprint:** $6 of working balance: about $1 of gas for the deployer and about
$1 in each of four party wallets. Demo debts are $0.50–$2 each, so the numbers shown are
real but small. Money actually spent (gas plus withdrawal fees) is under $0.50. The rest
stays in our own wallets and can go back to Binance at the end.

**Risks:**

1. **The demo parties are our own wallets.** Say so plainly, and keep cycles
   permissionless so reviewers can open their own.
2. **The fixing can lag the market.** A 24 h heartbeat and 0.5 % deviation threshold mean
   the fixing can be up to 0.5 % off. Treat it as a published fixing, not an execution
   price, and refuse stale rounds.
3. **Correctness.** Nets must sum to zero at every fixing. Write invariant tests before
   any UI.
4. **Collision.** PhiBao, already entered here with `wdrop`, built Canton netting
   (`netsettle`). The lane could close, so **speed matters**.

### Rejected

- **Anything x402, nanopayment or agent-payment.** That lane is 97–98 % of every previous
  Arc field and about 10 repos here already.
- **Escrow, invoices, payouts, checkout.** About 15 repos, and this is the "familiar
  workflow" Arc criticised.
- **StableFX, APS privacy, USYC, ERC-8183.** Permissioned, not live, or testnet-only.
  Each would fail the mainnet requirement or be unusable.
- **Pyth-based designs.** No working mainnet deployment.
- **cirBTC circuit breaker (#3).** Strong Arc fit, but the reversal can't be shown
  honestly on mainnet because we can't make reserves fall.

## Honest expectations

- **Cash:** 500 USDC per grant, 20 slots.
- **Field (estimate, not data):** 366 registrations on day 5, with 3 weeks still to go.
  At typical DoraHacks attrition, expect 150–400 submissions, of which perhaps 30–60 are
  serious.
- **Odds (a guess):** a top-tier entry in an open lane has maybe a one-in-three chance.
- **The larger upside:** the route into the Circle Grant Program, and credibility in the
  one Builders Fund vertical (FX infrastructure) that almost nobody is building for.
- **Cost:** under $0.50 actually spent, $6 of recoverable working balance, and 1–2 weeks
  of work.

## Timeline

| Date | Step |
| --- | --- |
| Sep 22–23 | Foundation: thesis, name, rig, repo |
| Sep 24 – Oct 3 | Build: contracts and invariants first, then the signature surface |
| Oct 4–6 | Proof surface (README, video, Sourcify-verified contracts), then Benchmark |
| **Oct 7** | Submit |
| Oct 14 23:59 ET | Hard deadline |
| Oct 21 | Decisions |

## Open decisions (yours)

1. Candidate #1, or #2 on its own?
2. Where does the USDC come from: OKX, Kraken or Gate directly, or Base plus CCTP?
3. ~~Solo or team, and public or pseudonymous?~~ **Decided 2026-09-21: solo, under own
   name.**

## Sources

- [Arc Microgrants — DoraHacks](https://dorahacks.io/hackathon/arc-microgrants/detail) · [Q&A](https://dorahacks.io/hackathon/arc-microgrants/qa)
- [Circle — Arc mainnet launch](https://www.circle.com/pressroom/circle-launches-arc-mainnet-an-economic-operating-system-for-the-internet)
- [Arc — HackMoney 2026 winners and learnings](https://www.arc.io/blog/meet-the-arc-track-winners-from-the-hackmoney-2026-hackathon-and-what-we-learned) · [Cannes 2026](https://www.arc.io/blog/meet-the-arc-track-winners-from-ethglobal-cannes-hackathon-and-what-we-learned)
- [Circle — Arc Builders Fund](https://www.circle.com/blog/introducing-the-arc-builders-fund)
- [DoraHacks — Start-up Ideas 2026 Pt.1 (Circle/Arc)](https://dorahacks.io/blog/news/start-up-ideas-pt1-2026)
- Arc docs: [connect](https://docs.arc.io/arc/references/connect-to-arc) · [contract addresses](https://docs.arc.io/arc/references/contract-addresses) · [EVM differences](https://docs.arc.io/arc/references/evm-differences) · [gas](https://docs.arc.io/arc/references/gas-and-fees) · [privacy](https://docs.arc.io/arc/concepts/opt-in-privacy) · [agentic economy](https://docs.arc.io/build/agentic-economy)
- [Circle — StableFX](https://developers.circle.com/stablefx) · [Chainlink feed directory (Arc mainnet)](https://reference-data-directory.vercel.app/feeds-arc-mainnet.json) · [DefiLlama](https://defillama.com/chain/arc)
- [Funding: exchange support and CCTP](https://docs.arc.io/integrate/exchanges/cctp-bridging)
