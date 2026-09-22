# Evidence — Arc mainnet (chain 5042)

The public record of everything Setoff has put on-chain. Each row resolves on the
explorer. The README's proof section is built from this file.

## Wallets

These all belong to the builder (D011). The four parties are demo counterparties, not
users.

| Role | Address |
| --- | --- |
| Deployer | [`0xA1b1214caa4ddaF0734f280dE7e9e285d8eAB294`](https://explorer.arc.io/address/0xA1b1214caa4ddaF0734f280dE7e9e285d8eAB294) |
| Party A | [`0xFcd8a11Eafc106CF7e94f161B04a3B61D247e00f`](https://explorer.arc.io/address/0xFcd8a11Eafc106CF7e94f161B04a3B61D247e00f) |
| Party B | [`0x4db81959DeB7c83f9B6bfC27cCb7277dC5015E63`](https://explorer.arc.io/address/0x4db81959DeB7c83f9B6bfC27cCb7277dC5015E63) |
| Party C | [`0x8d9cac7EC3ba29e158e49635AB4A4ec9729C4a28`](https://explorer.arc.io/address/0x8d9cac7EC3ba29e158e49635AB4A4ec9729C4a28) |
| Party D | [`0x22412d552220D3669054d8282D7672Bf5FF60Efe`](https://explorer.arc.io/address/0x22412d552220D3669054d8282D7672Bf5FF60Efe) |

## Contracts

| Contract | Address | Deployed | Verified |
| --- | --- | --- | --- |
| Setoff (milestone 1: debts priced in currency, paid at a fixing) | [`0xcbEb5Cf09d311f69D7FdF71F80A6BfE513333ce7`](https://explorer.arc.io/address/0xcbEb5Cf09d311f69D7FdF71F80A6BfE513333ce7) | [tx `0x0c63…018c`](https://explorer.arc.io/tx/0x0c63055b23b2273f82a5007301f89f41ea14da1811e8f7b89c19efaa63a5018c), block 22,094,796, 2026-09-22 | [Sourcify: exact match](https://sourcify.dev/server/v2/contract/5042/0xcbEb5Cf09d311f69D7FdF71F80A6BfE513333ce7) (creation and runtime), solc 0.8.37, `prague` |
| Setoff (milestone 2: both paths, plus netting cycles; D019) | [`0x8A78B1F880eA21dAe046Ff22De9Ccc21027680d6`](https://explorer.arc.io/address/0x8A78B1F880eA21dAe046Ff22De9Ccc21027680d6) | [tx `0xbf16…d04f`](https://explorer.arc.io/tx/0xbf16e693878e6460878e6fea1f8c0b124c8ac4ec8e15c002e71754d3e0aad04f), block 22,187,522, 2026-09-22, from commit `9b57f3c` | [Sourcify: exact match](https://sourcify.dev/server/v2/contract/5042/0x8A78B1F880eA21dAe046Ff22De9Ccc21027680d6) (creation and runtime), solc 0.8.37, `prague` |

- **Constructor (both):** EUR, MXN, BRL and JPY feeds (see `AGENTS.md`), `maxFixingAge`
  90,000 s.
- **Governance (both):** no owner and no admin.
- **Milestone 1's contract stays as its record.** Its source is the commit it was deployed
  from (`6135a07`), and debt #1 was paid on it. The app moves to the milestone 2 contract
  in Phase 3.
- **Read back after deploy:** `maxFixingAge` 90,000; `MAX_CYCLE_DEBTS` 16; `cycleCount` 0;
  currencies USD, EUR, MXN, BRL, JPY.

## Fixings, payments and cycles

**Debt #1, the first real debt:** Party B bills Party A **MXN 10.00**, and A pays at the
live fixing.

| Step | Tx | Block | Gas | Cost (USDC) |
| --- | --- | --- | --- | --- |
| Propose (B, the creditor) | [`0x22f7…d864`](https://explorer.arc.io/tx/0x22f7bd014cd7be3f5c753f8253abf2a5bf6b838c239d0ce6f227c2bf3328d864) | 22,095,074 | 139,095 | 0.002922 |
| Accept (A endorses) | [`0x5c01…e040`](https://explorer.arc.io/tx/0x5c01d79e27f7d1dbc1cf0cddf12d9b2c22986caf9f06b9662799394d2512e040) | 22,095,085 | 28,286 | 0.000586 |
| Pay (A, at the fixing) | [`0x7387…14f4`](https://explorer.arc.io/tx/0x7387e0776d039af60690080d1173caf6539573c51637eec4fd5d7313353114f4) | 22,095,094 | 105,733 | 0.002188 |
| Withdraw (B takes the payout) | [`0x08e1…32ae5`](https://explorer.arc.io/tx/0x08e1a69274f8f29a99fa06ad4834f91cd1faf8e5e80466a0561b50d23b332ae5) | 22,095,105 | 31,905 | 0.000657 |

- **The `Paid` event records the fixing:** 0.580458800000000000 USDC for MXN 10.00, at
  answer 5,804,588 (8 decimals, so 0.05804588 USD per MXN), round
  18446744073709551792, feed updated at 1790003047.
- **Afterwards:** the debt is `paid`, the contract balance is 0, and `totalWithdrawable`
  is 0.
- **A full debt lifecycle costs about 0.0064 USDC in gas.**

**Debt #2, the live specimen:** Party C bills Party D **BRL 5.00**, and D endorses it. It is
left unpaid on purpose: the refusal room tests against it.

| Step | Tx | Block | Gas | Cost (USDC) |
| --- | --- | --- | --- | --- |
| Propose (C, the creditor) | [`0xa16a…d213`](https://explorer.arc.io/tx/0xa16a82321207f1a37abb8c6da487cd6f1085ad15a1ec56dd176a6c311953d213) | 22,150,855 | 121,995 | 0.002707 |
| Accept (D endorses) | [`0x3fa8…3a6a`](https://explorer.arc.io/tx/0x3fa866aebe7924dc18e1aa8da41987b9c4b8523b785f64a821545d8587ea3a6a) | 22,150,866 | 28,286 | 0.000631 |

**Refusal room, first full run** (2026-09-22, blocks 22,151,605–22,151,622): 12 of 12
attempts matched their rule.

- **Refused, each by name:** `StaleFixing`, `InvalidAnswer`, `Underpaid`, `NotDebtor` (×2),
  `WrongState` (×2), `NothingToWithdraw`, `InvalidDebtor`, `UnsupportedCurrency`.
- **Cleared:** paying the honest amount, and recording an honest debt.

## Measured facts

| Fact | Value | Source |
| --- | --- | --- |
| Native USDC transfer | ≈ 0.00044 USDC (21,000 gas at ≈ 21 Gwei) | four funding transfers, 2026-09-21 |
| Setoff deploy (2,111,361 gas at 22 Gwei) | 0.04645 USDC | deploy receipt |
| Setoff milestone 2 deploy (4,397,110 gas at 25.75 Gwei) | 0.11323 USDC | deploy receipt |
| Fixing a cycle at the caps (16 debts, 5 currencies, 8 parties) | ≈ 631,000 gas | `test_fullCycle_atTheCaps` |
| Settling a cycle at the caps | ≈ 126,000 gas | `test_fullCycle_atTheCaps` |
| One debt, propose → accept → pay → withdraw | 0.00635 USDC | four receipts above |
| Gas floor | 20 Gwei | Arc docs; `eth_gasPrice` |
