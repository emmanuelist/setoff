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

    // ── milestone 2: a cycle at the live fixing ──────────────────────────

    address[4] internal ps;

    /// Four fresh parties (never the well-known test accounts: on Arc mainnet those carry an
    /// EIP-7702 sweeper), five currencies, one cycle.
    function _cycle() internal returns (uint256 cid, uint64 cutoff, uint64 deadline) {
        for (uint256 i; i < 4; ++i) {
            ps[i] = makeAddr(string.concat("party", vm.toString(i)));
            vm.deal(ps[i], 100 ether);
        }
        cutoff = uint64(block.timestamp + 1 minutes);
        deadline = cutoff + 10 minutes;
        cid = setoff.openCycle(cutoff, deadline);
        _bill(cid, ps[1], ps[0], "MXN", 30e6); // 0 owes 1 MXN 30.00
        _bill(cid, ps[2], ps[1], "EUR", 2e6); // 1 owes 2 EUR 2.00
        _bill(cid, ps[0], ps[2], "JPY", 300e6); // 2 owes 0 JPY 300
        _bill(cid, ps[3], ps[0], "BRL", 5e6); // 0 owes 3 BRL 5.00
        _bill(cid, ps[0], ps[3], "USD", 1e6); // 3 owes 0 USD 1.00
    }

    function _bill(uint256 cid, address creditor_, address debtor_, bytes3 ccy, uint128 amount)
        internal
    {
        vm.prank(creditor_);
        uint256 id = setoff.proposeInCycle(cid, debtor_, ccy, amount, "FORK");
        vm.prank(debtor_);
        setoff.accept(id);
    }

    function test_fork_aCycleInFiveCurrenciesMovesOnlyTheNet() public onArc {
        (uint256 cid, uint64 cutoff,) = _cycle();
        vm.warp(cutoff);
        setoff.fixCycle(cid);

        // Each currency was fixed at the live feed's own answer and round.
        (bytes3[] memory codes, address[] memory feeds) = ArcMainnet.feeds();
        for (uint256 i; i < codes.length; ++i) {
            (uint80 roundId, int256 answer,,,) = AggregatorV3Interface(feeds[i]).latestRoundData();
            Setoff.Fixing memory f = setoff.cycleFixing(cid, codes[i]);
            assertEq(f.answer, answer);
            assertEq(f.roundId, roundId);
        }

        Setoff.Cycle memory c = setoff.cycle(cid);
        assertLt(c.netMoved, c.gross, "only the net moves");
        (address[] memory parties, Setoff.Position[] memory pos) = setoff.cyclePositions(cid);
        int256 sum;
        for (uint256 i; i < pos.length; ++i) {
            sum += pos[i].net;
            if (pos[i].net < 0) {
                vm.prank(parties[i]);
                setoff.fund{value: uint256(-pos[i].net)}(cid);
            }
        }
        assertEq(sum, 0);
        assertEq(address(setoff).balance, c.netMoved);

        setoff.settle(cid);
        for (uint256 i; i < 4; ++i) {
            uint256 owed = setoff.withdrawable(ps[i]);
            if (owed == 0) continue;
            uint256 before = ps[i].balance;
            vm.prank(ps[i]);
            setoff.withdraw();
            assertEq(ps[i].balance - before, owed);
        }
        assertEq(address(setoff).balance, 0, "every unit that moved in moved out");
    }

    function test_fork_aHoldoutVoidsTheCycleAndEveryDepositComesBack() public onArc {
        (uint256 cid, uint64 cutoff, uint64 deadline) = _cycle();
        vm.warp(cutoff);
        setoff.fixCycle(cid);

        (address[] memory parties, Setoff.Position[] memory pos) = setoff.cyclePositions(cid);
        bool heldOut;
        uint256 deposited;
        for (uint256 i; i < pos.length; ++i) {
            if (pos[i].net >= 0) continue;
            if (!heldOut) {
                heldOut = true; // the first net debtor never funds
                continue;
            }
            vm.prank(parties[i]);
            setoff.fund{value: uint256(-pos[i].net)}(cid);
            deposited += uint256(-pos[i].net);
        }
        assertTrue(heldOut);
        assertGt(deposited, 0, "someone did fund, and must get it back");

        vm.warp(deadline);
        setoff.voidCycle(cid);
        assertEq(setoff.totalWithdrawable(), deposited);
        for (uint256 i; i < 4; ++i) {
            uint256 owed = setoff.withdrawable(ps[i]);
            if (owed == 0) continue;
            vm.prank(ps[i]);
            setoff.withdraw();
        }
        assertEq(address(setoff).balance, 0, "every deposit came back");

        // The debts are back on the direct path and can be paid at the live fixing.
        uint256 first = setoff.cycleDebts(cid)[0];
        Setoff.Debt memory d = setoff.debt(first);
        assertEq(d.cycleId, 0);
        (uint256 due,) = setoff.quote(first);
        vm.prank(d.debtor);
        setoff.pay{value: due}(first);
        assertEq(uint8(setoff.debt(first).state), uint8(Setoff.State.Paid));
    }
}
