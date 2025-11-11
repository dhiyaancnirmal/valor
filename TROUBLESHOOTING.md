# Troubleshooting Guide - Valor App

## Authentication Issues

### "MiniKit is not installed" Error in Browser

**Solution**: This is expected behavior. The app has two login modes:

1. **World App Mode** (Production)
   - The green "Connect with World App" button
   - Only works when opened inside World App
   - Requires HTTPS (use ngrok)

2. **Dev Mode** (Browser Testing)
   - The gray "Dev Mode Login (Browser Testing)" button
   - Appears automatically when MiniKit is not detected
   - Creates a mock wallet address for testing
   - Works in any browser

**To test in browser**: Click the "Dev Mode Login (Browser Testing)" button.

### Cannot Login in World App

**Checklist**:

1. **HTTPS Required**
   ```bash
   # Make sure you're using ngrok
   ngrok http 3000

   # Update .env.local with the HTTPS URL
   AUTH_URL=https://your-ngrok-url.ngrok.io

   # Restart dev server
   npm run dev
   ```

2. **Verify World App ID**
   - Check that `NEXT_PUBLIC_APP_ID` in `.env.local` is correct
   - Get it from https://developer.worldcoin.org

3. **Check Console Logs**
   - Open World App developer console
   - Look for any MiniKit errors
   - Check network tab for failed requests

### "Authentication failed" Error

**Possible causes**:

1. **Signature Verification Failed**
   - Server signature verification accepts both HMAC and World App signatures
   - Check that `HMAC_SECRET_KEY` is set in `.env.local`

2. **Session Cookie Issues**
   - Clear browser cookies
   - Make sure `AUTH_URL` matches your current URL

3. **Network Issues**
   - Check that `/api/auth/callback/worldcoin` is accessible
   - Verify no CORS errors in console

## Location Issues

### "Please enable location services"

**Solutions**:

1. **Browser Settings**
   - Chrome: Settings → Privacy → Location
   - Safari: Preferences → Websites → Location
   - Grant permission for localhost or your ngrok URL

2. **System Settings**
   - macOS: System Preferences → Security & Privacy → Location Services
   - iOS: Settings → Privacy → Location Services
   - Android: Settings → Location

3. **Programmatic Check**
   ```javascript
   // Test if geolocation is available
   if (navigator.geolocation) {
     navigator.geolocation.getCurrentPosition(
       pos => console.log("Location:", pos.coords),
       err => console.error("Error:", err)
     )
   }
   ```

### "You must be within 500m of the gas station"

**Solutions**:

1. **Mock Location (Development)**
   - Chrome DevTools → Sensors → Location
   - Set custom coordinates near your test gas station

2. **Adjust Distance Check**
   - Edit `src/components/PriceEntryPage/index.tsx`
   - Change `if (distance > 500)` to a larger value for testing

## Google Maps Issues

### Map Not Loading

**Checklist**:

1. **API Key Valid**
   ```bash
   # Test your API key
   curl "https://maps.googleapis.com/maps/api/js?key=YOUR_KEY"
   ```

2. **Places API Enabled**
   - Go to Google Cloud Console
   - APIs & Services → Library
   - Search for "Places API"
   - Click "Enable"

3. **Billing Enabled**
   - Google Maps requires billing to be enabled
   - Add a payment method in Google Cloud Console

4. **Check API Restrictions**
   - Go to Credentials in Google Cloud Console
   - Check if your API key has HTTP referrer restrictions
   - Add your localhost and ngrok URLs

### "No gas stations found"

**Solutions**:

1. **Check Location**
   - Make sure your location is correct
   - Try searching in a different area

2. **Increase Search Radius**
   - Edit `src/components/NewUI/index.tsx`
   - Change `radius: 5000` to `radius: 10000` (10km)

3. **Check Console**
   - Look for Places API errors
   - Check if API quota exceeded

## Database Issues

### "Failed to save submission"

**Checklist**:

1. **Supabase Table Exists**
   ```sql
   -- Run in Supabase SQL Editor to check
   SELECT * FROM price_submissions LIMIT 1;
   ```

2. **RLS Disabled**
   ```sql
   -- Run to disable Row Level Security
   ALTER TABLE price_submissions DISABLE ROW LEVEL SECURITY;
   ```

3. **Connection String**
   - Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
   - Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct

### Photo Upload Failing

**Checklist**:

1. **Storage Bucket Exists**
   - Go to Supabase Dashboard
   - Storage → Check for "price-photos" bucket
   - Create if missing

2. **Policies Set**
   ```sql
   -- Allow public uploads
   CREATE POLICY "Public upload" ON storage.objects FOR INSERT
   WITH CHECK (bucket_id = 'price-photos');

   -- Allow public reads
   CREATE POLICY "Public read" ON storage.objects FOR SELECT
   USING (bucket_id = 'price-photos');
   ```

3. **File Size**
   - Default limit is 50MB
   - Check if your photo exceeds this

## Build Issues

### TypeScript Errors

**Common fixes**:

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Tailwind CSS Not Working

**Solutions**:

1. **Check PostCSS Config**
   - Verify `postcss.config.js` uses `@tailwindcss/postcss`

2. **Import Order**
   - Make sure `@import "tailwindcss"` is first in `globals.css`

3. **Restart Dev Server**
   ```bash
   # Kill and restart
   npm run dev
   ```

## Performance Issues

### Slow Map Loading

**Solutions**:

1. **Reduce Marker Count**
   - Limit number of gas stations displayed
   - Add pagination

2. **Optimize Images**
   - Compress gas station photos
   - Use Next.js Image component

3. **Cache Places Results**
   - Store nearby stations in localStorage
   - Refresh only when location changes significantly

## Network Issues

### CORS Errors

**Solutions**:

1. **Check AUTH_URL**
   - Must match the actual URL you're visiting
   - Include protocol (http:// or https://)

2. **NextAuth Configuration**
   - Verify `next-auth` is properly configured
   - Check callback URLs

### API Routes 404

**Solutions**:

1. **Restart Dev Server**
   ```bash
   # API routes may not hot-reload properly
   npm run dev
   ```

2. **Check File Structure**
   ```
   src/app/api/
   ├── auth/[...nextauth]/route.ts
   ├── submit-price/route.ts
   └── dev-signature/route.ts
   ```

## Still Having Issues?

### Debug Steps

1. **Check Environment Variables**
   ```bash
   # Print (sanitized) env vars
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_APP_ID
   # Never print secrets!
   ```

2. **Enable Verbose Logging**
   - Add `console.log` statements
   - Check browser console
   - Check terminal output

3. **Test in Isolation**
   - Test each feature separately
   - Comment out complex logic
   - Verify one component at a time

### Get Help

- Check Next.js docs: https://nextjs.org/docs
- Worldcoin Mini Apps: https://docs.worldcoin.org/mini-apps
- Supabase docs: https://supabase.com/docs
- Google Maps docs: https://developers.google.com/maps

### Create Minimal Reproduction

If you're filing a bug:

1. List exact steps to reproduce
2. Include error messages (full stack trace)
3. Share relevant code snippets
4. Specify environment (browser, OS, etc.)
5. Include screenshots if visual issue
