# Database Recovery Procedures

**Version**: 1.0.0
**Last Updated**: November 17, 2025
**Owner**: DevOps + Backend Team
**Severity**: 🔴 CRITICAL

---

## Purpose

Step-by-step procedures for recovering from Cloudflare D1 database issues, including connection failures, schema corruption, and data loss scenarios.

---

## Database Architecture

**Database**: Cloudflare D1 (SQLite-based)
**Name**: `VOIDCAT_DB`
**Tables**:
- `grants` - Main grant data with FTS5 search
- `users` - User accounts and profiles
- `grants_fts` - FTS5 virtual table for full-text search

**Critical Files**:
- Schema: `api/src/db/grants-schema.js`
- Connection: `api/src/db/connection.js`
- Service: `api/src/services/databaseGrantService.js`

---

## Quick Diagnostics

### Check Database Status

```bash
# 1. Test database connection via API
curl https://grant-search-api.sorrowscry86.workers.dev/health/detailed | jq '.database'

# Expected output:
# {
#   "connected": true,
#   "tables": ["grants", "users", "grants_fts"],
#   "grants_count": 150
# }

# 2. List D1 databases
npx wrangler d1 list

# 3. Check binding in wrangler.toml
cat api/wrangler.toml | grep -A 3 "d1_databases"

# Expected:
# [[d1_databases]]
# binding = "VOIDCAT_DB"
# database_name = "voidcat-grant-db"
# database_id = "[uuid]"
```

---

## Scenario 1: Database Connection Failure

### Symptoms
- API returns: `database.connected: false`
- Search endpoints return 500 errors
- Admin health check shows DB unavailable

### Root Causes
1. D1 binding misconfigured in wrangler.toml
2. Database binding not propagated after deployment
3. Cloudflare D1 service outage
4. Worker env variable missing

### Recovery Procedure

**Step 1: Verify Binding Configuration**
```bash
# Check wrangler.toml
cd api
cat wrangler.toml | grep -A 5 "d1_databases"

# Ensure format:
# [[d1_databases]]
# binding = "VOIDCAT_DB"
# database_name = "voidcat-grant-db"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Step 2: Verify Database Exists**
```bash
# List all D1 databases
npx wrangler d1 list

# Should show:
# ┌──────────────────────────────────────┬──────────────────┬─────────┐
# │ UUID                                 │ Name             │ Version │
# ├──────────────────────────────────────┼──────────────────┼─────────┤
# │ xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx │ voidcat-grant-db │ ...     │
# └──────────────────────────────────────┴──────────────────┴─────────┘
```

**Step 3: Test Direct Database Access**
```bash
# Execute simple query
npx wrangler d1 execute VOIDCAT_DB --command "SELECT COUNT(*) as count FROM grants;"

# If fails with "table not found", schema not initialized
# If fails with "database not found", binding is broken
```

**Step 4: Redeploy Worker**
```bash
# Redeploy to refresh bindings
npx wrangler deploy

# Wait 30 seconds for propagation
sleep 30

# Test again
curl https://grant-search-api.sorrowscry86.workers.dev/health/detailed
```

**Step 5: If Still Failing - Recreate Binding**
```bash
# Create new D1 database (ONLY if absolutely necessary)
npx wrangler d1 create voidcat-grant-db-v2

# Update wrangler.toml with new database_id
# Initialize schema (see Scenario 2)
# Migrate data (see Scenario 4)
```

---

## Scenario 2: Database Schema Corruption

### Symptoms
- Queries fail with "no such table" errors
- Missing columns or indexes
- FTS5 search not working

### Recovery Procedure

**Step 1: Verify Current Schema**
```bash
# List all tables
npx wrangler d1 execute VOIDCAT_DB --command "SELECT name FROM sqlite_master WHERE type='table';"

# Expected tables:
# - grants
# - users
# - grants_fts
# - grants_fts_data
# - grants_fts_idx
# - grants_fts_docsize
# - grants_fts_config
```

**Step 2: Check Table Structure**
```bash
# Check grants table schema
npx wrangler d1 execute VOIDCAT_DB --command "PRAGMA table_info(grants);"

# Verify all required columns exist:
# - id, external_id, title, agency, description
# - amount, deadline, status, program_category
# - eligibility, matching_score, keywords
# - created_at, updated_at
```

**Step 3: Reinitialize Schema (if corrupted)**
```bash
# Backup existing data first!
npx wrangler d1 execute VOIDCAT_DB --command "SELECT * FROM grants;" --json > grants-backup.json

# Drop all tables (DESTRUCTIVE!)
npx wrangler d1 execute VOIDCAT_DB --command "DROP TABLE IF EXISTS grants_fts;"
npx wrangler d1 execute VOIDCAT_DB --command "DROP TABLE IF EXISTS grants;"
npx wrangler d1 execute VOIDCAT_DB --command "DROP TABLE IF EXISTS users;"

# Reinitialize via API
curl -X POST "https://grant-search-api.sorrowscry86.workers.dev/api/admin/grants/init-schema" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Verify schema created
curl https://grant-search-api.sorrowscry86.workers.dev/health/detailed | jq '.database.tables'

# Restore data (see Scenario 4)
```

---

## Scenario 3: Data Corruption or Loss

### Symptoms
- Grants table has incorrect/corrupted data
- Missing records
- Duplicate entries
- Invalid values in columns

### Recovery Procedure

**Step 1: Assess Damage**
```bash
# Check grant count
npx wrangler d1 execute VOIDCAT_DB --command "SELECT COUNT(*) FROM grants;"

# Check for duplicates
npx wrangler d1 execute VOIDCAT_DB --command "
  SELECT external_id, COUNT(*) as count
  FROM grants
  GROUP BY external_id
  HAVING count > 1;
"

# Check for null critical fields
npx wrangler d1 execute VOIDCAT_DB --command "
  SELECT COUNT(*) FROM grants
  WHERE title IS NULL OR agency IS NULL;
"
```

**Step 2: Export Current Data (before any fixes)**
```bash
# Export all grants
npx wrangler d1 execute VOIDCAT_DB \
  --command "SELECT * FROM grants ORDER BY created_at DESC;" \
  --json > grants-corrupted-$(date +%Y%m%d-%H%M%S).json
```

**Step 3: Clean Corrupted Data**
```bash
# Remove duplicates (keep most recent)
npx wrangler d1 execute VOIDCAT_DB --command "
  DELETE FROM grants
  WHERE id NOT IN (
    SELECT MAX(id)
    FROM grants
    GROUP BY external_id
  );
"

# Remove invalid records
npx wrangler d1 execute VOIDCAT_DB --command "
  DELETE FROM grants
  WHERE title IS NULL OR agency IS NULL;
"
```

**Step 4: Re-ingest Fresh Data**
```bash
# Trigger full re-ingestion
curl -X POST "https://grant-search-api.sorrowscry86.workers.dev/api/admin/grants/ingest" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["grants.gov", "sbir.gov", "nsf.gov"],
    "forceRefresh": true
  }'

# Monitor ingestion logs
npx wrangler tail --format pretty | grep "ingestion"
```

---

## Scenario 4: Complete Data Loss / Fresh Start

### When to Use
- Database completely corrupted beyond repair
- Need to start from scratch
- Migrating to new database instance

### Full Recovery Procedure

**Step 1: Create New Database (if needed)**
```bash
# Only if creating new database
npx wrangler d1 create voidcat-grant-db-recovery

# Note the database_id from output
# Update wrangler.toml with new database_id
```

**Step 2: Initialize Schema**
```bash
# Deploy updated Worker with new binding
cd api
npx wrangler deploy

# Initialize schema via admin endpoint
curl -X POST "https://grant-search-api.sorrowscry86.workers.dev/api/admin/grants/init-schema" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Verify schema
npx wrangler d1 execute VOIDCAT_DB \
  --command "SELECT name FROM sqlite_master WHERE type='table';"
```

**Step 3: Populate Data**
```bash
# Option A: Re-ingest from federal APIs (recommended)
curl -X POST "https://grant-search-api.sorrowscry86.workers.dev/api/admin/grants/ingest" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["grants.gov", "sbir.gov", "nsf.gov"]
  }'

# Option B: Restore from backup (if available)
# See "Backup Restoration" section below
```

**Step 4: Verify Data Integrity**
```bash
# Check grant count
npx wrangler d1 execute VOIDCAT_DB --command "SELECT COUNT(*) as count FROM grants;"

# Check agencies represented
npx wrangler d1 execute VOIDCAT_DB --command "
  SELECT agency, COUNT(*) as count
  FROM grants
  GROUP BY agency;
"

# Test search functionality
curl "https://grant-search-api.sorrowscry86.workers.dev/api/grants/search?query=research&limit=5"
```

---

## Backup & Restoration

### Creating Backups

**Manual Backup (recommended before major changes)**
```bash
# Export all grants to JSON
npx wrangler d1 execute VOIDCAT_DB \
  --command "SELECT * FROM grants;" \
  --json > backups/grants-$(date +%Y%m%d-%H%M%S).json

# Export users
npx wrangler d1 execute VOIDCAT_DB \
  --command "SELECT * FROM users;" \
  --json > backups/users-$(date +%Y%m%d-%H%M%S).json

# Compress backups
tar -czf backups/voidcat-db-backup-$(date +%Y%m%d-%H%M%S).tar.gz backups/*.json
```

**Automated Backup (recommended)**
```bash
# Create cron job or GitHub Action to run daily backups
# Store in S3, R2, or version control (encrypted)
```

### Restoring from Backup

**⚠️ WARNING**: This will replace ALL existing data!

```bash
# 1. Verify backup file exists and is valid
cat backups/grants-20251117-120000.json | jq '. | length'

# 2. Clear existing data
npx wrangler d1 execute VOIDCAT_DB --command "DELETE FROM grants;"

# 3. Restore from backup
# (This requires a custom script - see scripts/restore-db-backup.js)
node scripts/restore-db-backup.js backups/grants-20251117-120000.json

# 4. Rebuild FTS5 index
npx wrangler d1 execute VOIDCAT_DB --command "
  INSERT INTO grants_fts(grants_fts) VALUES('rebuild');
"

# 5. Verify restoration
npx wrangler d1 execute VOIDCAT_DB --command "SELECT COUNT(*) FROM grants;"
```

---

## Performance Optimization

### Rebuild FTS5 Indexes

If search is slow or returning incorrect results:

```bash
# Rebuild FTS5 index
npx wrangler d1 execute VOIDCAT_DB --command "
  INSERT INTO grants_fts(grants_fts) VALUES('rebuild');
"

# Optimize FTS5 index
npx wrangler d1 execute VOIDCAT_DB --command "
  INSERT INTO grants_fts(grants_fts) VALUES('optimize');
"
```

### Analyze Query Performance

```bash
# Get query plan for slow query
npx wrangler d1 execute VOIDCAT_DB --command "
  EXPLAIN QUERY PLAN
  SELECT * FROM grants WHERE agency = 'NSF' LIMIT 10;
"

# Ensure using indexes (look for "USING INDEX")
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Database Connection Success Rate**: Should be >99.9%
2. **Query Response Time**: <50ms for simple queries
3. **Grant Count**: Should increase over time (or remain stable)
4. **FTS5 Search Performance**: <100ms for typical searches

### Recommended Alerts

```yaml
# Example alert configuration (Cloudflare/Datadog/Sentry)
alerts:
  - name: "Database Connection Failure"
    condition: database.connected == false
    severity: P0
    notification: immediate

  - name: "Low Grant Count"
    condition: grants.count < 50
    severity: P1
    notification: 15min

  - name: "Slow Database Queries"
    condition: db_query_time > 500ms (p95)
    severity: P2
    notification: 1hour
```

---

## Troubleshooting Common Issues

### Issue: "Database not found"
**Solution**: Check wrangler.toml binding, verify database exists, redeploy

### Issue: "Table does not exist"
**Solution**: Run schema initialization via `/api/admin/grants/init-schema`

### Issue: "Search returns no results"
**Solution**: Rebuild FTS5 index, verify data exists, check query syntax

### Issue: "Duplicate primary key"
**Solution**: Clean duplicates using GROUP BY query, add UNIQUE constraint

### Issue: "Database locked"
**Solution**: D1 handles locking automatically; if persistent, contact Cloudflare support

---

## Emergency Contacts

| Service | Contact | URL |
|---------|---------|-----|
| Cloudflare Support | support@cloudflare.com | https://dash.cloudflare.com/support |
| D1 Documentation | - | https://developers.cloudflare.com/d1/ |
| Community Discord | - | https://discord.cloudflare.com |

---

## Related Runbooks

- [01-emergency-incident-response.md](./01-emergency-incident-response.md) - Overall incident response
- [05-data-ingestion-failure.md](./05-data-ingestion-failure.md) - Federal API ingestion issues

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-17 | Claude | Initial database recovery runbook |

---

**Remember**: Always backup before making destructive changes. When in doubt, test on a staging database first!
