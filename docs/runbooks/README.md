# Operational Runbooks

**Purpose**: Step-by-step procedures for handling production incidents and operational tasks.

---

## 📚 Available Runbooks

| # | Runbook | Severity | Purpose |
|---|---------|----------|---------|
| 01 | [Emergency Incident Response](./01-emergency-incident-response.md) | 🔴 CRITICAL | Overall incident response procedures |
| 02 | [Database Recovery](./02-database-recovery.md) | 🔴 CRITICAL | D1 database recovery and troubleshooting |
| 03 | [Performance Troubleshooting](./03-performance-troubleshooting.md) | 🟡 MEDIUM | _Coming soon_ |
| 04 | [API Integration Failure](./04-api-integration-failure.md) | 🟠 HIGH | External API failure resolution |
| 05 | [Data Ingestion Failure](./05-data-ingestion-failure.md) | 🟡 MEDIUM | _Coming soon_ |
| 06 | [Payment Processing Issues](./06-payment-processing.md) | 🔴 CRITICAL | _Coming soon_ |
| 07 | [Security Incident Response](./07-security-incident.md) | 🔴 CRITICAL | _Coming soon_ |

---

## 🚨 Quick Start - Incident Response

### For New Incidents

1. **Assess severity** (P0/P1/P2/P3)
2. **Open** [01-Emergency-Incident-Response](./01-emergency-incident-response.md)
3. **Follow checklist** step-by-step
4. **Escalate** if needed (see runbook for escalation path)

### Common Scenarios Quick Links

| Problem | Runbook | Section |
|---------|---------|---------|
| **API is down** | 01-Emergency | Scenario 1 |
| **Database unavailable** | 02-Database-Recovery | Scenario 1 |
| **Search not working** | 02-Database-Recovery | FTS5 Rebuild |
| **Grants.gov failing** | 04-API-Integration | Scenario 1 |
| **AI proposal errors** | 04-API-Integration | Scenario 2 |
| **Stripe checkout fails** | 04-API-Integration | Scenario 3 |
| **Slow response times** | 01-Emergency | Scenario 4 |

---

## 🎯 Severity Levels

| Level | Symbol | Response Time | Description |
|-------|--------|---------------|-------------|
| **P0** | 🔴 CRITICAL | < 15 minutes | Complete outage, data loss risk |
| **P1** | 🟠 HIGH | < 30 minutes | Major functionality impaired |
| **P2** | 🟡 MEDIUM | < 2 hours | Partial degradation, workaround exists |
| **P3** | 🔵 LOW | < 24 hours | Minor issues, minimal impact |

---

## 📞 Emergency Contacts

| Role | Primary On-Call | Escalation |
|------|----------------|------------|
| **Tech Lead** | 24/7 (P0 only) | Immediate |
| **DevOps Lead** | 24/7 (P0/P1) | Within 15 min |
| **Backend Lead** | Business hours | Within 2 hours |
| **Security Lead** | On-call rotation | As needed |

**On-Call Schedule**: See internal wiki for current rotation

---

## 🛠️ Prerequisites

### Required Access
- [ ] Cloudflare dashboard access (Workers, D1, Analytics)
- [ ] GitHub repository access
- [ ] `wrangler` CLI installed and authenticated
- [ ] Admin credentials for production API (`ADMIN_TOKEN`)
- [ ] Slack access (#incidents, #ops channels)

### Required Tools
```bash
# Install wrangler
npm install -g wrangler

# Authenticate
wrangler login

# Verify access
wrangler whoami
```

### Environment Setup
```bash
# Clone repository
git clone https://github.com/sorrowscry86/voidcat-grant-automation.git
cd voidcat-grant-automation

# Install dependencies
cd api && npm install

# Set environment variables
export ADMIN_TOKEN="your-admin-token-here"
export CLOUDFLARE_API_TOKEN="your-api-token"
```

---

## 📖 How to Use These Runbooks

### Before an Incident
1. **Read through** all runbooks at least once
2. **Bookmark** this README for quick access
3. **Test procedures** in staging environment
4. **Keep credentials** accessible (password manager)
5. **Join** #incidents and #ops Slack channels

### During an Incident
1. **Stay calm** - panic doesn't help
2. **Follow checklists** - don't skip steps
3. **Communicate often** - update every 15-30 minutes
4. **Document actions** - what you tried, what worked/didn't
5. **Ask for help** early if stuck

### After an Incident
1. **Complete postmortem** (within 48 hours)
2. **Update runbooks** with lessons learned
3. **Implement prevention** measures
4. **Share learnings** with team
5. **Thank responders** publicly

---

## 🔄 Runbook Maintenance

### Updating Runbooks
- **Review quarterly** or after major incidents
- **Test procedures** in staging before production
- **Version all changes** (see Version History section in each)
- **Get peer review** before committing updates

### Contributing
1. Make changes in a branch
2. Test procedures if possible
3. Update version history
4. Submit PR with description of changes
5. Get approval from Tech Lead or DevOps Lead

---

## 📊 Incident Metrics

### Key Performance Indicators

| Metric | Target | Tracking |
|--------|--------|----------|
| **Mean Time to Detect (MTTD)** | < 5 minutes | Automated monitoring |
| **Mean Time to Acknowledge (MTTA)** | < 10 minutes | On-call alerts |
| **Mean Time to Resolve (MTTR)** | < 60 minutes (P0/P1) | Incident tickets |
| **Incident Frequency** | < 2/month (P0/P1) | Monthly review |

### Monitoring Tools
- **Cloudflare Analytics**: Response times, error rates
- **Wrangler Tail**: Real-time log monitoring
- **Health Endpoints**: `/health` and `/health/detailed`
- **External Monitors**: UptimeRobot, Pingdom, etc.

---

## 🎓 Training & Onboarding

### For New Team Members

**Week 1**:
- [ ] Read all runbooks
- [ ] Set up local environment
- [ ] Get credentials and access
- [ ] Join on-call rotation (shadow only)

**Week 2**:
- [ ] Participate in incident drill (simulated)
- [ ] Practice database recovery in staging
- [ ] Test API integration troubleshooting
- [ ] Review recent incident postmortems

**Month 1**:
- [ ] Join on-call rotation (primary)
- [ ] Update at least one runbook
- [ ] Lead a postmortem meeting
- [ ] Conduct incident drill for team

---

## 📚 Related Documentation

- **Architecture**: `/docs/README.md`
- **API Documentation**: `/api/API_DOCUMENTATION.md`
- **Deployment Guide**: `/DEPLOYMENT_CHECKLIST.md`
- **Security**: `/docs/security/SECURITY.md`
- **Testing**: `/docs/testing/README-TESTING.md`

---

## 🆘 Additional Resources

### Internal
- **Wiki**: Internal knowledge base
- **Postmortems**: `/docs/postmortems/`
- **Architecture Diagrams**: `/docs/architecture/`
- **Incident Log**: Shared spreadsheet

### External
- **Cloudflare Status**: https://www.cloudflarestatus.com/
- **Cloudflare Community**: https://community.cloudflare.com/
- **Cloudflare Docs**: https://developers.cloudflare.com/
- **Stack Overflow**: Tag your questions with `cloudflare-workers`

---

## ⚠️ Important Reminders

1. **Never** run destructive commands in production without backup
2. **Always** test procedures in staging first
3. **Document** every action during incidents
4. **Communicate** early and often
5. **Escalate** when in doubt - better safe than sorry
6. **Learn** from every incident - update runbooks
7. **Thank** your teammates - incidents are team efforts

---

**Last Updated**: November 17, 2025
**Maintained By**: DevOps Team
**Contact**: devops@voidcat-rdc.com (internal)

---

_"The best time to prepare for an incident is before it happens."_
