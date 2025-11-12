// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../RewardVault.sol";

contract MockUSDC {
    string public constant name = "MockUSDC";
    string public constant symbol = "USDC";
    uint8 public constant decimals = 6;
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        require(balanceOf[msg.sender] >= value, "bal");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        return true;
    }
}

contract RewardVaultTest {
    MockUSDC usdc;
    RewardVault vault;

    function setUp() public {
        usdc = new MockUSDC();
        vault = new RewardVault(address(usdc), address(this));
        usdc.mint(address(vault), 1_000_000_000);
    }
}



