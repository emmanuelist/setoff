// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @notice A Chainlink-shaped feed whose answer and update time the test controls.
contract MockFeed {
    uint8 public immutable decimals;
    int256 public answer;
    uint256 public updatedAt;
    uint80 public roundId;

    constructor(uint8 decimals_, int256 answer_) {
        decimals = decimals_;
        set(answer_, block.timestamp);
    }

    function set(int256 answer_, uint256 updatedAt_) public {
        answer = answer_;
        updatedAt = updatedAt_;
        ++roundId;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (roundId, answer, updatedAt, updatedAt, roundId);
    }
}

/// @notice A party that cannot receive native value, as an address on Arc's runtime blocklist
///         cannot.
contract RefusingParty {
    function accept(address setoff, uint256 id) external {
        (bool ok,) = setoff.call(abi.encodeWithSignature("accept(uint256)", id));
        require(ok, "accept failed");
    }

    function propose(address setoff, address debtor, bytes3 currency, uint128 amount)
        external
        returns (uint256 id)
    {
        (bool ok, bytes memory ret) = setoff.call(
            abi.encodeWithSignature(
                "propose(address,bytes3,uint128,bytes32)", debtor, currency, amount, bytes32(0)
            )
        );
        require(ok, "propose failed");
        id = abi.decode(ret, (uint256));
    }

    function proposeInCycle(
        address setoff,
        uint256 cycleId,
        address debtor,
        bytes3 currency,
        uint128 amount
    ) external returns (uint256 id) {
        (bool ok, bytes memory ret) = setoff.call(
            abi.encodeWithSignature(
                "proposeInCycle(uint256,address,bytes3,uint128,bytes32)",
                cycleId,
                debtor,
                currency,
                amount,
                bytes32(0)
            )
        );
        require(ok, "proposeInCycle failed");
        id = abi.decode(ret, (uint256));
    }

    function withdraw(address setoff) external {
        (bool ok, bytes memory ret) = setoff.call(abi.encodeWithSignature("withdraw()"));
        if (!ok) {
            assembly { revert(add(ret, 32), mload(ret)) }
        }
    }

    receive() external payable {
        revert("refused");
    }
}

/// @notice A creditor that tries to re-enter withdraw() while being paid out.
contract Reentrant {
    address public immutable setoff;
    uint256 public reentries;

    constructor(address setoff_) {
        setoff = setoff_;
    }

    function propose(address debtor, bytes3 currency, uint128 amount) external returns (uint256) {
        (, bytes memory ret) = setoff.call(
            abi.encodeWithSignature(
                "propose(address,bytes3,uint128,bytes32)", debtor, currency, amount, bytes32(0)
            )
        );
        return abi.decode(ret, (uint256));
    }

    function withdraw() external {
        (bool ok,) = setoff.call(abi.encodeWithSignature("withdraw()"));
        require(ok, "withdraw failed");
    }

    receive() external payable {
        // A second withdraw must find nothing left; swallow the revert so the attack is real.
        (bool ok,) = setoff.call(abi.encodeWithSignature("withdraw()"));
        if (ok) ++reentries;
    }
}
