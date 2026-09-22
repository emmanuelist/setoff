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

## Milestone 2 contract: specimen debts and the first cycle

Everything below is on the milestone 2 contract, `0x8A78…80d6`. The specimen debts were recreated
there for the refusal room with `scripts/mainnet/specimen.sh`. The cycle was run with
`script/OpenCycle.s.sol` and `script/ClearCycle.s.sol`. Every step was rehearsed on a mainnet
fork first.

**Specimen debts, 2026-09-22.**

| Step | Tx | Block | Gas |
| --- | --- | --- | --- |
| #1: A bills B MXN 10.00 | [`0x68c0…4dcf`](https://explorer.arc.io/tx/0x68c0b682b12cef882e93d52f8f305d5bb7e1b54e7db017d3f531327d09924dcf) | 22,191,486 | 139,393 |
| #1: B endorses | [`0x66aa…81ad`](https://explorer.arc.io/tx/0x66aaa0c61cc30785a548fb20ea4942cc1c30d4de94e8ed6d99930549e31581ad) | 22,191,493 | 30,480 |
| #1: B pays 0.5804436 USDC at the fixing | [`0xcba3…5c61`](https://explorer.arc.io/tx/0xcba3d5867d806a9d7f649174459253419324f102d35ab7c5871145d473b75c61) | 22,191,503 | 105,860 |
| #1: A withdraws | [`0x2fb0…3b05`](https://explorer.arc.io/tx/0x2fb0dd1a59cc2601bab6aed3aaa7a6a1dc933cc20c5a8eba25e62e2a42753b05) | 22,191,507 | 31,959 |
| #2: C bills D BRL 5.00 | [`0x308c…dfa0`](https://explorer.arc.io/tx/0x308c22a225acdd743443d80a7f9031c606aba6f73dbf6a968c5eb61a7e56dfa0) | 22,191,512 | 122,293 |
| #2: D endorses; left unpaid | [`0x730c…3b41`](https://explorer.arc.io/tx/0x730cbe7b04126c9327aeac26a12d64404f038adc357b68eb33a050ce60ee3b41) | 22,191,520 | 30,480 |

**Cycle #1, 2026-09-22: a ring in five currencies that almost cancels.**

- **Schedule:** cutoff 1790087486 (14:31:26 UTC); funding deadline 1790088686 (20 minutes
  later).
- **Fixed** at 1790087611, in block 22,192,415. **Settled** at 1790087669, in block
  22,192,529.

| Debt | Creditor → debtor | Amount | At the fixing (USDC) |
| --- | --- | --- | --- |
| #3 | A → B | EUR 1.00 | 1.146365 |
| #4 | B → C | MXN 20.00 | 1.1608872 |
| #5 | C → D | BRL 6.00 | 1.17061746 |
| #6 | D → A | JPY 180 | 1.1439594 |
| #7 | A → C | USD 0.25 | 0.25 |
| | | **Gross** | **4.87182906** |

The rates were read once each, at the fixing, and are stored on-chain:

| Currency | Answer (8 decimals) | Round | Feed updated |
| --- | --- | --- | --- |
| EUR | 114,636,500 | 18446744073709551726 | 1790015731 |
| MXN | 5,804,436 | 18446744073709551794 | 1790074557 |
| BRL | 19,510,291 | 18446744073709551768 | 1790079508 |
| JPY | 635,533 | 18446744073709551845 | 1790081680 |
| USD | 1 : 1 by definition | | |

The nets sum to exactly zero:

| Party | Net (USDC) | Position |
| --- | --- | --- |
| A | +0.2524056 | credit |
| B | +0.0145222 | credit |
| C | −0.24026974 | debit, funded |
| D | −0.02665806 | debit, funded |

**0.2669278 USDC moved for 4.87182906 USDC owed: 94.5 % set off.** Five debts in five
currencies were netted in one settlement transaction.

| Step | By | Tx | Block | Gas |
| --- | --- | --- | --- | --- |
| Open the cycle | A | [`0xbfcc…c024`](https://explorer.arc.io/tx/0xbfcc6d52da6eead992adddb894036a36aa1bf7d1ea344076dcbb5562a542c024) | 22,191,622 | 90,825 |
| #3 proposed / endorsed | A / B | [`0x62e6…caac`](https://explorer.arc.io/tx/0x62e6883460360ea2595a18dd971d03214c8abb75d71c0a94789c1d7477fdcaac) / [`0x301d…2cb2`](https://explorer.arc.io/tx/0x301dcb12edfb72132a09cb1a7565e496aca6f7eb9a240c007dae592ed3b62cb2) | 22,191,624 / 627 | 128,603 / 199,667 |
| #4 proposed / endorsed | B / C | [`0x3e7a…c242`](https://explorer.arc.io/tx/0x3e7aadc1b3edf32e8f624238e761653658f75f1ad08ea4f4c0fa802247e1c242) / [`0xb8c6…219f`](https://explorer.arc.io/tx/0xb8c63aca078c6ff9159ca8faff6386dd1e7b08fbaa950abdb5681b48bb15219f) | 22,191,632 / 637 | 128,603 / 122,603 |
| #5 proposed / endorsed | C / D | [`0x776c…4a47`](https://explorer.arc.io/tx/0x776cd5013ec0566d0ea5d92e03a1bc92106b088268c3941dea52927b10be4a47) / [`0xd463…52be`](https://explorer.arc.io/tx/0xd4637f979330d2ff628f6ffb78d4cdade744e6bac9cf49459b7a644a5a0d52be) | 22,191,639 / 644 | 128,603 / 122,603 |
| #6 proposed / endorsed | D / A | [`0x59c7…40ae`](https://explorer.arc.io/tx/0x59c72ee8c552dd2a2f2179de67369141db5a78291f09454a7bb3e65be06b40ae) / [`0x2164…5f6d`](https://explorer.arc.io/tx/0x21649ed357e36d48f6265a1f2a04cd968021a2754811cd0360378e8162fd5f6d) | 22,191,646 / 652 | 128,603 / 74,939 |
| #7 proposed / endorsed | A / C | [`0x851c…589b`](https://explorer.arc.io/tx/0x851cb74737119417a6f73b7fd4fd5849cd7c5a7d86ab4420ad03cfe6854b589b) / [`0x6512…8294`](https://explorer.arc.io/tx/0x651239c1871cb10320eb2825136c16e67675726682c2f141e7e85e1871388294) | 22,191,657 / 662 | 126,418 / 74,939 |
| Fix: 4 reads, 5 debts, 4 nets | A | [`0x405e…eaaf`](https://explorer.arc.io/tx/0x405eea8d9e245153d4dd7843dda3c6e4a9e0b24671e1a62ce0655fa703e7eaaf) | 22,192,415 | 674,436 |
| Fund −0.24026974 | C | [`0x97c1…23c3`](https://explorer.arc.io/tx/0x97c1c27c91428543870034c3d64495d1f0923071cd69a78795a7372a057023c3) | 22,192,521 | 81,277 |
| Fund −0.02665806 | D | [`0xef66…e544`](https://explorer.arc.io/tx/0xef66db66ee4d9f46fab621427ff0de232252ef4af08233862c1e00586e41e544) | 22,192,524 | 47,077 |
| Settle: 5 debts netted | A | [`0x6f84…a10d`](https://explorer.arc.io/tx/0x6f840be9a2501cb80d4223ca7690577b987522c1bf5b7513a418c45f0d0ba10d) | 22,192,529 | 197,950 |
| Withdraw +0.2524056 | A | [`0x5e7e…9578`](https://explorer.arc.io/tx/0x5e7eecb6cb86838fb1876fb5c53aa227e9678c4e3338b4895239f8cae6869578) | 22,192,530 | 35,148 |
| Withdraw +0.0145222 | B | [`0xf33b…58cd`](https://explorer.arc.io/tx/0xf33bc8cad56c2827933053cdf924d3976238b9129089c139d3913fb1201058cd) | 22,192,533 | 31,959 |

**Afterwards:** the contract's balance is 0 and `totalHeld` is 0.

**Refusal room on the milestone 2 contract** (2026-09-22): 17 of 17 attempts matched their
rule. The 12 direct-path attempts run against specimens #1 and #2. Five cycle attempts run
against cycle #1:

- `settle` twice, refused with `WrongCycleState`;
- void after settlement, refused with `WrongCycleState`;
- fund after it closed, refused with `WrongCycleState`;
- pay a netted debt directly, refused with `WrongState`;
- open with a 5-minute funding window, refused with `InvalidSchedule`.

## Measured facts

| Fact | Value | Source |
| --- | --- | --- |
| Native USDC transfer | ≈ 0.00044 USDC (21,000 gas at ≈ 21 Gwei) | four funding transfers, 2026-09-21 |
| Setoff deploy (2,111,361 gas at 22 Gwei) | 0.04645 USDC | deploy receipt |
| Setoff milestone 2 deploy (4,397,110 gas at 25.75 Gwei) | 0.11323 USDC | deploy receipt |
| Fixing a cycle at the caps (16 debts, 5 currencies, 8 parties) | ≈ 631,000 gas | `test_fullCycle_atTheCaps` |
| Settling a cycle at the caps | ≈ 126,000 gas | `test_fullCycle_atTheCaps` |
| A real five-currency cycle, end to end (open, 5 debts, fix, 2 fundings, settle, 2 withdrawals) | 0.0516 USDC in gas (2,394,253 gas over 17 transactions) | cycle #1 receipts |
| One debt, propose → accept → pay → withdraw | 0.00635 USDC | four receipts above |
| Gas floor | 20 Gwei | Arc docs; `eth_gasPrice` |
