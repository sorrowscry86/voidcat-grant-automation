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

## 🚀 Quick Deployment

### 1. Deploy API to Cloudflare Workers
```bash
cd api
npm install
npx wrangler deploy --env production
```

### 2. Deploy Frontend
**Option A: GitHub Pages**
- Push to GitHub repository
- Enable GitHub Pages from `frontend/` directory

**Option B: Cloudflare Pages**
- Connect repository to Cloudflare Pages
- Set build directory to `frontend/`

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