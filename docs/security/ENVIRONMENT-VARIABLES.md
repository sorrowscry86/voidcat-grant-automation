# 🔧 Environment Variables Configuration

## 🚨 CRITICAL SECURITY REQUIREMENTS

**BREAKING CHANGE**: The following security fixes have been implemented:

### **JWT Authentication Security**
- ✅ **MANDATORY**: `JWT_SECRET_KEY` environment variable is now **REQUIRED** - no fallback allowed
- ✅ **Enforcement**: Application will fail to start if JWT_SECRET_KEY is not provided
- ✅ **Production Ready**: No hardcoded secrets remain in the codebase

```bash
# CRITICAL: JWT Secret Key (REQUIRED - NO FALLBACK)
JWT_SECRET_KEY="your-256-bit-secret-key-here"  # MUST be provided, minimum 32 characters
JWT_ACCESS_TOKEN_TTL="3600"    # 1 hour (seconds)
JWT_REFRESH_TOKEN_TTL="604800" # 7 days (seconds)
```

### **Enhanced Password Security**
- ✅ **Secure Reset Tokens**: Cryptographically secure random tokens (no predictable JSON encoding)
- ✅ **Token Hashing**: Reset tokens are hashed before database storage
- ✅ **Timing Attack Protection**: Constant-time comparison for all token/password verification

```bash
# Password Security Configuration
PASSWORD_HASH_ITERATIONS="100000"      # PBKDF2 iterations (minimum 100,000)
PASSWORD_MIN_LENGTH="8"                # Minimum password length
PASSWORD_MAX_LENGTH="128"              # Maximum password length
PASSWORD_REQUIRE_COMPLEXITY="true"     # Enforce complexity requirements
PASSWORD_RESET_TOKEN_TTL_MINUTES="60"  # Reset token expiration (minutes)
```

### **Admin Access Control**
- ✅ **Configuration-Based**: Admin access now controlled via environment variables
- ✅ **Security Logging**: Unauthorized admin access attempts are logged
- ✅ **No Hardcoded Logic**: Removed hardcoded admin email patterns

```bash
# Dashboard Admin Configuration (REQUIRED for admin access)
DASHBOARD_ADMIN_EMAILS="admin@voidcat.org,another-admin@company.com"
METRICS_RETENTION_DAYS="30"
DASHBOARD_ENABLE_EXPORTS="true"
DASHBOARD_ENABLE_REALTIME="true" 
DASHBOARD_MAX_EXPORT_RECORDS="10000"
```

### **Stripe Integration Security**
- ✅ **Subscription Logic**: Implemented missing subscription upgrade functionality
- ✅ **Database Updates**: Proper user tier upgrades after successful payments
- ✅ **Security Logging**: Payment events logged with telemetry

```bash
# Stripe Configuration (Required for payments)
STRIPE_SECRET_KEY="sk_live_..." # or sk_test_...
STRIPE_PUBLISHABLE_KEY="pk_live_..." # or pk_test_...
STRIPE_PRICE_ID="price_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

## 📋 Complete Environment Variables List

### Stripe Configuration Variables

#### Primary Variables (Use These)
```bash
# Stripe Secret Key (server-side)
STRIPE_SECRET_KEY="sk_live_..." # or sk_test_...

# Stripe Publishable Key (client-side) 
STRIPE_PUBLISHABLE_KEY="pk_live_..." # or pk_test_...

# Stripe Price ID for Pro subscription
STRIPE_PRICE_ID="price_..."

# Stripe Webhook Secret for signature verification
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Email Service Configuration Variables

#### Primary Variables (Use These)
```bash
# Email provider selection (mailchannels or resend)
MAIL_PROVIDER="mailchannels"

# From email address for outbound emails
MAIL_FROM="noreply@voidcat.org"

# MailChannels DKIM private key (for email authentication)
MAILCHANNELS_DKIM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Resend API key (if using Resend provider)
RESEND_API_KEY="re_..."
```

### Telemetry Configuration Variables

#### Primary Variables (Use These)
```bash
# Logging level (DEBUG, INFO, WARN, ERROR)
LOG_LEVEL="INFO"

# External telemetry endpoint (optional)
TELEMETRY_ENDPOINT="https://analytics.voidcat.org/collect"
```

### Rate Limiting Configuration Variables

#### Primary Variables (Use These)
```bash
# Rate limit per minute for proposal generation
RATE_LIMIT_PER_MIN="12"

# Rate limit per minute for search requests
SEARCH_RATE_LIMIT_PER_MIN="60"

# Rate limit per hour for user registration
REGISTRATION_RATE_LIMIT_PER_HOUR="5"
```

### Application Configuration Variables

#### Primary Variables (Use These)
```bash
# Application environment (development, production)
ENVIRONMENT="production"

# Service name and version
SERVICE_NAME="VoidCat Grant Search API"
API_VERSION="1.0.0"

# CORS allowed origins (comma-separated)
CORS_ORIGINS="https://voidcat.org,https://www.voidcat.org,https://sorrowscry86.github.io"
```

### Data Source Configuration Variables

#### Primary Variables (Use These)
```bash
# Enable live data fetching from grants.gov
USE_LIVE_DATA="true"
ENABLE_LIVE_DATA="true"

# Live data API URLs (optional - defaults provided)
GRANTS_GOV_API_URL="https://api.grants.gov/v1/api/search2"
SBIR_API_URL="https://www.sbir.gov/api/opportunities.json"
NSF_API_URL="https://www.nsf.gov/awardsearch/download.jsp"

# SAM.gov Opportunities API (Public API with key)
# Register for a free API key at SAM.gov → Account Details
SAM_API_KEY="your_sam_gov_api_key"

# Live data timeout in milliseconds
LIVE_DATA_TIMEOUT="15000"
```

### Validation Configuration Variables

#### Primary Variables (Use These)
```bash
# Maximum lengths for user inputs
MAX_SEARCH_QUERY_LENGTH="200"
MAX_NAME_LENGTH="100"
MIN_NAME_LENGTH="2"
MAX_COMPANY_LENGTH="200"
MAX_GRANT_ID_LENGTH="50"
```

### Feature Flags Configuration Variables

#### Primary Variables (Use These)
```bash
# Feature toggles
ENABLE_EMAIL_NOTIFICATIONS="true"
ENABLE_ADVANCED_FILTERS="false"
ENABLE_PROPOSAL_GENERATION="true"
ENABLE_RATE_LIMITING="true"
ENABLE_TELEMETRY="true"
ENABLE_REQUEST_LOGGING="true"
ENABLE_PERFORMANCE_METRICS="true"
ENABLE_ERROR_TRACKING="true"
```

#### Legacy/Alternative Names (Deprecated)
```bash
# These are supported for backward compatibility but deprecated:
STRIPE_SK              # Legacy name for STRIPE_SECRET_KEY
STRIPE_PUBLIC_KEY      # Legacy name for STRIPE_PUBLISHABLE_KEY
STRIPE_PRODUCT_PRICE_ID # Legacy name for STRIPE_PRICE_ID
STRIPE_WH_SECRET       # Legacy name for STRIPE_WEBHOOK_SECRET
```

### Required Environment Variables Summary

#### Production Deployment Requirements
```bash
# Essential for payment processing
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_PRICE_ID="price_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Essential for email notifications
MAIL_PROVIDER="mailchannels"
MAIL_FROM="noreply@yourdomain.com"
MAILCHANNELS_DKIM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."

# Recommended for monitoring
# Tier 4 Advanced Features Variables

## JWT Authentication Configuration
```bash
# JWT secret key for token signing (CRITICAL - must be secure in production)
JWT_SECRET_KEY="your-secure-jwt-secret-key-minimum-256-bits"

# JWT token expiration times (in seconds)
JWT_ACCESS_TOKEN_TTL="3600"     # 1 hour (default)
JWT_REFRESH_TOKEN_TTL="604800"  # 7 days (default)
```

## Password Security Configuration
```bash
# Password hashing parameters
PASSWORD_HASH_ITERATIONS="100000"  # PBKDF2 iterations (default)
PASSWORD_MIN_LENGTH="8"            # Minimum password length
PASSWORD_MAX_LENGTH="128"          # Maximum password length
```

## Metrics & Dashboard Configuration
```bash
# Metrics collection settings
ENABLE_METRICS="true"              # Enable/disable metrics collection
METRICS_RETENTION_DAYS="30"        # How long to keep metrics data

# Dashboard access control
DASHBOARD_ADMIN_EMAILS="admin@voidcat.org,sorrowscry86@users.noreply.github.com"
```

## Enhanced Email Configuration
```bash
# Email service provider selection
MAIL_PROVIDER="mailchannels"       # "mailchannels" or "resend"
MAIL_FROM="noreply@voidcat.org"

# MailChannels configuration (for Cloudflare Workers)
MAILCHANNELS_DKIM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
MAILCHANNELS_DKIM_SELECTOR="mailchannels"

# Resend configuration (alternative provider)
RESEND_API_KEY="re_..."
```

## Rate Limiting Enhancement
```bash
# Extended rate limiting configuration
RATE_LIMIT_PER_MIN="12"                    # Proposal generation limit
SEARCH_RATE_LIMIT_PER_MIN="60"            # Search queries limit
REGISTRATION_RATE_LIMIT_PER_HOUR="5"      # Registration attempts limit
LOGIN_RATE_LIMIT_PER_HOUR="20"            # Login attempts limit
```

## Feature Flags (Tier 4)
```bash
# Advanced feature toggles
ENABLE_JWT_AUTH="true"             # Enable JWT authentication
ENABLE_PASSWORD_AUTH="true"        # Enable password-based authentication
ENABLE_DASHBOARD="true"            # Enable metrics dashboard
ENABLE_ADVANCED_METRICS="true"    # Enable detailed analytics
ENABLE_PASSWORD_RESET="true"       # Enable password reset functionality
```

## Security Headers Configuration
```bash
# Enhanced security headers
SECURITY_HEADERS_ENABLED="true"
CONTENT_SECURITY_POLICY="default-src 'self'; script-src 'self' 'unsafe-inline'"
PERMISSIONS_POLICY="geolocation=(), microphone=(), camera=()"
REFERRER_POLICY="strict-origin-when-cross-origin"
```

LOG_LEVEL="INFO"
RATE_LIMIT_PER_MIN="12"
```

## Variable Precedence

When multiple variable names are present, the system follows this precedence order:

### 1. Stripe Secret Key
1. `STRIPE_SECRET_KEY` (primary)
2. `STRIPE_SK` (fallback)

### 2. Stripe Publishable Key
1. `STRIPE_PUBLISHABLE_KEY` (primary)
2. `STRIPE_PUBLIC_KEY` (fallback)

### 3. Stripe Price ID
1. `STRIPE_PRICE_ID` (primary)
2. `STRIPE_PRODUCT_PRICE_ID` (fallback)

### 4. Stripe Webhook Secret
1. `STRIPE_WEBHOOK_SECRET` (primary)
2. `STRIPE_WH_SECRET` (fallback)

## Configuration Methods

### 1. Cloudflare Workers (Production)
```bash
# Set via Wrangler CLI
npx wrangler secret put STRIPE_SECRET_KEY --env production
npx wrangler secret put STRIPE_PUBLISHABLE_KEY --env production
npx wrangler secret put STRIPE_PRICE_ID --env production
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production
```

### 2. GitHub Actions (CI/CD)
```bash
# Set via GitHub CLI
gh secret set STRIPE_SECRET_KEY --body "sk_live_..."
gh secret set STRIPE_PUBLISHABLE_KEY --body "pk_live_..."
gh secret set STRIPE_PRICE_ID --body "price_..."
gh secret set STRIPE_WEBHOOK_SECRET --body "whsec_..."
```

### 3. Local Development (.env)
```bash
# Create .env file in api/ directory
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Error Handling

The system provides specific error messages when variables are missing or invalid:

### Missing Secret Key
```json
{
  "success": false,
  "error": "Payment system is currently unavailable. Please contact support if this issue persists.",
  "code": "STRIPE_CONFIG_ERROR"
}
```

### Missing Price ID
```json
{
  "success": false,
  "error": "Payment system configuration error. Please contact support.",
  "code": "STRIPE_PRICE_CONFIG_ERROR"
}
```

### Missing Webhook Secret
```json
{
  "success": false,
  "error": "Webhook authentication error",
  "code": "WEBHOOK_CONFIG_ERROR"
}
```

## Validation

To verify your configuration is correct:

```bash
# Test API health
curl https://grant-search-api.sorrowscry86.workers.dev/health

# Test Stripe configuration (requires valid API key)
curl -X POST https://grant-search-api.sorrowscry86.workers.dev/api/stripe/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## Migration Guide

### From Legacy Variables
If you're currently using legacy variable names, update them:

```bash
# OLD (deprecated)
STRIPE_SK=sk_live_...
STRIPE_PUBLIC_KEY=pk_live_...

# NEW (standardized)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Frontend Updates
Update your frontend code to use the standardized publishable key:

```javascript
// OLD
const stripe = Stripe('pk_live_YOUR_PUBLISHABLE_KEY_HERE');

// NEW - Use environment-specific configuration
const stripe = Stripe(window.STRIPE_PUBLISHABLE_KEY || 'pk_live_YOUR_PUBLISHABLE_KEY_HERE');
```

## Security Best Practices

1. **Never commit secrets to version control**
2. **Use different keys for test and production environments**
3. **Rotate keys regularly**
4. **Monitor for unauthorized usage**
5. **Use webhook secrets to verify authenticity**

## Troubleshooting

### Common Issues

#### 1. "Payment system is currently unavailable"
- Check that `STRIPE_SECRET_KEY` is set
- Verify the key format starts with `sk_live_` or `sk_test_`
- Ensure the key has proper permissions

#### 2. "Webhook signature verification failed"
- Verify `STRIPE_WEBHOOK_SECRET` is correctly configured
- Check that the webhook endpoint URL is correct in Stripe Dashboard
- Ensure the signature is being passed in the request header

#### 3. "Invalid price ID"
- Confirm `STRIPE_PRICE_ID` matches your Stripe Dashboard
- Verify the price is active and not archived
- Check the price is for the correct product

### Debug Commands
```bash
# Check environment variables are set (in production worker)
npx wrangler secret list --env production

# Test webhook locally
npx stripe listen --forward-to localhost:8787/api/stripe/webhook
```