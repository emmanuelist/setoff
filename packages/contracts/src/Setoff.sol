// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @notice The subset of Chainlink's AggregatorV3Interface that Setoff reads.
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

/// @title Setoff
/// @notice Debts priced in USD, EUR, MXN, BRL or JPY, paid in native USDC on Arc at a
///         Chainlink fixing. Milestone 1: the direct path. Cycles and netting come next.
/// @dev Native USDC only (D006): deposits arrive as msg.value in 18-decimal native units and
///      the ERC-20 view never enters the maths. Every payout is a withdrawal (D007), because
///      on Arc a native transfer can revert even with sufficient balance. There is no owner.
contract Setoff {
    enum State {
        None,
        Proposed,
        Accepted,
        Paid,
        Cancelled
    }

    enum Reason {
        Payment,
        Settlement,
        Refund
    }

    struct Debt {
        address creditor;
        uint64 proposedAt;
        address debtor;
        uint64 acceptedAt;
        bytes3 currency;
        State state;
        uint64 closedAt;
        uint128 amount;
        bytes32 ref;
    }

    /// @notice One rate read. For USD, `answer` is 1 with 0 decimals and no round: par by definition.
    struct Fixing {
        bytes3 currency;
        int256 answer;
        uint8 decimals;
        uint80 roundId;
        uint64 updatedAt;
    }

    bytes3 public constant USD = "USD";

    /// @notice Debt amounts are the currency's value × 10^6.
    uint8 public constant AMOUNT_DECIMALS = 6;

    /// @notice A fixing older than this many seconds is refused, never approximated (D008).
    uint256 public immutable maxFixingAge;

    mapping(bytes3 currency => AggregatorV3Interface) public feedOf;
    bytes3[] private _currencies;

    uint256 public debtCount;
    mapping(uint256 id => Debt) private _debts;

    mapping(address party => uint256) public withdrawable;

    /// @notice Sum of every withdrawable balance. The contract's balance never falls below it.
    uint256 public totalWithdrawable;

    event Proposed(
        uint256 indexed id,
        address indexed creditor,
        address indexed debtor,
        bytes3 currency,
        uint128 amount,
        bytes32 ref
    );
    event Accepted(uint256 indexed id);
    event Cancelled(uint256 indexed id);
    event Paid(
        uint256 indexed id,
        address indexed payer,
        uint256 usdc,
        bytes3 currency,
        int256 answer,
        uint8 feedDecimals,
        uint80 roundId,
        uint64 updatedAt
    );
    event Credited(address indexed party, uint256 amount, Reason reason);
    event Withdrawn(address indexed party, uint256 amount);

    error LengthMismatch();
    error ZeroFeed(bytes3 currency);
    error DuplicateCurrency(bytes3 currency);
    error ZeroMaxFixingAge();
    error UnsupportedCurrency(bytes3 currency);
    error InvalidDebtor();
    error ZeroAmount();
    error UnknownDebt(uint256 id);
    error WrongState(uint256 id, State state);
    error NotDebtor(uint256 id);
    error NotCreditor(uint256 id);
    error InvalidAnswer(bytes3 currency, int256 answer);
    error InvalidUpdatedAt(bytes3 currency, uint256 updatedAt);
    error StaleFixing(bytes3 currency, uint256 updatedAt, uint256 maxFixingAge);
    error Underpaid(uint256 id, uint256 due, uint256 sent);
    error NothingToWithdraw();
    error TransferFailed();

    /// @param codes ISO 4217 codes other than USD, each with a Chainlink `<CCY> / USD` feed.
    /// @param feeds The feed proxy for each code, in the same order.
    /// @param maxFixingAge_ The feed heartbeat plus a grace period, in seconds.
    constructor(bytes3[] memory codes, address[] memory feeds, uint256 maxFixingAge_) {
        if (codes.length != feeds.length) revert LengthMismatch();
        if (maxFixingAge_ == 0) revert ZeroMaxFixingAge();
        for (uint256 i; i < codes.length; ++i) {
            bytes3 c = codes[i];
            if (feeds[i] == address(0)) revert ZeroFeed(c);
            if (c == USD || address(feedOf[c]) != address(0)) revert DuplicateCurrency(c);
            feedOf[c] = AggregatorV3Interface(feeds[i]);
            _currencies.push(c);
        }
        maxFixingAge = maxFixingAge_;
    }

    // ── Debts ─────────────────────────────────────────────────────────────

    /// @notice The creditor records a debt. It counts for nothing until the debtor accepts it.
    function propose(address debtor, bytes3 currency, uint128 amount, bytes32 ref)
        external
        returns (uint256 id)
    {
        if (debtor == address(0) || debtor == msg.sender) revert InvalidDebtor();
        if (amount == 0) revert ZeroAmount();
        if (!isSupported(currency)) revert UnsupportedCurrency(currency);

        id = ++debtCount;
        _debts[id] = Debt({
            creditor: msg.sender,
            proposedAt: uint64(block.timestamp),
            debtor: debtor,
            acceptedAt: 0,
            currency: currency,
            state: State.Proposed,
            closedAt: 0,
            amount: amount,
            ref: ref
        });
        emit Proposed(id, msg.sender, debtor, currency, amount, ref);
    }

    /// @notice The debtor endorses the debt.
    function accept(uint256 id) external {
        Debt storage d = _existing(id);
        if (msg.sender != d.debtor) revert NotDebtor(id);
        if (d.state != State.Proposed) revert WrongState(id, d.state);
        d.state = State.Accepted;
        d.acceptedAt = uint64(block.timestamp);
        emit Accepted(id);
    }

    /// @notice The creditor withdraws a debt before it is endorsed.
    function cancel(uint256 id) external {
        Debt storage d = _existing(id);
        if (msg.sender != d.creditor) revert NotCreditor(id);
        if (d.state != State.Proposed) revert WrongState(id, d.state);
        d.state = State.Cancelled;
        d.closedAt = uint64(block.timestamp);
        emit Cancelled(id);
    }

    /// @notice The debtor pays an accepted debt at the current fixing.
    /// @dev `msg.value` is the most the debtor will pay. Anything above the amount due is
    ///      credited back to the debtor as withdrawable, never pushed.
    function pay(uint256 id) external payable {
        Debt storage d = _existing(id);
        if (msg.sender != d.debtor) revert NotDebtor(id);
        if (d.state != State.Accepted) revert WrongState(id, d.state);

        Fixing memory f = fixingOf(d.currency);
        uint256 due = toUsdc(d.amount, f);
        if (msg.value < due) revert Underpaid(id, due, msg.value);

        d.state = State.Paid;
        d.closedAt = uint64(block.timestamp);
        _credit(d.creditor, due, Reason.Payment);
        if (msg.value > due) _credit(msg.sender, msg.value - due, Reason.Refund);

        emit Paid(id, msg.sender, due, f.currency, f.answer, f.decimals, f.roundId, f.updatedAt);
    }

    // ── Withdrawals ───────────────────────────────────────────────────────

    /// @notice Withdraw everything credited to the caller. A recipient that cannot receive
    ///         (for example, one on Arc's runtime blocklist) only ever blocks itself.
    function withdraw() external {
        uint256 amount = withdrawable[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        withdrawable[msg.sender] = 0;
        totalWithdrawable -= amount;
        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(msg.sender, amount);
    }

    // ── Reads ─────────────────────────────────────────────────────────────

    function debt(uint256 id) external view returns (Debt memory) {
        return _existing(id);
    }

    /// @notice What paying this debt would cost right now, and the fixing it would use.
    function quote(uint256 id) external view returns (uint256 due, Fixing memory fixing) {
        Debt storage d = _existing(id);
        fixing = fixingOf(d.currency);
        due = toUsdc(d.amount, fixing);
    }

    /// @notice Every supported currency, USD first.
    function currencies() external view returns (bytes3[] memory list) {
        list = new bytes3[](_currencies.length + 1);
        list[0] = USD;
        for (uint256 i; i < _currencies.length; ++i) {
            list[i + 1] = _currencies[i];
        }
    }

    function isSupported(bytes3 currency) public view returns (bool) {
        return currency == USD || address(feedOf[currency]) != address(0);
    }

    /// @notice The current fixing for a currency. Reverts rather than return a stale or
    ///         invalid rate.
    function fixingOf(bytes3 currency) public view returns (Fixing memory f) {
        if (currency == USD) return Fixing(USD, 1, 0, 0, 0);
        AggregatorV3Interface feed = feedOf[currency];
        if (address(feed) == address(0)) revert UnsupportedCurrency(currency);

        (uint80 roundId, int256 answer,, uint256 updatedAt,) = feed.latestRoundData();
        if (answer <= 0) revert InvalidAnswer(currency, answer);
        // The staleness window is 25 hours; seconds of validator timestamp drift cannot
        // change its outcome, and Arc's validator set is permissioned.
        // forge-lint: disable-next-line(block-timestamp)
        if (updatedAt == 0 || updatedAt > block.timestamp) {
            revert InvalidUpdatedAt(currency, updatedAt);
        }
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp - updatedAt > maxFixingAge) {
            revert StaleFixing(currency, updatedAt, maxFixingAge);
        }
        // Safe: updatedAt is at most block.timestamp, checked above.
        // forge-lint: disable-next-line(unsafe-typecast)
        f = Fixing(currency, answer, feed.decimals(), roundId, uint64(updatedAt));
    }

    /// @notice Converts a debt amount (currency × 10^6) to native USDC units (10^18),
    ///         rounding up so the creditor is never short by a unit.
    function toUsdc(uint256 amount, Fixing memory f) public pure returns (uint256) {
        if (f.currency == USD) return amount * 1e12;
        if (f.answer <= 0) revert InvalidAnswer(f.currency, f.answer);
        uint256 numerator = amount * uint256(f.answer) * 1e12;
        uint256 denominator = 10 ** uint256(f.decimals);
        return (numerator + denominator - 1) / denominator;
    }

    // ── Internal ──────────────────────────────────────────────────────────

    function _existing(uint256 id) private view returns (Debt storage d) {
        d = _debts[id];
        if (d.state == State.None) revert UnknownDebt(id);
    }

    function _credit(address party, uint256 amount, Reason reason) private {
        withdrawable[party] += amount;
        totalWithdrawable += amount;
        emit Credited(party, amount, reason);
    }
}
