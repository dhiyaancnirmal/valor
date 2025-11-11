# Valor - Gas Price Crowdsourcing App

A Worldcoin Mini App for crowdsourcing gas station prices. Users can submit prices with photos and GPS coordinates, earning rewards for their contributions.

## Features

- **Worldcoin Authentication** - Secure login via World App wallet
- **Google Maps Integration** - Interactive map showing nearby gas stations
- **Price Submission** - Multi-step form with photo verification
- **Location Verification** - GPS-based distance checking (500m radius)
- **Three-Tab UI** - Map view, home feed, and wallet dashboard

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Authentication**: NextAuth.js v5 + Worldcoin MiniKit
- **Database**: Supabase (PostgreSQL + Storage)
- **Maps**: Google Maps API
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Prerequisites

Before you begin, make sure you have:

1. **Node.js 18+** installed
2. **Supabase account** (free tier works)
3. **Google Maps API key** with Places API enabled
4. **Worldcoin App ID** from the developer portal
5. **ngrok** or similar for HTTPS tunneling (required for World App)

## Environment Setup

Your `.env.local` file is already configured with the necessary variables:

```bash
# NextAuth Configuration
NEXTAUTH_SECRET=A2Q3wgYA2um9QQjmDyC8LnQNaHA279SumN4P1HT+VTk=
HMAC_SECRET_KEY=HVPl1JcjG8YBalUZM81hLOqdDz6GS/CmHxEvYo6X7dk=

# Auth URL (must be HTTPS for World App)
AUTH_URL=http://localhost:3000

# World ID Application ID
NEXT_PUBLIC_APP_ID=app_7d5ee2764124e1b071f3f0fd1dfb08d8

# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyC3yrpo7M4ASx2FHma8gBH9Yg3Gy-WIynE

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://wxiesgknwzgkvyosuwjn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Database Setup

Run this SQL in your Supabase SQL Editor:

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

-- Disable RLS for simplicity (or add policies)
ALTER TABLE price_submissions DISABLE ROW LEVEL SECURITY;

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('price-photos', 'price-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (allow public read/write)
CREATE POLICY "Public read" ON storage.objects FOR SELECT
USING (bucket_id = 'price-photos');

CREATE POLICY "Public upload" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'price-photos');
```

## Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Testing & Development

### Browser Testing (Dev Mode)

For quick development and testing in your browser:

1. Open `http://localhost:3000`
2. You'll see two login buttons:
   - **"Connect with World App"** (gray/disabled in browser)
   - **"Dev Mode Login (Browser Testing)"** (active in browser)
3. Click "Dev Mode Login" to test with a mock wallet
4. This creates a temporary wallet address for testing all features

### World App Testing (Production Mode)

World App requires HTTPS. Use ngrok to test the real authentication flow:

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Start your dev server
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update AUTH_URL in .env.local with this URL
# Restart dev server
```

Then open the ngrok HTTPS URL in World App to test real Worldcoin authentication.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth API routes
│   │   └── submit-price/         # Price submission API
│   ├── submit-price/             # Price submission page
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── auth/
│   ├── index.ts                  # NextAuth configuration
│   └── wallet/
│       └── verify.ts             # Signature verification
├── components/
│   ├── LoginPage/                # Authentication UI
│   ├── NewUI/                    # Main app UI (3 tabs)
│   ├── GoogleMap/                # Map component
│   ├── PriceEntryPage/           # Price submission form
│   └── providers/                # React context providers
├── lib/
│   ├── supabase.ts               # Supabase client
│   └── utils.ts                  # Utility functions
└── types/
    ├── index.ts                  # Type definitions
    └── next-auth.d.ts            # NextAuth type extensions
```

## Key Features Implementation

### Authentication Flow
1. User opens app in World App
2. MiniKit provides wallet address
3. HMAC signature verification
4. JWT session created

### Price Submission Flow
1. **Step 1**: Select fuel type (Regular, Premium, Diesel)
2. **Step 2**: Enter price per gallon
3. **Step 3**: Take photo (optional)
4. **Step 4**: Review and submit

### Location Verification
- User must be within 500m of the gas station
- GPS coordinates are verified server-side
- Distance calculated using Haversine formula

## API Routes

### POST `/api/submit-price`
Submit a new gas price entry.

**Form Data:**
- `user_wallet_address` - User's wallet address
- `gas_station_name` - Name of the gas station
- `gas_station_id` - Google Places ID
- `price` - Price per gallon
- `fuel_type` - Regular, Premium, or Diesel
- `user_latitude` - User's GPS latitude
- `user_longitude` - User's GPS longitude
- `gas_station_latitude` - Station's latitude
- `gas_station_longitude` - Station's longitude
- `photo` - Optional photo file

## Development Tips

1. **Test Authentication**: Use World App simulator or test in production World App
2. **Mock Location**: Use Chrome DevTools to override geolocation during development
3. **Debug API Routes**: Check `/api/submit-price` responses in Network tab
4. **Supabase Logs**: Monitor Supabase logs for database errors
5. **Google Maps**: Ensure Places API is enabled in Google Cloud Console

## Common Issues

### "Please open this app in World App"
- Make sure you're testing inside World App or have MiniKit properly initialized
- Check that `NEXT_PUBLIC_APP_ID` is set correctly

### "Location not available"
- Enable location services in your browser/device
- Grant location permissions to the app

### Google Maps not loading
- Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is correct
- Enable Places API in Google Cloud Console
- Check for API key restrictions

### Photo upload failing
- Verify Supabase storage bucket is created
- Check storage policies allow public uploads
- Ensure bucket name is `price-photos`

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Update AUTH_URL to your Vercel URL
```

### Environment Variables for Production
Make sure to set all environment variables in your deployment platform:
- `NEXTAUTH_SECRET`
- `HMAC_SECRET_KEY`
- `AUTH_URL` (your production URL)
- `NEXT_PUBLIC_APP_ID`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Next Steps

1. **Rewards System**: Implement WLD token rewards for submissions
2. **Price History**: Show historical price trends
3. **User Profiles**: Display user stats and rankings
4. **Verification**: Add community voting for price accuracy
5. **Notifications**: Push notifications for price changes

## License

MIT

## Support

For issues or questions:
- GitHub Issues: [Create an issue]
- Worldcoin Docs: https://docs.worldcoin.org/mini-apps
- Supabase Docs: https://supabase.com/docs
