# Data contracts

Every value that crosses from the chain to the frontend, written before the contracts
exist, so the frontend is never designed against imagined data. The **source of truth is
always the contract**, as storage or an event (D009). Phase 1 entities are firm; Phase 2
entities are a **draft**, to be settled when open issues 1 and 2 are closed.

**Units, everywhere:**

- **USDC amounts:** native units, 18 decimals, as `bigint`. Displayed at 2 decimals, with
  exact values on hover or in the details view.
- **Debt amounts:** the currency's value × 10⁶ (6-decimal fixed point), as `bigint`.
  Always displayed with the ISO code (`MXN 1,250.00`), never a bare symbol.
- **Rates:** the raw feed answer plus the feed's own `decimals()`. Never pre-divided
  on-chain.

## Debt (Phase 1)

| Field | Type | Source of truth | Notes |
| --- | --- | --- | --- |
| `id` | `uint256` | storage `debts(id)` | Sequential from 1 |
| `creditor` | `address` | storage | The proposer. Never zero |
| `debtor` | `address` | storage | Never zero, never the creditor |
| `currency` | `bytes3` ISO 4217 | storage | `USD` `EUR` `MXN` `BRL` `JPY` |
| `amount` | `uint256` | storage | Currency × 10⁶ |
| `reference` | `bytes32` | storage | Creditor's invoice reference. Shown as text if printable, otherwise hex |
| `cycleId` | `uint256` | storage | `0` means direct. Phase 2 |
| `state` | enum | storage, plus events | See below |
| `proposedAt` / `acceptedAt` / `closedAt` | block time | events | `closedAt` means paid or netted |

**States:** `proposed` · `accepted` · `paid` · `netted` · `cancelled`

- `cancelled` is only reachable from `proposed`, and only by the creditor.
- A debt in a **void** cycle returns to `accepted`.
- The same five words are used on every surface.

**Absent values:** `acceptedAt` and `closedAt` are empty until reached, and shown as "—"
with no fake date. A `proposed` debt shows no converted amount, because nothing has been
fixed yet.

## Fixing (Phase 1)

One rate read, taken at payment time (direct debts) or at the cutoff (cycles).

| Field | Type | Source of truth | Notes |
| --- | --- | --- | --- |
| `currency` | `bytes3` | event | |
| `answer` | `int256` | event (from `latestRoundData`) | Must be > 0 or the transaction reverts |
| `feedDecimals` | `uint8` | event (from `decimals()`) | |
| `roundId` | `uint80` | event | Linked to the feed on the explorer |
| `updatedAt` | `uint64` | event | The feed's update time, not the read time |
| `readAt` | `uint64` | block timestamp | |

**Absent values:** USD has no feed. The UI shows **"1 : 1 by definition"** with a link to
D008, never a fabricated rate.

**Stale rule:** if `readAt − updatedAt` is more than the heartbeat (86,400 s) plus the grace
period (open issue 3), the transaction reverts. The UI shows the refusal and the feed's age.
It never falls back to an approximate rate.

## Payment (Phase 1, direct path)

| Field | Type | Source of truth | Notes |
| --- | --- | --- | --- |
| `debtId` | `uint256` | event `Paid` | |
| `payer` | `address` | event | Must be the debtor |
| `usdc` | `uint256` | event | Native units, charged at the fixing |
| `fixing` | Fixing | event | Embedded, not looked up afterwards |
| `tx` / `block` | hash / number | receipt | Every figure links here |

## Withdrawable balance (Phase 1)

| Field | Type | Source of truth | Notes |
| --- | --- | --- | --- |
| `party` | `address` | — | |
| `withdrawable` | `uint256` | storage `withdrawable(party)` | Native units. Credited by payments, settlements and refunds |

**Events:** `Credited(party, amount, reason)`, where reason is `payment`, `settlement` or
`refund`; and `Withdrawn(party, amount)`.

## Cycle (Phase 2 — draft)

| Field | Type | Source of truth | Notes |
| --- | --- | --- | --- |
| `id` | `uint256` | storage | |
| `cutoff` | `uint64` | storage | Fixing allowed at or after this time |
| `fundingDeadline` | `uint64` | storage | Void allowed at or after this time if anyone is unfunded |
| `state` | enum | storage + events | See below |
| `debts` | `uint256[]` | storage | Capped (open issue 1) |
| `fixings` | Fixing per currency | event `CycleFixed` | One read per currency per cycle |
| `gross` | `uint256` | event `CycleFixed` | Sum of every debt in USDC at the fixing |
| `netMoved` | `uint256` | event `CycleFixed` | Sum of net debits: the money that actually moves |

**States:** `open` · `fixed` · `settled` · `void`

## Position (Phase 2 — draft)

| Field | Type | Source of truth | Notes |
| --- | --- | --- | --- |
| `party` | `address` | storage | |
| `net` | `int256` | storage | Native units. Negative is debit, positive is credit |
| `funded` | `bool` | storage | Only meaningful for debits |

**Position words:** `debit` · `credit` · `flat`. Each is conveyed by sign, word and
position, never by colour alone (PRODUCT.md, Accessibility).
