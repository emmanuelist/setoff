# Design — Setoff

**World:** <name the world in two or three words>

<One paragraph. What this is, as a physical or cultural object — an account book, a
nautical chart, a clinical instrument, a studio's annual report. Then the sentence that
matters: why that object is the product's *structure* and not its decoration.>

Recorded from the built implementation, not from intention. Where this file and
`globals.css` disagree, `globals.css` is what shipped and this file is wrong — fix it.

---

## 1. The mechanic

The product's real states, named before any colour was chosen. These are the tokens
everything else is built around.

| State | Token | What it means |
| --- | --- | --- |
| <warmer> | `--color-warmer` | <what the user learns when they see it> |
| <colder> | `--color-colder` | |
| <found>  | `--color-found`  | |

**Test:** if these could move to an unrelated product unchanged, they were never derived.
Go back and start here.

## 2. References

Each reference owns **one dimension**. Do not blend them — when a brief says "push it
closer to X", this map says what X actually controls.

- **<Reference A>:** <the one dimension it owns — paper stock and leading, say>
- **<Reference B>:** <composition and negative space>
- **<Reference C>:** <the numeral system and type mixing>

## 3. Materials

| Token | Value | What it is in the world |
| --- | --- | --- |
| `--<name>` | `#<hex>` | |

### Laws

Write these as prohibitions with a reason. A law you cannot check is a preference.

- <Accent> appears **once** per <screen / 600vh>. If two things claim it, the second becomes <muted token>.
- <Secondary> is never used for a CTA. It is jewelry.
- Pure black is forbidden. The darkest value is `--<ink>` at `#<hex>`.
- Pure white appears only <where>. Never on <the ground>.
- <Any other rule that would be violated if someone were careless.>

## 4. Geometry

```
--rule-hair: <1px>
--radius:    <0 — state it even when it is zero>
--measure:   <68ch>
```

### Laws

- <e.g. There are no rounded corners anywhere. A ruled form has none.>
- Every border is `<1px solid var(--border)>`. No other border exists.

## 5. Type

| Role | Face | Use |
| --- | --- | --- |
| Display | | |
| Body | | |
| Figures | | |

### Laws

- <e.g. Monospace is for measurement only. If a string is not a figure, hash, address or
  identifier, it is the body face.>
- Fonts load through the framework's font loader. Font-CDN `<link>` tags are forbidden.

## 6. Components

<Each named component: what it is in the world, what it does, and its states.>

## 7. Signature

The 1–3 identity decisions. Each must be domain-anchored, recurring across surfaces, and
**not portable** — a competitor could not adopt it without adopting the product thinking.

1. **<name>** — <the domain problem it expresses, and where it recurs>

## 8. Motion

<The authored moments, and — more important — where motion is deliberately absent.>

Every animation checks `prefers-reduced-motion`.

## 9. Imagery

<What the images are, and which product state each one corresponds to. An image that
corresponds to no state is decoration; cut it.>

Source at high resolution, ship WebP, let the framework produce renditions.

## 10. Surfaces

| Surface | Mode | Shape |
| --- | --- | --- |

## 11. Anti-patterns

What this product must **not** look like. Written before the build, so drift is detectable.

- <e.g. Not crypto-generic: no dark slate with neon accent, no glassmorphism, no
  purple-to-blue gradient.>
- <e.g. No default framework state triplet — success/danger/warning must come from §1.>
- <the look a careless implementation would drift toward>

## 12. Accessibility

<Measured contrast ratios, not intentions. Focus treatment. How state is conveyed
without colour.>

## 13. Open findings and known limits

<Constraints and known-fragile details, not defects. Naming them is maturity.>

---

Product truth lives in [PRODUCT.md](PRODUCT.md). Verify this file against the build with
`node scripts/check-design.mjs`.
