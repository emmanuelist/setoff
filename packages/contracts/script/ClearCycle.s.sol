// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {Setoff} from "../src/Setoff.sol";

/// @notice Clears a demo cycle in two runs. The first run, after the cutoff, only fixes it. The
///         second reads the nets the contract stored and has each net debtor fund exactly its
///         net, from its own key, then settles, and every party with a balance withdraws it.
///         Splitting the runs means funding never relies on a simulated fixing.
///
///         SETOFF=0x… CYCLE_ID=n forge script script/ClearCycle.s.sol --rpc-url … --broadcast
contract ClearCycle is Script {
    Setoff internal setoff;
    uint256[4] internal keys;

    function run() external {
        setoff = Setoff(vm.envAddress("SETOFF"));
        uint256 cid = vm.envUint("CYCLE_ID");
        keys = [
            vm.envUint("PARTY_A_PRIVATE_KEY"),
            vm.envUint("PARTY_B_PRIVATE_KEY"),
            vm.envUint("PARTY_C_PRIVATE_KEY"),
            vm.envUint("PARTY_D_PRIVATE_KEY")
        ];

        Setoff.Cycle memory c = setoff.cycle(cid);
        if (c.state == Setoff.CycleState.Open) {
            require(block.timestamp >= c.cutoff, "ClearCycle: the cutoff has not arrived");
            vm.broadcast(keys[0]); // anyone can fix
            setoff.fixCycle(cid);
            console.log("fixed; run again to fund and settle");
            return;
        }
        require(c.state == Setoff.CycleState.Fixed, "ClearCycle: not fixed, or already closed");

        (address[] memory parties, Setoff.Position[] memory pos) = setoff.cyclePositions(cid);
        for (uint256 i; i < parties.length; ++i) {
            if (pos[i].net >= 0 || pos[i].funded) continue;
            vm.broadcast(_keyOf(parties[i]));
            setoff.fund{value: uint256(-pos[i].net)}(cid);
        }
        vm.broadcast(keys[0]); // anyone can settle
        setoff.settle(cid);
        for (uint256 i; i < parties.length; ++i) {
            if (setoff.withdrawable(parties[i]) == 0) continue;
            vm.broadcast(_keyOf(parties[i]));
            setoff.withdraw();
        }

        c = setoff.cycle(cid);
        console.log("gross (wei)", c.gross);
        console.log("netMoved (wei)", c.netMoved);
    }

    function _keyOf(address party) internal view returns (uint256) {
        for (uint256 i; i < 4; ++i) {
            if (vm.addr(keys[i]) == party) return keys[i];
        }
        revert("ClearCycle: a party that is not one of ours");
    }
}
