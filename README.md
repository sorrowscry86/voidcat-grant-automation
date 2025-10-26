# VoidCat RDC Federal Grant Automation Platform

AI-powered federal grant discovery and proposal automation platform built with Cloudflare Workers API and static frontend.

## 🔒 NO SIMULATIONS LAW - PRODUCTION ACTIVE

**Status**: ✅ **COMPLIANT** - Full rollout complete (October 26, 2025)

This platform operates under **100% REAL OUTPUT ONLY** mandate:
- ✅ Real AI execution via Claude/GPT-4 APIs (`FEATURE_REAL_AI = true`)
- ✅ Real federal grant data from live sources (`FEATURE_LIVE_DATA = true`)
- ✅ Zero tolerance for simulated outputs in production
- ✅ All responses include transparent execution type markers

See [NO_SIMULATIONS_LAW_COMPLIANCE_REPORT.md](./NO_SIMULATIONS_LAW_COMPLIANCE_REPORT.md) and [FULL_ROLLOUT_DOCUMENTATION.md](./FULL_ROLLOUT_DOCUMENTATION.md) for details.

---

## 🚀 Features

- Federal grant search and discovery
- AI-powered proposal generation
- Compliance automation and validation
- Freemium business model with success-based fees
- Comprehensive E2E testing (230+ tests)
- Production-ready architecture

### Backend API (Cloudflare Workers)

- **Location**: `/api/`
- **Framework**: Hono.js
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 + KV
- **Authentication**: API Key-based

### Frontend (Static Site)

- **Location**: `/frontend/`
- **Framework**: Alpine.js + Tailwind CSS (CDN)
- **Deployment**: GitHub Pages or Cloudflare Pages
- **Features**: Responsive design, real-time search, payment integration, dark mode

---

## 🚀 Quick Deploy

1. **Deploy API to Cloudflare Workers:**

   ```bash
   cd api
   npx wrangler deploy --env production  # Takes 30-60 seconds
   ```

2. **Deploy Frontend:**

   **Option A: GitHub Pages**
   
   - Push to GitHub repository
   - Enable GitHub Pages from Settings → Pages

   **Option B: Cloudflare Pages**
   
   - Connect repository to Cloudflare Pages
   - Deploy from `/frontend/` directory

**Live Endpoints:**

- **API**: <https://grant-search-api.sorrowscry86.workers.dev>
- **Frontend**: <https://sorrowscry86.github.io/voidcat-grant-automation>

---

## 📊 Current Infrastructure

### Cloudflare Resources

- ✅ D1 Database: `voidcat-users`
- ✅ KV Namespace: `FEDERAL_CACHE`
- ✅ R2 Bucket: `voidcat-assets`
- ✅ Workers: API deployed to production

---

## 🎯 Features Implemented

### Core MVP Features

- [x] Federal grant search and discovery
- [x] User registration and authentication
- [x] AI-powered proposal generation
- [x] Grant opportunity matching
- [x] Subscription tier management
- [x] Mobile-responsive interface
- [x] Dark mode toggle with localStorage persistence ✨ NEW

### Intelligent Discovery Engine ✨ NEW

- [x] 11 federal agency SBIR/STTR portal integration
- [x] Semantic analysis with 0-100% matching scores
- [x] Real-time technical alignment assessment
- [x] Automated deadline tracking
- [x] Strategic application calendar

### AI-Powered Proposal Generation ✨ NEW

- [x] Natural language processing of requirements
- [x] Template-based compliance checking
- [x] Agency-specific format validation
- [x] Dynamic content generation
- [x] Iterative refinement framework

### Compliance Automation ✨ NEW

- [x] Automatic eligibility validation
- [x] FAR cost principles budget generation
- [x] Required certifications checklist
- [x] Pre-submission compliance review

### Grant Sources Integrated

- SBIR/STTR programs (11 federal agencies)
- NSF Research Institutes
- DOE Advanced Computing
- DARPA Opportunities
- NASA ROSES programs

## 🔧 API Endpoints

### Core Endpoints

```http
GET  /health                        - Health check
GET  /api/grants/search             - Search grants
GET  /api/grants/:id                - Get grant details
POST /api/users/register            - User registration
GET  /api/users/me                  - User profile
POST /api/grants/generate-proposal  - AI proposal generation
```

### Discovery Engine Endpoints ✨ NEW

```http
GET  /api/grants/federal-agencies           - List 11 federal agency portals
POST /api/grants/analyze-match              - Calculate 0-100% matching score
POST /api/grants/application-timeline       - Generate strategic timeline
GET  /api/grants/strategic-calendar         - Get application calendar
```

### Compliance Automation Endpoints ✨ NEW

```http
POST /api/grants/validate-eligibility       - Validate eligibility requirements
POST /api/grants/generate-budget-justification - FAR-compliant budget
GET  /api/grants/certifications-checklist   - Required certifications
POST /api/grants/pre-submission-review      - Pre-submission compliance
```

### AI Proposal Endpoints ✨ NEW

```http
POST /api/grants/generate-ai-proposal       - AI-powered proposal generation
GET  /api/grants/agency-template            - Agency-specific templates
```

## 📚 Documentation

### Quick Links

- **[Complete Documentation](./docs/)** - Organized documentation directory
- **[Dark Mode Feature](./docs/DARK-MODE-FEATURE.md)** - Dark mode implementation and user guide ✨ NEW
- **[Visual Improvements](./docs/VISUAL-IMPROVEMENTS.md)** - UI/UX enhancements summary ✨ NEW
- **[Deployment Guide](./docs/deployment/)** - Production deployment instructions
- **[Testing Guide](./docs/testing/)** - E2E testing with Playwright
- **[Security Guide](./docs/security/)** - Environment variables and security
- **[Enhancement Plan](./docs/enhancement/)** - Platform improvements roadmap

### Repository Structure

```text
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

## 📈 Project Metrics

### Platform Statistics

- ✅ 230+ comprehensive E2E tests
- ✅ Multiple federal agency integrations
- ✅ AI-powered proposal generation
- ✅ Production-ready deployment

## 🛠️ Technology Stack

- **Backend**: Cloudflare Workers + Hono.js
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: HTML5 + Alpine.js + Tailwind CSS
- **AI Integration**: MCP Servers (future)
- **Payments**: Stripe (Phase 2)
- **Analytics**: Cloudflare Analytics

## 📞 Support & Contact

**VoidCat RDC Federal Grant Automation**

- Platform: <https://grant-search-api.sorrowscry86.workers.dev>
- Frontend: <https://sorrowscry86.github.io/voidcat-grant-automation>
- Support: Federal funding assistance for technology startups

### Team Information

- **Team**: VoidCat RDC Team
- **Maintainer/Lead**: Wykeve (sorrowscry86@voidcat.org)
- **License**: MIT

---

*Last Updated: October 3, 2025 | Status: LIVE MVP | Version 1.1.0*

## Recent Updates (v1.1.0)

🧹 **Repository Organization**: Complete restructuring for better maintainability

- Organized all documentation into categorized `docs/` directories
- Centralized deployment and utility scripts in `scripts/` directory
- Cleaned up temporary files and redundant documentation
- Enhanced project structure for easier navigation and development