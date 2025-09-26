# 🔧 Environment Variables Configuration

## Standardized Variable Names

This document defines the standardized environment variable names for the VoidCat Grant Automation Platform and documents precedence when multiple names are used.

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