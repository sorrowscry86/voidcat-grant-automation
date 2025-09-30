# VoidCat RDC Documentation

This directory contains organized documentation for the VoidCat RDC Federal Grant Automation Platform.

## Documentation Structure

### 📋 [Testing Documentation](./testing/)
- **COMPREHENSIVE-TESTING-README.md** - Complete testing infrastructure guide
- **README-TESTING.md** - E2E testing guide with Playwright
- **TESTING_DELEGATION_COMPLETE.md** - Testing environment setup report
- **E2E_FIX_SUMMARY.md** - Test failure analysis and fixes
- **GITHUB_AGENT_OPTIMIZATION_GUIDE.md** - Test optimization instructions
- **Playwright Test Report.md** - Detailed test execution results
- **verification-report.md** - System validation report

### 🚀 [Deployment Documentation](./deployment/)
- **DEPLOYMENT.md** - Complete deployment guide
- **GITHUB-SECRETS-SETUP.md** - GitHub secrets configuration
- **PRODUCTION_READINESS.md** - Production checklist and requirements
- **LAUNCH-STATUS.md** - Current deployment status
- **FIREWALL-CONFIG.md** - Security and firewall configuration

### 🔧 [Enhancement Documentation](./enhancement/)
- **Enhancement Plan.md** - Comprehensive improvement roadmap
- **STRIPE-INTEGRATION-IMPROVEMENTS.md** - Payment system enhancements

### 🔒 [Security Documentation](./security/)
- **SECURITY.md** - Security policies and procedures
- **ENVIRONMENT-VARIABLES.md** - Environment configuration guide

## Quick Start

1. **New Developer Setup**: Start with [DEPLOYMENT.md](./deployment/DEPLOYMENT.md)
2. **Testing**: Refer to [README-TESTING.md](./testing/README-TESTING.md)
3. **Production Deploy**: Follow [PRODUCTION_READINESS.md](./deployment/PRODUCTION_READINESS.md)
4. **Security Setup**: Configure using [ENVIRONMENT-VARIABLES.md](./security/ENVIRONMENT-VARIABLES.md)

## Repository Structure

```
/
├── README.md                 # Main project overview
├── CHANGELOG.md             # Version history
├── LICENSE                  # License information
├── docs/                    # All documentation (this directory)
├── api/                     # Cloudflare Workers API
├── frontend/                # Static frontend application
├── tests/                   # E2E test suite
├── scripts/                 # Deployment and utility scripts
└── package.json            # Root dependencies and test configuration
```

For the main project overview, see the [root README.md](../README.md).