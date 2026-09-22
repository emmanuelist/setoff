// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @notice Arc mainnet (chain 5042) constants, verified on-chain on 2026-09-22.
library ArcMainnet {
    uint256 internal constant CHAIN_ID = 5042;

    /// @notice Chainlink's FX heartbeat is 24 h; one hour of grace for a late update (D013).
    uint256 internal constant MAX_FIXING_AGE = 24 hours + 1 hours;

    address internal constant EUR_USD = 0xDd5B15443cd733D3966a50a3E48cB7DF9Fb5DE0D;
    address internal constant MXN_USD = 0x302eaa6cd6f7AdDdc973fAC2Bb8fa32e9Ce19f21;
    address internal constant BRL_USD = 0x3406DB72AC5136b89eba6808CFcaD83aF523B3C2;
    address internal constant JPY_USD = 0xF9Fc1C20C82d774A3787845E73E41BCbF7F38F25;

    function feeds() internal pure returns (bytes3[] memory codes, address[] memory addrs) {
        codes = new bytes3[](4);
        addrs = new address[](4);
        (codes[0], addrs[0]) = (bytes3("EUR"), EUR_USD);
        (codes[1], addrs[1]) = (bytes3("MXN"), MXN_USD);
        (codes[2], addrs[2]) = (bytes3("BRL"), BRL_USD);
        (codes[3], addrs[3]) = (bytes3("JPY"), JPY_USD);
    }
}
