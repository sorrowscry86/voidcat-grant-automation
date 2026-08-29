# Mobile Store Submission Runbook

How to get **VoidCat Grants** (`mobile/`) onto the App Store and Google Play.

- Bundle ID / package: `org.voidcat.grants`
- Build tooling: Expo Application Services (EAS)
- Source: [`mobile/`](../mobile) — see its [README](../mobile/README.md) for local development

---

## 1. Accounts you need first

| | Cost | Notes |
| --- | --- | --- |
| Apple Developer Program | $99/year | Enrollment can take 24–48h; an **organization** account additionally needs a D-U-N-S number, which takes longer. Start this before anything else. |
| Google Play Console | $25 one-time | |
| Expo account | Free tier is fine | Used for EAS builds |

> **Google Play, personal accounts:** developer accounts registered as an
> individual must run a closed test with at least **12 testers for 14
> continuous days** before production access is granted. Organization accounts
> are exempt. If the account is personal, start the closed test early — it is
> the long pole, not the build.

Apple builds require macOS **only if building locally**. `eas build` compiles on
hosted macOS workers, so a Mac is not required.

## 2. One-time project setup

```bash
cd mobile
npm install -g eas-cli      # or use npx eas-cli throughout
eas login
eas init                    # creates the EAS project, writes extra.eas.projectId
```

Then generate store credentials. Let EAS manage them unless there is a reason
not to — it creates and stores the signing key and provisioning profiles:

```bash
eas credentials --platform ios
eas credentials --platform android
```

## 3. Fill in submission config

`mobile/eas.json` ships with placeholders under `submit.production`:

| Placeholder | Where to find it |
| --- | --- |
| `APPLE_ID_EMAIL` | The Apple ID email used for the Developer Program |
| `APP_STORE_CONNECT_APP_ID` | App Store Connect → your app → App Information → "Apple ID" (a number) |
| `APPLE_TEAM_ID` | developer.apple.com → Membership |
| `google-play-service-account.json` | Play Console → Setup → API access → create a service account with **Release manager** rights, download the JSON |

The service-account JSON is gitignored — keep it out of the repository.

Create the app record in each console before the first submission:
- **App Store Connect** → Apps → **+** → New App (pick bundle ID `org.voidcat.grants`)
- **Play Console** → Create app (package `org.voidcat.grants`)

## 4. Build

```bash
cd mobile
npm run build:ios          # eas build --platform ios --profile production
npm run build:android      # produces an .aab for Play
```

`appVersionSource` is `remote` and the production profile sets
`autoIncrement`, so EAS manages `buildNumber` / `versionCode`. Bump the
user-facing `version` in `app.json` by hand for each release.

To test on real hardware before submitting:

```bash
eas build --profile preview --platform android   # installable APK
eas build --profile preview --platform ios       # needs registered UDIDs
```

## 5. Submit

```bash
npm run submit:ios         # uploads to App Store Connect
npm run submit:android     # uploads to the Play internal track
```

Android submits to the **internal** track with `releaseStatus: draft`. Promote
to production in the Play Console once it has been checked.

---

## 6. Store listing content

**Name:** VoidCat Grants
**Subtitle (iOS, ≤30 chars):** Federal grant search & drafts
**Short description (Android, ≤80 chars):** Search federal grants and draft compliant proposals from your phone.

**Description:**

> VoidCat Grants puts federal funding discovery in your pocket.
>
> Search live federal grant opportunities across SBIR, STTR and agency
> programs, filter by funding agency, and keep the ones that matter — saved
> opportunities stay readable even without a connection.
>
> When you find a fit, generate a first-pass proposal draft built from your
> organization profile and the opportunity's own requirements, covering
> executive summary, technical approach, commercial potential, an indicative
> budget and a timeline.
>
> • Live federal opportunity search
> • Agency filters for DOD, NSF, NIH, DOE, NASA and DARPA
> • Deadline tracking that flags what closes soon
> • Offline access to saved grants and drafts
> • AI-assisted proposal drafting
>
> VoidCat is an administrative drafting and compliance tool. Every draft
> requires your own review, and VoidCat cannot sign or submit documents to
> federal portals on your behalf.

**Keywords (iOS, ≤100 chars):** `grants,federal,SBIR,STTR,funding,proposal,NSF,NIH,DARPA,research,startup,nonprofit`

**Category:** Business (primary) / Productivity (secondary)
**Support URL:** https://sorrowscry86.github.io/voidcat-grant-automation
**Privacy policy URL:** https://sorrowscry86.github.io/voidcat-grant-automation/privacy-policy.html

### Screenshots

Capture from a simulator/emulator on the Search, Grant detail, Saved and Draft
Proposal screens.

| Store | Required |
| --- | --- |
| App Store | 6.9" iPhone (1320×2868). iPad 13" (2064×2752) is also required because `supportsTablet` is true — either drop that flag in `app.json` or supply iPad shots. |
| Play Store | 2–8 phone screenshots, 512×512 icon, 1024×500 feature graphic |

---

## 7. Privacy disclosures

Both stores require these to match what the app actually does. As built, the app
collects only what registration and sign-in need, uses no third-party analytics
SDK, and shows no ads.

**Apple — App Privacy:**

| Data type | Collected | Linked to user | Used for tracking | Purpose |
| --- | --- | --- | --- | --- |
| Email address | Yes | Yes | No | App functionality (account) |
| Name | Yes | Yes | No | App functionality (account) |
| Other user content (organization profile sent for proposal drafting) | Yes | Yes | No | App functionality |

**Google Play — Data safety:** same three items; data is encrypted in transit;
users can request deletion in-app; no data is shared with third parties.

Both forms ask whether users can delete their account — answer **yes**, and give
the in-app path: **Account → Delete account**, backed by
`POST /api/auth/delete-account`.

## 8. App review notes

Paste into App Store Connect → "Notes for Review", and Play Console → testing
instructions:

> A demo account is required to review this app.
> Email: `<create a reviewer account>`
> Password: `<password>`
>
> The app is a client for our federal grant database. Sign in, use the Search
> tab to query live opportunities, open any result for detail, and use "Draft a
> proposal" to generate a document draft.
>
> Subscriptions are not sold in the app. Paid plans are purchased only on our
> website, and no purchase or upgrade path is presented on iOS.
>
> Account deletion is available in-app under Account → Delete account.

**Create the reviewer account before submitting** and leave it active — an
unusable demo login is the most common cause of an avoidable rejection.

## 9. Known review risks, and how this build handles them

| Risk | Guideline | Status |
| --- | --- | --- |
| Selling digital subscriptions outside IAP | App Store 3.1.1 | Handled — `SHOW_UPGRADE_PATH` in `src/config.ts` hides every upgrade and billing link on iOS. Do not add a Stripe link to an iOS screen without adding StoreKit purchases first. |
| Account creation without account deletion | App Store 5.1.1(v) | Handled — Account → Delete account. |
| "Minimum functionality" / thin web wrapper | App Store 4.2 | Handled — a native client with offline saved grants and drafts, not a webview. |
| Missing privacy policy | Both stores | Handled — linked in-app and in the listing. |
| Incomplete demo credentials | App Store 2.1 | **Action required at submission time.** |

## 10. After the first release

- Over-the-air JS updates: `eas update --branch production`. Native config
  changes (new permissions, icons, plugins, SDK upgrades) still need a full
  rebuild and resubmission.
- Bump `version` in `mobile/app.json` per release; EAS handles the build numbers.
- Re-run `npm run doctor` in `mobile/` after any dependency change — it catches
  missing native peer dependencies that only fail at runtime on device.
