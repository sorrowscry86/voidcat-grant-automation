# VoidCat RDC Federal Grant Automation Platform

🚀 **LIVE MVP**: AI-powered federal grant discovery and proposal automation for startups and small businesses.

## 🎯 Project Overview

**Revenue Target**: $500 Month 1 → $2,500 Month 3 → $10,000+ Month 6

**Business Model**:
- Free Tier: 1 grant application/month
- Pro Tier: $99/month unlimited access  
- Success Fee: 5% of awarded grants over $50k

**Current Status**: Production-ready MVP with organized codebase and comprehensive documentation structure.

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

### Automated Deployment

```bash
# Deploy everything with one command
./scripts/deploy.sh
```

### Manual Steps

1. **Deploy API to Cloudflare Workers:**
```bash
cd api
npm install
npx wrangler deploy --env production
```

2. **Deploy Frontend:**

**Option A: GitHub Pages**
- Push to GitHub repository
- Enable GitHub Pages from `frontend/` directory

**Option B: Cloudflare Pages**
- Connect repository to Cloudflare Pages
- Set build directory to `frontend/`

**Live URLs**:
- **API**: https://grant-search-api.sorrowscry86.workers.dev
- **Frontend**: https://sorrowscry86.github.io/voidcat-grant-automation

For detailed deployment instructions, see [docs/deployment/](./docs/deployment/).

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

---

## 📚 Documentation

### Quick Links
- **[Complete Documentation](./docs/)** - Organized documentation directory
- **[Deployment Guide](./docs/deployment/)** - Production deployment instructions  
- **[Testing Guide](./docs/testing/)** - E2E testing with Playwright
- **[Security Guide](./docs/security/)** - Environment variables and security
- **[Enhancement Plan](./docs/enhancement/)** - Platform improvements roadmap

### Repository Structure
```
/
├── README.md                 # This file - project overview
├── CHANGELOG.md              # Version history and updates
├── LICENSE                   # MIT license
├── docs/                     # 📚 Organized documentation by category
│   ├── testing/             # Testing guides and reports  
│   ├── deployment/          # Production deployment instructions
│   ├── enhancement/         # Platform improvement plans
│   └── security/            # Security policies and environment setup
├── api/                      # 🔧 Cloudflare Workers API
├── frontend/                 # 🎨 Static frontend application  
├── tests/                    # 🧪 E2E test suite (Playwright)
├── scripts/                  # 🚀 Deployment and utility scripts
└── package.json             # Root dependencies and test configuration
```

## 💰 Revenue Metrics & Targets

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

## 📞 Support & Contact

**VoidCat RDC Federal Grant Automation**
- Platform: https://grant-search-api.sorrowscry86.workers.dev
- Frontend: https://sorrowscry86.github.io/voidcat-grant-automation
- Support: Federal funding assistance for technology startups

### Team Information
- **Team**: VoidCat RDC Team
- **Maintainer/Lead**: Wykeve (sorrowscry86@voidcat.org)
- **License**: MIT

---

*Last Updated: September 29, 2024 | Status: LIVE MVP | Version 1.1.0*

## Recent Updates (v1.1.0)

🧹 **Repository Organization**: Complete restructuring for better maintainability
- Organized all documentation into categorized `docs/` directories
- Centralized deployment and utility scripts in `scripts/` directory  
- Cleaned up temporary files and redundant documentation
- Enhanced project structure for easier navigation and development