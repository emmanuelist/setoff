// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {Setoff} from "../src/Setoff.sol";
import {MockFeed} from "./utils/MockFeed.sol";

/// @notice Drives Setoff through random, always-valid sequences of calls.
contract Handler is Test {
    Setoff public immutable setoff;
    MockFeed[4] public feeds;
    bytes3[5] internal codes = [bytes3("USD"), bytes3("EUR"), bytes3("MXN"), bytes3("BRL"), bytes3("JPY")];
    address[4] public actors;

    uint256 public ghostPaidIn;
    uint256 public ghostWithdrawn;
    uint256 public ghostPaidDebts;

    constructor(Setoff setoff_, MockFeed[4] memory feeds_) {
        setoff = setoff_;
        feeds = feeds_;
        for (uint256 i; i < 4; ++i) {
            actors[i] = makeAddr(string.concat("actor", vm.toString(i)));
            vm.deal(actors[i], 1e30); // far beyond the worst case: 10,000 units at 100 USD, many times
        }
    }

    function propose(uint256 creditorSeed, uint256 debtorSeed, uint256 codeSeed, uint128 amount)
        external
    {
        address creditor = actors[creditorSeed % 4];
        address debtor = actors[debtorSeed % 4];
        if (creditor == debtor) debtor = actors[(debtorSeed % 4 + 1) % 4];
        amount = uint128(bound(amount, 1, 1e10)); // up to 10,000 units of the currency
        vm.prank(creditor);
        setoff.propose(debtor, codes[codeSeed % 5], amount, bytes32(0));
    }

    function accept(uint256 idSeed) external {
        uint256 count = setoff.debtCount();
        if (count == 0) return;
        uint256 id = idSeed % count + 1;
        Setoff.Debt memory d = setoff.debt(id);
        if (d.state != Setoff.State.Proposed) return;
        vm.prank(d.debtor);
        setoff.accept(id);
    }

    function cancel(uint256 idSeed) external {
        uint256 count = setoff.debtCount();
        if (count == 0) return;
        uint256 id = idSeed % count + 1;
        Setoff.Debt memory d = setoff.debt(id);
        if (d.state != Setoff.State.Proposed) return;
        vm.prank(d.creditor);
        setoff.cancel(id);
    }

    function pay(uint256 idSeed, uint256 extra) external {
        uint256 count = setoff.debtCount();
        if (count == 0) return;
        uint256 id = idSeed % count + 1;
        Setoff.Debt memory d = setoff.debt(id);
        if (d.state != Setoff.State.Accepted) return;
        (uint256 due,) = setoff.quote(id);
        uint256 value = due + bound(extra, 0, 1 ether);
        vm.prank(d.debtor);
        setoff.pay{value: value}(id);
        ghostPaidIn += value;
        ++ghostPaidDebts;
    }

    function withdraw(uint256 actorSeed) external {
        address a = actors[actorSeed % 4];
        uint256 amount = setoff.withdrawable(a);
        if (amount == 0) return;
        vm.prank(a);
        setoff.withdraw();
        ghostWithdrawn += amount;
    }

    /// Rates move, and time passes, but every feed stays fresh.
    function moveRates(uint256 feedSeed, uint64 answer, uint32 elapsed) external {
        vm.warp(block.timestamp + bound(elapsed, 0, 3 hours));
        feeds[feedSeed % 4].set(int256(bound(uint256(answer), 1, 1e10)), block.timestamp); // up to 100 USD a unit
    }

    function actorCount() external pure returns (uint256) {
        return 4;
    }
}

contract SetoffInvariantTest is Test {
    Setoff internal setoff;
    Handler internal handler;

    function setUp() public {
        vm.warp(1_790_000_000);
        MockFeed[4] memory feeds = [
            new MockFeed(8, 114_636_500),
            new MockFeed(8, 5_804_588),
            new MockFeed(8, 19_553_400),
            new MockFeed(8, 635_489)
        ];
        bytes3[] memory codes = new bytes3[](4);
        address[] memory addrs = new address[](4);
        (codes[0], codes[1], codes[2], codes[3]) = (bytes3("EUR"), bytes3("MXN"), bytes3("BRL"), bytes3("JPY"));
        for (uint256 i; i < 4; ++i) addrs[i] = address(feeds[i]);
        setoff = new Setoff(codes, addrs, 90_000);
        handler = new Handler(setoff, feeds);
        targetContract(address(handler));
    }

    /// The contract can always pay everyone it owes.
    function invariant_solvent() public view {
        assertGe(address(setoff).balance, setoff.totalWithdrawable());
    }

    /// The books balance to the wei: every unit paid in is either still owed or withdrawn.
    function invariant_booksBalance() public view {
        assertEq(handler.ghostPaidIn(), setoff.totalWithdrawable() + handler.ghostWithdrawn());
        assertEq(address(setoff).balance, setoff.totalWithdrawable());
    }

    /// totalWithdrawable is exactly the sum of every party's balance.
    function invariant_totalMatchesParties() public view {
        uint256 sum;
        for (uint256 i; i < handler.actorCount(); ++i) {
            sum += setoff.withdrawable(handler.actors(i));
        }
        assertEq(sum, setoff.totalWithdrawable());
    }

    /// A paid or cancelled debt never comes back to life.
    function invariant_closedDebtsStayClosed() public view {
        uint256 paid;
        for (uint256 id = 1; id <= setoff.debtCount(); ++id) {
            if (setoff.debt(id).state == Setoff.State.Paid) ++paid;
        }
        assertEq(paid, handler.ghostPaidDebts());
    }
}
