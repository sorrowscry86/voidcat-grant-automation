# Changelog

All notable changes to the VoidCat RDC Federal Grant Automation Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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