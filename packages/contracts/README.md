# Setoff contracts

Debts priced in USD, EUR, MXN, BRL or JPY, paid in native USDC on Arc at a Chainlink
fixing. There is no owner and no admin; every payout is a withdrawal.

**Live on Arc mainnet:**
[`0xcbEb5Cf09d311f69D7FdF71F80A6BfE513333ce7`](https://explorer.arc.io/address/0xcbEb5Cf09d311f69D7FdF71F80A6BfE513333ce7)
([Sourcify exact match](https://sourcify.dev/server/v2/contract/5042/0xcbEb5Cf09d311f69D7FdF71F80A6BfE513333ce7))

Built and tested with [Arc Foundry](https://github.com/circlefin/arc-foundry), so the
tests run under Arc's native-USDC rules.

```bash
git submodule update --init
arc-forge test --network arc                                        # unit, fuzz, invariants
ARC_RPC_URL=https://rpc.mainnet.arc.io arc-forge test --network arc  # + mainnet fork
```

| Suite | What it proves |
| --- | --- |
| `Setoff.t.sol` | Every state rule and failure path: stale, zero, negative and future fixings; underpayment; wrong payer; a recipient that refuses payment blocks only itself; reentrancy; same-second payments; exact prices for all five currencies; fuzzed round-up by less than one unit |
| `SetoffInvariant.t.sol` | Across 256 random sequences of 64 calls: the contract stays solvent, the books balance to the wei, balances sum to the total, and closed debts stay closed |
| `SetoffFork.t.sol` | Against Arc mainnet state: live feeds are read exactly, and a peso debt is paid in native USDC |
