# Phase 2A Monitoring & Dashboards Guide

**Date:** October 3, 2025  
**Status:** Production Ready  
**Purpose:** Monitor Phase 2A features (live data, AI, caching)

## Overview

Phase 2A introduces live federal data integration and AI-powered proposal generation. This requires careful monitoring of costs, performance, and system health.

## Key Metrics to Monitor

### 1. AI Costs (Critical for ROI)

**Target:** <$0.60 per proposal  
**Monthly Budget:** $2,500 for 5K proposals  
**Alert Threshold:** Daily costs > $100

**Metrics:**
- Claude Sonnet 4 usage and costs (~$0.32/proposal)
- GPT-4 Turbo usage and costs (~$0.18/proposal)  
- Cost per proposal trend
- Monthly cost projection

**Monitoring Method:**
```javascript
// In aiProposalService.js - Cost logging
console.log('[AI_COST]', {
  timestamp: new Date().toISOString(),
  model: modelName,
  tokens: usage,
  cost: calculatedCost,
  proposal_id: proposalId
});
```

### 2. Cache Performance

**Target:** >60% cache hit rate  
**Storage:** KV namespace `FEDERAL_CACHE`  
**TTL:** 12 hours

**Metrics:**
- Cache hit rate percentage
- Cache miss frequency  
- Average response time (cached vs uncached)
- KV storage usage trends

**Monitoring Method:**
```javascript
// In dataService.js - Cache logging
console.log('[CACHE_PERF]', {
  timestamp: new Date().toISOString(),
  cache_hit: cacheHit,
  source: dataSource,
  query: queryHash
});
```

### 3. External API Health

**Primary:** Grants.gov API  
**Secondary:** SBIR.gov API  
**Target:** >95% success rate

**Metrics:**
- API response times
- Success/failure rates
- Retry frequency
- Fallback usage percentage

**Monitoring Method:**
```javascript
// In dataService.js - API health logging
console.log('[API_HEALTH]', {
  timestamp: new Date().toISOString(),
  source: 'grants.gov',
  success: response.ok,
  response_time: responseTime,
  status_code: response.status
});
```

### 4. System Performance

**Target:** <3s response time (p95)  
**Error Rate:** <5%

**Metrics:**
- Response time percentiles (p50, p95, p99)
- Error rates by endpoint
- Request volume trends
- Worker execution time

## Implementation Options

### Option A: Cloudflare Analytics Dashboard (Recommended)

**Setup:**
1. Enable Cloudflare Analytics for the Worker
2. Configure custom metrics via Analytics API
3. Create dashboard views in Cloudflare

**Custom Metrics:**
```javascript
// Add to worker code
env.analytics?.writeDataPoint({
  blobs: ['ai-cost'],
  doubles: [cost],
  indexes: [modelName]
});

env.analytics?.writeDataPoint({
  blobs: ['cache-performance'],
  doubles: [hitRate],
  indexes: ['federal-cache']
});
```

### Option B: Log-based Monitoring

**Setup:**
1. Enable Cloudflare Logpush for the Worker
2. Configure log retention (7-30 days)
3. Parse logs for metrics extraction

**Log Queries:**
```bash
# Daily AI costs
grep "[AI_COST]" logs.json | jq '.cost' | awk '{sum+=$1} END {print sum}'

# Cache hit rate
grep "[CACHE_PERF]" logs.json | jq '.cache_hit' | grep true | wc -l
```

### Option C: External Service (Production Ready)

**Recommended:** Grafana Cloud (free tier)
**Setup:**
1. Configure Cloudflare Logpush to external endpoint
2. Set up Grafana dashboards
3. Configure alerts via email/Slack

## Alert Configuration

### Critical Alerts (Immediate Action)
- Daily AI costs > $100
- Cache hit rate < 40% for 1 hour
- API success rate < 80% for 15 minutes
- Response time p95 > 5s for 10 minutes

### Warning Alerts (Monitor Closely)
- Daily AI costs > $75
- Cache hit rate < 50% for 30 minutes  
- API success rate < 90% for 10 minutes
- Error rate > 3% for 15 minutes

## Cost Tracking Dashboard

### Daily View
- Total AI costs today
- Cost per proposal (rolling average)
- Projection to monthly budget
- Cost breakdown by model (Claude vs GPT-4)

### Weekly View  
- Cost trends
- Cache efficiency impact on costs
- Usage patterns
- Budget burn rate

### Monthly View
- Total costs vs budget
- ROI analysis (revenue vs AI costs)
- Cost optimization opportunities
- Growth projections

## Performance Dashboard

### Real-time Metrics
- Current response times
- Active requests
- Cache hit rate (last hour)
- API health status

### Historical Trends
- Response time trends (7 days)
- Error rate patterns
- Traffic growth
- Feature adoption (live data vs mock)

## Implementation Timeline

### Phase 1: Basic Logging (Week 1)
- [x] Implement cost and cache logging in code
- [ ] Configure Cloudflare Analytics
- [ ] Set up basic dashboards

### Phase 2: Alerting (Week 2)  
- [ ] Configure critical alerts
- [ ] Set up notification channels
- [ ] Test alert responsiveness

### Phase 3: Advanced Analytics (Week 3-4)
- [ ] Historical trend analysis
- [ ] Cost optimization recommendations
- [ ] Performance bottleneck identification

## Rollout Monitoring Strategy

### Week 1: Staging Validation
- Monitor all metrics in staging environment
- Validate cost projections with real usage
- Test alert thresholds

### Week 2: Production Live Data (25%)
**Monitor Closely:**
- External API success rates
- Cache performance impact
- Response time changes
- User experience feedback

### Week 3: Production Live Data (100%)
**Key Metrics:**
- Cost per request vs projections
- Cache hit rate optimization
- API reliability patterns

### Week 4: Production AI Features (Beta)
**Critical Monitoring:**
- AI costs per proposal
- Generation success rates
- User satisfaction scores
- Revenue impact

### Week 5: Full Production Rollout
**Success Criteria:**
- AI costs <$0.60/proposal
- Cache hit rate >60%
- API success rate >95%
- User satisfaction >90%

## Troubleshooting Runbook

### High AI Costs
1. Check cost per proposal trend
2. Analyze token usage patterns
3. Optimize prompts if needed
4. Consider model alternatives
5. Implement usage limits if necessary

### Low Cache Hit Rate
1. Verify KV namespace configuration
2. Check cache key generation logic
3. Analyze query patterns
4. Adjust TTL if needed
5. Monitor KV storage limits

### API Failures
1. Check external API status pages
2. Verify retry logic is working
3. Confirm fallback to mock data
4. Monitor rate limits
5. Contact API providers if needed

### Poor Performance
1. Analyze response time patterns
2. Check Worker execution time
3. Identify slow queries
4. Optimize database operations
5. Consider caching improvements

## Success Metrics

### Technical KPIs
- Cache hit rate: >60%
- API success rate: >95%
- Response time p95: <3s
- Error rate: <5%

### Business KPIs  
- AI cost per proposal: <$0.60
- Monthly AI budget adherence: <$2,500
- User satisfaction: >90%
- Revenue per user: >$99/month

### Operational KPIs
- Alert response time: <15 minutes
- Issue resolution time: <2 hours
- Uptime: >99.9%
- Deployment frequency: Weekly safe releases

## Tools & Resources

### Cloudflare Tools
- Workers Analytics
- Logpush
- KV Analytics
- D1 Analytics

### External Tools
- Grafana Cloud (free tier)
- DataDog (paid)
- New Relic (paid)
- Custom scripts for log analysis

### Documentation
- Cloudflare Analytics API docs
- Workers monitoring best practices
- KV performance optimization guide

---

**Next Steps:**
1. Implement basic logging (Week 1)
2. Configure Cloudflare Analytics
3. Set up critical alerts
4. Monitor staging environment
5. Begin gradual production rollout

**Owner:** VoidCat RDC Development Team  
**Contact:** SorrowsCry86@voidcat.org  
**Last Updated:** October 3, 2025