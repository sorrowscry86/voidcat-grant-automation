# Production Deployment - Ready to Launch 🚀

**Status**: Database system integrated and backed up to GitHub. Ready for Stripe keys and deployment.

**Commit**: `ff3bc2a` - Database population system with automated refresh

---

## Pre-Deployment Checklist ✅

- ✅ **Database Population System**: Integrated and committed
- ✅ **Multi-Source Ingestion**: Grants.gov, SBIR.gov, NSF.gov ready
- ✅ **Automated Refresh**: Daily cron at 2 AM UTC configured
- ✅ **Admin API**: Bearer token authentication implemented
- ✅ **CLI Tool**: Manual database operations ready
- ✅ **Documentation**: Comprehensive guides created
- ✅ **Code Backup**: Pushed to GitHub (commit ff3bc2a)
- ⏳ **Stripe Keys**: Waiting for configuration
- ⏳ **Admin Token**: Needs generation
- ⏳ **Database Initialization**: Ready to execute
- ⏳ **Production Deployment**: Ready to deploy

---

## Step 1: Configure Stripe Secrets (You're Here!) 🔑

```bash
cd api

# Get your keys from https://dashboard.stripe.com/apikeys
npx wrangler secret put STRIPE_SECRET_KEY --env production
# Paste: sk_live_...

npx wrangler secret put STRIPE_PUBLISHABLE_KEY --env production
# Paste: pk_live_...

npx wrangler secret put STRIPE_PRICE_ID --env production
# Paste: price_...

npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production
# Paste: whsec_...
```

---

## Step 2: Generate and Set Admin Token 🔐

```bash
# Generate secure random token (32 bytes = 64 hex characters)
openssl rand -hex 32

# Set as Cloudflare secret
npx wrangler secret put ADMIN_TOKEN --env production
# Paste the generated token

# SAVE THIS TOKEN SECURELY - You'll need it for database operations
```

⚠️ **CRITICAL**: Save the admin token in a secure password manager. You'll need it to:
- Initialize the database schema
- Manually trigger data ingestion
- Check database statistics
- Clean up stale data

---

## Step 3: Deploy to Production 🚀

```bash
cd api
npx wrangler deploy --env production
```

Expected output:
```
✨ Successfully published your Worker
   https://grant-search-api.sorrowscry86.workers.dev
```

---

## Step 4: Initialize Database Schema 💾

```bash
# Set environment variables for CLI tool
$env:API_URL = "https://grant-search-api.sorrowscry86.workers.dev"
$env:ADMIN_TOKEN = "your-admin-token-here"

# Initialize database schema
node scripts/populate-grants-db.js init
```

Expected output:
```
✅ Database schema initialized successfully
Tables created: grants, grants_fts
Indexes created: idx_grants_deadline, idx_grants_agency
```

---

## Step 5: Populate Grant Database 📊

```bash
# Full ingestion from all sources (Grants.gov, SBIR.gov, NSF.gov)
node scripts/populate-grants-db.js full

# This will:
# - Fetch from 3 federal sources
# - Deduplicate results
# - Store in D1 database
# - Takes 30-60 seconds
# - Expect 400-600+ grants
```

Expected output:
```
🔍 Ingesting from all sources...
✅ Ingestion complete: 487 grants stored
📊 Database statistics: 487 total grants
```

---

## Step 6: Verify Production System ✅

### 6.1 Test Grant Search
```bash
curl "https://grant-search-api.sorrowscry86.workers.dev/api/grants/search?query=AI&agency=defense"
```

Expected: JSON with live federal grants

### 6.2 Test Database Statistics
```bash
node scripts/populate-grants-db.js stats
```

Expected:
```
📊 Grant Database Statistics:
Total grants: 487
Federal agencies: 8
Latest update: 2025-11-15T...
```

### 6.3 Verify Automated Refresh
Check Cloudflare dashboard → Workers → Cron Triggers:
- Should show: `0 2 * * *` (Daily at 2 AM UTC)
- Next run: Tomorrow at 2:00 AM UTC

### 6.4 Test Stripe Integration
1. Visit your frontend
2. Click "Upgrade to Pro"
3. Complete test checkout: Card `4242 4242 4242 4242`
4. Verify webhook received in Cloudflare logs

---

## Database System Features 🎯

### Automated Daily Refresh
- **Schedule**: 2 AM UTC daily
- **Sources**: Grants.gov, SBIR.gov, NSF.gov
- **Process**: Fetch → Deduplicate → Update → Cache
- **Monitoring**: Check Cloudflare Workers logs

### Manual Operations (CLI Tool)
```bash
# Show help
node scripts/populate-grants-db.js help

# Initialize schema
node scripts/populate-grants-db.js init

# Ingest from all sources
node scripts/populate-grants-db.js full

# Check statistics
node scripts/populate-grants-db.js stats

# Clean up stale data (>90 days old)
node scripts/populate-grants-db.js cleanup

# Ingest from specific source
node scripts/populate-grants-db.js ingest
```

### Admin API Endpoints
All require `Authorization: Bearer <ADMIN_TOKEN>` header:

- `POST /api/admin/grants/init-schema` - Initialize database
- `POST /api/admin/grants/ingest` - Trigger manual ingestion
- `GET /api/admin/grants/ingestion-stats` - View statistics
- `POST /api/admin/grants/cleanup` - Clean old data
- `GET /api/admin/health` - Admin health check

---

## Live Data Sources 📡

### Grants.gov API
- **Endpoint**: `https://api.grants.gov/v1/api/search2`
- **Authentication**: None required (public API)
- **Data**: Federal grant opportunities across all agencies
- **Update Frequency**: Daily via our cron job

### SBIR.gov API
- **Endpoint**: `https://www.sbir.gov/api/opportunities.json`
- **Authentication**: None required (public API)
- **Data**: Small Business Innovation Research grants
- **Update Frequency**: Daily via our cron job

### NSF.gov API
- **Endpoint**: `https://www.nsf.gov/services/v1/awards.json`
- **Authentication**: None required (public API)
- **Data**: National Science Foundation awards
- **Update Frequency**: Daily via our cron job

---

## Monitoring & Maintenance 📊

### Cloudflare Dashboard Checks
1. **Workers Analytics**: Request volume, errors, latency
2. **D1 Database**: Query performance, storage usage
3. **KV Namespace (FEDERAL_CACHE)**: Cache hit rate (target: >70%)
4. **Cron Triggers**: Execution history and success rate

### Daily Health Checks
```bash
# Run this daily to verify system health
curl https://grant-search-api.sorrowscry86.workers.dev/health/detailed

# Check database stats
node scripts/populate-grants-db.js stats

# Verify cache performance (should see cache hits)
curl "https://grant-search-api.sorrowscry86.workers.dev/api/grants/search?query=AI"
# Look for: "fromCache": true in subsequent requests
```

### Weekly Maintenance
- Review Cloudflare logs for errors
- Check database growth rate
- Verify automated refresh is running
- Monitor cache hit rates
- Review user feedback and usage patterns

---

## Troubleshooting 🔧

### Issue: Database schema not initialized
**Solution**: Run `node scripts/populate-grants-db.js init`

### Issue: No grants returned from search
**Solution**: Run `node scripts/populate-grants-db.js full` to populate

### Issue: Admin API returns 401 Unauthorized
**Solution**: Verify `ADMIN_TOKEN` secret is set in Cloudflare

### Issue: Scheduled ingestion not running
**Solution**: Check cron trigger in wrangler.toml and Cloudflare dashboard

### Issue: Stale data in search results
**Solution**: Run `node scripts/populate-grants-db.js cleanup` then `ingest`

---

## Security Notes 🔒

### Admin Token Security
- **Generate**: Use `openssl rand -hex 32` (64 characters)
- **Store**: Save in password manager
- **Distribution**: Only share with authorized admins
- **Rotation**: Rotate every 90 days
- **Never**: Commit to git or expose in logs

### Bearer Authentication
- All admin endpoints require `Authorization: Bearer <token>` header
- Tokens are validated against Cloudflare secret `ADMIN_TOKEN`
- Default/placeholder tokens are rejected
- Failed attempts are logged for security monitoring

### API Rate Limiting
- Search: 100 requests/minute per IP
- Proposal generation: 10 requests/minute per API key
- Admin operations: No rate limit (protected by bearer token)

---

## Production URLs 🌐

- **API**: https://grant-search-api.sorrowscry86.workers.dev
- **Health Check**: https://grant-search-api.sorrowscry86.workers.dev/health
- **Search**: https://grant-search-api.sorrowscry86.workers.dev/api/grants/search
- **Admin Health**: https://grant-search-api.sorrowscry86.workers.dev/api/admin/health

---

## Support & Documentation 📚

- **Database Docs**: `docs/DATABASE-POPULATION.md` (comprehensive guide)
- **Quick Reference**: `docs/DATABASE-POPULATION-QUICKREF.md`
- **API Docs**: `docs/API-REFERENCE.md`
- **Deployment Guide**: `REVENUE_READY_DEPLOYMENT.md`
- **GitHub**: https://github.com/sorrowscry86/voidcat-grant-automation

---

## Next Steps 📋

**Current Status**: ✅ Database system integrated and backed up

**Waiting For**: 🔑 Stripe keys from dashboard

**Once You Have Stripe Keys**:
1. Run Step 1 commands above to set Stripe secrets
2. Generate and set admin token (Step 2)
3. Deploy to production (Step 3)
4. Initialize database (Step 4)
5. Populate grant data (Step 5)
6. Verify everything works (Step 6)
7. 🎉 **GO LIVE!**

**Time to Production**: ~15 minutes after Stripe keys are configured

---

**Questions?** Check the documentation or review error logs in Cloudflare dashboard.

🚀 **READY FOR PRODUCTION DEPLOYMENT!** 🚀
