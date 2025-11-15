# Stripe Keys Setup - Quick Reference 🔑

**Current Status**: Everything ready. Just need Stripe keys to launch!

---

## Get Your Stripe Keys 📋

1. Go to: https://dashboard.stripe.com/apikeys
2. Copy these 4 values:
   - Secret key (starts with `sk_live_...`)
   - Publishable key (starts with `pk_live_...`)
   - Price ID (starts with `price_...`) - Create a product first if needed
   - Webhook secret (starts with `whsec_...`) - From Webhooks section

---

## Set Stripe Secrets (5 Minutes) ⚡

```bash
cd api

# 1. Secret Key
npx wrangler secret put STRIPE_SECRET_KEY --env production
# Paste when prompted: sk_live_...

# 2. Publishable Key
npx wrangler secret put STRIPE_PUBLISHABLE_KEY --env production
# Paste when prompted: pk_live_...

# 3. Price ID
npx wrangler secret put STRIPE_PRICE_ID --env production
# Paste when prompted: price_...

# 4. Webhook Secret
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production
# Paste when prompted: whsec_...
```

---

## Generate Admin Token (1 Minute) 🔐

```bash
# Generate secure token
openssl rand -hex 32

# Copy the output (64 characters)
# SAVE THIS IN PASSWORD MANAGER!

# Set as secret
npx wrangler secret put ADMIN_TOKEN --env production
# Paste the token when prompted
```

---

## Deploy Everything (2 Minutes) 🚀

```bash
npx wrangler deploy --env production
```

---

## Initialize Database (3 Minutes) 💾

```bash
# Set environment variables
$env:API_URL = "https://grant-search-api.sorrowscry86.workers.dev"
$env:ADMIN_TOKEN = "paste-your-admin-token-here"

# Initialize schema
node ../scripts/populate-grants-db.js init

# Populate with grants
node ../scripts/populate-grants-db.js full
```

---

## Verify It Works (2 Minutes) ✅

```bash
# Test search
curl "https://grant-search-api.sorrowscry86.workers.dev/api/grants/search?query=AI"

# Check stats
node ../scripts/populate-grants-db.js stats
```

---

## 🎉 DONE! You're Live!

**Total Time**: ~15 minutes
**Next**: Monitor Cloudflare dashboard for traffic

---

## Need Help?

See `PRODUCTION-DEPLOYMENT-READY.md` for detailed troubleshooting.
