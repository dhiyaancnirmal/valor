# Quick Start Guide - Valor App

Get up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Supabase account (free tier)
- Google Maps API key
- Worldcoin App ID

## Step 1: Database Setup (2 minutes)

1. Go to [supabase.com](https://supabase.com) and sign in
2. Your project is already configured in `.env.local`
3. Open your project's SQL Editor
4. Copy and paste this SQL:

```sql
-- Create price_submissions table
CREATE TABLE price_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet_address TEXT NOT NULL,
  gas_station_name TEXT NOT NULL,
  gas_station_id TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  fuel_type TEXT NOT NULL,
  user_latitude DECIMAL(10,7) NOT NULL,
  user_longitude DECIMAL(10,7) NOT NULL,
  gas_station_latitude DECIMAL(10,7),
  gas_station_longitude DECIMAL(10,7),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS
ALTER TABLE price_submissions DISABLE ROW LEVEL SECURITY;

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('price-photos', 'price-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read" ON storage.objects FOR SELECT
USING (bucket_id = 'price-photos');

CREATE POLICY "Public upload" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'price-photos');
```

5. Click "Run" to execute

## Step 2: Install Dependencies (1 minute)

```bash
npm install
```

## Step 3: Start Development Server (1 minute)

```bash
npm run dev
```

Your app is now running at `http://localhost:3000`!

## Step 4: HTTPS Setup for World App Testing (2 minutes)

World App requires HTTPS. Use ngrok:

```bash
# Install ngrok (one-time)
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Start ngrok in a new terminal
ngrok http 3000

# You'll see output like:
# Forwarding https://abc123.ngrok.io -> http://localhost:3000

# Copy the HTTPS URL and update .env.local:
AUTH_URL=https://abc123.ngrok.io
```

Restart your dev server after updating `AUTH_URL`.

## Testing the App

### In Browser (Development)
1. Open `http://localhost:3000`
2. You'll see the login page
3. Note: Full Worldcoin auth only works in World App

### In World App (Production Testing)
1. Open World App on your phone
2. Navigate to your ngrok HTTPS URL
3. Click "Connect with World App"
4. Grant location permissions
5. Browse nearby gas stations
6. Submit a price!

## Project Structure

```
valor/
├── src/
│   ├── app/              # Next.js app routes
│   ├── components/       # React components
│   ├── auth/            # Authentication logic
│   ├── lib/             # Utilities (Supabase, helpers)
│   └── types/           # TypeScript definitions
├── .env.local           # Environment variables
├── README.md            # Full documentation
└── QUICKSTART.md        # This file
```

## Key Features

### Authentication
- Worldcoin wallet-based login
- Secure JWT sessions
- HMAC signature verification

### Main UI
- **Map Tab**: Interactive Google Maps with gas station markers
- **Home Tab**: List view of nearby stations
- **Wallet Tab**: User profile and stats

### Price Submission
- 4-step process: Fuel type → Price → Photo → Review
- GPS verification (must be within 500m)
- Photo upload to Supabase Storage
- Real-time location tracking

## Common Issues

### "Please enable location services"
- Grant location permissions in your browser/phone
- Check that GPS is enabled

### "Please open this app in World App"
- This is expected in browser development mode
- For full testing, use World App with ngrok HTTPS URL

### Google Maps not loading
- Check that `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is correct
- Enable Places API in Google Cloud Console
- Verify no API key restrictions block your domain

### Build errors
- Run `npm run build` to check for TypeScript errors
- Make sure all environment variables are set

## Next Steps

1. **Deploy to Production**
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Add Rewards System**
   - Integrate Worldcoin payments
   - Set up WLD token rewards
   - Create user leaderboard

3. **Enhance Features**
   - Price history charts
   - User ratings and reviews
   - Push notifications
   - Community verification

## Need Help?

- Check the full [README.md](./README.md)
- Review Worldcoin docs: https://docs.worldcoin.org/mini-apps
- Check Supabase docs: https://supabase.com/docs

## Environment Variables Reference

```bash
# Required variables in .env.local:
NEXTAUTH_SECRET=              # Random secret for JWT
HMAC_SECRET_KEY=              # Random secret for signatures
AUTH_URL=                     # Your app URL (HTTPS for World App)
NEXT_PUBLIC_APP_ID=           # Worldcoin App ID
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=  # Google Maps API key
NEXT_PUBLIC_SUPABASE_URL=     # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon key
```

All variables are already configured in your `.env.local` file!

---

**Happy coding!** 🚀
