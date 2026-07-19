# Publishing to Google Play (Android)

This app ships as an installable **PWA**. To put it on the Play Store you wrap
the deployed website in a **Trusted Web Activity (TWA)** — a thin Android app
that opens your site full-screen (no browser UI). This is the same technique
used by many production apps and is fully allowed by Google Play.

You do **not** rewrite the app. You deploy the website (see `DEPLOY.md`), then
build a small Android bundle that points at it.

## Prerequisites

- The site deployed over **HTTPS** at your domain (e.g. `https://your-domain.com`).
- A **Google Play Developer account** ($25 one-time).
- **Node 18+** and a **JDK 17** on your build machine.
- Bubblewrap CLI: `npm i -g @bubblewrap/cli`

## 1. Configure the site for your domain

Set these environment variables on the server before deploying:

- `APP_URL=https://your-domain.com`
- `ANDROID_PACKAGE_NAME=com.yourcompany.characterai`
- `ANDROID_CERT_SHA256=<fingerprint1>,<fingerprint2>` (fill in after step 3)

The site already serves the two files Android needs:

- `https://your-domain.com/manifest.webmanifest` — the PWA manifest
- `https://your-domain.com/.well-known/assetlinks.json` — Digital Asset Links
  (driven by the env vars above)

## 2. Generate the Android project

A ready-to-edit Bubblewrap config lives at `android/twa-manifest.json`. Replace
`your-domain.com` and `com.characterai.app` with your values, then:

```bash
cd android
bubblewrap init --manifest ./twa-manifest.json   # or: bubblewrap build
bubblewrap build
```

This produces:

- `app-release-signed.aab` — the bundle you upload to Play
- `app-release-signed.apk` — for local testing (`adb install`)
- a signing keystore (**keep it safe** — you need it for every future update)

## 3. Wire up Digital Asset Links (removes the browser address bar)

Get both signing fingerprints:

- **Upload key:** `keytool -list -v -keystore <your.keystore> -alias <alias>`
  → copy the `SHA256` line.
- **Play App Signing key:** Play Console → your app → *Setup → App signing* →
  copy the `SHA-256 certificate fingerprint`.

Put both (comma-separated) into `ANDROID_CERT_SHA256` and redeploy the site.
Verify:

```bash
curl https://your-domain.com/.well-known/assetlinks.json
```

It must list your package name and both fingerprints. If this is wrong, the app
shows a URL bar.

## 4. Upload to Play Console

1. Create the app in Play Console.
2. Upload `app-release-signed.aab` to a **Closed testing** track first.
3. Complete the required listing:
   - **Data safety** form (declare: account data, user content, and that data is
     encrypted in transit; users can request deletion — the app supports it at
     `/settings`).
   - **Content rating** questionnaire (this hosts user-generated AI chat →
     answer honestly; likely Mature).
   - **Target audience**: 18+ (the app enforces an age gate).
   - **Privacy Policy URL:** `https://your-domain.com/privacy`
   - Screenshots (phone), feature graphic, short/full description.
4. Roll out to testers, verify the app opens full-screen with no URL bar, then
   promote to Production.

## Updating the app later

- **Content/website changes** need no Play update — they're live on the next
  deploy.
- **Only** bump `appVersionCode` (and `appVersion`) in `android/twa-manifest.json`
  and rebuild when you change the Android shell itself (icon, name, splash,
  package). Sign with the **same keystore** and upload the new `.aab`.

## Notes

- Push notifications are disabled in the template (`enableNotifications: false`).
  Enabling them requires additional setup and a notification delegation service.
- Keep the maskable icon (`/icons/icon-maskable-512.png`) — Android uses it to
  render an adaptive launcher icon.
