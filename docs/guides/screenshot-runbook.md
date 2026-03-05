# Screenshot Runbook (World App)

Use this runbook to capture the final Valor screenshots in the real World App.

## Prereqs
- App running with HTTPS tunnel and valid `AUTH_URL`.
- Logged in to World App.
- `Capture mode` enabled in Settings (masks profile/wallet details).

## Capture standards
- Portrait screenshots only.
- Keep status bar visible.
- Wait for all loaders to finish.
- No keyboard open.
- Keep each screen centered and stable before capture.

## Canonical filenames
Save every file in `public/showcase/` with the exact names below:

1. `01-login-en.png`
2. `02-home-en.png`
3. `03-submit-review-en.png`
4. `04-wallet-en.png`
5. `05-showcase-en.png`
6. `06-home-es-ar.png`

## Shot script
1. `01-login-en.png`
- Open mini app logged out.
- Show welcome + "Login with World ID" CTA.

2. `02-home-en.png`
- Logged in, Home tab selected.
- Show nearby stations list and sort/search row.

3. `03-submit-review-en.png`
- Open station drawer, enter submit flow.
- Capture final review step before submit.

4. `04-wallet-en.png`
- Wallet tab selected.
- Balance, submission count, and claim CTA visible.

5. `05-showcase-en.png`
- Open `/en/showcase`.
- Capture hero + first content fold.

6. `06-home-es-ar.png`
- Switch locale to Spanish in Settings.
- Return to Home tab and capture localized UI.

## After capture
- Drop files into `public/showcase/`.
- Run `npm run build` and verify `/en/showcase` displays all screenshots.
