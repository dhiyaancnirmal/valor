-- Reward tracking columns for price submissions
ALTER TABLE price_submissions ADD COLUMN IF NOT EXISTS reward_eligible BOOLEAN DEFAULT false;
ALTER TABLE price_submissions ADD COLUMN IF NOT EXISTS reward_claimed BOOLEAN DEFAULT false;
ALTER TABLE price_submissions ADD COLUMN IF NOT EXISTS reward_signature TEXT;
ALTER TABLE price_submissions ADD COLUMN IF NOT EXISTS reward_tx_hash TEXT;
ALTER TABLE price_submissions ADD COLUMN IF NOT EXISTS reward_claimed_at TIMESTAMP WITH TIME ZONE;

-- Helpful index for cooldown checks (one reward per station per 24h)
CREATE INDEX IF NOT EXISTS idx_station_timestamp ON price_submissions(gas_station_id, created_at DESC);



