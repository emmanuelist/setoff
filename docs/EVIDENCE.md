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

None yet. Phase 1 adds each deployment with its Sourcify verification link.

## Fixings, payments and cycles

None yet.

## Measured facts

| Fact | Value | Source |
| --- | --- | --- |
| Native USDC transfer | ≈ 0.00044 USDC (21,000 gas at ≈ 21 Gwei) | four funding transfers, 2026-09-21 |
| Contract deploy (2M gas) | ≈ 0.04 USDC | `eth_gasPrice` × gas |
| Gas floor | 20 Gwei | Arc docs; `eth_gasPrice` |
