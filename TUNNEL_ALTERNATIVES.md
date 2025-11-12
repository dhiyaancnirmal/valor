# Tunnel Alternatives for Local Development

Since ngrok has monthly limits, here are free alternatives:

## 1. Cloudflare Tunnel (Recommended) ✅

**Pros:**
- Free and unlimited
- No account required for basic use
- Fast and reliable
- HTTPS by default

**Usage:**
```bash
# Install (if not already installed)
brew install cloudflare/cloudflare/cloudflared

# Start tunnel
cloudflared tunnel --url http://localhost:3000
```

The URL will be displayed in the terminal (format: `https://xxxxx.trycloudflare.com`)

**Update AUTH_URL:**
```
AUTH_URL=https://xxxxx.trycloudflare.com
```

## 2. localtunnel

**Install:**
```bash
npm install -g localtunnel
```

**Usage:**
```bash
lt --port 3000
```

## 3. VS Code Port Forwarding

If using VS Code, you can use built-in port forwarding:
1. Open Command Palette (Cmd+Shift+P)
2. Search "Ports: Focus on Ports View"
3. Forward port 3000
4. Make it public

## 4. Serveo (SSH-based)

**Usage:**
```bash
ssh -R 80:localhost:3000 serveo.net
```

## Current Setup

Currently using **Cloudflare Tunnel** - check the terminal output for the URL.

