// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {TollgateAccessRegistry} from "../src/TollgateAccessRegistry.sol";

/// @dev Minimal USDC stand-in: 6 decimals, public mint.
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract TollgateAccessRegistryTest is Test {
    TollgateAccessRegistry internal registry;
    MockUSDC internal usdc;

    address internal owner = address(this);
    address internal feeRecipient = makeAddr("feeRecipient");
    address internal creator = makeAddr("creator");
    address internal reader = makeAddr("reader");

    uint16 internal constant FEE_BPS = 250; // 2.5%
    bytes32 internal constant CONTENT = keccak256("article-1");
    uint128 internal constant PRICE = 500_000; // $0.50 (6 decimals)

    event AccessGranted(
        bytes32 indexed contentId, address indexed reader, address indexed creator, uint256 paid, uint256 fee
    );
    event Tipped(address indexed creator, address indexed from, uint256 amount);

    function setUp() public {
        usdc = new MockUSDC();
        registry = new TollgateAccessRegistry(usdc, feeRecipient, FEE_BPS);

        vm.prank(creator);
        registry.registerContent(CONTENT, PRICE);

        usdc.mint(reader, 1_000_000_000); // $1,000
        vm.prank(reader);
        usdc.approve(address(registry), type(uint256).max);
    }

    // ----------------------------- constructor ----------------------------- //

    function test_constructor_setsState() public view {
        assertEq(address(registry.paymentToken()), address(usdc));
        assertEq(registry.feeRecipient(), feeRecipient);
        assertEq(registry.protocolFeeBps(), FEE_BPS);
        assertEq(registry.owner(), owner);
    }

    function test_constructor_revertsOnZeroToken() public {
        vm.expectRevert(TollgateAccessRegistry.ZeroAddress.selector);
        new TollgateAccessRegistry(MockUSDC(address(0)), feeRecipient, FEE_BPS);
    }

    function test_constructor_revertsOnZeroFeeRecipient() public {
        vm.expectRevert(TollgateAccessRegistry.ZeroAddress.selector);
        new TollgateAccessRegistry(usdc, address(0), FEE_BPS);
    }

    function test_constructor_revertsOnFeeTooHigh() public {
        vm.expectRevert(TollgateAccessRegistry.FeeTooHigh.selector);
        new TollgateAccessRegistry(usdc, feeRecipient, 1_001);
    }

    // ------------------------------ register ------------------------------- //

    function test_registerContent_storesCreatorAndPrice() public view {
        TollgateAccessRegistry.Content memory c = registry.getContent(CONTENT);
        assertEq(c.creator, creator);
        assertEq(c.price, PRICE);
        assertTrue(c.exists);
    }

    function test_registerContent_revertsOnDuplicate() public {
        vm.prank(creator);
        vm.expectRevert(TollgateAccessRegistry.ContentExists.selector);
        registry.registerContent(CONTENT, PRICE);
    }

    function test_setPrice_byCreator() public {
        vm.prank(creator);
        registry.setPrice(CONTENT, 750_000);
        assertEq(registry.getContent(CONTENT).price, 750_000);
    }

    function test_setPrice_revertsForNonCreator() public {
        vm.prank(reader);
        vm.expectRevert(TollgateAccessRegistry.NotCreator.selector);
        registry.setPrice(CONTENT, 1);
    }

    function test_setPrice_revertsForUnknownContent() public {
        vm.prank(creator);
        vm.expectRevert(TollgateAccessRegistry.UnknownContent.selector);
        registry.setPrice(keccak256("nope"), 1);
    }

    // ------------------------------ purchase ------------------------------- //

    function test_purchase_grantsAccessAndRoutesFunds() public {
        uint256 fee = (uint256(PRICE) * FEE_BPS) / 10_000;
        uint256 toCreator = PRICE - fee;

        vm.expectEmit(true, true, true, true);
        emit AccessGranted(CONTENT, reader, creator, PRICE, fee);

        vm.prank(reader);
        registry.purchase(CONTENT);

        assertTrue(registry.hasAccess(reader, CONTENT));
        assertEq(usdc.balanceOf(creator), toCreator);
        assertEq(usdc.balanceOf(feeRecipient), fee);
        assertEq(registry.creatorEarnings(creator), toCreator);
        assertEq(registry.totalUnlocks(), 1);
        assertEq(registry.totalVolume(), PRICE);

        TollgateAccessRegistry.Content memory c = registry.getContent(CONTENT);
        assertEq(c.unlocks, 1);
        assertEq(c.revenue, PRICE);
    }

    function test_purchase_revertsWhenAlreadyUnlocked() public {
        vm.startPrank(reader);
        registry.purchase(CONTENT);
        vm.expectRevert(TollgateAccessRegistry.AlreadyUnlocked.selector);
        registry.purchase(CONTENT);
        vm.stopPrank();
    }

    function test_purchase_revertsForUnknownContent() public {
        vm.prank(reader);
        vm.expectRevert(TollgateAccessRegistry.UnknownContent.selector);
        registry.purchase(keccak256("nope"));
    }

    function test_purchase_revertsWithoutApproval() public {
        address poor = makeAddr("poor");
        usdc.mint(poor, PRICE);
        vm.prank(poor);
        vm.expectRevert(); // ERC20 insufficient allowance
        registry.purchase(CONTENT);
    }

    function test_purchase_zeroFeeSendsFullPriceToCreator() public {
        TollgateAccessRegistry r = new TollgateAccessRegistry(usdc, feeRecipient, 0);
        vm.prank(creator);
        r.registerContent(CONTENT, PRICE);
        vm.prank(reader);
        usdc.approve(address(r), type(uint256).max);

        vm.prank(reader);
        r.purchase(CONTENT);

        assertEq(usdc.balanceOf(creator), PRICE);
        assertEq(usdc.balanceOf(feeRecipient), 0);
    }

    function test_purchase_freeContentGrantsAccessNoTransfer() public {
        bytes32 freeId = keccak256("free");
        vm.prank(creator);
        registry.registerContent(freeId, 0);

        vm.prank(reader);
        registry.purchase(freeId);

        assertTrue(registry.hasAccess(reader, freeId));
        assertEq(registry.totalUnlocks(), 1);
    }

    function test_purchase_multipleReadersSameContent() public {
        address reader2 = makeAddr("reader2");
        usdc.mint(reader2, PRICE);
        vm.prank(reader2);
        usdc.approve(address(registry), type(uint256).max);

        vm.prank(reader);
        registry.purchase(CONTENT);
        vm.prank(reader2);
        registry.purchase(CONTENT);

        assertTrue(registry.hasAccess(reader, CONTENT));
        assertTrue(registry.hasAccess(reader2, CONTENT));
        assertEq(registry.totalUnlocks(), 2);
        assertEq(registry.totalVolume(), uint256(PRICE) * 2);
    }

    // -------------------------------- tip ---------------------------------- //

    function test_tip_forwardsFundsAndEmits() public {
        vm.expectEmit(true, true, false, true);
        emit Tipped(creator, reader, 100_000);

        vm.prank(reader);
        registry.tip(creator, 100_000);

        assertEq(usdc.balanceOf(creator), 100_000);
        assertEq(registry.creatorEarnings(creator), 100_000);
        assertEq(registry.totalVolume(), 100_000);
    }

    function test_tip_revertsOnZeroAmount() public {
        vm.prank(reader);
        vm.expectRevert(TollgateAccessRegistry.ZeroAmount.selector);
        registry.tip(creator, 0);
    }

    function test_tip_revertsOnZeroCreator() public {
        vm.prank(reader);
        vm.expectRevert(TollgateAccessRegistry.ZeroAddress.selector);
        registry.tip(address(0), 1);
    }

    // ------------------------------- admin --------------------------------- //

    function test_setProtocolFee_byOwner() public {
        registry.setProtocolFee(500, feeRecipient);
        assertEq(registry.protocolFeeBps(), 500);
    }

    function test_setProtocolFee_revertsForNonOwner() public {
        vm.prank(reader);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, reader));
        registry.setProtocolFee(500, feeRecipient);
    }

    function test_setProtocolFee_revertsAboveCap() public {
        vm.expectRevert(TollgateAccessRegistry.FeeTooHigh.selector);
        registry.setProtocolFee(1_001, feeRecipient);
    }

    // -------------------------- dashboard reads ---------------------------- //

    function test_registerContent_addsToCreatorEnumeration() public view {
        assertEq(registry.creatorContentCount(creator), 1);
        bytes32[] memory ids = registry.getCreatorContentIds(creator);
        assertEq(ids.length, 1);
        assertEq(ids[0], CONTENT);
    }

    function test_creatorEnumeration_multipleContent() public {
        bytes32 c2 = keccak256("article-2");
        bytes32 c3 = keccak256("article-3");
        vm.startPrank(creator);
        registry.registerContent(c2, 100_000);
        registry.registerContent(c3, 200_000);
        vm.stopPrank();

        assertEq(registry.creatorContentCount(creator), 3);

        (bytes32[] memory ids, TollgateAccessRegistry.Content[] memory items) =
            registry.getCreatorContents(creator);
        assertEq(ids.length, 3);
        assertEq(items.length, 3);
        assertEq(items[1].price, 100_000);
        assertEq(items[2].price, 200_000);
        assertEq(items[0].creator, creator);
    }

    function test_revenueAndUnlocks_accumulateAcrossReaders() public {
        address reader2 = makeAddr("reader2");
        usdc.mint(reader2, PRICE);
        vm.prank(reader2);
        usdc.approve(address(registry), type(uint256).max);

        vm.prank(reader);
        registry.purchase(CONTENT);
        vm.prank(reader2);
        registry.purchase(CONTENT);

        TollgateAccessRegistry.Content memory c = registry.getContent(CONTENT);
        assertEq(c.unlocks, 2);
        assertEq(c.revenue, uint256(PRICE) * 2);
    }

    function test_emptyCreator_returnsEmpty() public view {
        assertEq(registry.creatorContentCount(reader), 0);
        assertEq(registry.getCreatorContentIds(reader).length, 0);
    }

    // ------------------------------- fuzz ---------------------------------- //

    function testFuzz_purchase_feeMathNeverOverpays(uint128 price, uint16 bps) public {
        bps = uint16(bound(bps, 0, registry.MAX_FEE_BPS()));
        price = uint128(bound(price, 0, 1_000_000_000_000)); // up to $1M

        TollgateAccessRegistry r = new TollgateAccessRegistry(usdc, feeRecipient, bps);
        bytes32 id = keccak256(abi.encode(price, bps));
        vm.prank(creator);
        r.registerContent(id, price);

        address payer = makeAddr("fuzzPayer");
        usdc.mint(payer, price);
        vm.startPrank(payer);
        usdc.approve(address(r), price);
        r.purchase(id);
        vm.stopPrank();

        uint256 fee = (uint256(price) * bps) / 10_000;
        // creator + fee always equals price exactly: no dust, no overpay
        assertEq(usdc.balanceOf(creator) + usdc.balanceOf(feeRecipient), price);
        assertEq(r.creatorEarnings(creator), price - fee);
        assertLe(fee, price);
    }
}
