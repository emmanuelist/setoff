// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {Setoff} from "../src/Setoff.sol";

/// @notice Opens a real cycle among the four demo parties (D011) and enrols a ring of debts in
///         five currencies, each about a dollar, that almost cancels: a large gross, a small net.
///         Every debt is proposed by its creditor and accepted by its debtor, from their own keys.
///
///         SETOFF=0x… forge script script/OpenCycle.s.sol --rpc-url … --broadcast
///         Optional: CUTOFF_IN (seconds, default 300) and FUNDING_WINDOW (default 1200).
contract OpenCycle is Script {
    Setoff internal setoff;

    function run() external returns (uint256 cid) {
        setoff = Setoff(vm.envAddress("SETOFF"));
        uint256 a = vm.envUint("PARTY_A_PRIVATE_KEY");
        uint256 b = vm.envUint("PARTY_B_PRIVATE_KEY");
        uint256 c = vm.envUint("PARTY_C_PRIVATE_KEY");
        uint256 d = vm.envUint("PARTY_D_PRIVATE_KEY");

        uint64 cutoff = uint64(block.timestamp + vm.envOr("CUTOFF_IN", uint256(5 minutes)));
        uint64 deadline = cutoff + uint64(vm.envOr("FUNDING_WINDOW", uint256(20 minutes)));
        vm.broadcast(a);
        cid = setoff.openCycle(cutoff, deadline);

        _bill(cid, a, b, "EUR", 1e6, "CYC-EUR"); // B owes A EUR 1.00
        _bill(cid, b, c, "MXN", 20e6, "CYC-MXN"); // C owes B MXN 20.00
        _bill(cid, c, d, "BRL", 6e6, "CYC-BRL"); // D owes C BRL 6.00
        _bill(cid, d, a, "JPY", 180e6, "CYC-JPY"); // A owes D JPY 180
        _bill(cid, a, c, "USD", 0.25e6, "CYC-USD"); // C owes A USD 0.25

        console.log("cycle", cid);
        console.log("cutoff", cutoff);
        console.log("deadline", deadline);
    }

    function _bill(
        uint256 cid,
        uint256 creditorKey,
        uint256 debtorKey,
        bytes3 currency,
        uint128 amount,
        string memory ref
    ) internal {
        vm.broadcast(creditorKey);
        uint256 id =
            setoff.proposeInCycle(cid, vm.addr(debtorKey), currency, amount, bytes32(bytes(ref)));
        vm.broadcast(debtorKey);
        setoff.accept(id);
    }
}
