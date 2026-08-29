# VoidCat Grants — Mobile App

Native iOS and Android client for the VoidCat RDC Federal Grant Automation
Platform, built with Expo (SDK 57) and React Native.

The app is a client of the existing Cloudflare Workers API in [`../api`](../api).
It adds no server of its own.

## What it does

| Screen | Purpose |
| --- | --- |
| **Search** | Query live federal opportunities, filter by agency, pull to refresh |
| **Grant detail** | Full opportunity record, save, share |
| **Saved** | Bookmarked opportunities, readable offline |
| **Draft proposal** | Generate an AI proposal draft from an organization profile |
| **Account** | Subscription tier, policies, support, sign out |

Saved opportunities and generated drafts are persisted on-device, so the two
screens users return to most keep working without a connection.

## Getting started

```bash
cd mobile
npm install
npm start          # then press i / a, or scan the QR code
```

The app targets production by default. To point it at a different backend:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000 npm start
```

Run `npm run start -- --clear` after changing that variable — Metro caches the
inlined value.

## Checks

```bash
npm run typecheck   # tsc --noEmit
npm run doctor      # expo-doctor: config + native dependency validation
npx expo export --platform ios      # verify the bundle builds
npx expo export --platform android
```

## Layout

```
app/                 expo-router routes (file path = URL)
  _layout.tsx        providers, splash gate, signed-in/out routing
  (auth)/            sign in, sign up
  (tabs)/            search, saved, account
  grant/[id].tsx     opportunity detail
  proposal/[id].tsx  proposal form + generated draft
src/
  api/               typed client for the Workers API
  store/             auth session (SecureStore) and saved library (AsyncStorage)
  components/        shared UI primitives
  theme.ts           light/dark palette
  format.ts          amount and deadline formatting
scripts/
  generate-icons.py  regenerates every launcher/splash/web icon
```

## Notes on the API

Two server behaviours shape the client and are easy to trip over:

- **There is no grant-detail endpoint.** `GET /api/grants/:id` deliberately
  returns 404 (`FEATURE_REQUIRES_SEARCH`). Detail screens read from the
  in-memory search cache or the saved library, and proposal generation sends
  the whole grant record from the search result.
- **Agency search matches full names.** `/api/grants/search?agency=` filters the
  `agency` column, which stores `"National Science Foundation"`; the acronym is
  in `agency_code`, which is not searched. The agency chips therefore send
  distinctive substrings of the full name, not acronyms.

## Store releases

Build and submission are handled by EAS; see
[`../docs/MOBILE-STORE-SUBMISSION.md`](../docs/MOBILE-STORE-SUBMISSION.md) for
the full runbook, including the App Store subscription-policy constraint that
keeps the upgrade path hidden on iOS.

```bash
npm run build:ios       # eas build --platform ios --profile production
npm run build:android
npm run submit:ios
npm run submit:android
```
