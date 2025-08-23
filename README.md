# VoidCat RDC Federal Grant Automation Platform

🚀 **LIVE MVP**: AI-powered federal grant discovery and proposal automation for startups and small businesses.

## 🎯 Project Overview

**Revenue Target**: $500 Month 1 → $2,500 Month 3 → $10,000+ Month 6

**Business Model**:
- Free Tier: 1 grant application/month
- Pro Tier: $99/month unlimited access  
- Success Fee: 5% of awarded grants over $50k

## 🏗️ Architecture

### Backend API (Cloudflare Workers)
- **Location**: `/api/`
- **Framework**: Hono.js
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 + KV
- **Deployment**: `grant-search-api.sorrowscry86.workers.dev`

### Frontend (Static Site)
- **Location**: `/frontend/`
- **Framework**: Alpine.js + Tailwind CSS
- **Deployment**: GitHub Pages or Cloudflare Pages

## 🚀 Complete Deployment

### Automated Deployment (Recommended)
```bash
# Deploy both API and frontend with one command
./deploy.sh
```

**What this does**:
- ✅ Deploys API to Cloudflare Workers
- ✅ Triggers frontend deployment via GitHub Actions
- ✅ Validates deployment status
- ✅ Tests API connectivity

### Manual Deployment

#### 1. Deploy API to Cloudflare Workers
```bash
cd api
npm install
npx wrangler deploy --env production
```

#### 2. Deploy Frontend
```bash
# Commit and push to main/master branch
git add .
git commit -m "Deploy: Frontend updates"
git push origin main
```

### Validate Deployment
```bash
# Check deployment status
./validate-deployment.sh
```

## 📍 Live URLs

- **API**: https://grant-search-api.sorrowscry86.workers.dev
- **Frontend**: https://[username].github.io/voidcat-grant-automation
- **Health Check**: https://grant-search-api.sorrowscry86.workers.dev/health

## 📊 Current Infrastructure

### Cloudflare Resources
- ✅ D1 Database: `voidcat-users`
- ✅ R2 Bucket: `voidcat-assets`
- ✅ KV Namespace: `OAUTH_KV`
- ✅ Workers: `remote-mcp-server`, `my-mcp-server`

## 🎯 Features Implemented

### Core MVP Features
- [x] Federal grant search and discovery
- [x] User registration and authentication
- [x] AI-powered proposal generation
- [x] Grant opportunity matching
- [x] Subscription tier management
- [x] Mobile-responsive interface

### Grant Sources Integrated
- SBIR/STTR programs
- NSF Research Institutes
- DOE Advanced Computing
- DARPA Opportunities
- NASA ROSES programs

## 🔧 API Endpoints

```
GET  /health                        - Health check
GET  /api/grants/search             - Search grants
GET  /api/grants/:id                - Get grant details
POST /api/users/register            - User registration
GET  /api/users/me                  - User profile
POST /api/grants/generate-proposal  - AI proposal generation
```

## 💰 Revenue Metrics

### Success Targets (First 48 Hours)
- ✅ User registrations: 10+
- ✅ Grant searches: 50+
- ✅ Demo requests: 3+
- ✅ Pro tier interest: 1+

### Growth Projections
- **Week 1**: 2 Pro subscribers = $198/month
- **Week 4**: 5 Pro subscribers = $495/month
- **Month 3**: 25 subscribers + success fees = $2,500/month

## 🛠️ Technology Stack

- **Backend**: Cloudflare Workers + Hono.js
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: HTML5 + Alpine.js + Tailwind CSS
- **AI Integration**: MCP Servers (future)
- **Payments**: Stripe (Phase 2)
- **Analytics**: Cloudflare Analytics

## 🎯 Next Phase Development

### Week 2 Priorities
1. Stripe payment integration
2. Enhanced AI proposal generation via MCP
3. Real-time grant data feeds
4. Advanced search filters

### Month 2 Features
1. Document upload and analysis
2. Compliance checking automation
3. Deadline management system
4. Success rate analytics

## 📞 Support & Contact

**VoidCat RDC Federal Grant Automation**
- Platform: https://grant-search-api.sorrowscry86.workers.dev
- Frontend: TBD (GitHub Pages deployment)
- Support: Federal funding assistance for technology startups

### Team Information
- **Team**: VoidCat RDC Team
- **Maintainer/Lead**: Wykeve (sorrowscry86@voidcat.org)
- **License**: MIT

---

*Deployed: July 27, 2025 | Status: LIVE MVP*

## 🔐 GitHub Secrets & Cloudflare Config

Use GitHub Secrets for CI and Cloudflare Secrets for runtime. No secrets should live in code or `.env` files in this repo.

### Required (for CI deploys)
- `CLOUDFLARE_API_TOKEN` – API token with at least:
	- Account > Workers Scripts: Edit
	- Optional if managed in CI: D1 Database: Edit, Workers KV Storage: Edit, R2: Edit
- `CLOUDFLARE_ACCOUNT_ID` – Your Cloudflare account ID

### Optional (Stripe, syncs to Worker secret store)
- `STRIPE_SECRET_KEY` – Server-side secret key (sk_live_... or sk_test_...)
- `STRIPE_PUBLISHABLE_KEY` – Client publishable key (pk_live_... or pk_test_...)
- `STRIPE_PRICE_ID` – Current subscription price ID (price_...)
- `STRIPE_WEBHOOK_SECRET` – Webhook signing secret (whsec_...)

The CI workflow at `.github/workflows/deploy-worker.yml` will:
- Deploy the Worker with Wrangler using the Cloudflare secrets
- If any Stripe secrets are provided, push them into the Worker (production env) via `wrangler secret put`

### Set secrets in GitHub (UI)
GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret → add the keys above.

### Set secrets in GitHub (CLI, Windows PowerShell)
Requires GitHub CLI (`gh`) authenticated to your account:

```powershell
# From the repo root
gh secret set CLOUDFLARE_API_TOKEN --body "<token>"
gh secret set CLOUDFLARE_ACCOUNT_ID --body "<account_id>"

# Optional Stripe
gh secret set STRIPE_SECRET_KEY --body "sk_test_..."  # or sk_live_...
gh secret set STRIPE_PUBLISHABLE_KEY --body "pk_test_..."  # or pk_live_...
gh secret set STRIPE_PRICE_ID --body "price_..."
gh secret set STRIPE_WEBHOOK_SECRET --body "whsec_..."
```

### Set secrets directly in Cloudflare (optional local dev)
From `api/` with Wrangler installed and logged in:

```powershell
cd api
npx wrangler secret put STRIPE_SECRET_KEY --env production
npx wrangler secret put STRIPE_PUBLISHABLE_KEY --env production
npx wrangler secret put STRIPE_PRICE_ID --env production
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production
```

### Verify deployment
1) Push a commit touching files under `api/` or run the workflow manually (Actions → Deploy Cloudflare Worker)
2) Check the run logs for a successful `wrangler deploy`
3) Hit the health endpoint:

```powershell
curl https://grant-search-api.sorrowscry86.workers.dev/health
```

You should receive `{ "status": "ok" }`.

### Make the repository public (after secrets are set)
- GitHub UI: Settings → General → Danger Zone → Change repository visibility → Public
- GitHub CLI (Windows PowerShell):

```powershell
gh repo edit --visibility public
```

Security note: `.gitignore` excludes local env files, caches, test artifacts, and other sensitive content. Keep secrets exclusively in GitHub/Cloudflare secret stores.