# Worldcoin Contract Whitelisting Guide

## Problem: "invalid_contract" Error

If you're getting an `invalid_contract` error when trying to claim rewards, it means your RewardVault contract address needs to be whitelisted in the Worldcoin Developer Portal.

According to the [Worldcoin documentation](https://docs.world.org/mini-apps/reference/errors):
> **invalid_contract**: App must whitelist the contract you're calling in the Developer Portal. Go to the Developer Portal and whitelist the contract you're calling.

## Solution: Whitelist Your Contract

### Step 1: Get Your Contract Address

Your RewardVault contract address is:
```
0x0C536573b70663e8819f344ae60dfcDeF2c37467
```

This address is configured in your environment variables as `REWARD_CONTRACT_ADDRESS`.

### Step 2: Access Worldcoin Developer Portal

1. Go to the [Worldcoin Developer Portal](https://developer.worldcoin.org/)
2. Log in with your account
3. Select your Mini App (App ID: `app_4d2a86df807eaa9553a851ea9adce618`)

### Step 3: Whitelist the Contract

1. Navigate to your app's settings or configuration page
2. Look for a section related to "Contract Whitelisting", "Allowed Contracts", or "Smart Contracts"
3. Add your RewardVault contract address: `0x0C536573b70663e8819f344ae60dfcDeF2c37467`
4. Save the changes

### Step 4: Verify

After whitelisting:
1. Wait a few minutes for the changes to propagate
2. Try claiming rewards again in your app
3. The `invalid_contract` error should be resolved

## Additional Notes

- The contract must be deployed on World Chain (mainnet)
- Only whitelisted contracts can be called via MiniKit's `sendTransaction` command
- This is a security measure to prevent malicious contracts from being called through World App

## Troubleshooting

If you still see the error after whitelisting:
1. Verify the contract address is correct (check `REWARD_CONTRACT_ADDRESS` env var)
2. Ensure you're using the correct app ID in the Developer Portal
3. Wait a few minutes for changes to take effect
4. Check that the contract is deployed on World Chain mainnet (not testnet)

## Related Documentation

- [Worldcoin Mini Apps Errors](https://docs.world.org/mini-apps/reference/errors)
- [Send Transaction Command](https://docs.world.org/mini-apps/commands/send-transaction)

