# Easool mobile — internal pilot runbook

## Prerequisites

- Node 20+
- Expo account (`npx eas login`)
- EAS CLI (`npm i -g eas-cli`)
- Backend deployed with v1.1 APIs (`feature/login-timetable` or production)

## Configure API

```bash
cp .env.example .env
# Edit EXPO_PUBLIC_API_BASE_URL — no /api suffix, e.g.:
# EXPO_PUBLIC_API_BASE_URL=https://schoolsync-api-production.up.railway.app
```

## Local smoke test

```bash
npm install
npx expo install --fix
npm run typecheck
npx expo start
```

Scan QR with Expo Go, or use a dev client from EAS.

## Internal builds (pilot schools)

```bash
# Android APK (share link from EAS dashboard)
eas build --profile preview --platform android

# iOS TestFlight (internal group)
eas build --profile preview --platform ios
eas submit --platform ios --profile production
```

Override API per build in [eas.json](./eas.json) `build.*.env` or EAS project secrets.

## Demo logins (after `POST /auth/seed` on API)

Password: `123456`

| Role | Phone |
|------|-------|
| Principal | 9876500001 |
| Coordinator | 9876500002 |
| Teacher | 9876500003 |
| Student | 9876500008 |

## Manual checklist (by role)

### All users

- [ ] Sign in / sign out
- [ ] Register teacher + student (pending approval)
- [ ] Profile shows school name and role details from `/profile`
- [ ] Notices list + pull to refresh
- [ ] Notifications tab

### Student

- [ ] My assignments, My results
- [ ] Timetable view
- [ ] Sibling login picker (same phone, two students)

### Teacher

- [ ] Student attendance mark
- [ ] Records (assignments / exams if `canWrite`)
- [ ] Lesson plans CRUD

### Principal / coordinator

- [ ] Build timetable + Quick fill (copy day / week / sample)
- [ ] Directory roll + reset password
- [ ] Substitution, teacher calendar
- [ ] Approvals

### School admin

- [ ] Teachers onboarding (subject dropdown, can enter marks)
- [ ] Classes, subjects, directory

### Super admin

- [ ] Schools, onboard, platform users
- [ ] Account requests (`/super-admin/requests`)
- [ ] Reset user password

## Support

Point pilot users to Menu → all modules for their role. If login fails, verify `EXPO_PUBLIC_API_BASE_URL` matches a live API (test `GET /auth/schools`).
