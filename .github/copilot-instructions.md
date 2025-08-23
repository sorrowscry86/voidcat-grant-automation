---
description: AI rules derived by SpecStory from the project AI interaction history
globs: *
---

# VoidCat RDC – Copilot Operating Guide (Tools & Use Cases)

This repository powers a static frontend (Alpine.js + Tailwind + Stripe.js) and a Cloudflare Workers API (Hono) with Playwright E2E tests. Use this guide to select the right tool and correct Windows PowerShell commands for common tasks.

---

## Project Surfaces

- Frontend: `frontend/index.html` (GitHub Pages/Cloudflare Pages)
- API (Worker): `api/src/index.js` (Hono, D1/KV/R2, Stripe)
- Tests: `tests/e2e/*` with `playwright.config.ts`
- Deployment: Cloudflare (via Wrangler), Pages for static frontend

---

## Primary Tools

1) Cloudflare Wrangler (Workers/D1/KV/R2)
- Purpose: Build/dev/deploy the API Worker; manage secrets and bindings
- Installed via devDependencies in `api/package.json`
- Typical commands (PowerShell):
```powershell
cd api
npm install
npx wrangler dev
npx wrangler dev --env production
npx wrangler deploy --env production
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put STRIPE_PUBLIC_KEY
npx wrangler secret put STRIPE_PRICE_ID
```

2) Playwright (@playwright/test)
- Purpose: E2E browser tests and reports
- Config: `playwright.config.ts` (baseURL points at `frontend/` via file:// URL)
- Root scripts (PowerShell):
```powershell
npm run test:install
npm run test
npm run test:ui
npm run test:report
```

3) Hono (API framework)
- Purpose: Define API routes, middleware, CORS, and integrations
- Location: `api/src/index.js`
- Use cases: add endpoints (search, grants/:id, users, stripe), health checks, CORS

4) Stripe SDK (Server) + Stripe.js (Client)
- Purpose: Subscription checkout, webhook handling, and tier upgrades
- Server: Use Stripe secret key in Worker; never expose secrets client-side
- Client: Initialize with publishable key only (fetched from API config endpoint)

5) Alpine.js + Tailwind CSS (Frontend)
- Purpose: Lightweight UI state and styling directly in `index.html`
- Use cases: search UI, modals, upgrade flow, proposal preview

---

## Cloudflare Environment (wrangler.toml)

Defined in `api/wrangler.toml`:
- Worker name: `grant-search-api` (production)
- Bindings:
  - D1: `VOIDCAT_DB`
  - KV: `OAUTH_KV`
  - R2: `ASSETS`
- Set secrets via `wrangler secret put` (see commands above).

Recommended secrets/vars:
- `STRIPE_SECRET_KEY` (required server-side)
- `STRIPE_PUBLIC_KEY` (publishable; returned by public config endpoint)
- `STRIPE_WEBHOOK_SECRET` (webhook verification)
- `STRIPE_PRICE_ID` (current subscription price)

---

## API Endpoints (Current)

- `GET /health` – service heartbeat
- `GET /api/grants/search` – list grants (supports `query`, `agency`)
- `GET /api/grants/:id` – grant details
- `POST /api/users/register` – registration → returns `api_key`
- `GET /api/users/me` – profile via `Authorization: Bearer <api_key>`
- `POST /api/grants/generate-proposal` – AI draft proposal (auth required)
- `POST /api/stripe/create-checkout` – server-side checkout session
- `POST /api/stripe/webhook` – subscription lifecycle updates
- `GET /api/public/stripe-config` – `{ publishable_key, price_id }` (Planned for frontend hydration)

---

## Common Use Cases & Recipes

1) Run E2E tests locally (Windows PowerShell)
```powershell
npm install
npm run test:install
npm run test
npm run test:report
```

2) Develop the API locally
```powershell
cd api
npm install
npx wrangler dev
```

3) Deploy API to production
```powershell
cd api
npm install
npx wrangler deploy --env production
```

4) Verify health and basic search
```powershell
# Health
curl https://grant-search-api.sorrowscry86.workers.dev/health
# Search
curl "https://grant-search-api.sorrowscry86.workers.dev/api/grants/search?query=AI"
```

5) Stripe setup (server-side only)
```powershell
cd api
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put STRIPE_PUBLIC_KEY
npx wrangler secret put STRIPE_PRICE_ID
```

---

## Frontend Guidance (Static Hosting)

- Do not use `process.env.*` in browser code; `process` is undefined on GitHub Pages.
- Fetch public runtime config from the API (e.g., `/api/public/stripe-config`) and initialize Stripe with `publishable_key`.
- Keep all secrets on the server. Price IDs and publishable key are safe client-side.

Example (Alpine initialization snippet):
```javascript
// during init()
const cfg = await fetch(`${this.apiBase}/api/public/stripe-config`).then(r => r.json());
this.stripe = Stripe(cfg.publishable_key);
```

---

## Testing Guidance

- `playwright.config.ts` uses a `file://` baseURL pointing at `/frontend/` — tests run against static files by default.
- Use projects: Chromium, Firefox, WebKit, and mobile emulations.
- Artifacts: HTML report, screenshots on failure, video on failure, traces on first retry.

Authoring tests:
- Prefer stable selectors (roles, text, data-testids if added)
- Cover happy paths: search, register, generate proposal, open upgrade modal
- Optionally mock API responses when needed for deterministic runs

---

## Copilot Do/Don’t

Do
- Use Windows PowerShell syntax for commands (use `;` to chain when necessary)
- Keep secrets out of the frontend; add/publicize only publishable config
- Add tests for new endpoints and critical flows before/with changes
- Update docs (README, AI-Comms, this file) when workflows change

Don’t
- Don’t inject secrets into `frontend/index.html`
- Don’t rely on `process.env` in browser JavaScript
- Don’t ship changes without verifying `npm run test` and a clean report

---

## Quick Links

- Frontend entry: `frontend/index.html`
- API entry: `api/src/index.js`
- Wrangler config: `api/wrangler.toml`
- Playwright config: `playwright.config.ts`
- Tests: `tests/e2e/*`
- Health URL: `https://grant-search-api.sorrowscry86.workers.dev/health`
- AI Communications Document: `AI-Comms.md`

---

Last updated: 2025-08-22