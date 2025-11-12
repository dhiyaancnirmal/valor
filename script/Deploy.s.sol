// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/RewardVault.sol";

contract DeployScript is Script {
    function run() external {
        // Load private key from environment
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        // Addresses from your constructor
        address usdc = 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1;
        address signer = 0x94b381D02e57E7fbfbE8687568cA96d619078Adb;

        vm.startBroadcast(deployerKey);
        RewardVault vault = new RewardVault(usdc, signer);
        console.log("RewardVault deployed at:");
        console.logAddress(address(vault));
        vm.stopBroadcast();
    }
}
