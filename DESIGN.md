---
name: Setoff
description: Debts in five currencies clear at one on-chain fixing. The interface is a clock room run by the chain's own time.
colors:
  wall: "#d6d9d9"
  plate: "#eceeee"
  plate-edge: "#c3c7c7"
  well: "#f5f6f6"
  enamel: "#fbfcfb"
  enamel-edge: "#dde1e0"
  steel-hi: "#f6f7f4"
  steel: "#b9bcb5"
  steel-lo: "#7e827b"
  ink: "#1d1b18"
  graphite: "#595b56"
  faint: "#80827c"
  rule: "#c7cac2"
  on-ink: "#eef0eb"
  endorse: "#4a3a92"
  endorse-hi: "#5e4cb2"
  endorse-lo: "#2e2465"
  returned: "#ad3219"
  key: "#f8f9f9"
  key-skirt: "#aeb2b2"
  key-ink: "#2a2824"
  key-ink-skirt: "#0f0e0c"
  tint-usd: "#d9e6d3"
  code-usd: "#2d5a27"
  tint-eur: "#d6e0ee"
  code-eur: "#274a7a"
  tint-mxn: "#cfe6e3"
  code-mxn: "#1b5a53"
  tint-brl: "#eee3c6"
  code-brl: "#6f5210"
  tint-jpy: "#e4e7c9"
  code-jpy: "#4a5514"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(38px, 5.2vw, 68px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.022em"
    fontVariation: "'wdth' 108"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(32px, 3.8vw, 50px)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 108"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 108"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
    fontVariation: "'wdth' 100"
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "10.5px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.18em"
    fontVariation: "'wdth' 125"
  figure:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    fontFeature: "tnum"
    fontVariation: "'wdth' 87.5"
  amount:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "clamp(46px, 6.6vw, 88px)"
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
    fontVariation: "'wdth' 80"
rounded:
  impress: "2px"
  card: "4px"
  well: "8px"
  key: "9px"
  plate: "14px"
spacing:
  seam: "10px"
  gutter: "clamp(12px, 2.2vw, 28px)"
  plate-pad: "24px"
  plate-pad-hero: "44px"
components:
  key:
    backgroundColor: "{colors.key}"
    textColor: "{colors.ink}"
    rounded: "{rounded.key}"
    padding: "0 18px"
    height: "44px"
  key-sm:
    backgroundColor: "{colors.key}"
    textColor: "{colors.ink}"
    rounded: "{rounded.key}"
    padding: "0 12px"
    height: "34px"
  key-ink:
    backgroundColor: "{colors.key-ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.key}"
    padding: "0 18px"
    height: "44px"
  key-sign:
    backgroundColor: "{colors.endorse}"
    textColor: "{colors.enamel}"
    rounded: "{rounded.key}"
    padding: "0 18px"
    height: "44px"
  plate:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink}"
    rounded: "{rounded.plate}"
    padding: "24px"
  well:
    backgroundColor: "{colors.well}"
    textColor: "{colors.ink}"
    rounded: "{rounded.well}"
  field:
    backgroundColor: "{colors.well}"
    textColor: "{colors.ink}"
    typography: "{typography.figure}"
    rounded: "{rounded.well}"
    padding: "0 14px"
    height: "48px"
  stock-usd:
    backgroundColor: "{colors.tint-usd}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "28px 32px 0"
  impress-sign:
    textColor: "{colors.endorse}"
    typography: "{typography.label}"
    rounded: "{rounded.impress}"
    padding: "4px 8px 3px"
  impress-late:
    textColor: "{colors.returned}"
    typography: "{typography.label}"
    rounded: "{rounded.impress}"
    padding: "4px 8px 3px"
---

# Design System: Setoff

## Overview

**Creative North Star: "The Clock Room"**

The chain is the master clock. Every page carries its time: a station clock driven by Arc block timestamps on the home page, and a block readout in the masthead everywhere else. Each currency's fixing is a slave dial whose needle shows the rate's age against the contract's own refusal limit, with a red band past it. Debts are cards of currency-tinted stock. The recorder punches them at the chain's time in a two-colour ribbon: violet for signed acts, red for late or refused. A paid card is perforated.

The room is a cool grey powder-coated wall (`--wall`) with instrument plates set into it (`--plate`). Plates carry engraved wide-caps legends, recessed wells for readouts and fields, and physical keys that press down. The page is composed as a bento of whole plates on a fixed 10px seam. Light is physical only. Gradients appear on steel bezels, dial glass and key caps, and never as colour fields.

The system is restrained. There is no dark mode, no decorative chart, no illustration. Depth comes from how a physical object sits in a wall: raised plates, recessed wells, keys with a skirt. Every figure on screen is read from the chain at request time.

Netting cycles are drawn as the cycle statement (below), rendered from a real mainnet cycle. The v3 "clearing room" particle floor was never built, and the clearing-room world it came from is retired.

**Key Characteristics:**
- One master clock (chain time) and five slaved fixing dials, live on every visit.
- The cycle statement: gross owed in several currencies collapsing to the net that moves.
- Debts are cards; card colour means currency and nothing else.
- Two ribbon colours with fixed meanings: violet signs, red refuses.
- Skeuomorphic materials (steel, enamel, glass, card stock) held to minimal composition.
- Bento grid of whole plates; tiles recompose by whole tiles, never shrink.
- Two type voices: Archivo for words and legends, Martian Mono for every figure.

## Colors

A cool neutral room with two ribbon inks and five pale card stocks, one per currency.

### Primary
- **Recorder Violet** (`--endorse`): the signing act. Fills the signing key (`.key-sign`) for every write the user signs: propose, endorse, pay, cancel, withdraw. Prints endorsement impressions and the timestamps of signed acts on a card. `--endorse-hi` and `--endorse-lo` are the key cap's lit top and its skirt; they never appear as flat colour. `--endorse-hi` is used only inside the key-sign gradient.
- **Returned Red** (`--returned`): refused, returned or late. The gauge's refusal band and limit numeral, a refused needle, the "Refused" impression, contract revert names on the recorder tape, and the "Setoff can't" crosses. Mapped to the Radix `--destructive` slot.

### Secondary: card stock
Each currency has a pale tint (the stock) and a deep code colour (the printed currency code). A `.ccy-*` class sets both on any element; the stock and the gauge face read them.
- **USD Ledger Green** (`--tint-usd` / `--code-usd`)
- **EUR Blue Stock** (`--tint-eur` / `--code-eur`)
- **MXN Teal Stock** (`--tint-mxn` / `--code-mxn`)
- **BRL Manila** (`--tint-brl` / `--code-brl`)
- **JPY Olive Stock** (`--tint-jpy` / `--code-jpy`)

### Neutral
- **Panel Wall** (`--wall`): page background and the scrollbar track.
- **Plate Steel** (`--plate`): every instrument plate, the popover surface.
- **Well** (`--well`): recessed readouts, fields, the nav switch, tx status lines.
- **Enamel** (`--enamel`, `--enamel-edge`): dial faces, and the default stock when no currency is set. `--enamel-edge` is where a face meets its bezel.
- **Bezel Steel** (`--steel-hi`, `--steel`, `--steel-lo`): dial bezels and lips as gradients, dial hubs, the scrollbar thumb.
- **Ink** (`--ink`): text, clock hands, needles, ticks, focus ring, selection.
- **Graphite** (`--graphite`): secondary text and legends.
- **Faint** (`--faint`): only the unset amount on the proposal card, at 38px and up. Large text only; placeholders, empty-value dashes, "Par" and "Not run" are graphite.
- **Rule** (`--rule`): hairline dividers in receipt rows; Radix border and input.
- **On Ink** (`--on-ink`): text on the ink key and ink tooltips; the selection foreground.
- **Keys** (`--key`, `--key-skirt`, `--key-ink`, `--key-ink-skirt`): the pale key cap and its skirt, the ink key cap and its skirt.
- `--plate-edge` is defined but not used by any component. It is not part of the system until something uses it.

### Measured contrast
- Code on its own tint: 5.69:1 (BRL) to 6.71:1 (EUR); USD 6.23, MXN 6.11, JPY 6.37.
- Graphite on plate 5.90:1; on well 6.35:1; on enamel 6.68:1; on wall 4.84:1; on the five tints 5.16 to 5.42:1.
- Faint on plate 3.34:1, on well 3.59:1, on enamel 3.78:1: large text only. Faint on the tints is 2.92 to 3.07:1 and on the wall 2.74:1.
- Ink on plate 14.75:1; on wall 12.10:1; on the tints 12.89 to 13.56:1.
- On Ink on the ink key 12.82:1. White on Recorder Violet 9.09:1. Violet on plate 7.80:1, on the tints 6.82 to 7.17:1.
- Returned Red on plate 5.55:1, on well 5.97:1, on enamel 6.29:1; on the tints 4.85 (EUR) to 5.10:1 (JPY). White on it 6.47:1.

### Named Rules
**The Signing Ribbon Rule.** Violet (`--endorse`) appears only for signing acts: the signing key and what a signed act prints. Never for links, selection, focus, charts or emphasis.

**The Refusal Ribbon Rule.** Red (`--returned`) appears only for refused, returned or late: the refusal band, refused marks, revert names, what the contract will not do. Never for decoration or emphasis.

**The Currency Stock Rule.** A tint or code colour appears only where it means that currency: the debt card, the gauge's currency code, the currency selector. No stock sits in the red or violet bands; those hues belong to the ribbon.

**The Physical Light Rule.** A gradient is light falling on an object (bezel, glass, key cap, the ink key). It is never a colour field or a background.

## Typography

**Display Font:** Archivo (variable width axis), fallback system-ui, via `--display`
**Figure Font:** Martian Mono (variable width axis), fallback ui-monospace, via `--figure`

**Character:** Archivo's width axis does the work of two faces: slightly wide and bold for headings, fully wide caps for engraved legends. Martian Mono, condensed, sets every amount, rate, ID, address, block and time in tabular figures, so numbers read as instrument output. Both load through next/font.

### The scale

Nine steps, defined once in `@theme` and used as utilities (`text-body`, `text-figure-m`). Nothing
sets a font size by hand, and each step carries its own line-height. The floor for functional
text is 11px, and it is reached only by the legend, which is uppercase and tracked.

| Token | Size | Line | Used for |
| --- | --- | --- | --- |
| `--text-label` | 11px | 1.25 | legends, impressions, the smallest instrument marks |
| `--text-caption` | 12px | 1.45 | secondary figures, timestamps, table asides |
| `--text-small` | 13px | 1.5 | plate prose, ledger rows, the footer |
| `--text-body` | 14px | 1.55 | base text, step bodies, act copy |
| `--text-lead` | 16px | 1.55 | the home paragraph and other lead prose |
| `--text-heading` | 17px | 1.3 | a plate's own sub-heading |
| `--text-figure-m` | 20px | 1.2 | a standing figure: the contract tally, withdrawable |
| `--text-figure-l` | 24px | 1.15 | a plate's headline figure |
| `--text-title` | 28px | 1.05 | a plate's own heading, such as "Try to break it." |
| `--text-display` | clamp(36, 4.4vw, 62) | 1.0 | the home claim and page headings |
| `--text-figure-xl` | clamp(40, 4.8vw, 60) | 0.95 | the compact cycle statement's figure |
| `--text-figure-hero` | clamp(46, 6.4vw, 88) | 0.95 | the full cycle statement's figure, and a debt card's face value |

### Hierarchy
- **Display** (Archivo 700, `text-display`, width 108): the home claim. The refusal room's heading runs larger (clamp(44px, 6vw, 84px), width 104, line-height 0.95).
- **Title** (700, `text-title`, width 108): a plate's own heading.
- **Body** (400, `text-body`): base text. Lead paragraphs run `text-lead` in graphite, capped near 52 to 62ch; plate prose runs `text-small` to `text-body`.
- **Legend** (700, `text-label`, 0.18em tracking, width 125, uppercase, graphite, with a 1px white engraving shadow): the name of an instrument, cut into its plate. It is the plate's heading, not a line above one. A legend is a label, never a sentence: it stays under about twenty characters, because uppercase at this size stops being readable as prose.
- **Figure** (Martian Mono, tabular, width 87.5): every measured value, from `text-caption` to `text-figure-hero`.
- **Amount** (Martian Mono 500, `text-figure-hero`, width 80): the face value on a debt card, beside its currency code set as a wide 750-weight code.
- **Print** (Martian Mono 600, 0.04em tracking): ribbon print on a card; timestamps are uppercase UTC.
- **Impression** (Archivo 800, `text-label`, 0.16em tracking, width 125, uppercase, 1.5px border in currentColor, 2px radius): a stamped state mark, "Endorsed" or "Refused". The small size is 9.5px.

### Named Rules
**The Figure Rule.** Every value that came from the chain is set in the figure face with tabular numerals. Words are never set in it, except ribbon print and revert names.

**The Engraved Legend Rule.** A legend names the instrument it sits on. It is never a kicker or eyebrow above a heading.

**The Scale Rule.** No component sets a font size. Every size is one of the twelve steps above, so a
size change is a token change. `cn` is built with `createCn` and told about these steps, or it would
read `text-body` as a colour and silently drop it.

## Layout

The page is a bento: a 12-column grid (`.bento`) with a fixed `--seam` gap between plates, inset from the viewport by `--gutter`. The masthead is itself a plate. Tiles recompose by whole tiles at breakpoints; they never scale down.

- **Home at 1440:** claim plate 7 columns, chain clock plate 5; the five fixing dials full width in five columns; debts ledger 8 columns beside the refusal-room invitation at 4; "How a debt clears" full width as one stock strip of four steps.
- **At sm (640px):** dials go to three columns; the clock plate takes the full row.
- **Under sm:** every plate is full width. Dials pair two by two, and USD (par, no feed) folds into a full-width strip without its gauge. The chain clock becomes a 128px readout beside its block number. Nav drops to a full-width row with short labels.
- **Plate padding:** 20px under sm, 24px above; hero plates 24, 36 and 44px at base, sm and lg.
- **Measure:** lead copy 56 to 58ch. `--measure` (68ch) is defined but no component reads it.

## Elevation & Depth

Depth is physical, not ambient. Surfaces are either raised out of the wall (plates, keys, cards) or recessed into a plate (wells). Every shadow is warm ink at low alpha (rgb 29 27 24), paired with a white top highlight, so light always comes from above. The wall itself is lit: a soft white falloff from the top of the viewport, fixed as the page scrolls, like a ceiling light on a painted panel.

### Shadow Vocabulary
- **Plate** (a lit surface: white at 50% fading out by 38% down, a faint ink shade at the foot; a 1.5px white rolled top edge, a white left edge, a 2px ink lower lip; a hairline ring; a 1px contact shadow, a 3px 6px near shadow and a 22px 40px -22px cast shadow): an instrument plate set into the wall. A fine noise grain sits under its content.
- **Mounted instrument** (dial plates and the chain clock only): four domed steel rivets, 12px, lit top-left, 7px in from each corner, drawn from one local gradient, `--rivet`, built from the steel tokens. Hidden under 640px, where they would crowd the dial.
- **Well** (a shade under the top lip, inset 2px 3px and 1px 1px ink, inset hairline, a white lip below): a window or field sunk into the plate.
- **Key** (white top highlight, hairline ring, a solid 2px skirt below, then a soft drop): a key cap standing on its skirt. On press it drops 2px and the skirt collapses to 0. The skirt is the key's own body, not an offset shadow.
- **Stock** (a lit top edge and a darker cut edge below for the card's thickness, hairline ring, 1px contact, 2px 3px near shadow, 18px 30px -20px drop, paper grain): a card lying on the plate.
- **Dial** (steel gradient bezel, enamel radial face, a bezel shadow sinking into the face's rim, glass highlight, 1 to 2px drop filter under hands and needle).

### Named Rules
**The Set-In Rule.** A surface is raised or recessed, never floating. No shadow without a top highlight and a hairline ring.

## Shapes

Corners follow the object: plates `--r-plate`, keys `--r-key` (also the Radix `--radius`), wells `--r-well`, cards `--r-card`, impressions 2px. The nav cap is 7px so it sits inside its 8px well. Dials and hubs are true circles. Dividers on stock are dashed ink at 25%, like a punch field; dividers in receipt rows are solid `--rule` hairlines. A paid card is really perforated: the word PAID in 5 by 7 dots is subtracted from the card with a mask, so what lies beneath shows through.

## Components

### Keys
Physical keys that press.
- **Shape:** gently rounded (`--r-key`), 44px tall, 18px sides; small keys 34px and 12px.
- **Plain key:** pale cap, ink label 650 at 14px. For navigation and secondary actions.
- **Ink key:** dark cap with on-ink label. The one primary non-signing action per view, such as "Record a debt" or "Run every attempt".
- **Signing key:** violet cap, white label. Only for actions that open a wallet signature.
- **States:** hover brightens 3%; active drops 2px and flattens the skirt (110ms `--settle`); disabled shows 62% opacity with a progress cursor. Focus is the global 2px ink outline, 3px offset. Icons are 16px lucide glyphs trailing the label.

### Plates
- **Corner Style:** `--r-plate`. **Background:** `--plate` under its surface light, with grain. **Shadow:** Plate (above). Instruments add the mounted rivets and 26 to 30px side padding to clear them.
- **Header:** optional engraved legend at left and a small graphite aside at right.
- **Padding:** 20 to 24px; hero plates up to 44px.

### Cycle statement (signature component)
The claim, drawn from a real cycle: gross owed in several currencies, set off at one fixing, collapsing to the net that moves.
- **Headline figure:** Martian Mono at up to 96px (60px compact). NumberFlow rolls it from the gross to the net over 1.4 s once the statement is 40 % in view. Its unit sits on the figure's baseline, in graphite, and says what the figure is at each moment: "USDC owed, gross, in N currencies", then "USDC moves". No legend is stacked above it. Beside it, in one line: owed · moves · % set off, and whether it is priced at the cycle's fixing or previewed at today's.
- **Set-off beams:** one row per party in a well, on a zero line.
  - Debits grow left of the zero line and credits right, each drawn as segments of currency stock.
  - At set-off the currency stock retracts toward the zero line, keeping its own segment widths, until only the surviving net is left; a hatched ghost (`.hatch`) holds the span it vacated. The net grows out from zero as an ink bar over the surviving stock. The cancellation is a thing you can see, not a figure you are told.
  - Rows cascade 0.12 s apart, top to bottom, and each party's net figure brightens as its own beam lands. The whole set-off reads as one movement rather than four.
  - The ink bar is the money that stops being pesos or yen and becomes the USDC that moves.
  - Direction is carried by side, sign and the word credit, debit or flat, never by colour. A net debtor shows funded or unfunded once the cycle is fixed.
- **Key:** a one-line key under the beams on both versions — each currency's swatch and code, the hatch as "set off", the ink bar as "net, in USDC" — so neither beam colour nor hatch is ever the only carrier of meaning. The page version adds a stock chip per currency with the total amount and its USDC at the fixing.
- **Replay:** a plain key reruns the set-off. With reduced motion, the net shows at once and there is no replay.
- **Accessibility:** a visually hidden sentence and table carry every figure: each party's legs by currency with their USDC, totals, net, and funding once fixed. The hidden wrapper is a div, because a table ignores the 1 px box and would overflow a phone.
- **Where it appears:** the cycle page, and the home page's "Latest cycle" plate (compact).
- **Its fixing** (cycle page): the home page's fixing board in a frozen mode, a full-size dial per currency in the cycle. The needle is held at the rate's age at the fixing, the header reads "20.0 h at fix", and the detail reads "as fixed". The on-chain trail (opened, fixed, each funding, settled or voided) sits in the right column as a vertical record, each row linked to its transaction.

### Contract tally
Four figures on the home plate, under the claim and above the keys, read live: debts settled, gross
owed, USDC moved, and the percentage set off across everything the contract has ever done. It is the
claim at contract scale, and it is why the hero plate is not mostly air. Labels are legends, figures
are `text-figure-m`; the four align on one baseline through a row subgrid, so a label that wraps at
one breakpoint never pushes its figure out of line.

### Your position
A plate that answers "what does this mean for me", for the connected wallet only: what it owes and is
owed across every debt, and its net in every running cycle, with whether it still has to fund. It is
the only plate whose content depends on who is looking. Disconnected, it says what it would show and
offers the keys to connect; there is nothing to see and it does not pretend otherwise.

### Connect keys
The act, offered where the act is. Any plate that needs a wallet carries its own connect keys with a
sentence naming what connecting would let you do here, rather than sending you to the masthead. With
no browser wallet, it says so and names two. Copy is capped at 62ch.

### Party marker
An address rendered as its short form, with "you" appended when it is the connected wallet's. It runs
through the ledger, the slips, the statement's party column and the on-chain trail, so the same
address is recognisable wherever it appears, and your own is never something you have to match by eye.

### Cycle timer
The cycle's schedule on the chain's clock.
- A sunk track runs from the first enrolment to the funding deadline, with ink ticks and labels at the cutoff and the deadline, and a violet tick at the fixing (a signed act).
- A small raised shuttle sits at chain time, or at the close once settled or voided, and slides a second at a time.
- A stage word and one line say what the cycle is waiting for, with the time left in `span` form.

### Cycle marks
From the same set as a debt's.
- Settled: perforated CLEARED.
- Void: a red "Returned" impression.
- Open and fixed: engraved legends, "Enrolling" and "Fixed".
- A netted debt is perforated CLEARED too.

### Debt card
A debt as a card the chain punches.
- Currency-tinted stock with paper grain, `--r-card`.
- Header: the clear band (original machine glyphs with the zero-padded debt ID) and the state impression.
- Face: currency code in its code colour, then the amount in the amount style. Struck through and graphite when cancelled.
- Price line: paid USDC at the fixing, or a live quote, or a red "Refused" impression when the fixing is stale.
- Punch fields: Proposed, Endorsed, then Paid, Netted (a cycle debt) or Cancelled (struck), each a dashed row. A field filled while the page is open prints in with a quick spring (scale 1.35 to 1, blur 3px to 0). Fields already printed stay still.
- Foot: the clear band again, with the paid amount in micro-USDC once there is one.
- Paid: perforated PAID; netted: perforated CLEARED. If it closes while you watch, the perforator punches it column by column first.
- A cycle debt is priced by its cycle: its value at the cycle's fixing once fixed, and before that a note that it clears there.

### Fixing dial
A 240-degree gauge from 8 o'clock to 4. The scale runs to 1.2 times the contract's refusal limit (read live); past the limit is a 7px red band with a red limit tick and numeral. The needle is ink, or red when refused, and sweeps in on a shared spring at load. The currency code sits below the hub in its code colour, the only currency colour on the face. A well under the face shows the rate in the figure face; NumberFlow rolls it. The round number opens an ink tooltip.

### Chain clock
A station clock on enamel under glass, steel bezel, ink hands, a stop-to-go seconds hand that waits at 12 for the minute impulse. Driven by block timestamps, with the block number rolling below it. The masthead carries a small readout (legend plus a well with the block number) on every page from md up.

### Navigation
A four-position selector switch in a well: Debts, Cycles, Record a debt, Refusal room (Record and Refusals on a phone). The active position is a raised cap that slides between detents with a spring (`layoutId`). Labels 13px semibold; inactive graphite, active ink.

### Inputs / Fields
- **Style:** wells, figure face at 15px, 48px tall (the amount field 64px at 26px).
- **Focus:** 2px ink outline, 2px offset.
- **Error:** a 2px inset ink ring and bold ink help text. A mistyped field is not a refusal, so it is never red.
- **Currency selector:** a Radix toggle group of five stock-coloured keys; the chosen one sits pressed with a ring in its code colour.

### Transaction status
One shared well line for every write: checking, signing, including (spinner, graphite), done (violet print of the act, block, hash), failed (red "REFUSED" for a revert, graphite "NOT SENT" otherwise). A flow never stays in flight.

### Motion
Springs settle without overshoot (`--spring`); presses use `--settle`. Motion carries meaning only: needles sweep to their age, the statement sets off in a cascade, the timer's shuttle follows chain time, punch fields print, the perforator punches, the nav cap slides, figures roll. `prefers-reduced-motion` zeroes CSS transitions, and every Motion component checks it. `--out-expo` is defined but unused.

## Do's and Don'ts

### Do:
- **Do** read every figure from the chain and set it in the figure face with tabular numerals.
- **Do** give each view one ink key for its main non-signing action, and a violet signing key for every act that opens a wallet signature.
- **Do** tint a card by the currency it was priced in and print its code in that currency's code colour.
- **Do** keep light physical: top highlights, hairline rings, skirts under keys, gradients only on bezels, glass and caps.
- **Do** recompose the bento by whole tiles at each breakpoint.
- **Do** keep faint text to placeholders and non-essential marks on plate, well or enamel.

### Don't:
- **Don't** use violet for anything but a signing act, or red for anything but refused, returned or late.
- **Don't** use a tint or code colour for anything but its currency, and don't add a stock in the red or violet band.
- **Don't** use a gradient as a colour field or background.
- **Don't** put a legend above a heading as a kicker; a legend names its plate.
- **Don't** use the framework palette; it is switched off, and only the room's own colours exist.
- **Don't** show pending finality or an optimistic result; print the mined receipt.
- **Don't** set faint text on card stock or on the wall; it measures under 3.1:1 there.

## Token index

Every custom property the stylesheet defines, for the design checker.

- Room: `--wall`, `--plate`, `--plate-edge`, `--well`, `--enamel`, `--enamel-edge`, `--steel-hi`, `--steel`, `--steel-lo`.
- Ink: `--ink`, `--graphite`, `--faint`, `--rule`, `--on-ink`.
- Ribbon: `--endorse`, `--endorse-hi`, `--endorse-lo`, `--returned`.
- Keys: `--key`, `--key-skirt`, `--key-ink`, `--key-ink-skirt`.
- Stock: `--tint-usd`, `--code-usd`, `--tint-eur`, `--code-eur`, `--tint-mxn`, `--code-mxn`, `--tint-brl`, `--code-brl`, `--tint-jpy`, `--code-jpy`.
- Geometry: `--r-plate`, `--r-key`, `--r-well`, `--r-card`, `--seam`, `--gutter`, `--measure`.
- Type: `--display`, `--figure`.
- Type scale: `--text-label`, `--text-caption`, `--text-small`, `--text-body`, `--text-lead`, `--text-heading`, `--text-figure-m`, `--text-figure-l`, `--text-title`, `--text-display`, `--text-figure-xl`, `--text-figure-hero`.
- Type scale line-heights: `--text-label--line-height`, `--text-caption--line-height`, `--text-small--line-height`, `--text-body--line-height`, `--text-lead--line-height`, `--text-heading--line-height`, `--text-figure-m--line-height`, `--text-figure-l--line-height`, `--text-title--line-height`, `--text-display--line-height`, `--text-figure-xl--line-height`, `--text-figure-hero--line-height`.
- Motion: `--spring`, `--settle`, `--out-expo`.
- Radix slots, mapped onto the room: `--background` (wall), `--foreground` (ink), `--popover` (plate), `--popover-foreground` (ink), `--muted` (well), `--muted-foreground` (graphite), `--border` (rule), `--input` (rule), `--ring` (ink), `--destructive` (returned), `--radius` (key).
- Tailwind theme aliases (same values, exposed as utilities): `--color-wall`, `--color-plate`, `--color-well`, `--color-enamel`, `--color-steel`, `--color-ink`, `--color-graphite`, `--color-faint`, `--color-rule`, `--color-on-ink`, `--color-endorse`, `--color-returned`, `--color-white`, `--color-background`, `--color-foreground`, `--color-popover`, `--color-popover-foreground`, `--color-muted`, `--color-muted-foreground`, `--color-border`, `--color-input`, `--color-ring`, `--color-destructive`, `--font-sans`, `--font-display`, `--font-figure`, `--radius-plate`, `--radius-key`, `--radius-well`, `--radius-card`, `--ease-spring`, `--ease-settle`, `--ease-out-expo`.
