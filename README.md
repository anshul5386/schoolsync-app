# Easool mobile app (schoolsync-app)

One React Native + Expo (TypeScript) codebase that produces both the Android and the iOS app.

There is **no separate backend**. The app calls the existing `schoolsync-api` with the same JWT
login and the same endpoints as the website (`schoolsync-web`). Backend additions the app needs
(push tokens, refresh tokens, account deletion) are made in the `schoolsync` repo, never here.

## Run it on your phone

1. Install Node 20+ and the **Expo Go** app on your phone.
2. `npm install`
3. `npx expo install --fix`   (aligns package versions with the installed Expo SDK)
4. (Optional) The app talks to the production API by default. To use another API, `cp .env.example .env` and set `EXPO_PUBLIC_API_BASE_URL`.
5. `npx expo start`, then scan the QR code with Expo Go.

## Layout
- `app/` screens (file-based routing): `login`, and tabs for assignments, notifications, account
- `src/api/` one small module per backend area, mirroring the website's `src/api/*.js`
- `src/auth/` session handling; the token lives in the device's secure storage, not plain storage

## Rules
- Never commit `.env`, keystores, `google-services.json` or `GoogleService-Info.plist`.
- Backend changes must stay backward compatible so the website keeps working.
