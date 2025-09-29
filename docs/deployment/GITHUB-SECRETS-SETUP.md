# 🔐 GitHub Secrets Setup Guide

This guide explains how to set up the required GitHub Secrets for automatic Cloudflare Worker deployment.

## ✅ Required Secrets

The following secrets **must** be configured for the deployment workflow to work:

### 1. CLOUDFLARE_API_TOKEN
**Required for deploying to Cloudflare Workers**
- Go to [Cloudflare API Tokens](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- Click "Create Token"
- Use the "Custom token" template
- Required permissions:
  - `Account` → `Workers Scripts:Edit`
  - `Account` → `Account Settings:Read` (for account ID)
- Account Resources: Include your account
- Zone Resources: All zones (or specific zones if preferred)

### 2. CLOUDFLARE_ACCOUNT_ID
**Required for resource identification**
- Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
- On the right sidebar, copy your "Account ID"
- It looks like: `1234567890abcdef1234567890abcdef`

## 🔧 Optional Secrets (Stripe Integration)

These are only needed if you want Stripe payment functionality:

### STRIPE_SECRET_KEY
- Your Stripe secret key (starts with `sk_live_` or `sk_test_`)

### STRIPE_PUBLISHABLE_KEY
- Your Stripe publishable key (starts with `pk_live_` or `pk_test_`)

### STRIPE_PRICE_ID
- Your Stripe price ID for subscriptions (starts with `price_`)

### STRIPE_WEBHOOK_SECRET
- Your Stripe webhook signing secret (starts with `whsec_`)

## 🚀 How to Add Secrets to GitHub

### Option 1: GitHub Web Interface
1. Go to your repository on GitHub
2. Click **Settings** tab
3. In left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret with its name and value
6. Click **Add secret**

### Option 2: GitHub CLI
```bash
# Required secrets
gh secret set CLOUDFLARE_API_TOKEN --body "your-api-token-here"
gh secret set CLOUDFLARE_ACCOUNT_ID --body "your-account-id-here"

# Optional Stripe secrets
gh secret set STRIPE_SECRET_KEY --body "sk_test_or_live_key"
gh secret set STRIPE_PUBLISHABLE_KEY --body "pk_test_or_live_key"
gh secret set STRIPE_PRICE_ID --body "price_your_price_id"
gh secret set STRIPE_WEBHOOK_SECRET --body "whsec_your_webhook_secret"
```

## ✅ Verification

After adding secrets, you can verify the setup by:

1. **Triggering a deployment:**
   - Push changes to the `api/` directory
   - Or go to **Actions** tab → **Deploy Cloudflare Worker (API)** → **Run workflow**

2. **Check the workflow output:**
   - Green checkmark ✅ = Success
   - Red X ❌ = Check logs for specific errors

3. **Test the API:**
   ```bash
   curl https://grant-search-api.sorrowscry86.workers.dev/health
   # Should return: {"status": "ok"}
   ```

## 🔍 Troubleshooting

### Error: "CLOUDFLARE_API_TOKEN secret is not set"
- The secret is missing or empty
- Add it following steps above
- Make sure there are no extra spaces in the token

### Error: "Authentication failed"
- The API token may be invalid or expired
- Regenerate the token in Cloudflare Dashboard
- Ensure token has correct permissions (Workers Scripts: Edit)

### Error: "Account ID not found"
- Double-check the Account ID from Cloudflare Dashboard
- Make sure you copied the full ID without spaces

### Deployment succeeds but API not accessible
- Wait a few minutes for DNS propagation
- Check if the worker name matches in `wrangler.toml`
- Verify the worker is deployed in Cloudflare Dashboard → Workers & Pages

## 📚 Additional Resources

- [Cloudflare API Token Documentation](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

---

**Need Help?** Check the GitHub Actions logs for specific error messages and consult this guide.