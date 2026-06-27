// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TollgateAccessRegistry
/// @notice The settlement and entitlement layer for Tollgate's pay-per-unlock protocol.
///
///         Any creator registers a piece of content with a USDC price. Any reader unlocks it by
///         paying once: the price is pulled in USDC and forwarded straight to the creator (minus
///         an optional protocol fee), the unlock is recorded, and per-content / per-creator stats
///         are updated on-chain. A server reads `hasAccess` before releasing gated content, so the
///         paywall is enforced by settlement rather than by the client.
///
///         The registry is non-custodial — funds never rest here — and keeps enough on-chain
///         bookkeeping (unlock counts, revenue, creator content lists) that dashboards can render
///         straight from chain state with no external indexer. It is designed to be called by a
///         reader's Universal Account, which batches the token `approve` and the `purchase` into a
///         single EIP-7702 transaction.
contract TollgateAccessRegistry is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev Settlement token (USDC on Arbitrum One, 6 decimals). Immutable for safety.
    IERC20 public immutable paymentToken;

    /// @notice Hard cap on the protocol fee (10%). The owner can never exceed this.
    uint16 public constant MAX_FEE_BPS = 1_000;

    struct Content {
        address creator; // slot 0: who gets paid / may reprice
        uint64 unlocks; // slot 0: lifetime unlocks
        bool exists; // slot 0
        uint128 price; // slot 1: USDC smallest units
        uint128 revenue; // slot 1: gross USDC collected for this content
    }

    uint16 public protocolFeeBps;
    address public feeRecipient;

    uint256 public totalUnlocks;
    uint256 public totalVolume;

    mapping(bytes32 => Content) public contents;
    mapping(address => mapping(bytes32 => bool)) public access;
    mapping(address => uint256) public creatorEarnings;
    /// @notice Every contentId a creator has registered, for dashboard enumeration.
    mapping(address => bytes32[]) private _creatorContentIds;

    event ContentRegistered(bytes32 indexed contentId, address indexed creator, uint128 price);
    event ContentPriceUpdated(bytes32 indexed contentId, uint128 price);
    event AccessGranted(
        bytes32 indexed contentId, address indexed reader, address indexed creator, uint256 paid, uint256 fee
    );
    event Tipped(address indexed creator, address indexed from, uint256 amount);
    event ProtocolFeeUpdated(uint16 bps, address recipient);

    error ZeroAddress();
    error FeeTooHigh();
    error ContentExists();
    error UnknownContent();
    error NotCreator();
    error AlreadyUnlocked();
    error ZeroAmount();

    constructor(IERC20 _paymentToken, address _feeRecipient, uint16 _feeBps) Ownable(msg.sender) {
        if (address(_paymentToken) == address(0) || _feeRecipient == address(0)) revert ZeroAddress();
        if (_feeBps > MAX_FEE_BPS) revert FeeTooHigh();
        paymentToken = _paymentToken;
        feeRecipient = _feeRecipient;
        protocolFeeBps = _feeBps;
    }

    // --------------------------------------------------------------------- //
    //                            Creator actions                            //
    // --------------------------------------------------------------------- //

    /// @notice Register a new piece of content owned by the caller.
    function registerContent(bytes32 contentId, uint128 price) external {
        if (contents[contentId].exists) revert ContentExists();
        contents[contentId] = Content({creator: msg.sender, unlocks: 0, exists: true, price: price, revenue: 0});
        _creatorContentIds[msg.sender].push(contentId);
        emit ContentRegistered(contentId, msg.sender, price);
    }

    /// @notice Update the price of content you own.
    function setPrice(bytes32 contentId, uint128 price) external {
        Content storage c = contents[contentId];
        if (!c.exists) revert UnknownContent();
        if (c.creator != msg.sender) revert NotCreator();
        c.price = price;
        emit ContentPriceUpdated(contentId, price);
    }

    // --------------------------------------------------------------------- //
    //                             Reader actions                            //
    // --------------------------------------------------------------------- //

    /// @notice Unlock content by paying its price in USDC. The caller must have approved this
    ///         contract for at least `price` (a Universal Account batches the approve + purchase
    ///         into one EIP-7702 transaction). Funds go straight to the creator and fee recipient.
    function purchase(bytes32 contentId) external nonReentrant {
        Content storage c = contents[contentId];
        if (!c.exists) revert UnknownContent();
        if (access[msg.sender][contentId]) revert AlreadyUnlocked();

        uint128 price = c.price;

        // effects before interactions
        access[msg.sender][contentId] = true;
        c.unlocks += 1;
        c.revenue += price;
        totalUnlocks += 1;
        totalVolume += price;

        uint256 fee = (uint256(price) * protocolFeeBps) / 10_000;
        uint256 toCreator = price - fee;
        creatorEarnings[c.creator] += toCreator;

        if (toCreator > 0) {
            paymentToken.safeTransferFrom(msg.sender, c.creator, toCreator);
        }
        if (fee > 0) {
            paymentToken.safeTransferFrom(msg.sender, feeRecipient, fee);
        }

        emit AccessGranted(contentId, msg.sender, c.creator, price, fee);
    }

    /// @notice Tip a creator any amount of USDC. No fee is taken from tips.
    function tip(address creator, uint256 amount) external nonReentrant {
        if (creator == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        creatorEarnings[creator] += amount;
        totalVolume += amount;
        paymentToken.safeTransferFrom(msg.sender, creator, amount);
        emit Tipped(creator, msg.sender, amount);
    }

    // --------------------------------------------------------------------- //
    //                                 Views                                 //
    // --------------------------------------------------------------------- //

    /// @notice Whether `reader` has unlocked `contentId`. Read by the paywall server.
    function hasAccess(address reader, bytes32 contentId) external view returns (bool) {
        return access[reader][contentId];
    }

    /// @notice Full content record for `contentId`.
    function getContent(bytes32 contentId) external view returns (Content memory) {
        return contents[contentId];
    }

    /// @notice How many pieces a creator has registered.
    function creatorContentCount(address creator) external view returns (uint256) {
        return _creatorContentIds[creator].length;
    }

    /// @notice The contentIds a creator has registered.
    function getCreatorContentIds(address creator) external view returns (bytes32[] memory) {
        return _creatorContentIds[creator];
    }

    /// @notice A creator's content with full stats, in one call — for the studio dashboard.
    function getCreatorContents(address creator)
        external
        view
        returns (bytes32[] memory ids, Content[] memory items)
    {
        ids = _creatorContentIds[creator];
        items = new Content[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            items[i] = contents[ids[i]];
        }
    }

    // --------------------------------------------------------------------- //
    //                                 Admin                                 //
    // --------------------------------------------------------------------- //

    /// @notice Update the protocol fee and recipient. Capped at `MAX_FEE_BPS`.
    function setProtocolFee(uint16 bps, address recipient) external onlyOwner {
        if (bps > MAX_FEE_BPS) revert FeeTooHigh();
        if (recipient == address(0)) revert ZeroAddress();
        protocolFeeBps = bps;
        feeRecipient = recipient;
        emit ProtocolFeeUpdated(bps, recipient);
    }
}
