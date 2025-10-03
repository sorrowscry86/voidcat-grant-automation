# GitHub Secrets Configuration Guide

## Required Secrets for VoidCat RDC Grant Automation Platform

This document outlines the GitHub Secrets that need to be configured for proper CI/CD deployment and security.

## Repository Secrets Setup

### Access Repository Secrets
1. Navigate to: `https://github.com/sorrowscry86/voidcat-grant-automation/settings/secrets/actions`
2. Click "New repository secret" for each secret below

### Required Secrets

#### Cloudflare Deployment Secrets
```
CLOUDFLARE_API_TOKEN
Description: Cloudflare API token for Workers deployment
Value: [Your Cloudflare API token with Workers:Edit permissions]
Required for: CI/CD deployment, Wrangler operations
```

```
CLOUDFLARE_ACCOUNT_ID  
Description: Cloudflare account ID for resource management
Value: [Your Cloudflare account ID]
Required for: Workers deployment, D1/KV/R2 access
```

#### AI Service Integration Secrets
```
ANTHROPIC_API_KEY
Description: Claude AI API key for proposal generation
Value: sk-ant-api03-[your-anthropic-key]
Required for: AI-powered proposal generation (Phase 2A)
```

```
OPENAI_API_KEY
Description: OpenAI GPT-4 API key for proposal generation  
Value: sk-proj-[your-openai-key]
Required for: AI-powered proposal generation (Phase 2A)
```

#### Payment Processing Secrets
```
STRIPE_SECRET_KEY
Description: Stripe secret key for payment processing
Value: sk_live_[your-stripe-secret-key] (production) or sk_test_[your-test-key] (testing)
Required for: Pro subscription upgrades
```

```
STRIPE_PUBLISHABLE_KEY
Description: Stripe publishable key (safe for frontend)
Value: pk_live_[your-stripe-publishable-key] (production) or pk_test_[your-test-key] (testing)  
Required for: Frontend payment forms
```

```
STRIPE_WEBHOOK_SECRET
Description: Stripe webhook endpoint secret for security
Value: whsec_[your-webhook-secret]
Required for: Secure webhook verification
```

```
STRIPE_PRICE_ID
Description: Stripe price ID for Pro subscription
Value: price_[your-price-id]
Required for: Pro tier subscription creation
```

### Optional Secrets for Enhanced Features

#### Analytics & Monitoring
```
GOOGLE_ANALYTICS_ID
Description: Google Analytics 4 measurement ID
Value: G-[your-measurement-id]
Required for: User behavior tracking and analytics
```

#### Email Marketing
```
MAILCHIMP_API_KEY
Description: Mailchimp API key for email automation
Value: [your-mailchimp-api-key]
Required for: User onboarding and marketing emails
```

```
MAILCHIMP_LIST_ID  
Description: Mailchimp audience/list ID
Value: [your-list-id]
Required for: Email subscriber management
```

#### Support Infrastructure
```
FRESHDESK_API_KEY
Description: Freshdesk API key for support ticketing
Value: [your-freshdesk-api-key]
Required for: Customer support and knowledge base
```

```
FRESHDESK_DOMAIN
Description: Freshdesk subdomain
Value: [your-subdomain] (e.g., "voidcat-rdc")
Required for: Support API endpoint construction
```

```
CRISP_WEBSITE_ID
Description: Crisp Chat website identifier
Value: [your-crisp-website-id]
Required for: Live chat support integration
```

## Security Best Practices

### Secret Rotation Schedule
- **API Keys**: Rotate every 90 days
- **Payment Keys**: Rotate every 60 days  
- **Auth Tokens**: Rotate every 30 days
- **Webhook Secrets**: Rotate when compromised

### Access Control
- **Repository Access**: Limit to core development team
- **Secret Access**: Admin-only for production secrets
- **Environment Separation**: Separate secrets for staging/production

### Monitoring & Alerts
- Enable GitHub security alerts for exposed secrets
- Monitor API usage for unusual activity
- Set up alerts for failed authentication attempts

## CI/CD Integration

### GitHub Actions Workflow Usage
```yaml
name: Deploy to Cloudflare Workers
on:
  push:
    branches: [master]
    
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy API
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          cd api
          npx wrangler deploy --env production
```

### Local Development
- Use `.env` files for local development (never commit)
- Use `wrangler secret put` commands for Cloudflare Workers
- Reference setup scripts: `scripts/setup-phase2a.ps1` and `scripts/setup-phase2a.sh`

## Verification Checklist

### After Adding Secrets
- [ ] Verify all required secrets are added to GitHub
- [ ] Test CI/CD deployment with new secrets  
- [ ] Confirm API functionality with live keys
- [ ] Validate payment processing in test mode
- [ ] Check analytics and monitoring integration

### Production Readiness
- [ ] All production API keys configured
- [ ] Stripe live keys for payment processing
- [ ] Google Analytics for user tracking
- [ ] Email marketing automation setup
- [ ] Support infrastructure integration

## Troubleshooting

### Common Issues
1. **Secret Not Found**: Ensure exact name matches in workflow files
2. **API Key Invalid**: Verify key format and permissions
3. **Deployment Fails**: Check Cloudflare token permissions
4. **Payment Errors**: Confirm Stripe keys match environment

### Support Resources
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Stripe API Keys](https://stripe.com/docs/keys)

---

**Status**: Configuration Required  
**Priority**: Critical (blocks secure deployment)
**Next Steps**: Add all required secrets to GitHub repository settings