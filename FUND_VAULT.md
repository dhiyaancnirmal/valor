# How to Fund the RewardVault Contract

The RewardVault contract needs USDC tokens to pay out rewards. Here's how to fund it:

## Contract Details
- **Vault Address**: `0x0C536573b70663e8819f344ae60dfcDeF2c37467`
- **USDC Address (World Chain)**: `0x79A02482A880bCE3F13e09Da970dC34db4CD24d1`
- **USDC Decimals**: 6

## Option 1: Using Foundry Script (Recommended)

1. Set the amount you want to fund (in smallest USDC units):
   ```bash
   # Example: 100 USDC = 100 * 10^6 = 100000000
   export FUND_AMOUNT=100000000
   ```

2. Run the funding script:
   ```bash
   ~/.foundry/bin/forge script script/FundVault.s.sol:FundVaultScript \
     --rpc-url https://worldchain-mainnet.g.alchemy.com/v2/vJp-om_ZDiQBX0HAzO5F2 \
     --broadcast \
     --private-key $(cat .env | grep PRIVATE_KEY | cut -d '=' -f2)
   ```

## Option 2: Using Block Explorer

1. Go to World Chain block explorer
2. Navigate to USDC contract: `0x79A02482A880bCE3F13e09Da970dC34db4CD24d1`
3. Connect your wallet (deployer wallet)
4. Call `transfer` function:
   - `to`: `0x0C536573b70663e8819f344ae60dfcDeF2c37467` (vault address)
   - `value`: Amount in smallest units (e.g., 100000000 for 100 USDC)

## Option 3: Using viem/TypeScript

You can also create a simple Node.js script to fund the vault using viem.

## Recommended Funding Amount

Based on your reward system:
- Daily budget: 0.5 USDC spread across all submissions
- If you expect ~100 submissions/day: ~50 USDC/day
- Recommended: Fund with **500-1000 USDC** for ~10-20 days of rewards

## Verify Funding

After funding, check the vault balance:
```bash
# Using cast (Foundry)
cast call 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1 \
  "balanceOf(address)(uint256)" \
  0x0C536573b70663e8819f344ae60dfcDeF2c37467 \
  --rpc-url https://worldchain-mainnet.g.alchemy.com/v2/vJp-om_ZDiQBX0HAzO5F2
```

Or check on the block explorer by viewing the USDC balance of the vault address.
