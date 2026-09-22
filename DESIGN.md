# Design — Setoff

**World:** The clearing room

Before software, net settlement happened in a bank clearing room. Each day's cheques were
exchanged between banks, and only the differences were paid. Items were **endorsed**,
their amounts **encoded** in magnetic ink, **sorted** into pockets per bank, **proved**
(total debits had to equal total credits), then **cleared** (perforated as cancelled) or
**returned unpaid**. Setoff is that process, run by a contract. So the world is the
product's *structure*, not its decoration: every on-chain state already has a mark
someone once made by hand, and every screen is a view of the same clearing.

The room has two parts:

- **The floor** is where the clearing happens. Money is visible as light: every debt is a
  stream, and you can scrub the clearing through its four legal stages (owed, fixed,
  novated, set off) and watch mutual debts annihilate until only the net survives.
- **The statement** is the light, ruled record of what happened.

Status: **direction v3, set 2026-09-22** from a rendered specimen
(`internal/design/specimen-v3.html`). It was verified at 1440 and at a true 390 with
device emulation. Every stage was captured deterministically through the scrubber.
Collisions, clipping, overflow and contrast were measured; the frame rate is 120 fps at
both widths with no console errors.

- v1 described the clearing with tables.
- v2 showed it once, as a diagram.
- v3 makes it something you can hold.

Once the app ships, this file is re-recorded from `globals.css`, and where they disagree
the stylesheet wins. Skills and templates are inputs, not limits (D012).

**Register: loud and sleek.** The floor lands in three seconds and rewards a minute of
play. The statement is disciplined back-office quiet.

**Personality:** exacting · luminous · candid · institutional · tactile.

---

## 1. The mechanic

Every state is a mark or a stage of the floor. Each row names the state, how it looks,
and what it means.

- **The four floor stages,** a single scrubbable parameter `T` from 0 to 3:
  - **Owed:** currency-coloured streams run between the parties. The gross is unsettled.
  - **Fixed:** labels re-price to USDC. One Chainlink read prices every debt; nothing is
    converted.
  - **Novated:** the streams route through the hub. The contract becomes every party's
    only counterparty.
  - **Set off:** on each spoke, the owed and owing lanes annihilate. Only the net moves.
- **Debt `proposed`:** no mark; graphite text. An item not yet endorsed.
- **Debt `accepted`:** the **ENDORSED** stamp in `--endorse`. The debtor signed for it.
- **Debtor unfunded / funded:** **HOLD** (hollow square) or **FUNDED** (filled square).
  The clearing waits on unfunded parties.
- **`paid` · `netted` · cycle `settled`:** **CLEARED**, a real perforation cut through the
  slip. Cancelled, like a cheque.
- **Cycle `void`:** the **RETURNED UNPAID** stamp in `--returned`. Every deposit goes back.
- **Debt `cancelled`:** one ink strike through the item. The creditor withdrew it before
  endorsement.
- **Fixing stale:** the **REFUSED** stamp in `--returned`, with a full age bar. Older than
  24 h; the transaction reverts.
- **Position `debit` / `credit` / `flat`:** sign + word + spoke lane + stream direction.
  Never colour; debit is not a failure.

## 2. References

Each reference owns **one** dimension.

- **Cheque encoding (E-13B MICR lines):** identifiers and figure setting, via original
  glyphs.
- **Rubber stamps:** state marks, and the only two stamp colours.
- **1960s Swiss bank forms:** the statement's grid, hairlines and wide-set capitals.
- **Cheque safety-paper tints:** currency colour.
- **Clearing-house novation diagrams** (bilateral obligations replaced by obligations to a
  central counterparty): the floor's geometry and its third stage.
- **Long-exposure photography of traffic:** how money is drawn — streams of points that
  read as flow in a still frame.

## 3. Materials

### Statement (light)

| Token | Value | What it is in the world |
| --- | --- | --- |
| `--ground` | `#eef0eb` | The room's light: cool, faintly green, not paper |
| `--ink` | `#1d1b18` | Magnetic ink, iron-oxide black |
| `--graphite` | `#595b56` | Pencil: secondary text, proposed items |
| `--faint` | `#80827c` | Cancelled figures |
| `--rule` | `#c7cac2` | Hairline dividers |
| `--endorse` | `#4a3a92` | Rubber-stamp violet: consent, and every act you sign |
| `--returned` | `#b8361c` | The RETURNED UNPAID stamp |
| `--tint-usd` / `--code-usd` | `#d9e6d3` / `#2d5a27` | USD safety paper / its label |
| `--tint-eur` / `--code-eur` | `#d6e0ee` / `#274a7a` | EUR |
| `--tint-mxn` / `--code-mxn` | `#eed8d5` / `#8a302a` | MXN |
| `--tint-brl` / `--code-brl` | `#eee3c6` / `#6f5210` | BRL |
| `--tint-jpy` / `--code-jpy` | `#e2dcec` / `#54467a` | JPY |

### Floor (dark)

| Token | Value | What it is in the world |
| --- | --- | --- |
| `--ink-2` | `#2b2824` | The floor under a lamp: the centre of a radial ground |
| `--on-ink` | `#eef0eb` | Text, net legs, and the money that actually moves |
| `--on-ink-dim` | `#a7a49c` | Secondary text on the floor |
| `--on-ink-mute` | `#6f6c65` | Inactive stages, indices |
| `--on-ink-rule` | `#3a3732` | Rules on the floor |
| `--endorse-lit` | `#6c5ad6` | Violet for signing acts on the floor |
| `--line-usd` | `#99ce9a` | USD streams |
| `--line-eur` | `#94bfed` | EUR streams |
| `--line-mxn` | `#ea988d` | MXN streams |
| `--line-brl` | `#e9c67d` | BRL streams |
| `--line-jpy` | `#bface4` | JPY streams |

### Colour laws

- **Violet is only for signing.**
- **Red is only "returned" or "refused."** Debit is never red.
- **Currency colour only ever means currency.** As debts set off, their particles whiten
  toward `--on-ink`: the money stops being pesos or yen and becomes the USDC that moves.
- **No default status triplet** and no green "connected" dot.
- **The floor is warm ink, never slate or navy.** Light is additive (the particles glow
  where they overlap), but never neon. The floor's only texture is a faint dot grid
  masked to the lamp's pool.

## 4. Geometry

```text
--rule-hair:  1px solid var(--rule)   dividers inside a statement section
--rule-ink:   1px solid var(--ink)    section boundaries
--rule-total: 2px solid var(--ink)    above every total (the accountant's rule)
--radius:     0
--gutter:     clamp(16px, 3vw, 44px)
```

### Geometry laws

- **Rectangles have square corners.** Circles belong only to the floor (parties, hub).
- **Shadows only on physical things:** slips, the violet signing button, and the focus
  card.
- The ring is laid out by the stage, not the page. Its radius leaves room for side
  labels, and on phone every label is measured after render and nudged back inside the
  stage.
- Every total sits under a 2 px ink rule.

## 5. Type

| Role | Face | Use |
| --- | --- | --- |
| Display / labels | **Archivo**, variable `wdth` 62–125, `wght` 100–900 | Wordmark, eyebrows, stages and stamps at `wdth` 125 in wide caps; captions at 86 |
| Figures | **Martian Mono**, variable `wdth` 75–112.5, `wght` 100–800 | Every amount, rate, ID, address and time |
| Body | Archivo at `wdth` 100 | Sentences, tables |

### Type laws

- **Mono is for measurement only.**
- **The figure's width is the mechanic.** It is `wdth` 112.5 while it shows the gross and
  compresses to 75 as debts set off, tracking the scrubber exactly.
- **The figure's label always tells the truth for its frame:** "USDC owed, gross", then
  "USDC still to move, as debts set off", then "USDC moves. That is the whole clearing."
- Amounts always carry an ISO code. Never a bare `$`.
- Fonts load through `next/font` with the `wdth` axis. No font-CDN `<link>` in the
  product.

## 6. Components

- **The floor:** a full-height stage, one screen tall on desktop and stacked on phone.
  - Left: clearing ID and marks · stage index and name ("03 / 04 Novated") · the stage
    caption (it crossfades) · the figure · the connected party's signing act.
  - Right: the field.
  - Bottom: the scrubber.
- **The field:** a `<canvas>` with DOM overlays (party buttons, labels, hub label, focus
  card) for crisp type and accessibility.
  - **Particles are deterministic,** computed from (debt, index, time, T), so scrubbing
    works both ways. Each debt has 44 + 64 × USDC particles, on a band of width
    proportional to USDC, drawn with additive light.
  - **Owed:** quadratic arcs, bent wide around the hub between opposite parties.
  - **Novated:** debtor → hub → creditor, on two lanes per spoke (outbound and inbound).
  - **Set off:** each particle survives only if its lane's surviving fraction covers it
    (outbound: 1 − cancelled ⁄ owes; inbound: 1 − cancelled ⁄ owed). What survives is
    exactly each party's net. Dissolving particles flash white.
  - **Net legs** draw beneath the particles as they emerge.
- **The scrubber:** a native range input with four stops (Owed 9.74 · Fixed 14:05 ·
  Novated 7 → 4 · Set off 1.65) and play/pause. It autoplays once (about 7.6 s with a
  dwell at each stop), then belongs to the user.
- **The focus card:** hover or focus a party to isolate its streams (everything else at
  12 %) and show its set-off: owes (with the original currencies) · owed · pays in /
  receives.
- **The statement:** the proof ledger with its 2 px total rule · the fixing strip (tinted
  cells with age bars) · pockets of slips · compact clearings rows (gross, perforated →
  net) · marks.
- **Slip:** a tinted item with a clear band. It lifts on hover; once cleared it is really
  perforated.
- **Button:** violet, square, used only for signing acts.

## 7. Signature

1. **The clearing floor.** Money as light, and a clearing you can scrub: the four legal
   stages of multilateral netting, with mutual debts visibly annihilating into exactly the
   net. It recurs on the clearing page, the landing page (from the latest real cycle), the
   demo video, and the README cover.
2. **The clear band.** Every item, cycle and fixing carries its on-chain identity as a
   machine line.
3. **Marks, not badges.** Endorsed, encoded, held, cleared (real perforation) and
   returned.

## 8. Motion

- **The authored moment is the clearing.**

  | Time | T | What happens |
  | --- | --- | --- |
  | 0 → 1.4 s | 0 → 0.35 | Streams fade up |
  | 1.4 → 2.6 s | → 1 | Labels re-price from currency to USDC |
  | 2.6 → 3.4 s | 1 | Dwell |
  | 3.4 → 5.0 s | → 2 | Streams bend into the hub |
  | 5.0 → 5.6 s | 2 | Dwell |
  | 5.6 → 7.6 s | → 3 | Set-off: the hub glows while the lanes annihilate, and the figure counts and compresses |

- **Living floor:** particles keep flowing. This is the only perpetual motion in the
  product, and it means something: those debts are live. It pauses when the stage is
  offscreen or the tab is hidden.
- **Ambient:** buttons, nodes, slips and fixing cells respond within 180–220 ms with a
  spring. Captions crossfade over 260 ms.
- **Deliberately absent:** parallax, scroll-jacking, and decorative loops.
- **`prefers-reduced-motion`:** there is no autoplay and no flow. The floor renders the
  final state statically, and the scrubber still works, redrawing on demand.

## 9. Imagery

None. The only image is the clearing itself, rendered from a real mainnet cycle.

## 10. Surfaces

| Surface | Mode | Shape |
| --- | --- | --- |
| Clearing (cycle) | floor + statement | Floor → proof → fixing → pockets → clearings and marks |
| Debt | statement | One slip at large size, its marks, the next signing act |
| Debts | statement | A ledger of slips |
| Fixings | statement | The history of reads, with ages and refusals |
| Landing | floor + statement | The latest real clearing on the floor, then how it works |

**Phone (390):**

- **Order:** figure → **your signing act (above the fold)** → field → scrubber → statement.
- **Debt labels are dropped from the field:** the particles, the party labels and the
  pockets carry the numbers.
- **Party figures stack** onto two lines.
- **Scrubber stops** show names only.

## 11. Anti-patterns

- **Not paper:** Assay's world is an anti-reference.
- **Not crypto:** no slate or navy, no neon, no glass cards, no token tickers.
- **No pill badges** and no status triplet.
- **No card grids.**
- **No decorative particles.** Every particle is a fraction of a real debt, and the
  surviving set is the real net. A particle effect that isn't data is forbidden.
- **Not a static dashboard.** If the clearing can't be watched and scrubbed, the
  direction has been lost.

## 12. Accessibility

Measured WCAG 2.1 contrast, 2026-09-22:

| Pair | Ratio |
| --- | --- |
| ink on ground / on-ink on ink | 14.97:1 |
| graphite on ground | 5.99:1 |
| on-ink-dim on ink | 6.90:1 |
| faint on ground (cancelled gross, large text only) | 3.39:1 |
| white on endorse / white on endorse-lit | 9.09:1 / 5.16:1 |
| endorse-lit button against the floor (non-text) | 3.33:1 |
| returned on ground | 5.11:1 |
| code on tint | 5.69–6.71:1 |
| currency lines on ink | 7.67–10.50:1 |

- **The canvas** is `role="img"` with a full text alternative. The proof ledger is its
  complete accessible equivalent.
- **The counting figure** is `aria-hidden`; a visually hidden sentence states the final
  amount once. This fixes v2's `aria-live` defect.
- **The scrubber** is a native range input, keyboard operable, with `aria-valuetext` set
  to the stage name.
- **Parties** are `<button>`s whose `aria-label` carries owes, owed and net. The focus card
  is `aria-live="polite"`.
- **State is never colour alone.**
- **Focus:** a 2 px outline at 3 px offset on every control.

## 13. Open findings and known limits

- **Four parties only.** The ring is laid out for exactly four; cycles of 3–8 need a
  general polygon layout. Phase 3 decides whether to cap parties per cycle.
- **Particle count scales with the debts.** At about 800 particles it holds 120 fps on
  this machine. A 20-debt cycle needs a density cap, measured on a mid-range phone.
- **Chainlink round IDs** show their last six digits; the full value is in the link.
- **Martian Mono's `wdth` axis through `next/font`** must be confirmed in Phase 1. The
  compression depends on it.
- **The perforation mask** is recomputed on resize (ResizeObserver).
- **The clear-band marks** are original glyphs, not E-13B.

---

Product truth lives in [PRODUCT.md](PRODUCT.md). Verify this file against the build with
`node scripts/check-design.mjs`.
