---
description: VoidCat RDC Federal Grant Automation Platform - Comprehensive AI Instructions
globs: *
---

# VoidCat RDC Federal Grant Automation Platform
AI-powered federal grant discovery and proposal automation platform built with Cloudflare Workers API and static frontend.

**ALWAYS REFERENCE THESE INSTRUCTIONS FIRST.** Only fallback to additional search and context gathering if the information here is incomplete or found to be in error.

## Working Effectively

### Bootstrap and Setup (Required First Steps)
```bash
# Install root dependencies (test framework)
npm install  # Takes ~1 second

# Install API dependencies  
cd api
npm install  # Takes ~1 second
cd ..

# Install Playwright browsers (for testing)
npx playwright install  # Takes 5-10 minutes. NEVER CANCEL. Set timeout to 15+ minutes.
```

**CRITICAL**: NEVER CANCEL browser installation. Playwright downloads can take 5-10 minutes and may appear to hang. Always wait for completion.

### API Development
```bash
# Start local API development server
cd api
npx wrangler dev --local  # Starts on http://localhost:8787, takes ~10 seconds

# Test API health
curl http://localhost:8787/health

# Test grant search 
curl "http://localhost:8787/api/grants/search?query=AI"
```

**API Endpoints Available:**
- `GET /health` - Health check
- `GET /api/grants/search?query=<term>` - Search grants
- `GET /api/grants/:id` - Get grant details  
- `POST /api/users/register` - User registration
- `GET /api/users/me` - User profile
- `POST /api/grants/generate-proposal` - AI proposal generation

### Frontend Development
```bash
# Serve frontend locally (no build required - static files)
cd frontend
python3 -m http.server 3000  # Starts immediately on http://localhost:3000

# Alternative: Use any static file server
npx serve . -p 3000
```

The frontend is a single HTML file (`frontend/index.html`) with Alpine.js and Tailwind CSS loaded via CDN. No build process required.

### Testing
```bash
# Run all E2E tests (230+ tests across browsers)
npm test  # Takes 10-15 minutes. NEVER CANCEL. Set timeout to 20+ minutes.

# Run tests with UI (for debugging)
npm run test:ui

# Run specific test file
npx playwright test tests/e2e/homepage.spec.ts

# Generate test report
npm run test:report
```

**CRITICAL**: Test suite includes 230+ tests across Chromium, Firefox, and WebKit. Complete run takes 10-15 minutes. NEVER CANCEL running tests.

### Deployment
```bash
# Deploy API to Cloudflare Workers (production)
cd api
npx wrangler deploy --env production  # Takes 30-60 seconds

# Full deployment (API + health checks)
./deploy.sh  # Takes 1-2 minutes
```

**Live Endpoints:**
- API: https://grant-search-api.sorrowscry86.workers.dev
- Frontend: Deploy to GitHub Pages from `frontend/` directory or Cloudflare Pages

## Validation

### Always Test These Scenarios After Making Changes
1. **API Health Check**: 
   ```bash
   curl http://localhost:8787/health
   # Should return: {"status":"healthy","service":"VoidCat Grant Search API",...}
   ```

2. **Grant Search Functionality**:
   ```bash
   curl "http://localhost:8787/api/grants/search?query=AI"
   # Should return: {"success":true,"count":7,"grants":[...],...}
   ```

3. **Frontend Connectivity**:
   - Open frontend in browser at http://localhost:3000
   - Verify search interface loads
   - Test grant search returns results
   - Verify registration modal opens/closes

4. **Full E2E Test Suite**:
   ```bash
   npm test  # Run complete 230+ test suite, takes 10-15 minutes
   ```

### Manual Testing Checklist
- [ ] API starts locally without errors (`npx wrangler dev --local`)
- [ ] Health endpoint returns 200 OK (`curl http://localhost:8787/health`)
- [ ] Grant search returns mock data (`curl "http://localhost:8787/api/grants/search?query=AI"`)
- [ ] Frontend loads and displays search interface (`python3 -m http.server 3000`)
- [ ] Registration modal opens/closes properly
- [ ] Search form submits and displays results
- [ ] Mobile responsive layout works

### Complete Developer Workflow Test
```bash
# Full validation sequence (run this to verify everything works)
npm install && cd api && npm install && cd ..
cd api && npx wrangler dev --local &
sleep 8
curl -s http://localhost:8787/health | grep "healthy"
curl -s "http://localhost:8787/api/grants/search?query=AI" | grep "success"
kill %1
cd frontend && python3 -m http.server 3000 &
sleep 2  
curl -s http://localhost:3000/ | grep "VoidCat RDC"
kill %1
```

## Project Structure

### Backend API (`/api/`)
- **Framework**: Hono.js for Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite) - `voidcat-users` 
- **Storage**: Cloudflare R2 (`voidcat-assets`) + KV (`OAUTH_KV`)
- **Main File**: `api/src/index.js`
- **Config**: `api/wrangler.toml`
- **Dependencies**: hono, stripe, wrangler

### Frontend (`/frontend/`)  
- **Framework**: Alpine.js + Tailwind CSS (CDN)
- **Main File**: `frontend/index.html` (single-page application)
- **Deployment**: Static hosting (GitHub Pages, Cloudflare Pages)
- **API Integration**: Connects to live Cloudflare Workers API

### Testing (`/tests/`)
- **Framework**: Playwright
- **Test Files**: `tests/e2e/*.spec.ts`
- **Config**: `playwright.config.ts`
- **Coverage**: 230+ tests (homepage, search, registration, responsive)

## Common Tasks

### Repo Root Structure
```
.
├── README.md
├── package.json
├── playwright.config.ts  
├── deploy.sh            # Main deployment script
├── api/                 # Cloudflare Workers API
│   ├── src/index.js     # API entry point
│   ├── package.json
│   └── wrangler.toml    # Cloudflare config
├── frontend/            # Static frontend
│   └── index.html       # Single-page application
└── tests/               # E2E test suite
    └── e2e/             # Playwright tests
```

### Key Configuration Files
- `package.json` (root): Test framework dependencies
- `api/package.json`: API dependencies (hono, stripe)
- `api/wrangler.toml`: Cloudflare Workers configuration
- `playwright.config.ts`: E2E test configuration

### Environment Variables & Secrets
- Cloudflare Workers environment managed via `wrangler.toml`
- No local `.env` files required for development
- Production secrets managed through Cloudflare Dashboard

## Build and Test Expectations

### Timing Expectations (Set Appropriate Timeouts)
- **npm install** (root): 1 second - timeout 30s
- **npm install** (api): 1 second - timeout 30s  
- **npx playwright install**: 5-10 minutes - timeout 15+ minutes. NEVER CANCEL
- **API local dev startup**: 10 seconds - timeout 30s
- **Frontend server startup**: Immediate - timeout 10s
- **Full test suite**: 10-15 minutes - timeout 20+ minutes. NEVER CANCEL
- **API deployment**: 30-60 seconds - timeout 2 minutes

### Development Workflow
1. **Set up environment**: Run bootstrap commands above
2. **Start API**: `cd api && npx wrangler dev --local`
3. **Start frontend**: `cd frontend && python3 -m http.server 3000`
4. **Make changes**: Edit API or frontend files
5. **Test locally**: Verify endpoints and UI functionality  
6. **Run tests**: `npm test` (NEVER CANCEL - takes 10-15 minutes)
7. **Deploy**: `./deploy.sh` or `cd api && npx wrangler deploy --env production`

### Common Issues
- **Browser download fails**: Playwright browser downloads can fail due to network issues. Retry `npx playwright install chromium` for single browser.
- **API not responding**: Ensure no other processes on port 8787. Check `npx wrangler dev --local` output for errors.
- **Tests fail**: Browser installation required. Run `npx playwright install` first.
- **Frontend API errors**: Check if connecting to correct API endpoint in `frontend/index.html` (line ~338).
- **Permission denied on playwright**: Run `chmod +x node_modules/.bin/playwright` if needed.
- **Wrangler dev warnings**: Cloudflare connection warnings are normal in local development.

## Primary Tools

### 1. Cloudflare Wrangler (Workers/D1/KV/R2)
- Purpose: Build/dev/deploy the API Worker; manage secrets and bindings
- Installed via devDependencies in `api/package.json`
- Typical commands:
```bash
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

### 2. Playwright (@playwright/test)
- Purpose: E2E browser tests and reports
- Config: `playwright.config.ts` (baseURL points at `frontend/` via file:// URL)
- Root scripts:
```bash
npm run test:install
npm run test
npm run test:ui
npm run test:report
```

### 3. Hono (API framework)
- Purpose: Define API routes, middleware, CORS, and integrations
- Location: `api/src/index.js`
- Use cases: add endpoints (search, grants/:id, users, stripe), health checks, CORS

### 4. Stripe SDK (Server) + Stripe.js (Client)
- Purpose: Subscription checkout, webhook handling, and tier upgrades
- Server: Use Stripe secret key in Worker; never expose secrets client-side
- Client: Initialize with publishable key only (fetched from API config endpoint)

### 5. Alpine.js + Tailwind CSS (Frontend)
- Purpose: Lightweight UI state and styling directly in `index.html`
- Use cases: search UI, modals, upgrade flow, proposal preview

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

## Testing Guidance

- `playwright.config.ts` uses a `file://` baseURL pointing at `/frontend/` — tests run against static files by default.
- Use projects: Chromium, Firefox, WebKit, and mobile emulations.
- Artifacts: HTML report, screenshots on failure, video on failure, traces on first retry.

Authoring tests:
- Prefer stable selectors (roles, text, data-testids if added)
- Cover happy paths: search, register, generate proposal, open upgrade modal
- Optionally mock API responses when needed for deterministic runs

## GitHub Secrets & Cloudflare Config
- Required: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- Optional: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`

Steps:
1) Create a Cloudflare API token with these permissions:
- Account → Workers Scripts: Edit
- Optionally add D1: Edit, KV: Edit, R2: Edit if you want CI to manage those.

2) Add GitHub Secrets (UI)
- Navigate to `Settings` → `Secrets and variables` → `Actions` → `New repository secret`.
- Add required and optional secrets as listed above.

3) Set Cloudflare Worker secrets directly for local/dev:
```bash
cd api
npx wrangler secret put STRIPE_SECRET_KEY --env production
npx wrangler secret put STRIPE_PUBLISHABLE_KEY --env production
npx wrangler secret put STRIPE_PRICE_ID --env production
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production
```

4) Verify deployment:
```bash
curl https://grant-search-api.sorrowscry86.workers.dev/health
# Expect: { "status": "ok" }
```

## Copilot Do/Don't

### Do
- Use cross-platform commands when possible (bash/PowerShell compatible)
- Keep secrets out of the frontend; add/publicize only publishable config
- Add tests for new endpoints and critical flows before/with changes
- Update docs (README, AI-Comms, this file) when workflows change
- Ensure sensitive files are properly .gitignored before pushing to GitHub
- Ensure `package-lock.json` is committed to ensure consistent dependency installations

### Don't
- Don't inject secrets into `frontend/index.html`
- Don't rely on `process.env` in browser JavaScript
- Don't ship changes without verifying `npm run test` and a clean report
- Don't commit `node_modules/`

## Technology Stack Notes
- **No build process required** for frontend (uses CDN libraries)
- **No linting/formatting tools** configured (just TypeScript for tests)
- **No CI/CD workflows** in repository currently
- **Cloudflare-specific** deployment (requires Cloudflare account)
- **Mock data** used in API (no real federal grant APIs integrated)

This platform targets federal grant automation with a freemium business model ($99/month Pro tier) and success-based fees.

## Quick Links

- Frontend entry: `frontend/index.html`
- API entry: `api/src/index.js`
- Wrangler config: `api/wrangler.toml`
- Playwright config: `playwright.config.ts`
- Tests: `tests/e2e/*`
- Health URL: `https://grant-search-api.sorrowscry86.workers.dev/health`

---

Last updated: 2025-09-24