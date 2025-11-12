#!/bin/bash
echo "Starting Cloudflare Tunnel..."
echo "Your URL will appear below:"
echo ""
cloudflared tunnel --url http://localhost:3000
