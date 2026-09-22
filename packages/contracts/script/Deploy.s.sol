// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {Setoff} from "../src/Setoff.sol";
import {ArcMainnet} from "./ArcMainnet.sol";

/// @notice Deploys Setoff to Arc mainnet with the live Chainlink FX feeds. No owner, no
///         admin: the currency list and the staleness limit are fixed at deployment.
contract Deploy is Script {
    function run() external returns (Setoff setoff) {
        require(block.chainid == ArcMainnet.CHAIN_ID, "Deploy: not Arc mainnet");
        (bytes3[] memory codes, address[] memory feeds) = ArcMainnet.feeds();

        vm.startBroadcast();
        setoff = new Setoff(codes, feeds, ArcMainnet.MAX_FIXING_AGE);
        vm.stopBroadcast();

        for (uint256 i; i < codes.length; ++i) {
            Setoff.Fixing memory f = setoff.fixingOf(codes[i]);
            console.log(string(abi.encodePacked(codes[i])), uint256(f.answer), f.updatedAt);
        }
        console.log("Setoff", address(setoff));
    }
}
