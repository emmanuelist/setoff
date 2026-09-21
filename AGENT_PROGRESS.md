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
- [ ] **Phase 0 — Direction (Sep 22).** Run `/premium-product-design`. Record the world,
      the state tokens and the signature component in DESIGN.md. Draft
      docs/RUNOFSHOW.md as a **~3-minute video**, since there is no live pitch. No feature
      code.
- [ ] **Phase 1 — Milestone 1: debts priced in currency (Sep 23–27).**
      `packages/contracts`: propose → accept → pay-direct at a Chainlink fixing, with the
      stale-rate refusal and withdrawals. Include failure-path tests. Deploy to Arc mainnet
      and verify on Sourcify. Scaffold `apps/web` (create-next-app@latest, pin real
      versions in AGENTS.md) and build one real flow: propose, accept, pay, with the fixing
      receipt shown. **At this point the project is submittable on its own.**
- [ ] **Phase 2 — Milestone 2: the netting cycle, contracts only (Sep 27–30).**
      create → fix → fund → settle | void, pull payouts, and size caps. Invariant tests:
      nets sum to zero at every fixing; the contract never pays out more than it received;
      no partial settlement; void refunds every deposit.
      **CHECKPOINT Sep 30:** if the invariant suite isn't green, drop milestone 2 and go
      to Phase 5 with milestone 1 (D002).
- [ ] **Phase 3 — The signature surface (Oct 1–3).** The cycle statement: gross owed per
      currency collapsing to the net actually moved, with every figure linked to its
      transaction or read.
- [ ] **Phase 4 — The reversal (Oct 4).** A real mainnet cycle voided by an unfunded
      party. Every deposit refunded, visible on-chain and in the app.
- [ ] **Phase 5 — Proof surface (Oct 5–6).** README as proof surface, deployed app, demo
      video, verified contracts, honest limits, all links clicked.
- [ ] **Phase 6 — Benchmark and submit (Oct 7).** Pressure-test against the rubric, fix
      only what matters, then submit on DoraHacks with the claim verbatim.

**Current phase:** 0

## Open issues

Track here until the GitHub repo exists, then move them to GitHub Issues.

1. **Enrolment consent (Phase 2 design).** Does a debt name its cycle when proposed (so the
   debtor consents by accepting), or can either party enrol it later? Leaning: named at
   proposal. It's simpler, and consent is explicit.
2. **Rounding (Phase 2).** Conversions must never let credits exceed debits. Round debits
   up and credits down, and decide where the dust goes. It is bounded and must be written
   down.
3. **Stale-feed grace period (Phase 1).** The heartbeat is 86,400 s; pick the grace
   period and state it in the UI.
4. **evm_version and solc (Phase 1).** Arc targets Osaka. Pin a solc and `evm_version`
   verified against Arc's deploy tutorial before the first mainnet deploy.
5. **Memo contract (Phase 2, optional).** Tag funding and settlement legs through Arc's
   Memo contract `0x5294…e505` for reconciliation. Decide on merit, and don't bolt it on.
6. **Wallet UX for the demo (Phase 3).** Import the four party keys into a browser wallet
   and switch accounts on camera. No server-side signing: that would be a demo mode.
7. **Surplus USDC.** The deployer holds about 15 USDC and the build needs about 3. The user
   was offered a return of the surplus to their Binance account.
