// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {MeterRegistry} from "../MeterRegistry.sol";

/**
 * @title DeployMeterRegistry
 * @notice Forge deploy script for MeterRegistry on Arc mainnet.
 *
 * Usage (run from repo root):
 *
 *   forge script contracts/script/DeployMeterRegistry.s.sol:DeployMeterRegistry \
 *     --rpc-url https://rpc.mainnet.arc.io \
 *     --broadcast \
 *     --private-key $PRIVATE_KEY
 *
 * The USDC address on Arc mainnet is 0x3600000000000000000000000000000000000000.
 * No constructor args beyond the USDC address are needed.
 *
 * After deployment:
 *   1. Copy the deployed address from the output below.
 *   2. Paste it into src/contracts/meter-registry.ts as METER_REGISTRY_ADDRESS.
 *   3. Register your "random fact" endpoint on the live contract.
 */
contract DeployMeterRegistry is Script {
    // Arc mainnet USDC (ERC-20 view, 6 decimals)
    address constant ARC_MAINNET_USDC = 0x3600000000000000000000000000000000000000;

    function run() external returns (MeterRegistry registry) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deployer:     ", deployer);
        console.log("USDC address: ", ARC_MAINNET_USDC);

        vm.startBroadcast(deployerPrivateKey);

        registry = new MeterRegistry(ARC_MAINNET_USDC);

        vm.stopBroadcast();

        console.log("MeterRegistry deployed at:", address(registry));
        console.log("Verify on explorer: https://explorer.arc.io/address/%s", address(registry));
    }
}
