# Submission — pre-flight

What must be true before pressing submit on DoraHacks. This replaces the demo run of show,
which planned a manual screen recording and a live pitch; the film is scripted capture
(`npm run film:all`) and its script lives in `scripts/narration.ts`, so a prose copy of the
same words would only drift.

**Event:** Arc Microgrants (Circle, DoraHacks). Target submission **2026-10-07**; hard
deadline **2026-10-14 23:59 ET**.

**Judged on**, verbatim: *"Relevance to Arc, technical credibility, the quality of what you
built, and whether the project is worth taking further. Promise counts for more than
traction here."* There is no live pitch — reviewers judge from one link, the repo and a
short description.

---

## The claim, in four places, identical

The same sentence, word for word, or the repetition stops working:

> Debts in five currencies clear at one on-chain fixing: only the net moves, and either
> every party settles or none does.

- [ ] GitHub repo description
- [ ] README subtitle
- [ ] DoraHacks submission form
- [ ] The film's closing line *(already true — `scripts/narration.ts`, `05-close`)*

## Links, each one clicked

- [ ] Live app — <https://setoff-omega.vercel.app>
- [ ] Demo film — <https://youtu.be/4KKoGLYV9E0> — **Unlisted, not Private**
- [ ] Contract on the explorer, and its Sourcify exact match
- [ ] The settled cycle and the voided cycle transactions
- [ ] CI badge green
- [ ] Every relative link in the README resolves (`assets/cover.png`, `LICENSE`, `docs/*`)

## From a cold browser, on a phone, on cellular

The one check that cannot be done from this machine, and the one that catches real problems.

- [ ] README renders; the cover image loads without a long wait
- [ ] The app paints fast and is usable at 390px
- [ ] The film plays with sound
- [ ] Nothing requires a wallet to *read*

## Watched with sound, start to finish

- [ ] Narration is level, and does not clip or drift against the picture
- [ ] No caption contradicts a figure on screen
- [ ] The set-off is legible and lands as the moment
- [ ] Nothing on screen leaks a key, a private address, or anything not meant to be public

## Honest by the time it ships

- [ ] The limits section is present and true
- [ ] No figure in the README, the film or the form that the chain does not hold
      (`npm run film:facts` regenerates every number the script is allowed to say)
- [ ] Cycle #2 — the empty, expired one — is voided or explained

## The state at submission

| | |
| --- | --- |
| Contract | `0x8A78B1F880eA21dAe046Ff22De9Ccc21027680d6`, Sourcify exact match |
| Proved on-chain | a cycle settled at 94.5 % set off, and a cycle voided with the deposit refunded to the wei |
| Tests | 56 passing, 7 invariants, reach instrumented |
| App | deployed, streaming, read-only without a wallet |
| Film | 1:41, 1920×1080, word-level captions |

## If something is wrong at the last minute

- **A Chainlink feed is stale.** That is the refusal state, not a failure. The app says so by
  name, and the film shows it. Nothing needs fixing.
- **The app is slow.** Latency is Arc's public RPC, ~1.4 s per round trip. The shell streams
  first, so it paints regardless. Say so rather than hiding it.
- **A link rots.** The film and the contract are the two that matter; everything else is
  recoverable.
