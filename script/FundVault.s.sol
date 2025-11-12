// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

contract FundVaultScript is Script {
    function run() external {
        // Load private key from environment
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        
        // Contract addresses
        address usdc = 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1;
        address vault = 0x0C536573b70663e8819f344ae60dfcDeF2c37467;
        
        // Amount to fund (in USDC with 6 decimals)
        // Example: 100 USDC = 100 * 10^6 = 100000000
        uint256 amount = vm.envUint("FUND_AMOUNT"); // Amount in smallest USDC units (6 decimals)
        
        vm.startBroadcast(deployerKey);
        
        IERC20 usdcToken = IERC20(usdc);
        
        // Check deployer balance
        uint256 deployerBalance = usdcToken.balanceOf(msg.sender);
        console.log("Deployer USDC balance:", deployerBalance);
        console.log("Amount to transfer:", amount);
        
        require(deployerBalance >= amount, "Insufficient USDC balance");
        
        // Transfer USDC to vault
        bool success = usdcToken.transfer(vault, amount);
        require(success, "USDC transfer failed");
        
        // Verify vault balance
        uint256 vaultBalance = usdcToken.balanceOf(vault);
        console.log("Vault USDC balance after funding:", vaultBalance);
        
        vm.stopBroadcast();
    }
}

