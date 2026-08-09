# AmarKrishok mobile · foundation reference

This document describes the M0 foundation underneath the Bengali-first Expo + TypeScript app. Later
work-package code may also be present in this directory; the M0 boundary remains the theme, fonts,
i18n, API client, lint, tests, and CI described below.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run android
```

`EXPO_PUBLIC_API_BASE_URL` must be an absolute HTTP(S) URL ending in `/api/v1`. The example points
to the deployed API so Expo Go works on a physical phone. To use a Nest API running on your Mac,
set the value to the Mac's LAN address (for example `http://192.168.1.20:4000/api/v1`); do not use
`localhost`, because that resolves to the phone inside Expo Go.

## Checks

```bash
npm run check
```

The check runs ESLint, strict TypeScript, and the M0 unit tests.

## Included in M0

- Expo SDK 54 blank TypeScript entry point, with Android as the priority target and compatibility
  with the current iOS App Store build of Expo Go.
- README design tokens exposed through a typed theme and provider.
- Noto Sans Bengali 400/600, Inter 400/500/600/700/800, and JetBrains Mono 500/600 loaded before UI.
- i18next configured with `bn-BD` as the default and `en` as fallback. English title glosses default
  off and remain a user-setting boundary for a later package.
- React Query provider and a `/api/v1` fetch client with bearer tokens, one-flight refresh, bilingual
  errors, envelope parsing, and caller-supplied `Idempotency-Key` support.
- Integer-poisha and Asia/Dhaka formatting helpers.

## M0 package boundary

M0 does not define onboarding, role navigators, shared product surfaces, or role-specific product
flows. Those belong to M1–M6 even when their implementations are already present in this checkout.

## Open questions for M1

1. `ARCHITECTURE.md` names `POST /auth/refresh` and the `{ data, meta }` envelope but does not define
   the refresh payload. The client currently validates `data.accessToken`; confirm this exact field.
2. The architecture puts the rotating refresh token in an httpOnly cookie. Confirm the production
   native cookie persistence policy and whether Expo's platform cookie jar is sufficient across app
   restarts, or whether the API will provide a native-session alternative. M0 does not persist tokens.
3. Supply the staging `/api/v1` base URL before release-channel configuration is added. The current
   deployed production URL is the physical-device-safe default.
