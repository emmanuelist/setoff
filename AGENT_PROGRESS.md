# Phases

Build the current phase only, and stop at each gate for confirmation.

**A phase closes when:**

- Contracts: `forge build` and `forge test` are green, the invariant suite included.
- App: lint (zero warnings), typecheck and build are green.
- UI phases: the surface has also been rendered at 1440 and 390 and inspected.
- Mainnet phases: every deployed address is Sourcify-verified and recorded in
  `docs/EVIDENCE.md`.

Hard deadline: **2026-10-14 23:59 ET**. Target submission: **2026-10-07**.
Decisions log: `docs/DECISIONS.md`. Research: `docs/RESEARCH.md`.

- [x] **Foundation — 2026-09-21.** Research closed; name and claim chosen; rig scaffolded;
      PRODUCT.md, DECISIONS.md and this plan written; mainnet wallets funded.
- [x] **Phase 0 — Direction (Sep 22).** World: *the clearing room*. v3 floor: money as
      light, and a clearing you can scrub through owed → fixed → novated → set off, where
      mutual debts annihilate into exactly the net. Party focus cards; a statement below.
      Recorded in DESIGN.md (v3, D012). Specimen `internal/design/specimen-v3.html`,
      verified at 1440 and a true 390 across every stage: 120 fps, no collisions, clipping
      or overflow, contrast measured. docs/RUNOFSHOW.md is scripted as a 3-minute video
      with a Herstatt cold open.
- [x] **Phase 1 — Milestone 1: debts priced in currency (done 2026-09-22, ahead of Sep 27).**
      *Contracts:* 27 tests, 4 invariants and 2 mainnet-fork tests are green; deployed at
      `0xcbEb…3ce7`, Sourcify exact match; debt #1 paid live on mainnet.
      *App:* Next 16 at `apps/web`, reading contract views live (D014), with an EIP-6963 wallet
      and one write lifecycle. Pages: debts ledger with the live fixing board, the debt slip
      (endorse / pay / withdraw, real perforation, fixing receipt), and record a debt.
      *Verified:* lint 0, typecheck 0, build green; rendered at 1440 and 390; the full UI
      write path (propose → endorse → pay → withdraw) ran end to end on an Arc mainnet fork.
      *Still to do by hand:* the same flow on mainnet with a real browser wallet.
      *Added:* the refusal room (`/refusals`, D015). Twelve read-only attempts against the
      live contract, 12 of 12 matching their rule.
      *Redesigned (D016, 2026-09-22):* the app is rebuilt on Tailwind 4, shadcn/Radix,
      Motion, NumberFlow and lucide, in the clock-room world. It has the chain clock, a fixing
      gauge per currency, debts as punched card stock, and a recorder tape in the refusal
      room. Lint 0, typecheck 0, build green, rendered at 1440 and 390. Two impeccable
      finish-review rounds were run and their fixes applied.
      `packages/contracts`: propose → accept → pay-direct at a Chainlink fixing, with the
      stale-rate refusal and withdrawals. Include failure-path tests. Deploy to Arc mainnet
      and verify on Sourcify. Scaffold `apps/web` (create-next-app@latest, pin real
      versions in AGENTS.md) and build one real flow: propose, accept, pay, with the fixing
      receipt shown. **At this point the project is submittable on its own.**
- [x] **Phase 2 — Milestone 2: the netting cycle, contracts only (done 2026-09-22, ahead of
      the Sep 30 checkpoint).**
      `Setoff.sol` now carries both paths (D019): open → enrol → fix → fund → settle | void,
      with pull payouts and caps of 16 debts and 8 parties (D017, D018).
      *Tests:* 60 green: 23 direct-path, 26 cycle, 7 invariants, and 4 mainnet-fork tests.
      The fork tests settle a five-currency cycle, and void one, at the live Chainlink fixing.
      The four promised invariants hold (nets sum to zero at every fixing; payouts never
      exceed receipts; no partial settlement; a void refunds every deposit), plus three for
      solvency, per-party totals, and debts closing only on their own path.
      *Reach, measured:* of 257 invariant runs, 215 fix a cycle, 76 settle one, 165 void one,
      and 65 void one holding deposits. See `afterInvariant` in the suite.
      *Size and gas:* 19,142 bytes runtime (5.4 KB under the limit). At the caps, a fixing
      costs about 631k gas and a settlement about 126k. A simulated mainnet deploy succeeds,
      estimated at about 5.7M gas.
      *Deployed (gate confirmed):* `0x8A78…80d6`, block 22,187,522, from commit `9b57f3c`, for
      0.113 USDC. Sourcify exact match on creation and runtime. The app still reads
      milestone 1's contract; it moves in Phase 3.
      **CHECKPOINT Sep 30:** met. The invariant suite is green, so milestone 2 stays in.
- [x] **Phase 3 — The signature surface (built 2026-09-22, ahead of Oct 1–3; awaiting the
      gate).** The cycle statement: gross owed per currency collapsing to the net actually
      moved, with every figure linked to its transaction or read.
      *App on milestone 2:* the app reads `0x8A78…80d6` (D019).
      - Pages: `/cycles` (list), `/cycles/[id]` (the statement, schedule timer, next act, the
        cycle's debts and fixing, and its on-chain trail), `/cycles/new` (open a cycle).
      - The home page carries the latest cycle; recording a debt offers "Where it clears";
        debt pages know netted debts.
      - Fix, fund, settle and void are each offered only when the contract would accept them.
      *On mainnet:*
      - Specimen debts #1 (paid) and #2 (endorsed) were recreated.
      - **Cycle #1** ran end to end: 4.87182906 USDC owed across five currencies,
        0.2669278 USDC moved (94.5 % set off). Every transaction is in `docs/EVIDENCE.md`.
      - The drills are committed and rehearsed on a fork first: `scripts/mainnet/specimen.sh`,
        `script/OpenCycle.s.sol`, `script/ClearCycle.s.sol`.
      *Refusal room:* 17 of 17 attempts match their rule, five of them against the real
      settled cycle.
      *Verified:* lint 0, typecheck 0, build green, `check-design` agrees, the impeccable
      detector is clean, rendered at 1440 and 390.
      *Since shown on mainnet by Phase 4:* a cycle Open, Fixed and Void, and cycle #2 sitting
      past its deadline in the state the app offers to void.
- [x] **Phase 4 — The reversal.** Done 2026-09-23, eleven days early. Cycle #3 on mainnet:
      two net debtors, one funded, one never did, voided after the deadline. C's 0.4279625
      USDC deposit came back to the wei, and all three debts returned to the direct path
      still endorsed. Receipts and the verification reads are in `docs/EVIDENCE.md`.
      Drill: `scripts/mainnet/void.sh`.
- [ ] **Phase 5 — Proof surface (Oct 5–6).** Mostly done, 2026-09-23.
      *Done:* README rebuilt as a proof surface with every link checked; MIT LICENSE and a
      CI workflow that runs the app gate (green); app deployed to
      <https://setoff-omega.vercel.app>; demo filmed and published at
      <https://youtu.be/4KKoGLYV9E0> (1:41, 1920x1080, word-level captions).
      *Left:* the honest-limits pass over the submission copy, and a read of the whole
      README from a cold browser on a phone.
- [ ] **Phase 6 — Benchmark and submit (Oct 7).** Pressure-test against the rubric, fix
      only what matters, then submit on DoraHacks with the claim verbatim.

**Current phase:** 4 done; next is 5. Phases 1-4 are committed, with the design passes run over the
app on 2026-09-22 (typeset, clarify, layout, harden, adapt, audit, animate, polish). The
audit scored 17/20; its snapshot and the dismissed detector findings are in `.impeccable/`.
Rendered and inspected at 1440 and 390 on the home, cycle and debt pages.

The home and cycle pages now stream: every read still goes out in one wave, but each plate awaits
its own slice inside a `Suspense` boundary, so the shell paints first. **Home TTFB 3.44s → 0.016s;
the cycle page 4.44s → 0.40s.** `/debts/[id]` (1.7s) and `/cycles` (1.4s) are each a single wave
and still block; stream them the same way if they ever matter.

Phase 5 next: the README as a proof surface, the app deployed, the video. Carried in: cycle #2 is
litter, `Open` and empty past its deadline, voidable by anyone.

**Measured on 2026-09-23:** Arc's public RPC is load-balanced and **not read-your-writes
consistent**: a read issued straight after a write can land on a node a block behind and be
refused with `request beyond head block`. It cost one wasted `openCycle` (cycle #2, now litter).
A local fork is a single consistent node and cannot reproduce it, so any mainnet script that
reads after a write needs a retry.

**Measured on 2026-09-22:** Arc's public RPC answers in about 1.4s per round trip, so a
page costs one round trip per *wave* of reads, not per call — multicall batching is already
on. Home was 3.44s TTFB after batching its reads and cutting `readCycle` from five waves to
three; it was 6.30s before. Any new surface should start every read it can in one wave.

## Open issues

Track here until the GitHub repo exists, then move them to GitHub Issues.

1. ~~**Enrolment consent.**~~ Resolved, D017: a debt names its cycle when proposed, and
   the debtor consents by accepting.
2. ~~**Rounding.**~~ Resolved, D018: each debt is priced once and applied to both sides, so
   the nets sum to exactly zero and there is no dust.
3. ~~**Stale-feed grace period.**~~ Resolved, D013: 1 h, so `maxFixingAge` is 90,000 s.
   The UI must state it.
4. ~~**evm_version and solc.**~~ Resolved, D013: solc 0.8.37 and `prague`, tested with Arc
   Foundry `--network arc`.
5. **Memo contract (Phase 2, optional).** Tag funding and settlement legs through Arc's
   Memo contract `0x5294…e505` for reconciliation. Decide on merit, and don't bolt it on.
6. **Wallet UX for the demo (Phase 3).** Import the four party keys into a browser wallet
   and switch accounts on camera. No server-side signing: that would be a demo mode.
7. **Surplus USDC.** The deployer holds about 15 USDC and the build needs about 3. The user
   was offered a return of the surplus to their Binance account.
