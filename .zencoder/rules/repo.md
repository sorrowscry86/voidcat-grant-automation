---
description: Repository Information Overview
alwaysApply: true
---

# VoidCat RDC Federal Grant Automation Platform

## Summary
AI-powered federal grant discovery and proposal automation platform for startups and small businesses. The platform helps users find relevant federal grants, generate proposals, and manage applications with a tiered subscription model (Free: 1 grant/month, Pro: $99/month unlimited access).

## Repository Structure
- **api/**: Backend API built with Hono.js on Cloudflare Workers
- **frontend/**: Static frontend site using Alpine.js and Tailwind CSS
- **deploy.sh**: Deployment script for both API and frontend

## Projects

### Backend API (Cloudflare Workers)
**Configuration File**: api/wrangler.toml

#### Language & Runtime
**Language**: JavaScript
**Runtime**: Cloudflare Workers
**Framework**: Hono.js
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- hono: ^4.0.0 (Web framework for Cloudflare Workers)
- stripe: ^15.8.0 (Payment processing)

**Development Dependencies**:
- wrangler: ^3.0.0 (Cloudflare Workers CLI)

#### Build & Installation
```bash
cd api
npm install
npx wrangler deploy --env production
```

#### Infrastructure
**Database**: Cloudflare D1 (SQLite)
- Database Name: voidcat-users
- Database ID: b22bd380-29ca-4a22-be8a-655a382a58a1

**Storage**:
- R2 Bucket: voidcat-assets
- KV Namespace: OAUTH_KV (ID: ae1f4c3087dd4b208a449f7fbd7c93d3)

#### API Endpoints
- GET /health - Health check
- GET /api/grants/search - Search grants
- GET /api/grants/:id - Get grant details
- POST /api/users/register - User registration
- GET /api/users/me - User profile
- POST /api/grants/generate-proposal - AI proposal generation
- POST /api/stripe/create-checkout - Create Stripe checkout session
- POST /api/stripe/webhook - Handle Stripe webhooks

### Frontend (Static Site)
**Main File**: frontend/index.html

#### Language & Runtime
**Language**: HTML, JavaScript
**Framework**: Alpine.js + Tailwind CSS
**Deployment**: GitHub Pages or Cloudflare Pages

#### Dependencies
**Frontend Libraries**:
- Alpine.js (via CDN): Lightweight JavaScript framework
- Tailwind CSS (via CDN): Utility-first CSS framework
- Stripe.js (via CDN): Payment processing

#### Features
- Grant search interface with filtering options
- User registration and authentication
- AI proposal generation
- Subscription management with Stripe integration
- Mobile-responsive design

#### Deployment
```bash
# Option A: GitHub Pages
# Push to GitHub repository
# Enable GitHub Pages from frontend/ directory

# Option B: Cloudflare Pages
# Connect repository to Cloudflare Pages
# Set build directory to frontend/
```

## Deployment
**Deployment Script**: deploy.sh
```bash
# Deploy API
cd api
npm install
npx wrangler deploy --env production

# Test API health
curl -s https://grant-search-api.sorrowscry86.workers.dev/health

# Test grant search
curl -s "https://grant-search-api.sorrowscry86.workers.dev/api/grants/search?query=AI"
```

**Live Endpoints**:
- API: https://grant-search-api.sorrowscry86.workers.dev
- Frontend: GitHub Pages or Cloudflare Pages (TBD)

## Testing Framework
**E2E Testing**: Playwright
**Test Location**: tests/e2e/
**Configuration**: playwright.config.ts