# Testing the Reward System

## Prerequisites
- ✅ Contract deployed at `0x0C536573b70663e8819f344ae60dfcDeF2c37467`
- ✅ Contract funded with USDC
- ✅ Environment variables set in Vercel
- ✅ App deployed to Vercel
- ✅ Database tables created (`price_submissions`, `reward_transactions`)

## Step 1: Test Price Submission

1. **Open your app** in World App or browser
   - URL: `https://valaa.vercel.app` (or your Vercel URL)

2. **Login** with your wallet

3. **Submit a price**:
   - Select a gas station
   - Choose fuel type
   - Enter price
   - (Optional) Add photo
   - Submit

4. **Verify submission**:
   - Should see success message
   - Check Supabase `price_submissions` table - should have new record

## Step 2: Verify Reward Accrual

1. **Check database**:
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM reward_transactions 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```
   
   Should see:
   - `accrued_amount` > 0
   - `paid` = false
   - `reward_period_date` = today's UTC date (YYYY-MM-DD)
   - `gas_station_id` matches the station you submitted

2. **Check wallet page**:
   - Go to Wallet tab in the app
   - Should see accrued USDC amount
   - Should show submission count
   - Should show "Payout at 12:00 AM UTC" message

3. **Check API directly**:
   ```bash
   # Get your wallet address from the session
   curl https://your-app.vercel.app/api/wallet/rewards \
     -H "Cookie: your-session-cookie"
   ```
   
   Should return:
   ```json
   {
     "totalAccrued": "500000",  // in smallest units
     "totalUSDC": 0.5,          // in USDC
     "submissionCount": 1
   }
   ```

## Step 3: Test Multiple Submissions

1. **Submit prices from different stations** (or same station multiple times)
   - Each submission should accrue a reward
   - Rewards are calculated based on total submissions per station per day

2. **Verify reward calculation**:
   - Stations with fewer submissions = higher reward per person
   - Total daily budget: 0.5 USDC spread across all submissions

3. **Check wallet again**:
   - Should see updated total accrued amount
   - Submission count should increase

## Step 4: Test Payout API Manually

**Important**: Only test with transactions from YESTERDAY or earlier (payout processes previous day's rewards)

1. **Create test data** (if needed):
   ```sql
   -- Update a reward_transaction to yesterday's date
   UPDATE reward_transactions 
   SET reward_period_date = CURRENT_DATE - INTERVAL '1 day',
       paid = false
   WHERE id = (SELECT id FROM reward_transactions LIMIT 1);
   ```

2. **Call payout API**:
   ```bash
   curl -X POST https://your-app.vercel.app/api/payout-rewards \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     -H "Content-Type: application/json"
   ```

3. **Verify response**:
   ```json
   {
     "success": true,
     "message": "Payout processed successfully",
     "payoutDate": "2025-01-XX",
     "totalUsers": 1,
     "totalSubmissions": 1,
     "totalAmount": "500000",
     "txHash": "0x..."
   }
   ```

4. **Check database**:
   ```sql
   SELECT * FROM reward_transactions 
   WHERE reward_period_date = CURRENT_DATE - INTERVAL '1 day';
   ```
   
   Should see:
   - `paid` = true
   - `paid_at` = timestamp
   - `payout_tx_hash` = transaction hash

5. **Verify on blockchain**:
   - Go to World Chain block explorer
   - Search for the transaction hash
   - Should see USDC transfer from vault to recipient

## Step 5: Verify Cron Job

1. **Check Vercel Dashboard**:
   - Go to Settings → Cron Jobs
   - Should see: `/api/payout-rewards` scheduled for `0 0 * * *`

2. **Wait for midnight UTC** (or test manually as above)

3. **Check logs**:
   - Go to Vercel Dashboard → Deployments → Functions
   - Check logs for `/api/payout-rewards`
   - Should see payout processing logs

## Step 6: End-to-End Test

1. **Day 1**: Submit multiple prices
   - Verify rewards accrue
   - Check wallet shows correct amounts

2. **Day 2 (after midnight UTC)**:
   - Cron job should automatically run
   - Check database - transactions should be marked as paid
   - Check blockchain - USDC should be transferred
   - Check wallet - accrued amount should reset (or show new day's accruals)

## Troubleshooting

### No rewards accruing?
- Check `/api/submit-price` logs in Vercel
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check database connection

### Payout failing?
- Check contract has USDC balance
- Verify `PRIVATE_KEY` (deployer) is correct
- Verify `REWARD_SIGNER_PRIVATE_KEY` is correct
- Check RPC URL is accessible
- Check transaction logs in Vercel

### Wallet not showing rewards?
- Check `/api/wallet/rewards` endpoint
- Verify user is authenticated
- Check database has `reward_transactions` for that user

### Contract transfer failing?
- Verify vault has USDC balance
- Check recipient address is valid
- Verify amounts are correct (6 decimals)

## Quick Test Checklist

- [ ] Submit a price → Success
- [ ] Check database → `reward_transaction` created
- [ ] Check wallet tab → Shows accrued USDC
- [ ] Submit another price → Reward accrues
- [ ] Test payout API manually → Success
- [ ] Verify database → Transaction marked as paid
- [ ] Verify blockchain → USDC transferred
- [ ] Check cron job → Configured correctly

