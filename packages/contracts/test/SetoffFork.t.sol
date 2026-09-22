// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {Setoff, AggregatorV3Interface} from "../src/Setoff.sol";
import {ArcMainnet} from "../script/ArcMainnet.sol";

/// @notice Runs against a fork of Arc mainnet and its live Chainlink feeds.
///         Skipped unless ARC_RPC_URL is set.
contract SetoffForkTest is Test {
    Setoff internal setoff;
    address internal creditor = makeAddr("creditor");
    address internal debtor = makeAddr("debtor");

    modifier onArc() {
        string memory rpc = vm.envOr("ARC_RPC_URL", string(""));
        if (bytes(rpc).length == 0) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(rpc);
        (bytes3[] memory codes, address[] memory feeds) = ArcMainnet.feeds();
        setoff = new Setoff(codes, feeds, ArcMainnet.MAX_FIXING_AGE);
        _;
    }

    function test_fork_everyFeedIsFreshAndPrices() public onArc {
        (bytes3[] memory codes, address[] memory feeds) = ArcMainnet.feeds();
        for (uint256 i; i < codes.length; ++i) {
            Setoff.Fixing memory f = setoff.fixingOf(codes[i]);
            (uint80 roundId, int256 answer,, uint256 updatedAt,) =
                AggregatorV3Interface(feeds[i]).latestRoundData();
            assertEq(f.answer, answer, "reads the live answer");
            assertEq(f.roundId, roundId, "and its round");
            assertEq(f.updatedAt, updatedAt, "and its update time");
            assertEq(f.decimals, 8);
            assertLe(block.timestamp - updatedAt, ArcMainnet.MAX_FIXING_AGE, "fresh");
        }
    }

    function test_fork_aDebtInPesosIsPaidInNativeUsdc() public onArc {
        vm.prank(creditor);
        uint256 id = setoff.propose(debtor, "MXN", 30e6, "INV-FORK");
        vm.prank(debtor);
        setoff.accept(id);

        (uint256 due, Setoff.Fixing memory f) = setoff.quote(id);
        uint256 expected = (uint256(30e6) * uint256(f.answer) * 1e12 + 1e8 - 1) / 1e8;
        assertEq(due, expected);

        vm.deal(debtor, 10 ether); // 10 native USDC
        vm.prank(debtor);
        setoff.pay{value: due}(id);
        vm.prank(creditor);
        setoff.withdraw();
        assertEq(creditor.balance, due, "the creditor holds exactly the fixed amount in USDC");
        assertEq(address(setoff).balance, 0);
    }
}
