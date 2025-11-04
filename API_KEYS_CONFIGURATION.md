# API Keys Configuration Guide for Production Rollout

## Overview

With the full rollout of NO SIMULATIONS LAW compliance, production now requires **real API keys** for AI services and external data sources.

## Security Best Practices ⚠️

**BEFORE configuring any secrets, review these security guidelines:**

1. **Terminal Security**
   - Ensure your terminal is not being screen-shared or recorded
   - Work in a private, secure environment
   - Consider clearing command history after: `history -c` or `history -d <line_number>`

2. **Key Handling**
   - Never commit API keys to git repositories
   - Never expose keys in logs or error messages
   - Use `wrangler secret put` which prompts for input (keys not echoed to screen)
   - Store backup copies in a secure password manager

3. **Network Security**
   - Use a secure, trusted network connection
   - Avoid public WiFi when configuring production secrets
   - Verify you're connecting to authentic Cloudflare services

4. **Access Control**
   - Only authorized personnel should configure production secrets
   - Rotate keys periodically per security policy
   - Revoke old keys immediately after rotation

## Required Secrets

### 1. AI API Keys (CRITICAL for FEATURE_REAL_AI=true)

#### Anthropic Claude API
```bash
# Get your API key from: https://console.anthropic.com/
npx wrangler secret put ANTHROPIC_API_KEY --env production
```

**OR via GitHub Actions:**
Add `ANTHROPIC_API_KEY` to GitHub repository secrets.

#### OpenAI API (Optional fallback)
```bash
# Get your API key from: https://platform.openai.com/api-keys
npx wrangler secret put OPENAI_API_KEY --env production
```

### 2. Stripe Payment Keys (For subscription processing)

```bash
# Get your keys from: https://dashboard.stripe.com/apikeys
npx wrangler secret put STRIPE_SECRET_KEY --env production
npx wrangler secret put STRIPE_PUBLISHABLE_KEY --env production
npx wrangler secret put STRIPE_PRICE_ID --env production
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production
```

### 3. Federal Grant Data APIs (Optional - for FEATURE_LIVE_DATA=true)

If you have API keys for grants.gov or other federal data sources, configure them:

```bash
# Example: grants.gov API key (if available)
npx wrangler secret put GRANTS_GOV_API_KEY --env production
```

## Verification

After setting secrets, verify they're configured:

```bash
# List configured secrets (won't show values)
cd api
npx wrangler secret list --env production
```

Expected output should show:
- `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`

## Deployment After Configuration

Once secrets are set:

```bash
# Deploy with secrets active
cd api
npx wrangler deploy --env production

# Verify deployment
curl https://grant-search-api.sorrowscry86.workers.dev/health
```

## GitHub Actions Setup

For automated deployments via GitHub Actions, add these secrets to your repository:

**Navigate to**: Repository Settings → Secrets and variables → Actions → New repository secret

**Required Secrets:**
1. `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
2. `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
3. `ANTHROPIC_API_KEY` - Claude API key (for AI generation)
4. `STRIPE_SECRET_KEY` - Stripe secret key
5. `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
6. `STRIPE_PRICE_ID` - Stripe price ID for Pro tier
7. `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret

The GitHub Actions workflow will automatically sync these to Cloudflare secrets on deployment.

## Important Notes

### Security
- ⚠️ **NEVER commit API keys** to git repositories
- ⚠️ **NEVER expose secret keys** in frontend code
- ✅ **ALWAYS use** Cloudflare secrets for sensitive values
- ✅ **ALWAYS use** GitHub secrets for CI/CD workflows

### Cost Management
With FEATURE_REAL_AI=true, AI API calls will incur costs:
- Claude 3.5 Sonnet: ~$0.02-0.05 per proposal generation
- Monitor usage in Anthropic Console: https://console.anthropic.com/

### Fallback Behavior
If API keys are NOT configured but feature flags are enabled:
- AI calls will **FAIL** with proper error messages (NO silent fallbacks)
- Errors will be logged with `execution: "failed"`
- Frontend will receive HTTP 500 with clear error message

This is COMPLIANT with NO SIMULATIONS LAW - better to fail openly than simulate success.

## Testing Secret Configuration

```bash
# Test AI proposal generation (requires ANTHROPIC_API_KEY)
curl -X POST https://grant-search-api.sorrowscry86.workers.dev/api/grants/generate-ai-proposal \
  -H "Content-Type: application/json" \
  -d '{
    "grant_id": "SBIR-25-001",
    "company_profile": {
      "name": "Test Company",
      "description": "AI research startup"
    }
  }'

# Expected: Either real AI response OR proper error (NOT template fallback)
```

## Troubleshooting

### Issue: "API key not found" error
**Solution**: Ensure secrets are set with exact names:
```bash
npx wrangler secret put ANTHROPIC_API_KEY --env production
```

### Issue: "Invalid API key" error
**Solution**: Verify key is valid:
1. Check Anthropic Console for key status
2. Ensure key has necessary permissions
3. Re-create key if necessary

### Issue: Deployment succeeds but AI still returns templates
**Solution**: 
1. Verify wrangler.toml has `FEATURE_REAL_AI = true`
2. Check secrets are configured: `npx wrangler secret list --env production`
3. Re-deploy: `npx wrangler deploy --env production`
4. Check logs in Cloudflare Dashboard

## References

- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

**Remember: Real execution requires real API keys. Zero tolerance for simulation.**
