// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {Setoff} from "../src/Setoff.sol";
import {MockFeed, RefusingParty, Reentrant} from "./utils/MockFeed.sol";

contract SetoffTest is Test {
    Setoff internal setoff;
    MockFeed internal eur;
    MockFeed internal mxn;
    MockFeed internal brl;
    MockFeed internal jpy;

    uint256 internal constant MAX_AGE = 90_000; // 24 h heartbeat + 1 h grace (D013)
    uint256 internal constant T0 = 1_790_000_000;

    address internal creditor = makeAddr("creditor");
    address internal debtor = makeAddr("debtor");
    address internal stranger = makeAddr("stranger");

    function setUp() public {
        vm.warp(T0);
        // The live Arc mainnet answers on 2026-09-22, all 8 decimals.
        eur = new MockFeed(8, 114_636_500);
        mxn = new MockFeed(8, 5_804_588);
        brl = new MockFeed(8, 19_553_400);
        jpy = new MockFeed(8, 635_489);

        bytes3[] memory codes = new bytes3[](4);
        address[] memory feeds = new address[](4);
        (codes[0], codes[1], codes[2], codes[3]) = (bytes3("EUR"), bytes3("MXN"), bytes3("BRL"), bytes3("JPY"));
        (feeds[0], feeds[1], feeds[2], feeds[3]) = (address(eur), address(mxn), address(brl), address(jpy));
        setoff = new Setoff(codes, feeds, MAX_AGE);

        vm.deal(debtor, 100 ether);
        vm.deal(stranger, 100 ether);
    }

    // ── helpers ──────────────────────────────────────────────────────────

    function _accepted(bytes3 currency, uint128 amount) internal returns (uint256 id) {
        vm.prank(creditor);
        id = setoff.propose(debtor, currency, amount, "INV-1");
        vm.prank(debtor);
        setoff.accept(id);
    }

    function _due(uint256 id) internal view returns (uint256 due) {
        (due,) = setoff.quote(id);
    }

    // ── construction ─────────────────────────────────────────────────────

    function test_constructor_rejectsMismatchedLengths() public {
        bytes3[] memory codes = new bytes3[](1);
        address[] memory feeds = new address[](2);
        codes[0] = "EUR";
        vm.expectRevert(Setoff.LengthMismatch.selector);
        new Setoff(codes, feeds, MAX_AGE);
    }

    function test_constructor_rejectsZeroFeed() public {
        bytes3[] memory codes = new bytes3[](1);
        address[] memory feeds = new address[](1);
        codes[0] = "EUR";
        vm.expectRevert(abi.encodeWithSelector(Setoff.ZeroFeed.selector, bytes3("EUR")));
        new Setoff(codes, feeds, MAX_AGE);
    }

    function test_constructor_rejectsUsdAndDuplicates() public {
        bytes3[] memory codes = new bytes3[](1);
        address[] memory feeds = new address[](1);
        (codes[0], feeds[0]) = (bytes3("USD"), address(eur));
        vm.expectRevert(abi.encodeWithSelector(Setoff.DuplicateCurrency.selector, bytes3("USD")));
        new Setoff(codes, feeds, MAX_AGE);

        codes = new bytes3[](2);
        feeds = new address[](2);
        (codes[0], codes[1]) = (bytes3("EUR"), bytes3("EUR"));
        (feeds[0], feeds[1]) = (address(eur), address(mxn));
        vm.expectRevert(abi.encodeWithSelector(Setoff.DuplicateCurrency.selector, bytes3("EUR")));
        new Setoff(codes, feeds, MAX_AGE);
    }

    function test_constructor_rejectsZeroMaxAge() public {
        vm.expectRevert(Setoff.ZeroMaxFixingAge.selector);
        new Setoff(new bytes3[](0), new address[](0), 0);
    }

    function test_currencies_listsUsdFirst() public view {
        bytes3[] memory list = setoff.currencies();
        assertEq(list.length, 5);
        assertEq(list[0], bytes3("USD"));
        assertEq(list[4], bytes3("JPY"));
        assertTrue(setoff.isSupported("USD"));
        assertFalse(setoff.isSupported("GBP"));
    }

    // ── propose / accept / cancel ────────────────────────────────────────

    function test_propose_recordsTheDebt() public {
        vm.expectEmit(address(setoff));
        emit Setoff.Proposed(1, creditor, debtor, "MXN", 30e6, "INV-1");
        vm.prank(creditor);
        uint256 id = setoff.propose(debtor, "MXN", 30e6, "INV-1");

        Setoff.Debt memory d = setoff.debt(id);
        assertEq(id, 1);
        assertEq(d.creditor, creditor);
        assertEq(d.debtor, debtor);
        assertEq(d.currency, bytes3("MXN"));
        assertEq(d.amount, 30e6);
        assertEq(uint8(d.state), uint8(Setoff.State.Proposed));
        assertEq(d.proposedAt, T0);
        assertEq(d.acceptedAt, 0);
    }

    function test_propose_rejectsBadInput() public {
        vm.startPrank(creditor);
        vm.expectRevert(Setoff.InvalidDebtor.selector);
        setoff.propose(address(0), "USD", 1e6, "");
        vm.expectRevert(Setoff.InvalidDebtor.selector);
        setoff.propose(creditor, "USD", 1e6, "");
        vm.expectRevert(Setoff.ZeroAmount.selector);
        setoff.propose(debtor, "USD", 0, "");
        vm.expectRevert(abi.encodeWithSelector(Setoff.UnsupportedCurrency.selector, bytes3("GBP")));
        setoff.propose(debtor, "GBP", 1e6, "");
        vm.stopPrank();
    }

    function test_accept_onlyTheDebtorAndOnlyOnce() public {
        vm.prank(creditor);
        uint256 id = setoff.propose(debtor, "EUR", 1.2e6, "");

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Setoff.NotDebtor.selector, id));
        setoff.accept(id);

        vm.expectEmit(address(setoff));
        emit Setoff.Accepted(id);
        vm.prank(debtor);
        setoff.accept(id);
        assertEq(uint8(setoff.debt(id).state), uint8(Setoff.State.Accepted));

        vm.prank(debtor);
        vm.expectRevert(abi.encodeWithSelector(Setoff.WrongState.selector, id, Setoff.State.Accepted));
        setoff.accept(id);
    }

    function test_unknownDebt_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(Setoff.UnknownDebt.selector, 7));
        setoff.debt(7);
        vm.prank(debtor);
        vm.expectRevert(abi.encodeWithSelector(Setoff.UnknownDebt.selector, 7));
        setoff.pay{value: 1 ether}(7);
    }

    function test_cancel_onlyTheCreditorBeforeEndorsement() public {
        vm.prank(creditor);
        uint256 id = setoff.propose(debtor, "BRL", 8e6, "");

        vm.prank(debtor);
        vm.expectRevert(abi.encodeWithSelector(Setoff.NotCreditor.selector, id));
        setoff.cancel(id);

        vm.prank(creditor);
        setoff.cancel(id);
        assertEq(uint8(setoff.debt(id).state), uint8(Setoff.State.Cancelled));

        vm.prank(debtor);
        vm.expectRevert(abi.encodeWithSelector(Setoff.WrongState.selector, id, Setoff.State.Cancelled));
        setoff.accept(id);

        uint256 endorsed = _accepted("BRL", 8e6);
        vm.prank(creditor);
        vm.expectRevert(abi.encodeWithSelector(Setoff.WrongState.selector, endorsed, Setoff.State.Accepted));
        setoff.cancel(endorsed);
    }

    // ── the fixing ───────────────────────────────────────────────────────

    /// The specimen's seven debts, priced exactly at the 2026-09-22 fixing.
    function test_quote_pricesEveryCurrencyExactly() public {
        assertEq(_due(_accepted("MXN", 30e6)), 1.7413764e18);
        assertEq(_due(_accepted("EUR", 1.2e6)), 1.375638e18);
        assertEq(_due(_accepted("BRL", 8e6)), 1.564272e18);
        assertEq(_due(_accepted("JPY", 200e6)), 1.270978e18);
        assertEq(_due(_accepted("USD", 2e6)), 2e18);
    }

    function test_quote_reportsTheFixingItUses() public {
        uint256 id = _accepted("EUR", 1e6);
        (, Setoff.Fixing memory f) = setoff.quote(id);
        assertEq(f.currency, bytes3("EUR"));
        assertEq(f.answer, 114_636_500);
        assertEq(f.decimals, 8);
        assertEq(f.roundId, eur.roundId());
        assertEq(f.updatedAt, T0);

        (, Setoff.Fixing memory usd) = setoff.quote(_accepted("USD", 1e6));
        assertEq(usd.answer, 1);
        assertEq(usd.decimals, 0);
        assertEq(usd.roundId, 0);
    }

    function test_fixing_refusesAStaleRead() public {
        uint256 id = _accepted("MXN", 30e6);
        vm.warp(T0 + MAX_AGE); // exactly at the limit: still valid
        assertGt(_due(id), 0);

        vm.warp(T0 + MAX_AGE + 1);
        vm.expectRevert(abi.encodeWithSelector(Setoff.StaleFixing.selector, bytes3("MXN"), T0, MAX_AGE));
        setoff.quote(id);
        vm.prank(debtor);
        vm.expectRevert(abi.encodeWithSelector(Setoff.StaleFixing.selector, bytes3("MXN"), T0, MAX_AGE));
        setoff.pay{value: 2 ether}(id);
    }

    function test_fixing_refusesInvalidAnswersAndTimes() public {
        uint256 id = _accepted("JPY", 200e6);

        jpy.set(0, T0);
        vm.expectRevert(abi.encodeWithSelector(Setoff.InvalidAnswer.selector, bytes3("JPY"), int256(0)));
        setoff.quote(id);

        jpy.set(-1, T0);
        vm.expectRevert(abi.encodeWithSelector(Setoff.InvalidAnswer.selector, bytes3("JPY"), int256(-1)));
        setoff.quote(id);

        jpy.set(635_489, T0 + 1);
        vm.expectRevert(abi.encodeWithSelector(Setoff.InvalidUpdatedAt.selector, bytes3("JPY"), T0 + 1));
        setoff.quote(id);

        jpy.set(635_489, 0);
        vm.expectRevert(abi.encodeWithSelector(Setoff.InvalidUpdatedAt.selector, bytes3("JPY"), uint256(0)));
        setoff.quote(id);
    }

    function test_toUsdc_refusesANegativeRateFromAnyCaller() public {
        Setoff.Fixing memory f = Setoff.Fixing("EUR", -5, 8, 1, uint64(T0));
        vm.expectRevert(abi.encodeWithSelector(Setoff.InvalidAnswer.selector, bytes3("EUR"), int256(-5)));
        setoff.toUsdc(1e6, f);
    }

    /// The creditor is never short: the amount due is the exact value rounded up, never down.
    function testFuzz_toUsdc_roundsUpByLessThanOneUnit(uint128 amount, uint64 answer, uint8 decimals)
        public
        view
    {
        amount = uint128(bound(amount, 1, 1e30));
        answer = uint64(bound(answer, 1, type(uint64).max));
        decimals = uint8(bound(decimals, 0, 24));
        Setoff.Fixing memory f = Setoff.Fixing("EUR", int256(uint256(answer)), decimals, 1, uint64(T0));

        uint256 due = setoff.toUsdc(amount, f);
        uint256 exact = uint256(amount) * answer * 1e12;
        uint256 scale = 10 ** uint256(decimals);
        assertGe(due * scale, exact, "due never undercharges");
        assertLt((due - 1) * scale, exact, "due exceeds the exact value by less than one unit");
    }

    // ── paying ───────────────────────────────────────────────────────────

    function test_pay_exactCreditsTheCreditor() public {
        uint256 id = _accepted("MXN", 30e6);
        uint256 due = _due(id);

        vm.expectEmit(address(setoff));
        emit Setoff.Paid(id, debtor, due, "MXN", 5_804_588, 8, mxn.roundId(), uint64(T0));
        vm.prank(debtor);
        setoff.pay{value: due}(id);

        Setoff.Debt memory d = setoff.debt(id);
        assertEq(uint8(d.state), uint8(Setoff.State.Paid));
        assertEq(d.closedAt, T0);
        assertEq(setoff.withdrawable(creditor), due);
        assertEq(setoff.withdrawable(debtor), 0);
        assertEq(setoff.totalWithdrawable(), due);
        assertEq(address(setoff).balance, due);
    }

    function test_pay_creditsChangeBackToTheDebtor() public {
        uint256 id = _accepted("EUR", 1.2e6);
        uint256 due = _due(id);
        vm.prank(debtor);
        setoff.pay{value: due + 0.25 ether}(id);
        assertEq(setoff.withdrawable(creditor), due);
        assertEq(setoff.withdrawable(debtor), 0.25 ether);
        assertEq(setoff.totalWithdrawable(), due + 0.25 ether);
    }

    function test_pay_refusesUnderpaymentWrongPayerAndWrongState() public {
        vm.prank(creditor);
        uint256 id = setoff.propose(debtor, "BRL", 8e6, "");

        vm.prank(debtor);
        vm.expectRevert(abi.encodeWithSelector(Setoff.WrongState.selector, id, Setoff.State.Proposed));
        setoff.pay{value: 2 ether}(id);

        vm.prank(debtor);
        setoff.accept(id);
        uint256 due = _due(id);

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Setoff.NotDebtor.selector, id));
        setoff.pay{value: due}(id);

        vm.prank(debtor);
        vm.expectRevert(abi.encodeWithSelector(Setoff.Underpaid.selector, id, due, due - 1));
        setoff.pay{value: due - 1}(id);

        vm.prank(debtor);
        setoff.pay{value: due}(id);
        vm.prank(debtor);
        vm.expectRevert(abi.encodeWithSelector(Setoff.WrongState.selector, id, Setoff.State.Paid));
        setoff.pay{value: due}(id);
    }

    /// Arc timestamps are non-decreasing, not strictly increasing: a feed updated in this very
    /// second is fresh, and several debts can close in the same second.
    function test_pay_worksWithinTheSameSecond() public {
        mxn.set(5_804_588, T0);
        uint256 a = _accepted("MXN", 1e6);
        uint256 b = _accepted("MXN", 2e6);
        vm.startPrank(debtor);
        setoff.pay{value: _due(a)}(a);
        setoff.pay{value: _due(b)}(b);
        vm.stopPrank();
        assertEq(setoff.debt(a).closedAt, setoff.debt(b).closedAt);
    }

    // ── withdrawing ──────────────────────────────────────────────────────

    function test_withdraw_paysOutAndZeroes() public {
        uint256 id = _accepted("USD", 2e6);
        vm.prank(debtor);
        setoff.pay{value: 2 ether}(id);

        vm.expectEmit(address(setoff));
        emit Setoff.Withdrawn(creditor, 2 ether);
        vm.prank(creditor);
        setoff.withdraw();
        assertEq(creditor.balance, 2 ether);
        assertEq(setoff.withdrawable(creditor), 0);
        assertEq(setoff.totalWithdrawable(), 0);
        assertEq(address(setoff).balance, 0);

        vm.prank(creditor);
        vm.expectRevert(Setoff.NothingToWithdraw.selector);
        setoff.withdraw();
    }

    /// D007: a creditor that cannot receive blocks only itself, never anyone else.
    function test_withdraw_aRefusingPartyBlocksOnlyItself() public {
        RefusingParty blocked = new RefusingParty();
        uint256 blockedDebt = blocked.propose(address(setoff), debtor, "USD", 1e6);
        vm.prank(debtor);
        setoff.accept(blockedDebt);
        uint256 fineDebt = _accepted("USD", 2e6);

        vm.startPrank(debtor);
        setoff.pay{value: 1 ether}(blockedDebt);
        setoff.pay{value: 2 ether}(fineDebt);
        vm.stopPrank();

        vm.expectRevert(Setoff.TransferFailed.selector);
        blocked.withdraw(address(setoff));
        assertEq(setoff.withdrawable(address(blocked)), 1 ether, "the refused payout stays owed");

        vm.prank(creditor);
        setoff.withdraw();
        assertEq(creditor.balance, 2 ether, "everyone else is unaffected");
        assertEq(address(setoff).balance, setoff.totalWithdrawable());
    }

    function test_withdraw_cannotBeReentered() public {
        Reentrant attacker = new Reentrant(address(setoff));
        uint256 id = attacker.propose(debtor, "USD", 1e6);
        uint256 other = _accepted("USD", 5e6);
        vm.startPrank(debtor);
        setoff.accept(id);
        setoff.pay{value: 1 ether}(id);
        setoff.pay{value: 5 ether}(other);
        vm.stopPrank();

        attacker.withdraw();
        assertEq(address(attacker).balance, 1 ether, "only its own credit");
        assertEq(attacker.reentries(), 0);
        assertEq(address(setoff).balance, 5 ether, "the other creditor's funds are intact");
        assertEq(setoff.totalWithdrawable(), 5 ether);
    }
}
