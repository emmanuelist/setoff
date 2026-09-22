// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {Setoff} from "../src/Setoff.sol";
import {MockFeed} from "./utils/MockFeed.sol";

/// @notice Drives Setoff through random, always-valid sequences of calls on both paths:
///         direct debts, and cycles that are opened, filled, fixed, funded, settled or voided.
contract Handler is Test {
    Setoff public immutable setoff;
    MockFeed[4] public feeds;
    bytes3[5] internal codes =
        [bytes3("USD"), bytes3("EUR"), bytes3("MXN"), bytes3("BRL"), bytes3("JPY")];
    address[4] public actors;

    uint256 public ghostPaidIn; // every unit sent into the contract: payments and deposits
    uint256 public ghostWithdrawn;
    uint256 public ghostPaidDebts;
    uint256 public ghostNettedDebts;
    mapping(uint256 cycleId => uint256) public ghostDeposited;
    mapping(uint256 cycleId => uint256) public ghostRefunded;
    uint256 public ghostFixed;
    uint256 public ghostSettled;
    uint256 public ghostVoided;
    uint256 public ghostVoidedWithDeposits;

    constructor(Setoff setoff_, MockFeed[4] memory feeds_) {
        setoff = setoff_;
        feeds = feeds_;
        for (uint256 i; i < 4; ++i) {
            actors[i] = makeAddr(string.concat("actor", vm.toString(i)));
            vm.deal(actors[i], 1e30); // far beyond the worst case: 10,000 units at 100 USD, many times
        }
    }

    // ── direct path ──────────────────────────────────────────────────────

    function propose(uint256 creditorSeed, uint256 debtorSeed, uint256 codeSeed, uint128 amount)
        external
    {
        (address creditor, address debtor) = _pair(creditorSeed, debtorSeed);
        amount = uint128(bound(amount, 1, 1e10)); // up to 10,000 units of the currency
        vm.prank(creditor);
        setoff.propose(debtor, codes[codeSeed % 5], amount, bytes32(0));
    }

    /// Finds a proposal that can still be accepted and accepts it.
    function accept(uint256 idSeed) external {
        uint256 count = setoff.debtCount();
        for (uint256 k; k < count; ++k) {
            uint256 id = (idSeed % count + k) % count + 1;
            Setoff.Debt memory d = setoff.debt(id);
            if (d.state != Setoff.State.Proposed) continue;
            if (d.cycleId != 0 && !_hasRoom(d.cycleId, d.creditor, d.debtor)) continue;
            vm.prank(d.debtor);
            setoff.accept(id);
            return;
        }
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
        if (d.state != Setoff.State.Accepted || d.cycleId != 0) return;
        _refresh();
        (uint256 due,) = setoff.quote(id);
        uint256 value = due + bound(extra, 0, 1 ether);
        vm.prank(d.debtor);
        setoff.pay{value: value}(id);
        ghostPaidIn += value;
        ++ghostPaidDebts;
    }

    // ── cycle path ───────────────────────────────────────────────────────

    function openCycle(uint32 lead, uint32 window) external {
        uint64 cutoff = uint64(block.timestamp + bound(lead, 1 hours, 2 days));
        uint64 deadline = uint64(cutoff + bound(window, 10 minutes, 1 days));
        setoff.openCycle(cutoff, deadline);
    }

    function proposeInCycle(
        uint256 cycleSeed,
        uint256 creditorSeed,
        uint256 debtorSeed,
        uint256 codeSeed,
        uint128 amount
    ) external {
        uint256 count = setoff.cycleCount();
        uint256 cid;
        for (uint256 k; k < count && cid == 0; ++k) {
            uint256 candidate = (cycleSeed % count + k) % count + 1;
            if (_enrollable(candidate)) cid = candidate;
        }
        if (cid == 0) return;
        (address creditor, address debtor) = _pair(creditorSeed, debtorSeed);
        amount = uint128(bound(amount, 1, 1e10));
        vm.prank(creditor);
        setoff.proposeInCycle(cid, debtor, codes[codeSeed % 5], amount, bytes32(0));
    }

    /// A creditor bills into a cycle still open for enrolment, and the debtor accepts at once.
    function enrol(
        uint256 cycleSeed,
        uint256 creditorSeed,
        uint256 debtorSeed,
        uint256 codeSeed,
        uint128 amount
    ) external {
        uint256 count = setoff.cycleCount();
        (address creditor, address debtor) = _pair(creditorSeed, debtorSeed);
        for (uint256 k; k < count; ++k) {
            uint256 cid = (cycleSeed % count + k) % count + 1;
            if (!_hasRoom(cid, creditor, debtor)) continue;
            vm.prank(creditor);
            uint256 id = setoff.proposeInCycle(
                cid, debtor, codes[codeSeed % 5], uint128(bound(amount, 1, 1e10)), bytes32(0)
            );
            vm.prank(debtor);
            setoff.accept(id);
            return;
        }
    }

    /// Two debtors owe one creditor, in random currencies: a cycle with a debtor to hold out.
    function enrolTwoDebtors(
        uint256 cycleSeed,
        uint256 creditorSeed,
        uint256 codeSeed,
        uint128 x,
        uint128 y
    ) external {
        address creditor = actors[creditorSeed % 4];
        address d1 = actors[(creditorSeed % 4 + 1) % 4];
        address d2 = actors[(creditorSeed % 4 + 2) % 4];
        uint256 count = setoff.cycleCount();
        for (uint256 k; k < count; ++k) {
            uint256 cid = (cycleSeed % count + k) % count + 1;
            if (
                !_hasRoom(cid, creditor, d1)
                    || setoff.cycleDebts(cid).length + 2 > setoff.MAX_CYCLE_DEBTS()
            ) continue;
            if (!_hasRoom(cid, d1, d2)) continue; // all three must fit
            _bill(cid, creditor, d1, codes[codeSeed % 5], x);
            _bill(cid, creditor, d2, codes[(codeSeed / 5) % 5], y);
            return;
        }
    }

    /// Finds an open cycle with debts and fixes it, waiting for its cutoff when needed.
    function fixCycle(uint256 cycleSeed, uint32 when) external {
        uint256 count = setoff.cycleCount();
        for (uint256 k; k < count; ++k) {
            uint256 cid = (cycleSeed % count + k) % count + 1;
            Setoff.Cycle memory c = setoff.cycle(cid);
            if (c.state != Setoff.CycleState.Open || block.timestamp >= c.fundingDeadline) {
                continue;
            }
            if (setoff.cycleDebts(cid).length == 0) continue;
            if (block.timestamp < c.cutoff) {
                vm.warp(c.cutoff + bound(when, 0, c.fundingDeadline - c.cutoff - 1));
            }
            _refresh();
            setoff.fixCycle(cid);
            ++ghostFixed;
            return;
        }
    }

    /// One net debtor of some fixed cycle funds, possibly overpaying.
    function fund(uint256 cycleSeed, uint256 partySeed, uint256 extra) external {
        uint256 count = setoff.cycleCount();
        for (uint256 k; k < count; ++k) {
            uint256 cid = (cycleSeed % count + k) % count + 1;
            if (_fundOne(cid, partySeed, extra)) return;
        }
    }

    /// Every net debtor of one fixed cycle funds: the path to settlement.
    function fundAll(uint256 cycleSeed) external {
        uint256 count = setoff.cycleCount();
        for (uint256 k; k < count; ++k) {
            uint256 cid = (cycleSeed % count + k) % count + 1;
            bool any;
            while (_fundOne(cid, 0, 0)) any = true;
            if (any) return;
        }
    }

    /// Every net debtor but one funds, the deadline passes, and the cycle is voided: the
    /// holdout the all-or-nothing rule exists for.
    function holdOut(uint256 cycleSeed, uint32 lateness) external {
        uint256 count = setoff.cycleCount();
        for (uint256 k; k < count; ++k) {
            uint256 cid = (cycleSeed % count + k) % count + 1;
            Setoff.Cycle memory c = setoff.cycle(cid);
            if (c.state != Setoff.CycleState.Fixed || block.timestamp >= c.fundingDeadline) {
                continue;
            }
            if (c.debtors < 2 || c.funded + 1 >= c.debtors) continue;
            while (setoff.cycle(cid).funded + 1 < c.debtors) {
                if (!_fundOne(cid, 0, 0)) break;
            }
            vm.warp(c.fundingDeadline + bound(lateness, 0, 1 hours));
            _void(cid);
            return;
        }
    }

    function settle(uint256 cycleSeed) external {
        uint256 count = setoff.cycleCount();
        for (uint256 k; k < count; ++k) {
            uint256 cid = (cycleSeed % count + k) % count + 1;
            Setoff.Cycle memory c = setoff.cycle(cid);
            if (c.state != Setoff.CycleState.Fixed || c.funded < c.debtors) continue;
            setoff.settle(cid);
            ghostNettedDebts += setoff.cycleDebts(cid).length;
            ++ghostSettled;
            return;
        }
    }

    /// Finds a cycle that has failed (never fixed by its deadline, or fixed with someone
    /// unfunded) and voids it, waiting out a fixed cycle's deadline when needed.
    function voidCycle(uint256 cycleSeed, uint32 lateness) external {
        uint256 count = setoff.cycleCount();
        for (uint256 k; k < count; ++k) {
            uint256 cid = (cycleSeed % count + k) % count + 1;
            Setoff.Cycle memory c = setoff.cycle(cid);
            if (c.state != Setoff.CycleState.Open && c.state != Setoff.CycleState.Fixed) continue;
            if (c.state == Setoff.CycleState.Fixed && c.funded == c.debtors) continue;
            if (block.timestamp < c.fundingDeadline) {
                // Only a fixed cycle with a holdout is waited out; an enrolling one is left alone.
                if (c.state == Setoff.CycleState.Open) continue;
                vm.warp(c.fundingDeadline + bound(lateness, 0, 1 hours));
            }

            _void(cid);
            return;
        }
    }

    /// Voids a cycle, measuring each refund as it lands in the depositor's withdrawable balance.
    function _void(uint256 cid) internal {
        (address[] memory parties, Setoff.Position[] memory pos) = setoff.cyclePositions(cid);
        uint256[] memory before = new uint256[](parties.length);
        for (uint256 i; i < parties.length; ++i) {
            before[i] = setoff.withdrawable(parties[i]);
        }
        setoff.voidCycle(cid);
        ++ghostVoided;
        if (ghostDeposited[cid] > 0) ++ghostVoidedWithDeposits;
        for (uint256 i; i < parties.length; ++i) {
            if (pos[i].funded) ghostRefunded[cid] += setoff.withdrawable(parties[i]) - before[i];
        }
    }

    function _bill(uint256 cid, address creditor, address debtor, bytes3 code, uint128 amount)
        internal
    {
        vm.prank(creditor);
        uint256 id =
            setoff.proposeInCycle(cid, debtor, code, uint128(bound(amount, 1, 1e10)), bytes32(0));
        vm.prank(debtor);
        setoff.accept(id);
    }

    function _fundOne(uint256 cid, uint256 partySeed, uint256 extra) internal returns (bool) {
        Setoff.Cycle memory c = setoff.cycle(cid);
        if (c.state != Setoff.CycleState.Fixed || block.timestamp >= c.fundingDeadline) {
            return false;
        }
        (address[] memory parties, Setoff.Position[] memory pos) = setoff.cyclePositions(cid);
        for (uint256 k; k < parties.length; ++k) {
            uint256 i = (partySeed % parties.length + k) % parties.length;
            if (pos[i].net >= 0 || pos[i].funded) continue;
            uint256 due = uint256(-pos[i].net);
            uint256 value = due + bound(extra, 0, 1 ether);
            vm.prank(parties[i]);
            setoff.fund{value: value}(cid);
            ghostPaidIn += value;
            ghostDeposited[cid] += due;
            return true;
        }
        return false;
    }

    // ── both ─────────────────────────────────────────────────────────────

    function withdraw(uint256 actorSeed) external {
        address a = actors[actorSeed % 4];
        uint256 amount = setoff.withdrawable(a);
        if (amount == 0) return;
        vm.prank(a);
        setoff.withdraw();
        ghostWithdrawn += amount;
    }

    /// Rates move, and time passes, so cutoffs and deadlines arrive.
    function moveRates(uint256 feedSeed, uint64 answer, uint32 elapsed) external {
        vm.warp(block.timestamp + bound(elapsed, 0, 2 hours));
        feeds[feedSeed % 4].set(int256(bound(uint256(answer), 1, 1e10)), block.timestamp); // up to 100 USD a unit
    }

    function passTime(uint32 elapsed) external {
        vm.warp(block.timestamp + bound(elapsed, 0, 3 hours));
    }

    function actorCount() external pure returns (uint256) {
        return 4;
    }

    // ── helpers ──────────────────────────────────────────────────────────

    function _pair(uint256 creditorSeed, uint256 debtorSeed)
        internal
        view
        returns (address creditor, address debtor)
    {
        creditor = actors[creditorSeed % 4];
        debtor = actors[debtorSeed % 4];
        if (creditor == debtor) debtor = actors[(debtorSeed % 4 + 1) % 4];
    }

    function _cycleId(uint256 seed) internal view returns (uint256) {
        uint256 count = setoff.cycleCount();
        return count == 0 ? 0 : seed % count + 1;
    }

    function _enrollable(uint256 cid) internal view returns (bool) {
        Setoff.Cycle memory c = setoff.cycle(cid);
        return c.state == Setoff.CycleState.Open && block.timestamp < c.cutoff;
    }

    function _hasRoom(uint256 cid, address creditor, address debtor) internal view returns (bool) {
        if (!_enrollable(cid)) return false;
        if (setoff.cycleDebts(cid).length >= setoff.MAX_CYCLE_DEBTS()) return false;
        (address[] memory parties,) = setoff.cyclePositions(cid);
        uint256 joining = 2;
        for (uint256 i; i < parties.length; ++i) {
            if (parties[i] == creditor || parties[i] == debtor) --joining;
        }
        return parties.length + joining <= setoff.MAX_CYCLE_PARTIES();
    }

    /// Keep every feed fresh at its current answer, so only the handler decides when rates move.
    function _refresh() internal {
        for (uint256 i; i < 4; ++i) {
            feeds[i].set(feeds[i].answer(), block.timestamp);
        }
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
        (codes[0], codes[1], codes[2], codes[3]) =
        (bytes3("EUR"), bytes3("MXN"), bytes3("BRL"), bytes3("JPY"));
        for (uint256 i; i < 4; ++i) {
            addrs[i] = address(feeds[i]);
        }
        setoff = new Setoff(codes, addrs, 90_000);
        handler = new Handler(setoff, feeds);
        targetContract(address(handler));
    }

    /// The suite's reach, accumulated across runs in the process environment (forge prints only
    /// the last run's log). Run one invariant with -vv and read the "reach" line: how many runs
    /// fixed, settled, voided, and voided with deposits to refund. Green invariants mean little
    /// if the runs never get there.
    function _bump(string memory key, bool hit) internal {
        uint256 v = vm.envOr(key, uint256(0)) + (hit ? 1 : 0);
        vm.setEnv(key, vm.toString(v));
    }

    function afterInvariant() public {
        _bump("R_RUNS", true);
        _bump("R_FIXED", handler.ghostFixed() > 0);
        _bump("R_SETTLED", handler.ghostSettled() > 0);
        _bump("R_VOIDED", handler.ghostVoided() > 0);
        _bump("R_BOTH", handler.ghostSettled() > 0 && handler.ghostVoided() > 0);
        _bump("R_REFUND", handler.ghostVoidedWithDeposits() > 0);
        _bump("R_NETTED", false);
        vm.setEnv(
            "R_NETTED", vm.toString(vm.envOr("R_NETTED", uint256(0)) + handler.ghostNettedDebts())
        );
        emit log_named_string(
            "reach",
            string.concat(
                "runs ",
                vm.envString("R_RUNS"),
                " | with a fixing ",
                vm.envString("R_FIXED"),
                " | with a settlement ",
                vm.envString("R_SETTLED"),
                " | with a void ",
                vm.envString("R_VOIDED"),
                " | with both ",
                vm.envString("R_BOTH"),
                " | with a refunding void ",
                vm.envString("R_REFUND"),
                " | debts netted ",
                vm.envString("R_NETTED")
            )
        );
    }

    /// The contract can always pay everyone it owes, and give back every deposit it holds.
    function invariant_solvent() public view {
        assertGe(address(setoff).balance, setoff.totalWithdrawable() + setoff.totalHeld());
    }

    /// The books balance to the wei: every unit paid in is still owed, still held, or withdrawn.
    /// Payouts therefore never exceed receipts.
    function invariant_booksBalance() public view {
        assertEq(
            handler.ghostPaidIn(),
            setoff.totalWithdrawable() + setoff.totalHeld() + handler.ghostWithdrawn()
        );
        assertEq(address(setoff).balance, setoff.totalWithdrawable() + setoff.totalHeld());
    }

    /// totalWithdrawable is exactly the sum of every party's balance.
    function invariant_totalMatchesParties() public view {
        uint256 sum;
        for (uint256 i; i < handler.actorCount(); ++i) {
            sum += setoff.withdrawable(handler.actors(i));
        }
        assertEq(sum, setoff.totalWithdrawable());
    }

    /// A debt closes once, on the path it belongs to: paid only while direct, netted only in a
    /// cycle, and never reopened.
    function invariant_debtsCloseOnceOnTheirPath() public view {
        uint256 paid;
        uint256 netted;
        for (uint256 id = 1; id <= setoff.debtCount(); ++id) {
            Setoff.Debt memory d = setoff.debt(id);
            if (d.state == Setoff.State.Paid) {
                ++paid;
                assertEq(
                    d.cycleId, 0, "a debt is paid directly only while it is out of every cycle"
                );
            }
            if (d.state == Setoff.State.Netted) {
                ++netted;
                assertGt(d.cycleId, 0);
            }
        }
        assertEq(paid, handler.ghostPaidDebts());
        assertEq(netted, handler.ghostNettedDebts());
    }

    /// At every fixing the nets sum to exactly zero, and exactly the net debits move.
    function invariant_netsSumToZero() public view {
        for (uint256 cid = 1; cid <= setoff.cycleCount(); ++cid) {
            Setoff.Cycle memory c = setoff.cycle(cid);
            if (c.fixedAt == 0) continue;
            (, Setoff.Position[] memory pos) = setoff.cyclePositions(cid);
            int256 sum;
            uint256 debits;
            uint256 debtors;
            for (uint256 i; i < pos.length; ++i) {
                sum += pos[i].net;
                if (pos[i].net < 0) {
                    debits += uint256(-pos[i].net);
                    ++debtors;
                }
            }
            assertEq(sum, 0);
            assertEq(c.netMoved, debits);
            assertEq(c.debtors, debtors);
            assertLe(c.netMoved, c.gross);
        }
    }

    /// No partial settlement: a settled cycle netted every debt and was fully funded; any
    /// other cycle netted none.
    function invariant_noPartialSettlement() public view {
        for (uint256 cid = 1; cid <= setoff.cycleCount(); ++cid) {
            Setoff.Cycle memory c = setoff.cycle(cid);
            uint256[] memory ids = setoff.cycleDebts(cid);
            bool settled = c.state == Setoff.CycleState.Settled;
            if (settled) assertEq(c.funded, c.debtors);
            for (uint256 i; i < ids.length; ++i) {
                bool netted = setoff.debt(ids[i]).state == Setoff.State.Netted;
                assertEq(netted, settled);
            }
        }
    }

    /// Every deposit is accounted for: held while the cycle is fixed, paid out when it
    /// settles, and refunded in full when it is voided.
    function invariant_depositsAreHeldPaidOrRefunded() public view {
        uint256 held;
        for (uint256 cid = 1; cid <= setoff.cycleCount(); ++cid) {
            Setoff.Cycle memory c = setoff.cycle(cid);
            if (c.state == Setoff.CycleState.Fixed) {
                (, Setoff.Position[] memory pos) = setoff.cyclePositions(cid);
                uint256 funded;
                for (uint256 i; i < pos.length; ++i) {
                    if (pos[i].funded) funded += uint256(-pos[i].net);
                }
                assertEq(c.held, funded);
                assertEq(c.held, handler.ghostDeposited(cid));
                held += c.held;
            } else {
                assertEq(c.held, 0);
            }
            if (c.state == Setoff.CycleState.Void) {
                assertEq(
                    handler.ghostRefunded(cid),
                    handler.ghostDeposited(cid),
                    "a void refunds every deposit"
                );
            }
        }
        assertEq(setoff.totalHeld(), held);
    }
}
