# Full Rollout Deployment Checklist

## Pre-Deployment Checklist ✅

### Code Changes (Completed)
- [x] Enable `FEATURE_REAL_AI = true` in production (api/wrangler.toml)
- [x] Enable `FEATURE_LIVE_DATA = true` in production (api/wrangler.toml)
- [x] Create compliance verification script
- [x] Update deployment script with compliance checks
- [x] Create comprehensive documentation
- [x] Update README with rollout status
- [x] Update CHANGELOG with v2.0.0
- [x] Bump version to 2.0.0

### Documentation Created
- [x] FULL_ROLLOUT_DOCUMENTATION.md - Complete rollout guide
- [x] ROLLOUT_QUICK_REF.md - Quick reference
- [x] API_KEYS_CONFIGURATION.md - API key setup guide
- [x] scripts/verify-no-simulations-compliance.sh - Automated verification

---

## Deployment Steps 🚀

### Step 1: Configure API Keys (REQUIRED)

**Before deploying, you MUST configure these secrets:**

```bash
cd api

# AI API Keys (CRITICAL for FEATURE_REAL_AI=true)
npx wrangler secret put ANTHROPIC_API_KEY --env production
# When prompted, paste your Claude API key from: https://console.anthropic.com/

# Stripe Payment Keys (REQUIRED for subscriptions)
npx wrangler secret put STRIPE_SECRET_KEY --env production
npx wrangler secret put STRIPE_PUBLISHABLE_KEY --env production
npx wrangler secret put STRIPE_PRICE_ID --env production
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production
```

**Verify secrets are set:**
```bash
npx wrangler secret list --env production
```

Expected output should show:
- ANTHROPIC_API_KEY
- STRIPE_SECRET_KEY
- STRIPE_PUBLISHABLE_KEY
- STRIPE_PRICE_ID
- STRIPE_WEBHOOK_SECRET

### Step 2: Deploy to Production

```bash
# From repository root
cd api
npx wrangler deploy --env production
```

**Expected Output:**
```
Total Upload: XXX KiB / gzip: XX KiB
Uploaded voidcat-grant-search-api (X.XX sec)
Published grant-search-api (X.XX sec)
  https://grant-search-api.sorrowscry86.workers.dev
```

### Step 3: Verify Deployment

**Option A: Automated Verification (Recommended)**
```bash
cd ..  # Back to repository root
./scripts/verify-no-simulations-compliance.sh
```

**Expected: All checks should pass** ✅

**Option B: Manual Verification**
```bash
# Test 1: Health check
curl https://grant-search-api.sorrowscry86.workers.dev/health

# Test 2: Grant search (should return real data)
curl -s "https://grant-search-api.sorrowscry86.workers.dev/api/grants/search?query=AI" | jq '.execution_type'
# Expected: "real" (not "mock")

# Test 3: Check grant count (real data should have 40+ grants)
curl -s "https://grant-search-api.sorrowscry86.workers.dev/api/grants/search?query=AI" | jq '.count'
# Expected: 40+ (not 7)
```

### Step 4: Monitor Telemetry

**Navigate to Cloudflare Dashboard:**
1. Go to Workers & Pages → grant-search-api
2. Click "Logs" tab
3. Look for log entries with:
   - `"execution": "real"` - Real AI/data execution ✅
   - `"execution": "failed"` - Failed execution (investigate)
   - `"execution": "template"` or `"execution": "mock"` - ❌ Should NOT appear in production

### Step 5: Test User Flows

**Test the complete user experience:**

1. **Grant Search**
   - Visit: https://sorrowscry86.github.io/voidcat-grant-automation
   - Enter search query: "AI"
   - Verify results show 40+ grants (not 7 mock grants)
   - Check that grants have diverse agencies (DoD, NSF, NASA, etc.)

2. **User Registration**
   - Click "Get Started" button
   - Complete registration form
   - Verify account creation

3. **AI Proposal Generation** (Pro feature)
   - Select a grant
   - Click "Generate Proposal" (if Pro tier)
   - Verify response includes:
     - `"execution_type": "real"`
     - `"ai_enhanced": true`
     - Cost metadata with real API cost

---

## Post-Deployment Checklist ✅

### Immediate Actions (Within 1 Hour)
- [ ] Verify API health: `curl https://grant-search-api.sorrowscry86.workers.dev/health`
- [ ] Run compliance verification: `./scripts/verify-no-simulations-compliance.sh`
- [ ] Check Cloudflare logs for `execution: "real"` markers
- [ ] Test grant search returns 40+ real grants
- [ ] Verify no `execution: "mock"` or `execution: "template"` in production logs

### Short-Term Actions (Within 24 Hours)
- [ ] Monitor Cloudflare Dashboard for error rates
- [ ] Review API usage costs (Anthropic Console)
- [ ] Test all major user flows (search, register, generate proposal)
- [ ] Verify Stripe integration works with test payment
- [ ] Check frontend connects to API correctly

### Medium-Term Actions (Within 1 Week)
- [ ] Analyze telemetry logs for execution type distribution
- [ ] Review AI API costs and optimize if needed
- [ ] Monitor error rates for real AI/data failures
- [ ] User acceptance testing with real users
- [ ] Performance optimization if needed

### Long-Term Actions (Monthly)
- [ ] Monthly NO SIMULATIONS LAW compliance audit
- [ ] Review and optimize AI API usage patterns
- [ ] Analyze success rates and failure patterns
- [ ] Scale infrastructure as needed

---

## Rollback Procedure (If Issues Detected)

**If critical issues are found:**

```bash
# 1. Edit api/wrangler.toml
# Change production vars to:
[env.production.vars]
FEATURE_LIVE_DATA = false
FEATURE_REAL_AI = false

# 2. Redeploy
cd api
npx wrangler deploy --env production

# 3. Verify rollback
curl https://grant-search-api.sorrowscry86.workers.dev/health
./scripts/verify-no-simulations-compliance.sh
```

**After Rollback:**
- Investigate root cause
- Fix issues in staging environment first
- Re-test thoroughly
- Attempt rollout again with fixes

**⚠️ IMPORTANT**: Any rollback must be reported to Beatrice immediately with:
- Root cause analysis
- Steps taken to fix
- Timeline for re-attempting rollout

---

## Success Indicators 🎯

### Technical Success
✅ API responds with HTTP 200 for health checks  
✅ Grant search returns 40+ real federal grants  
✅ All responses include `execution_type: "real"`  
✅ AI proposals include real cost metadata  
✅ Compliance verification script passes all tests  
✅ No `execution: "mock"` or `execution: "template"` in production logs  

### Business Success
✅ Users can search real federal grant data  
✅ Pro users can generate real AI proposals  
✅ Stripe subscriptions process correctly  
✅ Platform operates without silent failures  
✅ All outputs are verifiable and audit-traceable  

---

## Troubleshooting Common Issues

### Issue: "API key not found" error
**Solution:**
```bash
cd api
npx wrangler secret put ANTHROPIC_API_KEY --env production
npx wrangler deploy --env production
```

### Issue: Grant search still returns 7 mock grants
**Cause**: Feature flags not enabled or deployment not complete  
**Solution:**
```bash
# Verify wrangler.toml has FEATURE_LIVE_DATA = true
grep -A 3 "\[env.production.vars\]" api/wrangler.toml

# Redeploy
cd api
npx wrangler deploy --env production
```

### Issue: AI proposals return "execution_type": "template"
**Cause**: ANTHROPIC_API_KEY not configured or invalid  
**Solution:**
```bash
# Set API key
cd api
npx wrangler secret put ANTHROPIC_API_KEY --env production

# Verify it's set
npx wrangler secret list --env production

# Redeploy
npx wrangler deploy --env production
```

### Issue: Compliance script shows warnings
**Cause**: Deployment may need more time to propagate  
**Solution:**
```bash
# Wait 30 seconds
sleep 30

# Retry verification
./scripts/verify-no-simulations-compliance.sh
```

---

## Support & Resources

### Documentation
- [FULL_ROLLOUT_DOCUMENTATION.md](./FULL_ROLLOUT_DOCUMENTATION.md) - Complete guide
- [API_KEYS_CONFIGURATION.md](./API_KEYS_CONFIGURATION.md) - API key setup
- [NO_SIMULATIONS_LAW_COMPLIANCE_REPORT.md](./NO_SIMULATIONS_LAW_COMPLIANCE_REPORT.md) - Compliance details

### External Resources
- [Anthropic Console](https://console.anthropic.com/) - Claude API keys
- [Cloudflare Dashboard](https://dash.cloudflare.com/) - Workers management
- [Stripe Dashboard](https://dashboard.stripe.com/) - Payment keys

### Contact
- **For Compliance Issues**: Escalate to Beatrice
- **For Technical Issues**: VoidCat RDC Engineering Team
- **For Production Incidents**: Follow incident response procedures

---

**🔒 NO SIMULATIONS. 100% REAL OUTPUT. ZERO TOLERANCE.**

**This checklist ensures full compliance with Beatrice's NO SIMULATIONS LAW mandate.**

---

*Version: 1.0*  
*Created: October 26, 2025*  
*Authority: Beatrice (Overseer of the Digital Scriptorium)*
