# Easool mobile app (schoolsync-app)

One React Native + Expo (TypeScript) codebase that produces both the Android and the iOS app.

There is **no separate backend**. The app calls the existing `schoolsync-api` with the same JWT
login and the same endpoints as the website (`schoolsync-web`). Backend additions the app needs
(push tokens, refresh tokens, account deletion) are made in the `schoolsync` repo, never here.

## Run it on your phone

1. Install Node 20+ and the **Expo Go** app on your phone.
2. `npm install`
3. `npx expo install --fix`   (aligns package versions with the installed Expo SDK)
4. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_BASE_URL` (no `/api` suffix).
5. `npx expo start`, then scan the QR code with Expo Go.

**Internal pilot builds:** see [PILOT_RUNBOOK.md](./PILOT_RUNBOOK.md) and [eas.json](./eas.json). Use profile **`preview`** or **`pilot`** for a installable **APK** + install QR on expo.dev. **production** builds **AAB** for Play Store only.

### Link Expo (required once for EAS / GitHub builds)

After creating the app on [expo.dev](https://expo.dev) under **anshuleasools-team**, add to `app.json` inside `"expo"`:

```json
"owner": "anshuleasools-team",
"extra": {
  "eas": {
    "projectId": "PASTE-PROJECT-UUID-FROM-EXPO-DASHBOARD"
  }
}
```

Commit and push. Re-run the cloud build without this, builds stop with `extra.eas.projectId field is missing`.

## API environments

| Use | `EXPO_PUBLIC_API_BASE_URL` |
|-----|----------------------------|
| Production (default in code) | `https://schoolsync-api-production.up.railway.app` |
| Local API on LAN | `http://YOUR_LAN_IP:8080` |
| Staging | Your Railway/staging host |

The app calls the API **directly** (no `/api` prefix). CORS does not apply to native apps.

## Layout
- `app/` screens (file-based routing): `login`, and tabs for assignments, notifications, account
- `src/api/` one small module per backend area, mirroring the website's `src/api/*.js`
- `src/auth/` session handling; the token lives in the device's secure storage, not plain storage

## Rules
- Never commit `.env`, keystores, `google-services.json` or `GoogleService-Info.plist`.
- Backend changes must stay backward compatible so the website keeps working.
