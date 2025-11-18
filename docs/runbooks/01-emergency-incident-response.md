# Emergency Incident Response Runbook

**Version**: 1.0.0
**Last Updated**: November 17, 2025
**Owner**: DevOps Team
**Severity**: 🔴 CRITICAL

---

## Purpose

This runbook provides step-by-step procedures for responding to critical production incidents affecting the VoidCat Grant Automation Platform.

---

## Severity Levels

| Level | Symbol | Response Time | Description |
|-------|--------|---------------|-------------|
| P0 | 🔴 CRITICAL | < 15 minutes | Complete service outage, data loss risk |
| P1 | 🟠 HIGH | < 30 minutes | Major functionality impaired, significant user impact |
| P2 | 🟡 MEDIUM | < 2 hours | Partial functionality degraded, workaround available |
| P3 | 🔵 LOW | < 24 hours | Minor issues, minimal user impact |

---

## Incident Response Checklist

### Step 1: Assess & Triage (0-5 minutes)

- [ ] **Confirm the incident**
  ```bash
  # Check API health
  curl https://grant-search-api.sorrowscry86.workers.dev/health

  # Check detailed health
  curl https://grant-search-api.sorrowscry86.workers.dev/health/detailed
  ```

- [ ] **Determine severity level** (P0/P1/P2/P3)
  - P0: API completely down (5xx > 90%)
  - P1: Database unavailable or major endpoint failing
  - P2: Specific feature broken or slow response times
  - P3: Minor bug or cosmetic issue

- [ ] **Check Cloudflare dashboard**
  - Go to https://dash.cloudflare.com
  - Navigate to Workers > grant-search-api
  - Review error rates and metrics

- [ ] **Initial notification**
  ```
  # Post to #incidents Slack channel
  🚨 INCIDENT DETECTED
  Severity: [P0/P1/P2/P3]
  Summary: [Brief description]
  Impact: [User-facing impact]
  Status: Investigating
  ```

### Step 2: Contain & Stabilize (5-15 minutes)

- [ ] **If P0/P1: Consider rollback**
  ```bash
  # Check recent deployments
  cd api
  npx wrangler deployments list

  # Rollback to previous version if needed
  npx wrangler rollback [deployment-id]
  ```

- [ ] **If database issue: Switch to read-only mode**
  - Disable write operations temporarily
  - Prevent data corruption

- [ ] **Enable maintenance mode (if necessary)**
  - Update frontend to show maintenance message
  - Preserve user sessions if possible

- [ ] **Gather logs**
  ```bash
  # View Worker logs
  npx wrangler tail --format pretty

  # Check specific time range
  npx wrangler tail --since 15m
  ```

### Step 3: Investigate Root Cause (15-30 minutes)

- [ ] **Check recent changes**
  ```bash
  # Review recent commits
  git log --oneline --since="1 day ago"

  # Check deployed version
  curl https://grant-search-api.sorrowscry86.workers.dev/ | jq '.version'
  ```

- [ ] **Review error patterns**
  - Check Cloudflare Analytics for error spike timing
  - Identify affected endpoints
  - Look for patterns in error messages

- [ ] **Database connectivity**
  ```bash
  # Test database connection
  curl -X GET "https://grant-search-api.sorrowscry86.workers.dev/health/detailed" | jq '.database'
  ```

- [ ] **External dependencies**
  - Check status pages:
    - https://www.cloudflarestatus.com/
    - https://status.stripe.com/
    - https://status.anthropic.com/
  - Test federal API endpoints manually

- [ ] **Environment variables**
  ```bash
  # Verify critical env vars are set (via Cloudflare dashboard)
  # - VOIDCAT_DB
  # - ADMIN_TOKEN
  # - STRIPE_SECRET_KEY
  # - ANTHROPIC_API_KEY
  ```

### Step 4: Implement Fix (30-60 minutes)

- [ ] **Deploy hotfix**
  ```bash
  # Create hotfix branch
  git checkout -b hotfix/incident-[date]

  # Make fix, test locally
  npm run dev

  # Deploy to production
  cd api
  npx wrangler deploy

  # Verify fix
  curl https://grant-search-api.sorrowscry86.workers.dev/health
  ```

- [ ] **If configuration issue**
  - Update environment variables in Cloudflare dashboard
  - Restart Worker (redeploy)

- [ ] **If database issue**
  - Follow Database Recovery Runbook (02-database-recovery.md)

- [ ] **Monitor for 15 minutes**
  - Watch error rates decrease
  - Check key endpoints functioning
  - Verify user reports improving

### Step 5: Communicate & Document (60+ minutes)

- [ ] **Update stakeholders**
  ```
  # Post to #incidents
  ✅ INCIDENT RESOLVED
  Severity: [P0/P1/P2/P3]
  Duration: [start time - end time]
  Root Cause: [brief description]
  Fix Applied: [what was done]
  Monitoring: Ongoing for next 24 hours
  ```

- [ ] **Create incident postmortem** (within 48 hours)
  - Timeline of events
  - Root cause analysis
  - Lessons learned
  - Action items to prevent recurrence

- [ ] **Update monitoring/alerts** (if needed)
  - Add new alerts for this scenario
  - Adjust thresholds

- [ ] **Schedule follow-up meeting** (within 1 week)
  - Review postmortem
  - Assign action items
  - Update runbooks

---

## Common Incident Scenarios

### Scenario 1: Complete API Outage (P0)

**Symptoms**:
- All requests returning 5xx errors
- Health check fails

**Likely Causes**:
1. Cloudflare Workers issue (check status page)
2. Recent deployment broke critical path
3. Database binding broken
4. Worker script exceeds CPU/memory limits

**Quick Fix**:
```bash
# Immediate rollback
cd api
npx wrangler rollback

# If that fails, redeploy last known good version
git checkout [last-good-commit]
npx wrangler deploy
```

---

### Scenario 2: Database Unavailable (P0/P1)

**Symptoms**:
- `/health/detailed` shows `database.connected: false`
- Search endpoints returning errors

**Likely Causes**:
1. D1 database binding misconfigured
2. Database migration failed
3. Cloudflare D1 service issue

**Quick Fix**:
```bash
# Check binding
npx wrangler d1 list

# Verify schema
npx wrangler d1 execute VOIDCAT_DB --command "SELECT name FROM sqlite_master WHERE type='table';"

# See Database Recovery Runbook for full procedure
```

---

### Scenario 3: High Error Rate on Specific Endpoint (P1)

**Symptoms**:
- One endpoint consistently failing
- Other endpoints working

**Likely Causes**:
1. New code bug in that endpoint
2. External dependency down (e.g., Stripe, Anthropic API)
3. Rate limiting hit

**Quick Fix**:
```bash
# Test endpoint directly
curl -X POST "https://grant-search-api.sorrowscry86.workers.dev/api/grants/generate-ai-proposal" \
  -H "Content-Type: application/json" \
  -d @test-payload.json

# Check external dependency status
# Anthropic: https://status.anthropic.com/
# Stripe: https://status.stripe.com/

# If code bug: rollback deployment
npx wrangler rollback
```

---

### Scenario 4: Slow Response Times (P2)

**Symptoms**:
- Requests taking >1000ms (normal <100ms)
- No errors, but timeouts

**Likely Causes**:
1. Database query performance degraded
2. External API slow
3. Worker CPU throttling
4. Cache not working

**Quick Fix**:
```bash
# Check database query performance
# (via detailed health endpoint)
curl https://grant-search-api.sorrowscry86.workers.dev/health/detailed

# Review slow queries in logs
npx wrangler tail | grep "slow query"

# Clear KV cache if stale
# (via admin endpoint)
curl -X DELETE "https://grant-search-api.sorrowscry86.workers.dev/api/admin/cache/clear" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Emergency Contacts

| Role | Name | Contact | Primary On-Call Hours |
|------|------|---------|----------------------|
| Tech Lead | TBD | TBD | 24/7 (P0 only) |
| DevOps Lead | TBD | TBD | 24/7 (P0/P1) |
| Backend Lead | TBD | TBD | Business hours |
| Security Lead | TBD | TBD | On-call rotation |

---

## Escalation Path

1. **P3 incidents**: Assigned engineer handles, notifies team lead
2. **P2 incidents**: On-call engineer + team lead notified
3. **P1 incidents**: Full team notified, tech lead oversees
4. **P0 incidents**: All hands on deck, immediate escalation to leadership

---

## Post-Incident Actions

### Immediate (< 24 hours)
- [ ] Verify fix is stable
- [ ] Remove any temporary workarounds
- [ ] Update status page
- [ ] Thank team members who responded

### Short-term (< 1 week)
- [ ] Complete postmortem document
- [ ] Review and update this runbook
- [ ] Implement quick wins to prevent recurrence
- [ ] Schedule team postmortem meeting

### Long-term (< 1 month)
- [ ] Implement preventive measures
- [ ] Add automated tests for this scenario
- [ ] Update monitoring and alerting
- [ ] Review similar systems for same vulnerability

---

## Related Runbooks

- [02-database-recovery.md](./02-database-recovery.md) - Database recovery procedures
- [03-performance-troubleshooting.md](./03-performance-troubleshooting.md) - Performance issue diagnosis
- [04-api-integration-failure.md](./04-api-integration-failure.md) - External API failure handling
- [05-data-ingestion-failure.md](./05-data-ingestion-failure.md) - Federal API ingestion issues

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-17 | Claude | Initial runbook creation |

---

**Remember**: In a crisis, **communication is as important as technical fixes**. Keep stakeholders informed every 15-30 minutes during active incidents.
