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

The netting-cycle floor (the v3 "clearing room" particle view, where debts annihilate until only the net survives) was not built. It is deferred to milestone 2, when a real cycle gives it data. Nothing in this file describes it, and the clearing-room world it came from is retired.

**Key Characteristics:**
- One master clock (chain time) and five slaved fixing dials, live on every visit.
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

### Hierarchy
- **Display** (700, clamp(38px, 5.2vw, 68px), line-height 1.0, width 108): the home claim. The refusal room's heading runs larger (clamp(44px, 6vw, 84px), width 104, line-height 0.95).
- **Headline** (700, clamp(32px, 3.8vw, 50px), width 108): the record page heading.
- **Title** (700, 28px, width 108): a plate's own heading, such as "Try to break it." on home.
- **Body** (400, 15px, line-height 1.45): base text. Lead paragraphs run 15.5 to 16px at 1.55 in graphite, capped near 56 to 58ch. Plate prose runs 13 to 14px.
- **Legend** (700, 10.5px, 0.18em tracking, width 125, uppercase, graphite, with a 1px white engraving shadow): the name of an instrument, cut into its plate. It is the plate's heading, not a line above one.
- **Figure** (Martian Mono, tabular, width 87.5): every measured value, 12 to 30px.
- **Amount** (Martian Mono 500, clamp(46px, 6.6vw, 88px), width 80): the face value on a debt card, beside its currency code set as a wide 750-weight code.
- **Print** (Martian Mono 600, 0.04em tracking): ribbon print on a card; timestamps are uppercase UTC.
- **Impression** (Archivo 800, 11px, 0.16em tracking, width 125, uppercase, 1.5px border in currentColor, 2px radius): a stamped state mark, "Endorsed" or "Refused". The small size is 9.5px.

### Named Rules
**The Figure Rule.** Every value that came from the chain is set in the figure face with tabular numerals. Words are never set in it, except ribbon print and revert names.

**The Engraved Legend Rule.** A legend names the instrument it sits on. It is never a kicker or eyebrow above a heading.

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

### Debt card (signature component)
The cycle statement's first form: a debt as a card the chain punches.
- Currency-tinted stock with paper grain, `--r-card`.
- Header: the clear band (original machine glyphs with the zero-padded debt ID) and the state impression.
- Face: currency code in its code colour, then the amount in the amount style. Struck through and graphite when cancelled.
- Price line: paid USDC at the fixing, or a live quote, or a red "Refused" impression when the fixing is stale.
- Punch fields: Proposed, Endorsed, Paid (or Cancelled, struck), each a dashed row. A field filled while the page is open prints in with a quick spring (scale 1.35 to 1, blur 3px to 0). Fields already printed stay still.
- Foot: the clear band again, with the paid amount in micro-USDC once there is one.
- Paid: perforated PAID; if paid while watching, the perforator punches it column by column first.

### Fixing dial
A 240-degree gauge from 8 o'clock to 4. The scale runs to 1.2 times the contract's refusal limit (read live); past the limit is a 7px red band with a red limit tick and numeral. The needle is ink, or red when refused, and sweeps in on a shared spring at load. The currency code sits below the hub in its code colour, the only currency colour on the face. A well under the face shows the rate in the figure face; NumberFlow rolls it. The round number opens an ink tooltip.

### Chain clock
A station clock on enamel under glass, steel bezel, ink hands, a stop-to-go seconds hand that waits at 12 for the minute impulse. Driven by block timestamps, with the block number rolling below it. The masthead carries a small readout (legend plus a well with the block number) on every page from md up.

### Navigation
A three-position selector switch in a well. The active position is a raised cap that slides between detents with a spring (`layoutId`). Labels 13px semibold; inactive graphite, active ink.

### Inputs / Fields
- **Style:** wells, figure face at 15px, 48px tall (the amount field 64px at 26px).
- **Focus:** 2px ink outline, 2px offset.
- **Error:** a 2px inset ink ring and bold ink help text. A mistyped field is not a refusal, so it is never red.
- **Currency selector:** a Radix toggle group of five stock-coloured keys; the chosen one sits pressed with a ring in its code colour.

### Transaction status
One shared well line for every write: checking, signing, including (spinner, graphite), done (violet print of the act, block, hash), failed (red "REFUSED" for a revert, graphite "NOT SENT" otherwise). A flow never stays in flight.

### Motion
Springs settle without overshoot (`--spring`); presses use `--settle`. Motion carries meaning only: needles sweep to their age, punch fields print, the perforator punches, the nav cap slides, figures roll. `prefers-reduced-motion` zeroes CSS transitions, and every Motion component checks it. `--out-expo` is defined but unused.

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
- Motion: `--spring`, `--settle`, `--out-expo`.
- Radix slots, mapped onto the room: `--background` (wall), `--foreground` (ink), `--popover` (plate), `--popover-foreground` (ink), `--muted` (well), `--muted-foreground` (graphite), `--border` (rule), `--input` (rule), `--ring` (ink), `--destructive` (returned), `--radius` (key).
- Tailwind theme aliases (same values, exposed as utilities): `--color-wall`, `--color-plate`, `--color-well`, `--color-enamel`, `--color-steel`, `--color-ink`, `--color-graphite`, `--color-faint`, `--color-rule`, `--color-on-ink`, `--color-endorse`, `--color-returned`, `--color-white`, `--color-background`, `--color-foreground`, `--color-popover`, `--color-popover-foreground`, `--color-muted`, `--color-muted-foreground`, `--color-border`, `--color-input`, `--color-ring`, `--color-destructive`, `--font-sans`, `--font-display`, `--font-figure`, `--radius-plate`, `--radius-key`, `--radius-well`, `--radius-card`, `--ease-spring`, `--ease-settle`, `--ease-out-expo`.
