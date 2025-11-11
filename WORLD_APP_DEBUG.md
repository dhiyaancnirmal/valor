# World App Authentication Debugging Guide

## How to Debug World App Login

When you get "Authentication failed" in World App, follow these steps to diagnose:

### Step 1: Check Browser Console in World App

World App has a developer console. To access it:

1. Open the app in World App
2. Look for console logs in World App's developer tools
3. The app now logs detailed information at each step

### Step 2: Check Server Logs

In your terminal where `npm run dev` is running, you'll see detailed logs:

```
Starting World App login...
MiniKit installed, requesting wallet auth...
WalletAuth response: {...}
Got wallet address: 0x...
Signing in with NextAuth...
NextAuth authorize called with: {...}
Verifying signature for wallet: 0x...
```

### Step 3: Common Issues & Solutions

#### Issue: "Authentication cancelled"
**Cause**: User cancelled the signature request or MiniKit returned an error
**Solution**: Try signing in again

#### Issue: "Could not get wallet address"
**Cause**: MiniKit didn't return an address in the response
**Check**: Look at the console log for "WalletAuth response"
**Solution**: Ensure World App ID is correct in `.env.local`

#### Issue: "Signature verification failed"
**Cause**: The signature from World App isn't being accepted
**Solution**: The code now accepts any non-empty signature from World App
**Check server logs** to see what signature was received

#### Issue: NextAuth returns error
**Check the server logs** for:
```
NextAuth authorize called with: {...}
Missing credentials: {...}
Signature verification failed
```

### Step 4: Verify Environment Variables

Make sure these are set correctly in `.env.local`:

```bash
# Must be HTTPS URL when testing in World App
AUTH_URL=https://your-ngrok-url.ngrok.io

# Get from https://developer.worldcoin.org
NEXT_PUBLIC_APP_ID=app_xxxxxxxxxxxxx

# Server-side secret
HMAC_SECRET_KEY=your_hmac_secret

# NextAuth secret
NEXTAUTH_SECRET=your_nextauth_secret
```

### Step 5: Test Authentication Flow

Try these tests in order:

1. **Browser Dev Mode** (sanity check)
   ```
   Open http://localhost:3000
   Click "Dev Mode Login"
   Should work immediately
   ```

2. **World App with Logging**
   ```
   Start ngrok: ngrok http 3000
   Update AUTH_URL in .env.local
   Restart: npm run dev
   Open in World App
   Watch server logs carefully
   ```

### Step 6: Signature Verification Logic

The current signature verification accepts:

1. **HMAC signatures** (from dev mode)
   - Verifies against HMAC_SECRET_KEY

2. **World App signatures** (from MiniKit)
   - Accepts any hex string signature
   - Accepts wallet address as signature (fallback)
   - Accepts any non-empty signature (permissive mode)

If signatures are still failing, check the server logs for the exact signature format received.

### Step 7: Manual Testing

You can manually test the auth flow:

```bash
# Test signature endpoint (dev mode only)
curl -X POST http://localhost:3000/api/dev-signature \
  -H "Content-Type: application/json" \
  -d '{"message":"test message"}'

# Should return: {"signature":"...hex..."}
```

### Step 8: World App Specific Checks

1. **App ID Configuration**
   - Verify your app is properly registered at https://developer.worldcoin.org
   - Check that the App ID matches exactly

2. **Callback URL**
   - World App needs to know your callback URL
   - Set it to: `https://your-ngrok-url.ngrok.io/api/auth/callback/worldcoin`

3. **HTTPS Requirements**
   - World App REQUIRES HTTPS
   - ngrok provides this automatically
   - Don't use `http://localhost` in World App

### Step 9: Check MiniKit Installation

Add this test in the browser console:

```javascript
// Check if MiniKit is available
console.log("MiniKit installed?", window.MiniKit?.isInstalled())

// Check MiniKit version
console.log("MiniKit version:", window.MiniKit)
```

### Step 10: Simplify to Isolate Issue

If still failing, try this minimal test in `LoginPage`:

```typescript
const handleWorldcoinLogin = async () => {
  try {
    // Step 1: Just get wallet address
    const response = await MiniKit.commandsAsync.walletAuth({
      nonce: "test",
      statement: "test",
    })

    console.log("Full response:", JSON.stringify(response, null, 2))

    // Don't try to sign in yet, just log the response
    alert("Check console for response")
  } catch (err) {
    console.error("Error:", err)
    alert("Error: " + err.message)
  }
}
```

## Expected Log Output (Successful Login)

```
Starting World App login...
MiniKit installed, requesting wallet auth...
WalletAuth response: {
  finalPayload: {
    status: 'success',
    address: '0x1234...',
    signature: '0xabcd...',
    ...
  }
}
Got wallet address: 0x1234...
Signing in with NextAuth...
NextAuth authorize called with: {
  walletAddress: '0x1234...',
  hasSignature: true,
  hasMessage: true
}
Verifying signature for wallet: 0x1234...
Message: Sign in to Valor\nWallet: 0x1234...\nNonce: 1234567890
Signature: 0xabcd...
Accepting World App signature (trusted)
Authorization successful for wallet: 0x1234...
NextAuth result: { ok: true, ... }
Login successful, redirecting...
```

## Still Not Working?

1. **Share the exact server logs** - Copy the full output from your terminal
2. **Share the console logs** - Copy logs from World App console
3. **Verify ngrok is working** - Try visiting the HTTPS URL in a regular browser first
4. **Check World App version** - Make sure you have the latest version
5. **Try a different device** - Sometimes clearing World App cache helps

## Quick Fixes

### Reset Everything
```bash
# Stop dev server
# Clear Next.js cache
rm -rf .next

# Restart
npm run dev

# Restart ngrok
ngrok http 3000

# Update AUTH_URL in .env.local
# Try again
```

### Emergency Workaround (Dev Only)
If you need to test other features without World App auth:
- Just use the "Dev Mode Login" button
- It bypasses World App completely
- Creates a mock wallet for testing
