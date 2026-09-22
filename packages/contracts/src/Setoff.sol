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
/// @notice Debts in five currencies clear at one on-chain fixing: only the net moves, and
///         either every party settles or none does.
///
///         Direct path (milestone 1): a debt priced in USD, EUR, MXN, BRL or JPY is paid in
///         native USDC at the current Chainlink fixing.
///
///         Cycle path (milestone 2): debts are enrolled in a cycle when proposed, so the
///         debtor consents to the cycle by accepting. At the cutoff anyone fixes the cycle:
///         each currency is read once, every debt is priced, and each party's net position
///         is stored. Net debtors fund their net. If every one of them has funded, anyone
///         settles and every debt is netted in one transaction. If the funding deadline
///         passes with anyone unfunded, anyone voids the cycle: every deposit becomes
///         refundable and every debt returns to the direct path.
/// @dev Native USDC only (D006): deposits arrive as msg.value in 18-decimal native units and
///      the ERC-20 view never enters the maths. Every payout is a withdrawal (D007), because
///      on Arc a native transfer can revert even with sufficient balance. There is no owner.
///
///      Rounding (D018): each debt is converted to USDC exactly once, rounded up, and that one
///      value is added to its creditor and subtracted from its debtor. Nets are sums of those
///      values, so they add up to exactly zero, the deposits cover the payouts to the unit,
///      and there is no dust to assign.
contract Setoff {
    enum State {
        None,
        Proposed,
        Accepted,
        Paid,
        Cancelled,
        Netted
    }

    enum CycleState {
        None,
        Open,
        Fixed,
        Settled,
        Void
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
        uint32 cycleId; // 0 is the direct path
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

    struct Cycle {
        address opener;
        uint64 cutoff; // enrolment closes and fixing opens at this time
        uint64 fundingDeadline; // fixing and funding close, and voiding opens, at this time
        uint64 fixedAt;
        uint64 closedAt; // settled or voided
        CycleState state;
        uint8 debtors; // parties with a net debit at the fixing
        uint8 funded; // of those, how many have funded
        uint8 currencyMask; // bit 0 is USD; bit i + 1 is the i-th feed currency
        uint256 gross; // every debt at the fixing, in native USDC
        uint256 netMoved; // the sum of the net debits: the money that actually moves
        uint256 held; // deposits received and not yet settled or refunded
    }

    struct Position {
        int256 net; // native USDC; negative is a debit, positive a credit
        uint8 index; // 1-based place in the cycle's party list; 0 means not a party
        bool funded;
    }

    bytes3 public constant USD = "USD";

    /// @notice Debt amounts are the currency's value × 10^6.
    uint8 public constant AMOUNT_DECIMALS = 6;

    /// @notice Bounds that keep a cycle's fixing and settlement well inside one block, and
    ///         keep every conversion clear of overflow, whatever the feed answers.
    uint256 public constant MAX_CYCLE_DEBTS = 16;
    uint256 public constant MAX_CYCLE_PARTIES = 8;
    uint256 public constant MAX_AMOUNT = 1e30;
    uint256 public constant MIN_FUNDING_WINDOW = 10 minutes;
    uint256 public constant MAX_FUNDING_WINDOW = 30 days;

    /// @notice A fixing older than this many seconds is refused, never approximated (D008).
    uint256 public immutable maxFixingAge;

    mapping(bytes3 currency => AggregatorV3Interface) public feedOf;
    bytes3[] private _currencies;
    mapping(bytes3 currency => uint8) private _bitOf; // 0 for USD, i + 1 for the i-th feed

    uint256 public debtCount;
    mapping(uint256 id => Debt) private _debts;

    uint256 public cycleCount;
    mapping(uint256 id => Cycle) private _cycles;
    mapping(uint256 id => uint256[]) private _cycleDebts;
    mapping(uint256 id => address[]) private _cycleParties;
    mapping(uint256 id => mapping(address party => Position)) private _positions;
    mapping(uint256 id => mapping(bytes3 currency => Fixing)) private _cycleFixings;

    mapping(address party => uint256) public withdrawable;

    /// @notice Sum of every withdrawable balance.
    uint256 public totalWithdrawable;

    /// @notice Sum of every cycle deposit not yet settled or refunded. The contract's balance
    ///         never falls below totalWithdrawable + totalHeld.
    uint256 public totalHeld;

    event Proposed(
        uint256 indexed id,
        address indexed creditor,
        address indexed debtor,
        bytes3 currency,
        uint128 amount,
        bytes32 ref
    );
    event Enrolled(uint256 indexed id, uint256 indexed cycleId);
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
    event CycleOpened(
        uint256 indexed cycleId, address indexed opener, uint64 cutoff, uint64 fundingDeadline
    );
    event CurrencyFixed(
        uint256 indexed cycleId,
        bytes3 currency,
        int256 answer,
        uint8 feedDecimals,
        uint80 roundId,
        uint64 updatedAt
    );
    event CycleFixed(uint256 indexed cycleId, uint256 gross, uint256 netMoved, uint8 debtors);
    event Funded(uint256 indexed cycleId, address indexed party, uint256 usdc);
    event Netted(uint256 indexed id, uint256 indexed cycleId);
    event CycleSettled(uint256 indexed cycleId, uint256 netMoved);
    event CycleVoided(uint256 indexed cycleId, uint256 refunded);
    event Credited(address indexed party, uint256 amount, Reason reason);
    event Withdrawn(address indexed party, uint256 amount);

    error LengthMismatch();
    error TooManyCurrencies();
    error ZeroFeed(bytes3 currency);
    error DuplicateCurrency(bytes3 currency);
    error ZeroMaxFixingAge();
    error UnsupportedCurrency(bytes3 currency);
    error InvalidDebtor();
    error ZeroAmount();
    error AmountTooLarge(uint256 amount);
    error UnknownDebt(uint256 id);
    error WrongState(uint256 id, State state);
    error NotDebtor(uint256 id);
    error NotCreditor(uint256 id);
    error InCycle(uint256 id, uint256 cycleId);
    error InvalidAnswer(bytes3 currency, int256 answer);
    error InvalidUpdatedAt(bytes3 currency, uint256 updatedAt);
    error StaleFixing(bytes3 currency, uint256 updatedAt, uint256 maxFixingAge);
    error Underpaid(uint256 id, uint256 due, uint256 sent);
    error InvalidSchedule(uint256 cutoff, uint256 fundingDeadline);
    error UnknownCycle(uint256 cycleId);
    error WrongCycleState(uint256 cycleId, CycleState state);
    error BeforeCutoff(uint256 cycleId, uint256 cutoff);
    error PastCutoff(uint256 cycleId, uint256 cutoff);
    error BeforeDeadline(uint256 cycleId, uint256 fundingDeadline);
    error PastDeadline(uint256 cycleId, uint256 fundingDeadline);
    error CycleFull(uint256 cycleId);
    error TooManyParties(uint256 cycleId);
    error EmptyCycle(uint256 cycleId);
    error NotNetDebtor(uint256 cycleId, address party);
    error AlreadyFunded(uint256 cycleId, address party);
    error Underfunded(uint256 cycleId, uint256 due, uint256 sent);
    error NotFullyFunded(uint256 cycleId, uint256 funded, uint256 debtors);
    error FullyFunded(uint256 cycleId);
    error NothingToWithdraw();
    error TransferFailed();

    /// @param codes ISO 4217 codes other than USD, each with a Chainlink `<CCY> / USD` feed.
    /// @param feeds The feed proxy for each code, in the same order.
    /// @param maxFixingAge_ The feed heartbeat plus a grace period, in seconds.
    constructor(bytes3[] memory codes, address[] memory feeds, uint256 maxFixingAge_) {
        if (codes.length != feeds.length) revert LengthMismatch();
        if (codes.length > 7) revert TooManyCurrencies(); // bit 0 is USD; the mask has 8 bits
        if (maxFixingAge_ == 0) revert ZeroMaxFixingAge();
        for (uint256 i; i < codes.length; ++i) {
            bytes3 c = codes[i];
            if (feeds[i] == address(0)) revert ZeroFeed(c);
            if (c == USD || address(feedOf[c]) != address(0)) revert DuplicateCurrency(c);
            feedOf[c] = AggregatorV3Interface(feeds[i]);
            _currencies.push(c);
            // Safe: at most 7 codes, checked above.
            // forge-lint: disable-next-line(unsafe-typecast)
            _bitOf[c] = uint8(i + 1);
        }
        maxFixingAge = maxFixingAge_;
    }

    // ── Debts ─────────────────────────────────────────────────────────────

    /// @notice The creditor records a debt on the direct path. It counts for nothing until
    ///         the debtor accepts it.
    function propose(address debtor, bytes3 currency, uint128 amount, bytes32 ref)
        external
        returns (uint256 id)
    {
        id = _propose(debtor, currency, amount, ref, 0);
    }

    /// @notice The creditor records a debt that will clear in a cycle. By accepting it, the
    ///         debtor consents to the cycle and its schedule (D017).
    function proposeInCycle(
        uint256 cycleId,
        address debtor,
        bytes3 currency,
        uint128 amount,
        bytes32 ref
    ) external returns (uint256 id) {
        _enrollable(cycleId);
        // Safe: cycle IDs are sequential; four billion cycles cannot be opened.
        // forge-lint: disable-next-line(unsafe-typecast)
        id = _propose(debtor, currency, amount, ref, uint32(cycleId));
        emit Enrolled(id, cycleId);
    }

    /// @notice The debtor endorses the debt. A cycle debt joins its cycle here, and only
    ///         while the cycle is still open for enrolment.
    function accept(uint256 id) external {
        Debt storage d = _existing(id);
        if (msg.sender != d.debtor) revert NotDebtor(id);
        if (d.state != State.Proposed) revert WrongState(id, d.state);
        if (d.cycleId != 0) _enrol(d.cycleId, id, d);
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

    /// @notice The debtor pays an accepted direct debt at the current fixing.
    /// @dev `msg.value` is the most the debtor will pay. Anything above the amount due is
    ///      credited back to the debtor as withdrawable, never pushed.
    function pay(uint256 id) external payable {
        Debt storage d = _existing(id);
        if (msg.sender != d.debtor) revert NotDebtor(id);
        if (d.state != State.Accepted) revert WrongState(id, d.state);
        if (d.cycleId != 0) revert InCycle(id, d.cycleId);

        Fixing memory f = fixingOf(d.currency);
        uint256 due = toUsdc(d.amount, f);
        if (msg.value < due) revert Underpaid(id, due, msg.value);

        d.state = State.Paid;
        d.closedAt = uint64(block.timestamp);
        _credit(d.creditor, due, Reason.Payment);
        if (msg.value > due) _credit(msg.sender, msg.value - due, Reason.Refund);

        emit Paid(id, msg.sender, due, f.currency, f.answer, f.decimals, f.roundId, f.updatedAt);
    }

    // ── Cycles ────────────────────────────────────────────────────────────

    /// @notice Anyone opens a cycle. Debts can be enrolled until `cutoff`; it can be fixed from
    ///         `cutoff` until `fundingDeadline`, funded until `fundingDeadline`, and voided from
    ///         `fundingDeadline` if anyone is unfunded.
    function openCycle(uint64 cutoff, uint64 fundingDeadline) external returns (uint256 id) {
        // Deadlines are absolute times checked with explicit >= and <, because Arc block
        // timestamps can repeat. Seconds of drift cannot move a ten-minute window.
        // forge-lint: disable-next-line(block-timestamp)
        if (cutoff <= block.timestamp) revert InvalidSchedule(cutoff, fundingDeadline);
        uint256 window = fundingDeadline > cutoff ? fundingDeadline - cutoff : 0;
        if (window < MIN_FUNDING_WINDOW || window > MAX_FUNDING_WINDOW) {
            revert InvalidSchedule(cutoff, fundingDeadline);
        }

        id = ++cycleCount;
        Cycle storage c = _cycles[id];
        c.opener = msg.sender;
        c.cutoff = cutoff;
        c.fundingDeadline = fundingDeadline;
        c.state = CycleState.Open;
        emit CycleOpened(id, msg.sender, cutoff, fundingDeadline);
    }

    /// @notice Anyone fixes a cycle at or after its cutoff: one read per currency, every debt
    ///         priced, every party's net stored. A stale or invalid rate reverts the whole
    ///         fixing; it can be retried until the funding deadline.
    function fixCycle(uint256 cycleId) external {
        Cycle storage c = _existingCycle(cycleId);
        if (c.state != CycleState.Open) revert WrongCycleState(cycleId, c.state);
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp < c.cutoff) revert BeforeCutoff(cycleId, c.cutoff);
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp >= c.fundingDeadline) revert PastDeadline(cycleId, c.fundingDeadline);
        if (_cycleDebts[cycleId].length == 0) revert EmptyCycle(cycleId);

        Fixing[8] memory fx = _readFixings(c.currencyMask);
        for (uint256 b; b < 8; ++b) {
            if (uint256(c.currencyMask) & (uint256(1) << b) == 0) continue;
            Fixing memory f = fx[b];
            _cycleFixings[cycleId][f.currency] = f;
            emit CurrencyFixed(cycleId, f.currency, f.answer, f.decimals, f.roundId, f.updatedAt);
        }

        (int256[] memory nets, uint256 gross, uint256 netMoved, uint8 debtors) = _nets(cycleId, fx);
        address[] storage parties = _cycleParties[cycleId];
        for (uint256 i; i < parties.length; ++i) {
            _positions[cycleId][parties[i]].net = nets[i];
        }

        c.gross = gross;
        c.netMoved = netMoved;
        c.debtors = debtors;
        c.fixedAt = uint64(block.timestamp);
        c.state = CycleState.Fixed;
        emit CycleFixed(cycleId, gross, netMoved, debtors);
    }

    /// @notice A net debtor pays its net, once. Anything above it is credited back as
    ///         withdrawable, never pushed.
    function fund(uint256 cycleId) external payable {
        Cycle storage c = _existingCycle(cycleId);
        if (c.state != CycleState.Fixed) revert WrongCycleState(cycleId, c.state);
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp >= c.fundingDeadline) revert PastDeadline(cycleId, c.fundingDeadline);

        Position storage p = _positions[cycleId][msg.sender];
        if (p.net >= 0) revert NotNetDebtor(cycleId, msg.sender);
        if (p.funded) revert AlreadyFunded(cycleId, msg.sender);
        uint256 due = uint256(-p.net);
        if (msg.value < due) revert Underfunded(cycleId, due, msg.value);

        p.funded = true;
        ++c.funded;
        c.held += due;
        totalHeld += due;
        if (msg.value > due) _credit(msg.sender, msg.value - due, Reason.Refund);
        emit Funded(cycleId, msg.sender, due);
    }

    /// @notice Once every net debtor has funded, anyone settles: every net creditor is
    ///         credited, and every debt in the cycle is netted, in this one transaction.
    function settle(uint256 cycleId) external {
        Cycle storage c = _existingCycle(cycleId);
        if (c.state != CycleState.Fixed) revert WrongCycleState(cycleId, c.state);
        if (c.funded < c.debtors) revert NotFullyFunded(cycleId, c.funded, c.debtors);

        c.state = CycleState.Settled;
        c.closedAt = uint64(block.timestamp);
        totalHeld -= c.held;
        c.held = 0;

        address[] storage parties = _cycleParties[cycleId];
        for (uint256 i; i < parties.length; ++i) {
            int256 net = _positions[cycleId][parties[i]].net;
            // Safe: only a positive net is converted.
            // forge-lint: disable-next-line(unsafe-typecast)
            if (net > 0) _credit(parties[i], uint256(net), Reason.Settlement);
        }
        uint256[] storage ids = _cycleDebts[cycleId];
        for (uint256 i; i < ids.length; ++i) {
            Debt storage d = _debts[ids[i]];
            d.state = State.Netted;
            d.closedAt = uint64(block.timestamp);
            emit Netted(ids[i], cycleId);
        }
        emit CycleSettled(cycleId, c.netMoved);
    }

    /// @notice From the funding deadline, if anyone is unfunded (or the cycle was never fixed),
    ///         anyone voids the cycle. Every deposit becomes withdrawable by whoever made it,
    ///         and every debt returns to the direct path, still accepted.
    function voidCycle(uint256 cycleId) external {
        Cycle storage c = _existingCycle(cycleId);
        if (c.state != CycleState.Open && c.state != CycleState.Fixed) {
            revert WrongCycleState(cycleId, c.state);
        }
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp < c.fundingDeadline) revert BeforeDeadline(cycleId, c.fundingDeadline);
        if (c.state == CycleState.Fixed && c.funded == c.debtors) revert FullyFunded(cycleId);

        c.state = CycleState.Void;
        c.closedAt = uint64(block.timestamp);
        uint256 refunded = c.held;
        totalHeld -= refunded;
        c.held = 0;

        address[] storage parties = _cycleParties[cycleId];
        for (uint256 i; i < parties.length; ++i) {
            Position storage p = _positions[cycleId][parties[i]];
            if (p.funded) _credit(parties[i], uint256(-p.net), Reason.Refund);
        }
        uint256[] storage ids = _cycleDebts[cycleId];
        for (uint256 i; i < ids.length; ++i) {
            _debts[ids[i]].cycleId = 0;
        }
        emit CycleVoided(cycleId, refunded);
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

    /// @notice What paying this debt directly would cost right now, and the fixing it would use.
    function quote(uint256 id) external view returns (uint256 due, Fixing memory fixing) {
        Debt storage d = _existing(id);
        fixing = fixingOf(d.currency);
        due = toUsdc(d.amount, fixing);
    }

    function cycle(uint256 cycleId) external view returns (Cycle memory) {
        return _existingCycle(cycleId);
    }

    /// @notice The debts that joined the cycle, in the order they were accepted.
    function cycleDebts(uint256 cycleId) external view returns (uint256[] memory) {
        _existingCycle(cycleId);
        return _cycleDebts[cycleId];
    }

    /// @notice The cycle's parties, and each one's position (zero before the fixing).
    function cyclePositions(uint256 cycleId)
        external
        view
        returns (address[] memory parties, Position[] memory positions)
    {
        _existingCycle(cycleId);
        parties = _cycleParties[cycleId];
        positions = new Position[](parties.length);
        for (uint256 i; i < parties.length; ++i) {
            positions[i] = _positions[cycleId][parties[i]];
        }
    }

    /// @notice The fixing the cycle used for a currency (all zero before the fixing).
    function cycleFixing(uint256 cycleId, bytes3 currency) external view returns (Fixing memory) {
        _existingCycle(cycleId);
        return _cycleFixings[cycleId][currency];
    }

    /// @notice What the cycle's nets would be at the current fixings. Reverts on a stale or
    ///         invalid rate, exactly as the fixing itself would.
    function preview(uint256 cycleId)
        external
        view
        returns (address[] memory parties, int256[] memory nets, uint256 gross, uint256 netMoved)
    {
        Cycle storage c = _existingCycle(cycleId);
        parties = _cycleParties[cycleId];
        (nets, gross, netMoved,) = _nets(cycleId, _readFixings(c.currencyMask));
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

    function _propose(address debtor, bytes3 currency, uint128 amount, bytes32 ref, uint32 cycleId)
        private
        returns (uint256 id)
    {
        if (debtor == address(0) || debtor == msg.sender) revert InvalidDebtor();
        if (amount == 0) revert ZeroAmount();
        if (amount > MAX_AMOUNT) revert AmountTooLarge(amount);
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
            cycleId: cycleId,
            ref: ref
        });
        emit Proposed(id, msg.sender, debtor, currency, amount, ref);
    }

    /// @dev Reverts unless the cycle exists, is open, and its cutoff has not arrived.
    function _enrollable(uint256 cycleId) private view returns (Cycle storage c) {
        c = _existingCycle(cycleId);
        if (c.state != CycleState.Open) revert WrongCycleState(cycleId, c.state);
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp >= c.cutoff) revert PastCutoff(cycleId, c.cutoff);
    }

    function _enrol(uint256 cycleId, uint256 id, Debt storage d) private {
        Cycle storage c = _enrollable(cycleId);
        uint256[] storage ids = _cycleDebts[cycleId];
        if (ids.length >= MAX_CYCLE_DEBTS) revert CycleFull(cycleId);
        ids.push(id);
        _join(cycleId, d.creditor);
        _join(cycleId, d.debtor);
        c.currencyMask |= uint8(1) << _bitOf[d.currency];
    }

    function _join(uint256 cycleId, address party) private {
        Position storage p = _positions[cycleId][party];
        if (p.index != 0) return;
        address[] storage parties = _cycleParties[cycleId];
        if (parties.length >= MAX_CYCLE_PARTIES) revert TooManyParties(cycleId);
        parties.push(party);
        // Safe: at most MAX_CYCLE_PARTIES (8) parties, checked above.
        // forge-lint: disable-next-line(unsafe-typecast)
        p.index = uint8(parties.length);
    }

    /// @dev One read per currency present in the cycle, indexed by the currency's bit.
    function _readFixings(uint8 mask) private view returns (Fixing[8] memory fx) {
        if (mask & 1 != 0) fx[0] = fixingOf(USD);
        for (uint256 i; i < _currencies.length; ++i) {
            if (uint256(mask) & (uint256(1) << (i + 1)) != 0) fx[i + 1] = fixingOf(_currencies[i]);
        }
    }

    /// @dev Each debt is priced once; that one value is added to the creditor and subtracted
    ///      from the debtor, so the nets sum to exactly zero (D018).
    function _nets(uint256 cycleId, Fixing[8] memory fx)
        private
        view
        returns (int256[] memory nets, uint256 gross, uint256 netMoved, uint8 debtors)
    {
        nets = new int256[](_cycleParties[cycleId].length);
        uint256[] storage ids = _cycleDebts[cycleId];
        for (uint256 i; i < ids.length; ++i) {
            Debt storage d = _debts[ids[i]];
            uint256 v = toUsdc(d.amount, fx[_bitOf[d.currency]]);
            gross += v;
            // Safe: amount ≤ MAX_AMOUNT keeps v far below 2^255 for any feed answer that
            // does not already overflow the conversion, which reverts instead.
            // forge-lint: disable-next-line(unsafe-typecast)
            int256 sv = int256(v);
            nets[_positions[cycleId][d.creditor].index - 1] += sv;
            nets[_positions[cycleId][d.debtor].index - 1] -= sv;
        }
        for (uint256 i; i < nets.length; ++i) {
            if (nets[i] < 0) {
                netMoved += uint256(-nets[i]);
                ++debtors;
            }
        }
    }

    function _existing(uint256 id) private view returns (Debt storage d) {
        d = _debts[id];
        if (d.state == State.None) revert UnknownDebt(id);
    }

    function _existingCycle(uint256 cycleId) private view returns (Cycle storage c) {
        c = _cycles[cycleId];
        if (c.state == CycleState.None) revert UnknownCycle(cycleId);
    }

    function _credit(address party, uint256 amount, Reason reason) private {
        withdrawable[party] += amount;
        totalWithdrawable += amount;
        emit Credited(party, amount, reason);
    }
}
