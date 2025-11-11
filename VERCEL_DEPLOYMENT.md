# Vercel Deployment Guide

This document outlines all environment variables required for deploying this Next.js app to Vercel.

## How to Add Environment Variables in Vercel

1. Go to your project in the Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable below for **Production**, **Preview**, and **Development** environments (or as needed)
4. After adding variables, redeploy your application

---

## Required Environment Variables

### 🔐 Authentication & Security (Server-Only)

These are **secret** variables that should **NOT** be prefixed with `NEXT_PUBLIC_`:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_SECRET` | Secret key for NextAuth JWT signing. Generate a random string. | `A2Q3wgYA2um9QQjmDyC8LnQNaHA279SumN4P1HT+VTk=` |
| `HMAC_SECRET_KEY` | Secret key for HMAC signature verification. Generate a random string. | `HVPl1JcjG8YBalUZM81hLOqdDz6GS/CmHxEvYo6X7dk=` |
| `AUTH_URL` | Your production app URL (must be HTTPS). Set this to your Vercel deployment URL. | `https://your-app.vercel.app` |

### 🌍 Worldcoin Configuration

| Variable | Type | Description | Where to Get |
|----------|------|-------------|--------------|
| `NEXT_PUBLIC_APP_ID` | Public | Worldcoin App ID | [World Developer Portal](https://developer.worldcoin.org) |
| `APP_ID` | Server-Only | Same as above (for API routes) | Same as above |
| `DEV_PORTAL_API_KEY` | Server-Only | Worldcoin Developer Portal API key | [World Developer Portal](https://developer.worldcoin.org) |

### 🗺️ Google Maps

| Variable | Type | Description | Where to Get |
|----------|------|-------------|--------------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Public | Google Maps API key with Places API enabled | [Google Cloud Console](https://console.cloud.google.com) |

### 🗄️ Supabase Configuration

| Variable | Type | Description | Where to Get |
|----------|------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Your Supabase project URL | [Supabase Dashboard](https://supabase.com) → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anonymous/public key | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-Only | Supabase service role key (for admin operations) | Same as above → **Service Role** key (keep secret!) |

### 💰 Blockchain Rewards (Optional)

These are optional if you're not using the rewards system:

| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `REWARD_CONTRACT_ADDRESS` | Server-Only | Smart contract address for rewards | None |
| `NEXT_PUBLIC_REWARD_CONTRACT_ADDRESS` | Public | Same as above (for client-side) | None |
| `REWARD_SIGNER_PRIVATE_KEY` | Server-Only | Private key (0x-prefixed hex) for signing reward claims | None |
| `REWARD_AMOUNT_USDC` | Server-Only | Reward amount in USDC (6 decimals). Default: 500000 (0.5 USDC) | `500000` |

---

## Complete Environment Variables Checklist

Copy this list and check off each variable as you add it to Vercel:

### Required for Basic Functionality
- [ ] `NEXTAUTH_SECRET` (generate new random string)
- [ ] `HMAC_SECRET_KEY` (generate new random string)
- [ ] `AUTH_URL` (set to your Vercel URL: `https://your-app.vercel.app`)
- [ ] `NEXT_PUBLIC_APP_ID`
- [ ] `APP_ID` (same value as `NEXT_PUBLIC_APP_ID`)
- [ ] `DEV_PORTAL_API_KEY`
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

### Optional (Rewards System)
- [ ] `REWARD_CONTRACT_ADDRESS`
- [ ] `NEXT_PUBLIC_REWARD_CONTRACT_ADDRESS` (same as above)
- [ ] `REWARD_SIGNER_PRIVATE_KEY` (0x + 64 hex chars)
- [ ] `REWARD_AMOUNT_USDC` (optional, defaults to 500000)

---

## Generating Secrets

### Generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### Generate `HMAC_SECRET_KEY`:
```bash
openssl rand -base64 32
```

---

## Important Notes

1. **Public vs Private Variables**: 
   - Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
   - Variables without this prefix are server-only and kept secret

2. **AUTH_URL**: 
   - Must be HTTPS in production
   - Set this to your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
   - Vercel provides this automatically, but you can also set it manually

3. **After Adding Variables**:
   - Variables are only available after redeploying
   - Go to **Deployments** → Click **⋯** → **Redeploy**

4. **Environment-Specific Values**:
   - You can set different values for Production, Preview, and Development
   - Use Production values for your main deployment

---

## Verification

After deployment, you can verify your environment variables are set correctly by:

1. Visiting: `https://your-app.vercel.app/api/test-env`
2. This endpoint will show which variables are present (without exposing their values)

---

## Troubleshooting

### Variables not working?
- Make sure you've redeployed after adding variables
- Check that variable names match exactly (case-sensitive)
- Verify `NEXT_PUBLIC_` prefix is correct for client-side variables

### Build errors?
- Ensure all required variables are set
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set (not just the anon key)
- Verify `REWARD_SIGNER_PRIVATE_KEY` is 0x-prefixed hex (66 characters total)

### Runtime errors?
- Check Vercel function logs: **Deployments** → Click deployment → **Functions** tab
- Verify database connections work with your Supabase credentials
- Ensure Google Maps API key has Places API enabled

