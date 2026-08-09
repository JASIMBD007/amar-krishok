# AmarKrishok mobile · M0 foundations

Expo + TypeScript foundation for the Bengali-first AmarKrishok mobile app. This package intentionally
contains no onboarding, role navigator, or marketplace workflow; those start in M1 and later packages.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run android
```

`EXPO_PUBLIC_API_BASE_URL` must include the versioned `/api/v1` prefix. The example points to the local
Nest API. No production API URL is assumed in M0.

## Checks

```bash
npm run check
```

The check runs ESLint, strict TypeScript, and the M0 unit tests.

## Included in M0

- Expo SDK 57 blank TypeScript entry point, with Android as the priority target.
- README design tokens exposed through a typed theme and provider.
- Noto Sans Bengali 400/600, Inter 400/500/600/700/800, and JetBrains Mono 500/600 loaded before UI.
- i18next configured with `bn-BD` as the default and `en` as fallback. English title glosses default
  off and remain a user-setting boundary for a later package.
- React Query provider and a `/api/v1` fetch client with bearer tokens, one-flight refresh, bilingual
  errors, envelope parsing, and caller-supplied `Idempotency-Key` support.
- Integer-poisha and Asia/Dhaka formatting helpers.

## Deliberately excluded

- OTP, PIN, secure session persistence, device registration, role selection, and navigators (M1).
- Profile, notifications, chat, and order tracking (M2).
- Farmer, buyer, logistics, capture/upload, location, offline, and push workflows (M3–M6).

## Open questions for M1

1. `ARCHITECTURE.md` names `POST /auth/refresh` and the `{ data, meta }` envelope but does not define
   the refresh payload. The client currently validates `data.accessToken`; confirm this exact field.
2. The architecture puts the rotating refresh token in an httpOnly cookie. Confirm the production
   native cookie persistence policy and whether Expo's platform cookie jar is sufficient across app
   restarts, or whether the API will provide a native-session alternative. M0 does not persist tokens.
3. Supply the production and staging `/api/v1` base URLs before release configuration is added.
