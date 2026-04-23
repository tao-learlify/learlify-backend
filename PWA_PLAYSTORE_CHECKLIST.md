# PWA → Play Store Checklist

## Status Overview

| Step | Status |
|---|---|
| Manifest | ✅ Done |
| Service Worker | ✅ Done |
| Icons | ✅ Done |
| Web Push (backend) | ✅ Done |
| Web Push (frontend) | ✅ Done |
| DB migration (`push_subscriptions`) | ✅ Done |
| VAPID keys configured | ✅ Done |
| Lighthouse audit | ⏳ Pending |
| Bubblewrap / TWA | ⏳ Pending |
| Digital Asset Links | ⏳ Pending |
| Play Store submission | ⏳ Pending |

---

## Step 1 — Lighthouse PWA Audit

**Requires:** Frontend deployed on HTTPS.

1. Open Chrome and navigate to your live URL (e.g. `https://aptisgo.b1b2.es`)
2. Open DevTools → **Lighthouse** tab
3. Select **Progressive Web App** category → click **Analyze page load**
4. Must pass all PWA checks (green checkmarks)

Common failures to fix if they appear:
- `start_url` not cached by service worker → make sure `/` is in `APP_SHELL` in `public/service-worker.js`
- Icons not maskable → verify `icon-192x192.png` and `icon-512x512.png` have safe zone padding
- Not served over HTTPS → fix at infrastructure level

---

## Step 2 — Bubblewrap Setup (Generate Android APK/AAB)

**Requires:** Live HTTPS URL + passing Lighthouse PWA audit.

### 2.1 Install dependencies

```bash
# Install Bubblewrap CLI
npm install -g @bubblewrap/cli

# Bubblewrap needs Java 11+ — install if not present
# macOS: brew install openjdk@17
java -version

# Android SDK — Bubblewrap will prompt to download it automatically on first run
```

### 2.2 Initialize the TWA project

```bash
mkdir aptisgo-twa && cd aptisgo-twa

bubblewrap init --manifest https://YOUR_DOMAIN/manifest.json
```

Bubblewrap will prompt you for:
- **Application ID** → use reverse domain, e.g. `es.b1b2.aptisgo`
- **Host** → your domain, e.g. `aptisgo.b1b2.es`
- **Start URL** → `/`
- **App name** → `AptisGo`
- **Short name** → `AptisGo`
- **Theme color** → `#f8f9fa`
- **Background color** → `#f8f9fa`
- **Icon** → path to your `icon-512x512.png`
- **Keystore** → let Bubblewrap generate one (save the password safely)

### 2.3 Build the APK/AAB

```bash
bubblewrap build
```

This produces:
- `app-release-signed.apk` — for testing on a real device
- `app-release-bundle.aab` — for Play Store upload

### 2.4 Test on a real device

```bash
# Install APK on a connected Android device
adb install app-release-signed.apk
```

Open the app — it should open your PWA in full standalone mode (no browser UI).

---

## Step 3 — Digital Asset Links

This links your domain to the Android app so Chrome doesn't show the browser bar inside the TWA.

### 3.1 Get the SHA-256 fingerprint

```bash
bubblewrap fingerprint add
# or
keytool -list -v -keystore ./android.keystore
```

Copy the **SHA-256 certificate fingerprint**.

### 3.2 Create the assetlinks.json file

Create this file and serve it from your **frontend** at `/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "es.b1b2.aptisgo",
    "sha256_cert_fingerprints": [
      "YOUR:SHA:256:FINGERPRINT:HERE"
    ]
  }
}]
```

### 3.3 Serve the file

**If using Vite/static hosting:** place `assetlinks.json` in `learlify-frontend/public/.well-known/assetlinks.json`

**If serving via Express backend:** add this route in the backend:

```ts
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.json([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'es.b1b2.aptisgo',
      sha256_cert_fingerprints: ['YOUR:SHA:256:FINGERPRINT:HERE']
    }
  }])
})
```

### 3.4 Verify it works

```
https://YOUR_DOMAIN/.well-known/assetlinks.json
```

Should return the JSON above. Also verify with Google's tool:
```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://YOUR_DOMAIN&relation=delegate_permission/common.handle_all_urls
```

---

## Step 4 — Play Store Submission

### 4.1 Create a Google Play Developer account

- Go to https://play.google.com/console
- Pay the one-time $25 fee
- Fill in account details

### 4.2 Create a new app

1. Click **Create app**
2. Fill in: app name, default language, app/game, free/paid
3. Complete the store listing:
   - **Description** (short + full)
   - **Screenshots** — minimum 2, recommended for phone + tablet
   - **Feature graphic** — 1024×500px banner
   - **Category** → Education
   - **Privacy policy URL** — required (must be a real hosted URL)

### 4.3 Upload the AAB

1. Go to **Production** → **Create new release**
2. Upload `app-release-bundle.aab`
3. Add release notes

### 4.4 Complete content rating

- Go to **Policy** → **App content**
- Fill out the content rating questionnaire (IARC)
- For an education app: expect **Everyone** rating

### 4.5 Submit for review

- Review typically takes **1–3 business days** for new apps
- You'll get an email when approved or if changes are needed

---

## Quick Reference — Key Files Changed

| File | What changed |
|---|---|
| `learlify-frontend/public/manifest.json` | Fixed scope, added maskable icons, description, lang |
| `learlify-frontend/public/service-worker.js` | Full caching strategy + push handler |
| `learlify-frontend/public/offline.html` | Offline fallback page |
| `learlify-frontend/src/serviceWorker.js` | Fixed Vite compatibility |
| `learlify-frontend/src/api/push.js` | Push API calls |
| `learlify-frontend/src/hooks/usePushNotifications.js` | Subscribe user after login |
| `learlify-frontend/src/App.js` | SW update banner + push hook wired |
| `learlify-backend/src/api/push/*` | Full push module (model, service, controller, routes) |
| `learlify-backend/src/config/env.ts` | VAPID env vars |
| `learlify-backend/.env.example` | VAPID section added |
| `learlify-backend/src/migrations/20260423000001_*` | `push_subscriptions` table |

---

## Key Commands Summary

```bash
# Generate VAPID keys (already done, for reference)
npx web-push generate-vapid-keys

# Run DB migration (already done locally, run on prod after deploy)
npx knex migrate:latest --knexfile src/config/knexfile.ts

# Install Bubblewrap
npm install -g @bubblewrap/cli

# Generate TWA project
bubblewrap init --manifest https://YOUR_DOMAIN/manifest.json

# Build APK/AAB
bubblewrap build

# Test on device
adb install app-release-signed.apk
```
