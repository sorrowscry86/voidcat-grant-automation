# API Integration Failure Resolution

**Version**: 1.0.0
**Last Updated**: November 17, 2025
**Owner**: Backend Team
**Severity**: 🟠 HIGH

---

## Purpose

Procedures for diagnosing and resolving failures with external API integrations including federal grant APIs (Grants.gov, SBIR.gov, NSF.gov), Anthropic Claude API, and Stripe.

---

## External Dependencies

| Service | Purpose | Criticality | Status Page |
|---------|---------|-------------|-------------|
| **Grants.gov API** | Federal grant data | HIGH | https://www.grants.gov/web/grants/support/technical-support.html |
| **SBIR.gov API** | SBIR/STTR grant data | MEDIUM | https://www.sbir.gov/ |
| **NSF.gov API** | NSF grant data | MEDIUM | https://status.nsf.gov/ |
| **Anthropic Claude** | AI proposal generation | HIGH | https://status.anthropic.com/ |
| **Stripe** | Payment processing | CRITICAL | https://status.stripe.com/ |
| **Cloudflare** | Infrastructure | CRITICAL | https://www.cloudflarestatus.com/ |

---

## Quick Diagnostics

### Test All Integrations

```bash
# 1. Test federal APIs via admin endpoint
curl -X POST "https://grant-search-api.sorrowscry86.workers.dev/api/admin/grants/ingest" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sources": ["grants.gov", "sbir.gov", "nsf.gov"]}'

# 2. Test Anthropic API (requires API key)
curl -X POST "https://grant-search-api.sorrowscry86.workers.dev/api/grants/generate-ai-proposal" \
  -H "Content-Type: application/json" \
  -d @test-proposal-request.json

# 3. Test Stripe API
curl -X POST "https://grant-search-api.sorrowscry86.workers.dev/api/stripe/create-checkout" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 4. Check API health endpoint
curl https://grant-search-api.sorrowscry86.workers.dev/health/detailed | jq '.services'
```

---

## Scenario 1: Grants.gov API Failure

### Symptoms
- Grant ingestion returns 0 grants from Grants.gov
- Error logs show HTTP 4xx/5xx from Grants.gov
- Data ingestion summary shows `grants.gov: {fetched: 0, inserted: 0}`

### Common Error Codes

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 400 Bad Request | Invalid request format | Check API version, request body |
| 403 Forbidden | API key invalid/missing | Verify API credentials |
| 405 Method Not Allowed | Wrong HTTP method | Check if POST/GET method is correct |
| 429 Too Many Requests | Rate limit exceeded | Implement backoff, wait 60 seconds |
| 500 Internal Server Error | Grants.gov issue | Wait and retry, check status page |
| 503 Service Unavailable | Grants.gov down | Check status page, wait for recovery |

### Troubleshooting Steps

**Step 1: Verify API Endpoint**
```bash
# Check service file
cat api/src/services/grantsGovService.js | grep "api.grants.gov"

# Should be: https://api.grants.gov/v1/api/search2 (2025 API)
# NOT: https://www.grants.gov/grantsws/rest/opportunities/search (deprecated)
```

**Step 2: Test API Directly**
```bash
# Test Grants.gov API manually
curl -X POST "https://api.grants.gov/v1/api/search2" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "technology",
    "oppStatuses": ["forecasted", "posted"]
  }'

# If fails: Check Grants.gov status page
# If succeeds: Issue is in our integration code
```

**Step 3: Check Request Format**
```javascript
// Correct 2025 format (api/src/services/grantsGovService.js)
const response = await fetch('https://api.grants.gov/v1/api/search2', {
  method: 'POST',  // ✅ POST, not GET
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    keyword: query || 'technology',
    oppStatuses: ['forecasted', 'posted']
  })
});

const data = await response.json();
const opportunities = data.oppHits || [];  // ✅ oppHits, not opportunities
```

**Step 4: Implement Rate Limiting**
```javascript
// Add to grantsGovService.js if hitting rate limits
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Before each request
await delay(1000);  // 1 second between requests
```

**Step 5: Fallback Strategy**
- If Grants.gov persistently fails, disable temporarily
- Rely on SBIR.gov and NSF.gov for data
- Re-enable after confirmed recovery

---

## Scenario 2: Anthropic Claude API Failure

### Symptoms
- AI proposal generation returns errors
- Error message: "ANTHROPIC_API_KEY not configured"
- HTTP 401/403 from api.anthropic.com
- Unexpected token usage/costs

### Common Error Codes

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 401 Unauthorized | API key invalid | Check ANTHROPIC_API_KEY env var |
| 429 Too Many Requests | Rate limit hit | Implement backoff, upgrade tier |
| 500 Internal Server Error | Anthropic issue | Retry with exponential backoff |
| 529 Overloaded | Claude API overloaded | Wait and retry, check status |

### Troubleshooting Steps

**Step 1: Verify API Key Configuration**
```bash
# Check if ANTHROPIC_API_KEY is set (via Cloudflare dashboard)
# Environment > Variables > ANTHROPIC_API_KEY

# Test API key validity
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'

# Should return valid response, not 401
```

**Step 2: Check Feature Flag**
```bash
# Verify FEATURE_REAL_AI is enabled
# (via Cloudflare dashboard or wrangler.toml)

# If disabled, AI proposals will use templates
# If enabled, requires valid ANTHROPIC_API_KEY
```

**Step 3: Monitor Token Usage**
```javascript
// Check cost tracking in response
{
  "proposal": {...},
  "metadata": {
    "ai_enhanced": true,
    "total_ai_cost": 0.45,  // USD
    "api_calls": [
      {
        "model": "claude-3-5-sonnet-20241022",
        "input_tokens": 1000,
        "output_tokens": 3000,
        "cost": 0.45
      }
    ]
  }
}
```

**Step 4: Implement Circuit Breaker**
```javascript
// Add to aiProposalService.js
let failureCount = 0;
const MAX_FAILURES = 5;
const CIRCUIT_BREAK_TIME = 300000; // 5 minutes

if (failureCount >= MAX_FAILURES) {
  // Temporarily disable AI, use templates
  console.warn('Circuit breaker open - using templates');
  return this.generateProposal(...);
}

try {
  const result = await callAnthropicAPI(...);
  failureCount = 0;  // Reset on success
  return result;
} catch (error) {
  failureCount++;
  throw error;
}
```

**Step 5: Fallback to Templates**
- If Claude API persistently fails, temporarily disable FEATURE_REAL_AI
- Use template-based proposal generation
- Mark responses with `execution_type: "template"`
- Re-enable after API recovery confirmed

---

## Scenario 3: Stripe Payment Processing Failure

### Symptoms
- Checkout session creation fails
- Webhook signature verification fails
- Subscription upgrades not processing

### Common Error Codes

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 401 Unauthorized | Invalid API key | Check STRIPE_SECRET_KEY |
| 400 Bad Request | Invalid parameters | Verify price_id, customer_email |
| 404 Not Found | Price ID not found | Check STRIPE_PRICE_ID in dashboard |
| 500 Server Error | Stripe issue | Retry, check status page |

### Troubleshooting Steps

**Step 1: Verify Stripe Configuration**
```bash
# Check all Stripe env vars are set
# - STRIPE_SECRET_KEY (sk_live_... or sk_test_...)
# - STRIPE_PUBLISHABLE_KEY
# - STRIPE_WEBHOOK_SECRET
# - STRIPE_PRICE_ID
```

**Step 2: Test Stripe API**
```bash
# Test API key
curl https://api.stripe.com/v1/prices/$STRIPE_PRICE_ID \
  -u $STRIPE_SECRET_KEY:

# Should return price details
```

**Step 3: Verify Webhook Secret**
```bash
# Test webhook endpoint
curl -X POST "https://grant-search-api.sorrowscry86.workers.dev/api/stripe/webhook" \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{}'

# Should return 400 (invalid signature), not 500 (server error)
```

**Step 4: Check Stripe Dashboard**
- Go to https://dashboard.stripe.com
- Check Recent Events for errors
- Verify webhook endpoint is active
- Check price ID is correct and active

**Step 5: Monitor Subscription Upgrades**
```bash
# After checkout.session.completed event
# Verify user upgraded in database
npx wrangler d1 execute VOIDCAT_DB --command "
  SELECT email, subscription_tier, stripe_subscription_id
  FROM users
  WHERE email = 'customer@example.com';
"

# Should show subscription_tier = 'pro'
```

---

## Scenario 4: Rate Limiting Issues

### Symptoms
- 429 Too Many Requests errors
- Intermittent failures during high load
- Some requests succeed, others fail

### Affected Services
- Grants.gov: ~100 requests/hour
- Anthropic Claude: Tier-based (check dashboard)
- Stripe: Generally very high limits

### Solutions

**Implement Exponential Backoff**
```javascript
// Add to all external API calls
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || (2 ** i);
        console.log(`Rate limited, retrying after ${retryAfter}s`);
        await delay(retryAfter * 1000);
        continue;
      }

      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(1000 * (2 ** i));  // Exponential backoff
    }
  }
}
```

**Request Queuing**
```javascript
// For grant ingestion, process in batches
const batchSize = 10;
const delayBetweenBatches = 5000; // 5 seconds

for (let i = 0; i < totalRequests; i += batchSize) {
  const batch = requests.slice(i, i + batchSize);
  await Promise.all(batch.map(r => processRequest(r)));
  await delay(delayBetweenBatches);
}
```

---

## Monitoring & Alerts

### Key Metrics

1. **API Success Rate**: >95% for each integration
2. **Response Time**: <2s for external APIs
3. **Error Rate by Service**: Track 4xx/5xx separately
4. **Rate Limit Hits**: Should be rare (<1% of requests)

### Recommended Alerts

```yaml
# Example alert rules
alerts:
  - name: "Grants.gov API Down"
    condition: grants_gov_success_rate < 50% (over 15 min)
    severity: P1
    action: Check status page, disable temporarily

  - name: "Anthropic API Errors"
    condition: anthropic_error_rate > 10% (over 5 min)
    severity: P1
    action: Check API key, circuit breaker

  - name: "Stripe Payment Failures"
    condition: stripe_checkout_success_rate < 90%
    severity: P0
    action: Immediate investigation, potential revenue loss

  - name: "Rate Limit Approaching"
    condition: rate_limit_429_count > 10 (per hour)
    severity: P2
    action: Implement backoff, upgrade tier
```

---

## Emergency Workarounds

### If Grants.gov is Down
```javascript
// Temporarily disable Grants.gov
// In api/src/services/grantIngestionService.js
const DEFAULT_SOURCES = ['sbir.gov', 'nsf.gov'];  // Remove grants.gov
```

### If Anthropic is Down
```bash
# Disable AI features temporarily
# Set via Cloudflare dashboard:
FEATURE_REAL_AI=false

# All proposals will use templates with execution_type: "template"
```

### If Stripe is Down
- Display maintenance message on pricing/checkout pages
- Queue subscription purchases for manual processing
- Contact Stripe support immediately

---

## Related Runbooks

- [01-emergency-incident-response.md](./01-emergency-incident-response.md) - Overall incident response
- [05-data-ingestion-failure.md](./05-data-ingestion-failure.md) - Federal data ingestion specifics

---

## External Resources

- **Grants.gov API Docs**: https://www.grants.gov/help/html/help/api/api.htm
- **Anthropic API Docs**: https://docs.anthropic.com/claude/reference/
- **Stripe API Docs**: https://stripe.com/docs/api
- **Cloudflare Workers**: https://developers.cloudflare.com/workers/

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-17 | Claude | Initial API integration runbook |

---

**Remember**: External APIs fail. Always have circuit breakers, retries, and fallbacks in place!
