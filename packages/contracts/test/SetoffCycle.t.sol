// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test, Vm} from "forge-std/Test.sol";
import {Setoff} from "../src/Setoff.sol";
import {MockFeed, RefusingParty} from "./utils/MockFeed.sol";

contract SetoffCycleTest is Test {
    Setoff internal setoff;
    MockFeed internal eur;
    MockFeed internal mxn;
    MockFeed internal brl;
    MockFeed internal jpy;

    uint256 internal constant MAX_AGE = 90_000;
    uint256 internal constant T0 = 1_790_000_000;
    uint64 internal constant CUTOFF = uint64(T0 + 1 hours);
    uint64 internal constant DEADLINE = uint64(T0 + 2 hours);

    address internal a = makeAddr("a");
    address internal b = makeAddr("b");
    address internal c = makeAddr("c");
    address internal d = makeAddr("d");
    address internal stranger = makeAddr("stranger");

    function setUp() public {
        vm.warp(T0);
        eur = new MockFeed(8, 114_636_500);
        mxn = new MockFeed(8, 5_804_588);
        brl = new MockFeed(8, 19_553_400);
        jpy = new MockFeed(8, 635_489);

        bytes3[] memory codes = new bytes3[](4);
        address[] memory feeds = new address[](4);
        (codes[0], codes[1], codes[2], codes[3]) =
        (bytes3("EUR"), bytes3("MXN"), bytes3("BRL"), bytes3("JPY"));
        (feeds[0], feeds[1], feeds[2], feeds[3]) =
        (address(eur), address(mxn), address(brl), address(jpy));
        setoff = new Setoff(codes, feeds, MAX_AGE);

        vm.deal(a, 1000 ether);
        vm.deal(b, 1000 ether);
        vm.deal(c, 1000 ether);
        vm.deal(d, 1000 ether);
    }

    // ── helpers ──────────────────────────────────────────────────────────

    function _open() internal returns (uint256) {
        return setoff.openCycle(CUTOFF, DEADLINE);
    }

    /// `creditor` bills `debtor`, into the cycle, and `debtor` accepts.
    function _enrolled(uint256 cid, address creditor, address debtor, bytes3 ccy, uint128 amount)
        internal
        returns (uint256 id)
    {
        vm.prank(creditor);
        id = setoff.proposeInCycle(cid, debtor, ccy, amount, "CYC");
        vm.prank(debtor);
        setoff.accept(id);
    }

    function _refreshFeeds() internal {
        eur.set(eur.answer(), block.timestamp);
        mxn.set(mxn.answer(), block.timestamp);
        brl.set(brl.answer(), block.timestamp);
        jpy.set(jpy.answer(), block.timestamp);
    }

    function _net(uint256 cid, address party) internal view returns (int256) {
        (address[] memory parties, Setoff.Position[] memory positions) = setoff.cyclePositions(cid);
        for (uint256 i; i < parties.length; ++i) {
            if (parties[i] == party) return positions[i].net;
        }
        return 0;
    }

    /// The first party (in a, b, c order) whose net is a debit, or a credit.
    function _first(uint256 cid, bool debit) internal view returns (address) {
        address[3] memory ps = [a, b, c];
        for (uint256 i; i < 3; ++i) {
            int256 net = _net(cid, ps[i]);
            if (debit ? net < 0 : net > 0) return ps[i];
        }
        return address(0);
    }

    function _usdc(uint256 cid, bytes3 ccy, uint128 amount) internal view returns (uint256) {
        return setoff.toUsdc(amount, setoff.cycleFixing(cid, ccy));
    }

    /// A three-party, four-currency cycle where everyone owes someone.
    function _triangle() internal returns (uint256 cid) {
        cid = _open();
        _enrolled(cid, b, a, "MXN", 100e6); // a owes b MXN 100.00
        _enrolled(cid, c, b, "EUR", 10e6); // b owes c EUR 10.00
        _enrolled(cid, a, c, "JPY", 1000e6); // c owes a JPY 1,000
        _enrolled(cid, b, a, "USD", 5e6); // a owes b USD 5.00
    }

    function _fixed() internal returns (uint256 cid) {
        cid = _triangle();
        vm.warp(CUTOFF);
        _refreshFeeds();
        setoff.fixCycle(cid);
    }

    function _fundAll(uint256 cid) internal {
        (address[] memory parties, Setoff.Position[] memory positions) = setoff.cyclePositions(cid);
        for (uint256 i; i < parties.length; ++i) {
            if (positions[i].net < 0) {
                vm.prank(parties[i]);
                setoff.fund{value: uint256(-positions[i].net)}(cid);
            }
        }
    }

    // ── opening ──────────────────────────────────────────────────────────

    function test_openCycle_recordsTheSchedule() public {
        vm.expectEmit(address(setoff));
        emit Setoff.CycleOpened(1, stranger, CUTOFF, DEADLINE);
        vm.prank(stranger);
        uint256 cid = setoff.openCycle(CUTOFF, DEADLINE);

        Setoff.Cycle memory cy = setoff.cycle(cid);
        assertEq(cid, 1);
        assertEq(cy.opener, stranger);
        assertEq(cy.cutoff, CUTOFF);
        assertEq(cy.fundingDeadline, DEADLINE);
        assertEq(uint8(cy.state), uint8(Setoff.CycleState.Open));
    }

    function test_openCycle_validatesTheSchedule() public {
        uint64 now_ = uint64(block.timestamp);
        vm.expectRevert(
            abi.encodeWithSelector(Setoff.InvalidSchedule.selector, now_, now_ + 1 hours)
        );
        setoff.openCycle(now_, now_ + 1 hours); // cutoff must be in the future

        uint64 cut = now_ + 1 hours;
        vm.expectRevert(
            abi.encodeWithSelector(Setoff.InvalidSchedule.selector, cut, cut + 10 minutes - 1)
        );
        setoff.openCycle(cut, cut + 10 minutes - 1); // funding window too short
        vm.expectRevert(abi.encodeWithSelector(Setoff.InvalidSchedule.selector, cut, cut - 1));
        setoff.openCycle(cut, cut - 1); // deadline before cutoff
        vm.expectRevert(
            abi.encodeWithSelector(Setoff.InvalidSchedule.selector, cut, cut + 30 days + 1)
        );
        setoff.openCycle(cut, cut + 30 days + 1); // funding window too long

        setoff.openCycle(cut, cut + 10 minutes); // both bounds are inclusive
        setoff.openCycle(cut, cut + 30 days);
    }

    function test_unknownCycle_reverts() public {
        bytes memory err = abi.encodeWithSelector(Setoff.UnknownCycle.selector, 7);
        vm.expectRevert(err);
        setoff.cycle(7);
        vm.expectRevert(err);
        setoff.fixCycle(7);
        vm.expectRevert(err);
        setoff.fund{value: 1}(7);
        vm.expectRevert(err);
        setoff.settle(7);
        vm.expectRevert(err);
        setoff.voidCycle(7);
        vm.prank(a);
        vm.expectRevert(err);
        setoff.proposeInCycle(7, b, "USD", 1e6, "");
    }

    // ── enrolment: named at proposal, joined on acceptance (D017) ────────

    function test_proposeInCycle_joinsOnlyWhenAccepted() public {
        uint256 cid = _open();
        vm.expectEmit(address(setoff));
        emit Setoff.Enrolled(1, cid);
        vm.prank(b);
        uint256 id = setoff.proposeInCycle(cid, a, "MXN", 100e6, "INV-9");

        assertEq(setoff.debt(id).cycleId, cid);
        assertEq(setoff.cycleDebts(cid).length, 0, "a proposal is not in the cycle yet");

        vm.prank(a);
        setoff.accept(id);
        uint256[] memory ids = setoff.cycleDebts(cid);
        assertEq(ids.length, 1);
        assertEq(ids[0], id);
        (address[] memory parties,) = setoff.cyclePositions(cid);
        assertEq(parties.length, 2);
        assertEq(parties[0], b);
        assertEq(parties[1], a);
    }

    function test_enrolment_closesExactlyAtTheCutoff() public {
        uint256 cid = _open();
        vm.prank(b);
        uint256 id = setoff.proposeInCycle(cid, a, "USD", 1e6, "");

        vm.warp(CUTOFF - 1);
        vm.prank(b);
        setoff.proposeInCycle(cid, a, "USD", 1e6, ""); // one second before: still open

        vm.warp(CUTOFF);
        bytes memory err = abi.encodeWithSelector(Setoff.PastCutoff.selector, cid, CUTOFF);
        vm.prank(b);
        vm.expectRevert(err);
        setoff.proposeInCycle(cid, a, "USD", 1e6, "");
        vm.prank(a);
        vm.expectRevert(err);
        setoff.accept(id);

        // A proposal left behind by the cutoff can still be withdrawn by its creditor.
        vm.prank(b);
        setoff.cancel(id);
        assertEq(uint8(setoff.debt(id).state), uint8(Setoff.State.Cancelled));
    }

    function test_cycleDebt_cannotBePaidDirectly() public {
        uint256 cid = _open();
        uint256 id = _enrolled(cid, b, a, "EUR", 1e6);
        vm.prank(a);
        vm.expectRevert(abi.encodeWithSelector(Setoff.InCycle.selector, id, cid));
        setoff.pay{value: 10 ether}(id);
    }

    function test_proposeInCycle_rejectsBadInputLikeDirect() public {
        uint256 cid = _open();
        vm.startPrank(b);
        vm.expectRevert(Setoff.InvalidDebtor.selector);
        setoff.proposeInCycle(cid, b, "USD", 1e6, "");
        vm.expectRevert(Setoff.ZeroAmount.selector);
        setoff.proposeInCycle(cid, a, "USD", 0, "");
        vm.expectRevert(abi.encodeWithSelector(Setoff.UnsupportedCurrency.selector, bytes3("GBP")));
        setoff.proposeInCycle(cid, a, "GBP", 1e6, "");
        uint128 tooMuch = uint128(setoff.MAX_AMOUNT() + 1);
        vm.expectRevert(abi.encodeWithSelector(Setoff.AmountTooLarge.selector, tooMuch));
        setoff.proposeInCycle(cid, a, "USD", tooMuch, "");
        vm.expectRevert(abi.encodeWithSelector(Setoff.AmountTooLarge.selector, tooMuch));
        setoff.propose(a, "USD", tooMuch, "");
        vm.stopPrank();
    }

    // ── caps ─────────────────────────────────────────────────────────────

    function test_cap_sixteenDebts() public {
        uint256 cid = _open();
        for (uint256 i; i < 16; ++i) {
            _enrolled(cid, b, a, "USD", 1e6);
        }
        vm.prank(b);
        uint256 id = setoff.proposeInCycle(cid, a, "USD", 1e6, "");
        vm.prank(a);
        vm.expectRevert(abi.encodeWithSelector(Setoff.CycleFull.selector, cid));
        setoff.accept(id);
    }

    function test_cap_eightParties() public {
        uint256 cid = _open();
        address[9] memory p;
        for (uint256 i; i < 9; ++i) {
            p[i] = makeAddr(string.concat("p", vm.toString(i)));
        }
        for (uint256 i; i < 8; i += 2) {
            _enrolled(cid, p[i], p[i + 1], "USD", 1e6);
        }
        (address[] memory parties,) = setoff.cyclePositions(cid);
        assertEq(parties.length, 8);

        vm.prank(p[8]);
        uint256 id = setoff.proposeInCycle(cid, p[0], "USD", 1e6, "");
        vm.prank(p[0]);
        vm.expectRevert(abi.encodeWithSelector(Setoff.TooManyParties.selector, cid));
        setoff.accept(id);

        // Between parties already in the cycle, there is still room.
        _enrolled(cid, p[1], p[2], "USD", 1e6);
    }

    // ── the fixing ───────────────────────────────────────────────────────

    function test_fix_opensExactlyAtTheCutoffAndClosesAtTheDeadline() public {
        uint256 cid = _triangle();
        vm.warp(CUTOFF - 1);
        vm.expectRevert(abi.encodeWithSelector(Setoff.BeforeCutoff.selector, cid, CUTOFF));
        setoff.fixCycle(cid);

        vm.warp(CUTOFF);
        _refreshFeeds();
        setoff.fixCycle(cid);
        assertEq(uint8(setoff.cycle(cid).state), uint8(Setoff.CycleState.Fixed));
        vm.expectRevert(
            abi.encodeWithSelector(Setoff.WrongCycleState.selector, cid, Setoff.CycleState.Fixed)
        );
        setoff.fixCycle(cid);

        uint256 late = setoff.openCycle(DEADLINE, DEADLINE + 1 hours);
        _enrolled(late, b, a, "USD", 1e6);
        vm.warp(DEADLINE + 1 hours);
        vm.expectRevert(
            abi.encodeWithSelector(Setoff.PastDeadline.selector, late, DEADLINE + 1 hours)
        );
        setoff.fixCycle(late);
    }

    function test_fix_refusesAnEmptyCycle() public {
        uint256 cid = _open();
        vm.warp(CUTOFF);
        vm.expectRevert(abi.encodeWithSelector(Setoff.EmptyCycle.selector, cid));
        setoff.fixCycle(cid);
    }

    function test_fix_readsEachCurrencyOnceAndNetsSumToZero() public {
        uint256 cid = _triangle();
        _enrolled(cid, b, a, "MXN", 1e6); // a second MXN debt: still one MXN read
        vm.warp(CUTOFF);
        _refreshFeeds();

        vm.recordLogs();
        setoff.fixCycle(cid);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        uint256 reads;
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].topics[0] == Setoff.CurrencyFixed.selector) ++reads;
        }
        assertEq(reads, 4, "USD, EUR, MXN and JPY, each read once");
        assertEq(setoff.cycleFixing(cid, "BRL").answer, 0, "BRL is not in this cycle");

        uint256 vMxn = _usdc(cid, "MXN", 100e6);
        uint256 vMxn2 = _usdc(cid, "MXN", 1e6);
        uint256 vEur = _usdc(cid, "EUR", 10e6);
        uint256 vJpy = _usdc(cid, "JPY", 1000e6);
        uint256 vUsd = _usdc(cid, "USD", 5e6);
        assertEq(vUsd, 5 ether);
        assertEq(vEur, 11.46365 ether);

        int256 na = int256(vJpy) - int256(vMxn) - int256(vUsd) - int256(vMxn2);
        int256 nb = int256(vMxn) + int256(vUsd) + int256(vMxn2) - int256(vEur);
        int256 nc = int256(vEur) - int256(vJpy);
        assertEq(_net(cid, a), na);
        assertEq(_net(cid, b), nb);
        assertEq(_net(cid, c), nc);
        assertEq(na + nb + nc, 0);

        Setoff.Cycle memory cy = setoff.cycle(cid);
        assertEq(cy.gross, vMxn + vMxn2 + vEur + vJpy + vUsd);
        uint256 moved =
            (na < 0 ? uint256(-na) : 0) + (nb < 0 ? uint256(-nb) : 0) + (nc < 0 ? uint256(-nc) : 0);
        assertEq(cy.netMoved, moved);
        assertLt(cy.netMoved, cy.gross, "only the net moves");
        assertEq(cy.fixedAt, CUTOFF);
    }

    function test_fix_aStaleRateRefusesTheWholeFixingUntilTheFeedUpdates() public {
        uint256 cid = _triangle();
        vm.warp(CUTOFF);
        _refreshFeeds();
        eur.set(eur.answer(), CUTOFF - MAX_AGE - 1);

        vm.expectRevert(
            abi.encodeWithSelector(
                Setoff.StaleFixing.selector, bytes3("EUR"), CUTOFF - MAX_AGE - 1, MAX_AGE
            )
        );
        setoff.fixCycle(cid);
        assertEq(uint8(setoff.cycle(cid).state), uint8(Setoff.CycleState.Open));

        eur.set(eur.answer(), block.timestamp);
        setoff.fixCycle(cid);
        assertEq(uint8(setoff.cycle(cid).state), uint8(Setoff.CycleState.Fixed));
    }

    function test_preview_matchesTheFixing() public {
        uint256 cid = _triangle();
        vm.warp(CUTOFF);
        _refreshFeeds();
        (address[] memory parties, int256[] memory nets, uint256 gross, uint256 netMoved) =
            setoff.preview(cid);
        setoff.fixCycle(cid);
        for (uint256 i; i < parties.length; ++i) {
            assertEq(_net(cid, parties[i]), nets[i]);
        }
        assertEq(setoff.cycle(cid).gross, gross);
        assertEq(setoff.cycle(cid).netMoved, netMoved);
    }

    // ── funding ──────────────────────────────────────────────────────────

    function test_fund_onlyNetDebtorsOnceAndInFull() public {
        uint256 cid = _triangle();
        vm.prank(a);
        vm.expectRevert(
            abi.encodeWithSelector(Setoff.WrongCycleState.selector, cid, Setoff.CycleState.Open)
        );
        setoff.fund{value: 1 ether}(cid);

        vm.warp(CUTOFF);
        _refreshFeeds();
        setoff.fixCycle(cid);

        address debtor = _first(cid, true);
        address creditor = _first(cid, false);
        uint256 due = uint256(-_net(cid, debtor));

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Setoff.NotNetDebtor.selector, cid, stranger));
        setoff.fund(cid);
        vm.prank(creditor);
        vm.expectRevert(abi.encodeWithSelector(Setoff.NotNetDebtor.selector, cid, creditor));
        setoff.fund{value: 1 ether}(cid);

        vm.prank(debtor);
        vm.expectRevert(abi.encodeWithSelector(Setoff.Underfunded.selector, cid, due, due - 1));
        setoff.fund{value: due - 1}(cid);

        vm.expectEmit(address(setoff));
        emit Setoff.Funded(cid, debtor, due);
        vm.prank(debtor);
        setoff.fund{value: due + 0.5 ether}(cid);
        assertEq(setoff.withdrawable(debtor), 0.5 ether, "the excess is credited back, never kept");
        assertEq(setoff.totalHeld(), due);
        assertEq(setoff.cycle(cid).held, due);

        vm.prank(debtor);
        vm.expectRevert(abi.encodeWithSelector(Setoff.AlreadyFunded.selector, cid, debtor));
        setoff.fund{value: due}(cid);
    }

    function test_fund_closesExactlyAtTheDeadline() public {
        uint256 cid = _fixed();
        address debtor = _first(cid, true);
        uint256 due = uint256(-_net(cid, debtor));
        vm.warp(DEADLINE);
        vm.prank(debtor);
        vm.expectRevert(abi.encodeWithSelector(Setoff.PastDeadline.selector, cid, DEADLINE));
        setoff.fund{value: due}(cid);
    }

    // ── settlement: all or nothing ───────────────────────────────────────

    function test_settle_waitsForEveryDebtor() public {
        uint256 cid = _fixed();
        Setoff.Cycle memory cy = setoff.cycle(cid);
        vm.expectRevert(abi.encodeWithSelector(Setoff.NotFullyFunded.selector, cid, 0, cy.debtors));
        setoff.settle(cid);
    }

    function test_settle_creditsEveryNetCreditorAndNetsEveryDebt() public {
        uint256 cid = _fixed();
        _fundAll(cid);
        uint256 moved = setoff.cycle(cid).netMoved;
        assertEq(address(setoff).balance, moved);

        vm.warp(CUTOFF + 5 minutes);
        vm.prank(stranger); // anyone can settle
        setoff.settle(cid);

        Setoff.Cycle memory cy = setoff.cycle(cid);
        assertEq(uint8(cy.state), uint8(Setoff.CycleState.Settled));
        assertEq(cy.closedAt, CUTOFF + 5 minutes);
        assertEq(cy.held, 0);
        assertEq(setoff.totalHeld(), 0);
        assertEq(
            setoff.totalWithdrawable(), moved, "every unit deposited is now owed to a creditor"
        );
        assertEq(address(setoff).balance, setoff.totalWithdrawable());

        address[3] memory ps = [a, b, c];
        for (uint256 i; i < 3; ++i) {
            int256 net = _net(cid, ps[i]);
            assertEq(setoff.withdrawable(ps[i]), net > 0 ? uint256(net) : 0);
        }
        uint256[] memory ids = setoff.cycleDebts(cid);
        for (uint256 i; i < ids.length; ++i) {
            Setoff.Debt memory dbt = setoff.debt(ids[i]);
            assertEq(uint8(dbt.state), uint8(Setoff.State.Netted));
            assertEq(dbt.closedAt, CUTOFF + 5 minutes);
        }

        vm.expectRevert(
            abi.encodeWithSelector(Setoff.WrongCycleState.selector, cid, Setoff.CycleState.Settled)
        );
        setoff.settle(cid);
        vm.warp(DEADLINE);
        vm.expectRevert(
            abi.encodeWithSelector(Setoff.WrongCycleState.selector, cid, Setoff.CycleState.Settled)
        );
        setoff.voidCycle(cid);
    }

    function test_settle_stillWorksAfterTheDeadlineWhenEveryoneFunded() public {
        uint256 cid = _fixed();
        _fundAll(cid);
        vm.warp(DEADLINE + 1 days);
        vm.expectRevert(abi.encodeWithSelector(Setoff.FullyFunded.selector, cid));
        setoff.voidCycle(cid);
        setoff.settle(cid);
    }

    function test_settle_aRefusingCreditorBlocksOnlyItself() public {
        RefusingParty blocked = new RefusingParty();
        uint256 cid = _open();
        uint256 id = blocked.proposeInCycle(address(setoff), cid, a, "USD", 3e6);
        vm.prank(a);
        setoff.accept(id);
        _enrolled(cid, b, a, "EUR", 2e6);

        vm.warp(CUTOFF);
        _refreshFeeds();
        setoff.fixCycle(cid);
        _fundAll(cid);
        setoff.settle(cid); // a recipient that can't receive does not stop the cycle

        assertEq(setoff.withdrawable(address(blocked)), 3 ether);
        vm.expectRevert(Setoff.TransferFailed.selector);
        blocked.withdraw(address(setoff));
        vm.prank(b);
        setoff.withdraw(); // everyone else is paid
        assertEq(setoff.withdrawable(b), 0);
        assertEq(setoff.withdrawable(address(blocked)), 3 ether, "still owed, never lost");
    }

    function test_allFlat_settlesWithoutAnyoneFunding() public {
        uint256 cid = _open();
        _enrolled(cid, a, b, "USD", 10e6);
        _enrolled(cid, b, a, "USD", 10e6);
        vm.warp(CUTOFF);
        setoff.fixCycle(cid);

        Setoff.Cycle memory cy = setoff.cycle(cid);
        assertEq(cy.gross, 20 ether);
        assertEq(cy.netMoved, 0, "mutual debts cancel completely");
        assertEq(cy.debtors, 0);
        setoff.settle(cid);
        assertEq(setoff.totalWithdrawable(), 0);
        assertEq(uint8(setoff.debt(1).state), uint8(Setoff.State.Netted));
    }

    function test_theWholeCycle_inOneSecond() public {
        uint256 cid = _triangle();
        vm.warp(CUTOFF);
        _refreshFeeds();
        setoff.fixCycle(cid);
        _fundAll(cid);
        setoff.settle(cid); // fix, fund and settle share one block timestamp
        assertEq(uint8(setoff.cycle(cid).state), uint8(Setoff.CycleState.Settled));
    }

    // ── voiding: nobody's money is held hostage ──────────────────────────

    function test_void_opensExactlyAtTheDeadlineAndRefundsEveryDeposit() public {
        uint256 cid = _fixed();
        address[3] memory ps = [a, b, c];
        address holdout;
        uint256 deposited;
        for (uint256 i; i < 3; ++i) {
            int256 net = _net(cid, ps[i]);
            if (net >= 0) continue;
            if (holdout == address(0)) {
                holdout = ps[i]; // the first debtor never funds
                continue;
            }
            vm.prank(ps[i]);
            setoff.fund{value: uint256(-net)}(cid);
            deposited += uint256(-net);
        }
        assertTrue(holdout != address(0));

        vm.warp(DEADLINE - 1);
        vm.expectRevert(abi.encodeWithSelector(Setoff.BeforeDeadline.selector, cid, DEADLINE));
        setoff.voidCycle(cid);

        vm.warp(DEADLINE);
        vm.expectEmit(address(setoff));
        emit Setoff.CycleVoided(cid, deposited);
        vm.prank(stranger); // anyone can void
        setoff.voidCycle(cid);

        assertEq(setoff.totalHeld(), 0);
        assertEq(setoff.totalWithdrawable(), deposited, "every deposit is refundable");
        for (uint256 i; i < 3; ++i) {
            int256 net = _net(cid, ps[i]);
            bool refunded = net < 0 && ps[i] != holdout;
            assertEq(setoff.withdrawable(ps[i]), refunded ? uint256(-net) : 0);
        }

        // Every debt is back on the direct path, still accepted, and can be paid there.
        uint256[] memory ids = setoff.cycleDebts(cid);
        for (uint256 i; i < ids.length; ++i) {
            Setoff.Debt memory dbt = setoff.debt(ids[i]);
            assertEq(uint8(dbt.state), uint8(Setoff.State.Accepted));
            assertEq(dbt.cycleId, 0);
        }
        _refreshFeeds();
        Setoff.Debt memory first = setoff.debt(ids[0]);
        (uint256 due,) = setoff.quote(ids[0]);
        vm.prank(first.debtor);
        setoff.pay{value: due}(ids[0]);
        assertEq(uint8(setoff.debt(ids[0]).state), uint8(Setoff.State.Paid));

        vm.prank(holdout);
        vm.expectRevert(
            abi.encodeWithSelector(Setoff.WrongCycleState.selector, cid, Setoff.CycleState.Void)
        );
        setoff.fund{value: 100 ether}(cid);
        vm.expectRevert(
            abi.encodeWithSelector(Setoff.WrongCycleState.selector, cid, Setoff.CycleState.Void)
        );
        setoff.settle(cid);
    }

    function test_void_aCycleThatWasNeverFixed() public {
        uint256 cid = _triangle();
        vm.warp(DEADLINE);
        setoff.voidCycle(cid);
        assertEq(uint8(setoff.cycle(cid).state), uint8(Setoff.CycleState.Void));
        assertEq(setoff.debt(1).cycleId, 0);
        assertEq(uint8(setoff.debt(1).state), uint8(Setoff.State.Accepted));
    }

    // ── rounding (D018) ──────────────────────────────────────────────────

    /// Any mix of debts, currencies and rates: the nets sum to exactly zero, and exactly the
    /// net debits move.
    function testFuzz_netsSumToZero(uint256 seed, uint8 n, int64 eurRate, int64 jpyRate) public {
        n = uint8(bound(n, 1, 16));
        eur.set(int256(bound(int256(eurRate), 1, 1e12)), block.timestamp);
        jpy.set(int256(bound(int256(jpyRate), 1, 1e12)), block.timestamp);
        address[4] memory ps = [a, b, c, d];
        // The worst case prices far above 1,000 USDC.
        for (uint256 i; i < 4; ++i) {
            vm.deal(ps[i], 1e40);
        }
        bytes3[5] memory ccys =
            [bytes3("USD"), bytes3("EUR"), bytes3("MXN"), bytes3("BRL"), bytes3("JPY")];

        uint256 cid = _open();
        for (uint256 i; i < n; ++i) {
            uint256 r = uint256(keccak256(abi.encode(seed, i)));
            address cr = ps[r % 4];
            address dr = ps[(r / 4) % 4];
            if (cr == dr) dr = ps[((r / 4) % 4 + 1) % 4];
            _enrolled(cid, cr, dr, ccys[(r / 16) % 5], uint128(bound(r / 80, 1, 1e15)));
        }
        vm.warp(CUTOFF);
        _refreshFeeds();
        setoff.fixCycle(cid);

        (, Setoff.Position[] memory pos) = setoff.cyclePositions(cid);
        int256 sum;
        uint256 debits;
        for (uint256 i; i < pos.length; ++i) {
            sum += pos[i].net;
            if (pos[i].net < 0) debits += uint256(-pos[i].net);
        }
        assertEq(sum, 0);
        assertEq(setoff.cycle(cid).netMoved, debits);
        assertLe(setoff.cycle(cid).netMoved, setoff.cycle(cid).gross);

        _fundAll(cid);
        setoff.settle(cid);
        assertEq(
            address(setoff).balance,
            setoff.totalWithdrawable(),
            "payouts equal deposits to the unit"
        );
    }

    // ── size: a full cycle fits comfortably in one block ─────────────────

    function test_fullCycle_atTheCaps() public {
        uint256 cid = _open();
        address[8] memory ps;
        for (uint256 i; i < 8; ++i) {
            ps[i] = makeAddr(string.concat("cap", vm.toString(i)));
            vm.deal(ps[i], 1e24);
        }
        bytes3[5] memory ccys =
            [bytes3("USD"), bytes3("EUR"), bytes3("MXN"), bytes3("BRL"), bytes3("JPY")];
        for (uint256 i; i < 16; ++i) {
            _enrolled(cid, ps[i % 8], ps[(i + 3) % 8], ccys[i % 5], uint128(1e6 * (i + 1)));
        }
        vm.warp(CUTOFF);
        _refreshFeeds();

        uint256 g = gasleft();
        setoff.fixCycle(cid);
        uint256 fixGas = g - gasleft();
        _fundAll(cid);
        g = gasleft();
        setoff.settle(cid);
        uint256 settleGas = g - gasleft();

        emit log_named_uint("fixCycle gas at 16 debts, 8 parties, 5 currencies", fixGas);
        emit log_named_uint("settle gas at 16 debts, 8 parties", settleGas);
        assertLt(fixGas, 3_000_000);
        assertLt(settleGas, 3_000_000);
    }
}
