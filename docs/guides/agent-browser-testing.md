# Agent Browser Testing Runbook

Use this runbook to validate mini-app flows in a normal browser (outside World App).

## 1) Enable local bypass
Set in `.env.local`:

```env
ENABLE_DEV_AUTH=true
NEXT_PUBLIC_ENABLE_DEV_AUTH=true
NEXT_PUBLIC_WORLD_DEV_BYPASS=true
```

This keeps production behavior intact while allowing local browser testing.

## 2) Start app
```bash
npm run dev:browser
```

## 3) Validate key flows with `agent-browser`

Open app:
```bash
agent-browser open http://localhost:3000/en
agent-browser snapshot -i
```

Login in dev mode:
```bash
agent-browser find text "Login (Dev Mode)" click
agent-browser wait --url "**/en"
```

Check tabs and map/home/wallet rendering:
```bash
agent-browser snapshot -i
agent-browser find text "Map" click
agent-browser find text "Home" click
agent-browser find text "Wallet" click
```

Capture screenshots:
```bash
agent-browser screenshot public/showcase/dev-home.png
agent-browser find text "Map" click
agent-browser screenshot public/showcase/dev-map.png
agent-browser find text "Wallet" click
agent-browser screenshot public/showcase/dev-wallet.png
```

## Notes
- Claim flow uses a dev-only simulated success path when MiniKit is unavailable.
- Wallet auth and transaction signing remain real only inside World App.
