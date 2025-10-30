# Changelog

All notable changes to the VoidCat RDC Federal Grant Automation Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-10-26 - NO SIMULATIONS LAW FULL ROLLOUT 🔒

### Breaking Changes
- **PRODUCTION ROLLOUT**: Enabled REAL AI and LIVE DATA in production (NO SIMULATIONS LAW compliance)
- `FEATURE_REAL_AI = true` in production - All AI operations now use real Claude/GPT-4 APIs
- `FEATURE_LIVE_DATA = true` in production - All data fetches now use real federal grant APIs
- **Zero tolerance** for simulated outputs - All failures result in proper errors (no silent fallbacks)

### Added
- **NO SIMULATIONS LAW Compliance**: Complete enforcement of 100% real output mandate
- `FULL_ROLLOUT_DOCUMENTATION.md` - Comprehensive rollout documentation
- `ROLLOUT_QUICK_REF.md` - Quick reference guide for deployment
- `API_KEYS_CONFIGURATION.md` - Guide for configuring required API keys
- `scripts/verify-no-simulations-compliance.sh` - Automated compliance verification script
- **Transparent Execution Markers**: All API responses now include `execution_type` field
  - `"execution_type": "real"` - Real AI/data execution
  - `"execution_type": "failed"` - Execution failed (with proper error)
  - `"execution_type": "template"` - Template fallback (only when FEATURE_REAL_AI=false)
  - `"execution_type": "mock"` - Mock data (only when FEATURE_LIVE_DATA=false)

### Changed
- **Production Feature Flags**: Enabled in `api/wrangler.toml`
  - `FEATURE_REAL_AI: false → true`
  - `FEATURE_LIVE_DATA: false → true`
- **Deployment Script**: Enhanced with NO SIMULATIONS LAW compliance verification
- **README.md**: Updated with rollout status and compliance badge

### Required Actions for Production
⚠️ **CRITICAL**: Configure these secrets before deployment:
```bash
npx wrangler secret put ANTHROPIC_API_KEY --env production
npx wrangler secret put STRIPE_SECRET_KEY --env production
npx wrangler secret put STRIPE_PUBLISHABLE_KEY --env production
npx wrangler secret put STRIPE_PRICE_ID --env production
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production
```

### Security
- ✅ All AI execution now verifiable through telemetry logs
- ✅ All data sources transparently marked in responses
- ✅ Failures throw proper errors (HTTP 500/503) instead of silent fallbacks
- ✅ Compliance verification enforced in deployment pipeline

### References
- See: [NO_SIMULATIONS_LAW_COMPLIANCE_REPORT.md](./NO_SIMULATIONS_LAW_COMPLIANCE_REPORT.md)
- See: [FULL_ROLLOUT_DOCUMENTATION.md](./FULL_ROLLOUT_DOCUMENTATION.md)
- Authority: Beatrice (Overseer of the Digital Scriptorium)

---

## [1.1.0] - 2024-09-29

### Changed
- **Repository Organization**: Complete restructuring of project files for better maintainability
- **Documentation Structure**: Reorganized all documentation into categorized directories under `docs/`
  - `docs/testing/` - All testing documentation and guides
  - `docs/deployment/` - Deployment instructions and configuration
  - `docs/enhancement/` - Enhancement plans and improvements
  - `docs/security/` - Security policies and environment setup
- **Scripts Centralization**: Moved all deployment and utility scripts to dedicated `scripts/` directory
- **Root Directory Cleanup**: Removed temporary and redundant files from repository root

### Removed
- Temporary development files (`test-validation.js`, `debug-frontend.js`, etc.)
- Orphaned artifacts (`tatus`, `tatus --porcelain`)
- Redundant documentation files
- Development testing utilities no longer needed

### Added
- Comprehensive documentation navigation in `docs/README.md`
- Script documentation in `scripts/README.md`
- Enhanced `.gitignore` to prevent future accumulation of temporary files

## [1.0.0] - 2024-07-27

### Added
- Initial MVP release
- Federal grant search and discovery
- User registration and authentication
- AI-powered proposal generation
- Grant opportunity matching
- Subscription tier management (Free: 1 grant/month, Pro: $99/month)
- Mobile-responsive interface
- Stripe payment integration
- Legal compliance documents (Privacy Policy, Terms of Service)

### Security
- Implemented secure Stripe integration
- CORS configuration with restricted origins
- Environment variables managed through Cloudflare Workers secrets

## [0.9.0] - 2025-07-20

### Added
- Pre-release testing version
- Comprehensive test suite with Playwright
- End-to-end testing for all core features

### Fixed
- Resolved responsive design issues on mobile devices
- Fixed authentication token handling
- Improved error handling for API requests

## [0.8.0] - 2025-07-15

### Added
- Beta version with initial payment processing
- Stripe integration for subscription management
- Usage limiting for free tier accounts

### Changed
- Improved UI/UX for grant search results
- Enhanced proposal generation with better AI prompts