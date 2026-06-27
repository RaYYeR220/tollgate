// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TollgateAccessRegistry} from "../src/TollgateAccessRegistry.sol";

/// @notice Deploys TollgateAccessRegistry. Defaults the settlement token to native USDC on
///         Arbitrum One; override with env vars for other networks or a local mock.
///
/// Usage:
///   forge script script/Deploy.s.sol:Deploy \
///     --rpc-url arbitrum --account <keystore> --broadcast --verify
contract Deploy is Script {
    /// @dev Circle's native USDC on Arbitrum One (NOT bridged USDC.e).
    address constant ARBITRUM_USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;

    function run() external returns (TollgateAccessRegistry registry) {
        address usdc = vm.envOr("PAYMENT_TOKEN", ARBITRUM_USDC);
        address feeRecipient = vm.envOr("FEE_RECIPIENT", msg.sender);
        uint16 feeBps = uint16(vm.envOr("FEE_BPS", uint256(250)));

        vm.startBroadcast();
        registry = new TollgateAccessRegistry(IERC20(usdc), feeRecipient, feeBps);
        vm.stopBroadcast();

        console.log("TollgateAccessRegistry deployed:", address(registry));
        console.log("  paymentToken:", usdc);
        console.log("  feeRecipient:", feeRecipient);
        console.log("  feeBps:", feeBps);
    }
}
