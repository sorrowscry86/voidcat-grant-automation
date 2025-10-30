# Full Rollout Quick Reference

## What Changed?

### Feature Flags Enabled in Production
```toml
# api/wrangler.toml
[env.production.vars]
FEATURE_LIVE_DATA = true   # ✅ Was: false
FEATURE_REAL_AI = true     # ✅ Was: false
```

## Deployment Commands

### Deploy API with Real Execution
```bash
cd api
npx wrangler deploy --env production
```

### Verify Deployment
```bash
# Quick health check
curl https://grant-search-api.sorrowscry86.workers.dev/health

# Full compliance verification
./scripts/verify-no-simulations-compliance.sh
```

## Required Secrets

### AI API Keys (Must be configured)
```bash
npx wrangler secret put ANTHROPIC_API_KEY --env production
npx wrangler secret put OPENAI_API_KEY --env production
```

### Stripe Keys (For payment processing)
```bash
npx wrangler secret put STRIPE_SECRET_KEY --env production
npx wrangler secret put STRIPE_PUBLISHABLE_KEY --env production
npx wrangler secret put STRIPE_PRICE_ID --env production
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production
```

## API Behavior Changes

### Before Rollout
- Grant search: Returns mock data (7 grants)
- AI proposals: Uses templates
- Response: `execution_type: "mock"` or `execution_type: "template"`

### After Rollout
- Grant search: Returns REAL federal grant data (45+ grants from grants.gov, sbir.gov)
- AI proposals: Uses REAL Claude/GPT-4 APIs
- Response: `execution_type: "real"` or `execution_type: "failed"` (on errors)

## Monitoring

### Check Execution Type
```bash
# Should return "execution_type": "real" in production
curl -s "https://grant-search-api.sorrowscry86.workers.dev/api/grants/search?query=AI" | grep execution_type
```

### View Telemetry (Cloudflare Dashboard)
- Navigate to Workers & Pages → grant-search-api → Logs
- Look for `execution: "real"` markers in log entries
- Monitor for `execution: "failed"` errors

## Rollback (If Needed)

```bash
# 1. Edit api/wrangler.toml
[env.production.vars]
FEATURE_LIVE_DATA = false
FEATURE_REAL_AI = false

# 2. Redeploy
cd api
npx wrangler deploy --env production
```

## Success Indicators

✅ API health check passes  
✅ Grant search returns 40+ grants (real data)  
✅ Responses show `execution_type: "real"`  
✅ AI proposals include cost metadata  
✅ Compliance verification script passes  

## Documentation

- Full details: [FULL_ROLLOUT_DOCUMENTATION.md](./FULL_ROLLOUT_DOCUMENTATION.md)
- Compliance report: [NO_SIMULATIONS_LAW_COMPLIANCE_REPORT.md](./NO_SIMULATIONS_LAW_COMPLIANCE_REPORT.md)
- Deployment guide: [scripts/deploy.sh](./scripts/deploy.sh)

---

**🔒 NO SIMULATIONS. 100% REAL OUTPUT. ZERO TOLERANCE.**
