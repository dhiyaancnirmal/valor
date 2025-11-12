#!/bin/bash
pkill -f cloudflared
sleep 1
echo "Starting Cloudflare Tunnel..."
echo "=================================="
cloudflared tunnel --url http://localhost:3000 2>&1 | tee /tmp/cloudflared.log &
TUNNEL_PID=$!
sleep 5
URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/cloudflared.log | head -1)
if [ -n "$URL" ]; then
  echo ""
  echo "=================================="
  echo "✅ Tunnel URL: $URL"
  echo "=================================="
  echo ""
  echo "Update your AUTH_URL in .env.local:"
  echo "AUTH_URL=$URL"
  echo ""
  echo "Tunnel is running in background (PID: $TUNNEL_PID)"
  echo "Press Ctrl+C to stop"
  wait $TUNNEL_PID
else
  echo "Could not extract URL. Check /tmp/cloudflared.log"
  tail -20 /tmp/cloudflared.log
fi

