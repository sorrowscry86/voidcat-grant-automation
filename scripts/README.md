# VoidCat RDC Scripts

This directory contains deployment, testing, and utility scripts for the VoidCat RDC platform.

## Deployment Scripts

### `deploy.sh`
Main deployment script that deploys both API and frontend components.

**Usage:**
```bash
./deploy.sh
```

**Features:**
- Deploys API to Cloudflare Workers
- Validates deployment with health checks
- Tests API endpoints
- Provides deployment status and next steps

### `validate-deployment.sh`
Validates a deployed instance of the platform.

**Usage:**
```bash
./validate-deployment.sh
```

## Testing Scripts

### `comprehensive-live-testing.sh`
Master orchestrator for comprehensive live payment system testing.

**Usage:**
```bash
./comprehensive-live-testing.sh
```

**Features:**
- Runs E2E test suite multiple times for reliability
- Tests live Stripe endpoints
- Validates database state
- Provides automated, repeatable testing

### `run-live-payment-tests.sh`
Focused testing script for payment system validation.

**Usage:**
```bash
./run-live-payment-tests.sh
```

### `test-live-data-fixes.sh`
Tests data handling and mock data validation.

**Usage:**
```bash
./test-live-data-fixes.sh
```

## Utility Scripts

### PowerShell Scripts (Windows Development)

#### `save-stripe-keys.ps1`
Saves Stripe API keys to Cloudflare Workers secrets.

**Usage:**
```powershell
.\save-stripe-keys.ps1
```

#### `retrieve-stripe-keys.ps1`
Retrieves and displays Stripe configuration.

**Usage:**
```powershell
.\retrieve-stripe-keys.ps1
```

### `update-mock-grants.js`
Updates mock grant data for development and testing.

**Usage:**
```bash
node update-mock-grants.js
```

## Script Dependencies

Most scripts require:
- Node.js and npm
- Cloudflare CLI (`wrangler`)
- Valid Cloudflare account credentials
- Stripe account for payment testing

## Environment Setup

Before running scripts, ensure:

1. **API Dependencies Installed:**
   ```bash
   cd api && npm install
   ```

2. **Cloudflare CLI Authenticated:**
   ```bash
   npx wrangler auth
   ```

3. **Environment Variables Configured:**
   Refer to [docs/security/ENVIRONMENT-VARIABLES.md](../docs/security/ENVIRONMENT-VARIABLES.md)

## Security Notes

- Never commit API keys or secrets
- Use PowerShell scripts only in secure development environments
- Always validate deployment endpoints before sharing

For more information, see the main [documentation directory](../docs/).