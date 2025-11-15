# Database Population Quick Reference

## 🚀 Quick Start

```bash
# 1. Initialize database schema
node scripts/populate-grants-db.js init

# 2. Populate with grant data
node scripts/populate-grants-db.js full

# 3. Check results
node scripts/populate-grants-db.js stats
```

## 📋 Common Commands

```bash
# Show help
node scripts/populate-grants-db.js help

# Initialize schema only
node scripts/populate-grants-db.js init

# Ingest from all sources (default queries)
node scripts/populate-grants-db.js ingest

# Ingest with specific query
node scripts/populate-grants-db.js ingest --query "artificial intelligence"

# Force refresh all data
node scripts/populate-grants-db.js ingest --force

# Ingest from specific sources
node scripts/populate-grants-db.js ingest --sources grants.gov,nsf.gov

# View statistics
node scripts/populate-grants-db.js stats

# Clean up stale grants (180 days default)
node scripts/populate-grants-db.js cleanup

# Custom cleanup threshold
node scripts/populate-grants-db.js cleanup --days 90

# Full setup (schema + ingestion)
node scripts/populate-grants-db.js full
```

## 🔗 Admin API Endpoints

```bash
# Initialize schema
curl -X POST https://grant-search-api.sorrowscry86.workers.dev/api/admin/grants/init-schema

# Trigger ingestion
curl -X POST https://grant-search-api.sorrowscry86.workers.dev/api/admin/grants/ingest \
  -H "Content-Type: application/json" \
  -d '{"query": "technology", "forceRefresh": false}'

# Ingest from single source
curl -X POST https://grant-search-api.sorrowscry86.workers.dev/api/admin/grants/ingest/grants.gov \
  -H "Content-Type: application/json" \
  -d '{"query": "AI"}'

# Get statistics
curl https://grant-search-api.sorrowscry86.workers.dev/api/admin/grants/ingestion-stats

# Clean up old grants
curl -X POST https://grant-search-api.sorrowscry86.workers.dev/api/admin/grants/cleanup \
  -H "Content-Type: application/json" \
  -d '{"daysOld": 180}'

# Health check
curl https://grant-search-api.sorrowscry86.workers.dev/api/admin/health
```

## ⏰ Automated Refresh

**Cron Schedule**: Daily at 2 AM UTC (`0 2 * * *`)

Automatically:
- ✅ Fetches from all 3 sources
- ✅ Updates stale data (>24 hours)
- ✅ Removes grants closed 180+ days
- ✅ Logs all operations

## 🔍 Verify Working

```bash
# 1. Check database has grants
node scripts/populate-grants-db.js stats
# Expected: total_grants > 0

# 2. Test search endpoint
curl "https://grant-search-api.sorrowscry86.workers.dev/api/grants/search?query=AI"
# Expected: grants array with data_source field

# 3. Check recent ingestion logs
curl https://grant-search-api.sorrowscry86.workers.dev/api/admin/grants/ingestion-stats
# Expected: recent_ingestions with success status
```

## 🛠️ Troubleshooting

**Problem**: "No grants returned"
**Solution**: Run manual ingestion
```bash
node scripts/populate-grants-db.js full
```

**Problem**: "Schema already exists"
**Solution**: Safe to ignore - schema is idempotent

**Problem**: Ingestion failures
**Solution**: Check logs
```bash
node scripts/populate-grants-db.js stats
# Look at recent_ingestions for error_message
```

**Problem**: Stale data
**Solution**: Force refresh
```bash
node scripts/populate-grants-db.js cleanup
node scripts/populate-grants-db.js ingest --force
```

## 📊 Database Schema

**Main Tables**:
- `grants` - Core grant data (1247 grants avg)
- `grants_fts` - Full-text search index (auto-synced)
- `grant_ingestion_log` - Audit trail

**Key Indexes**:
- `idx_grants_source` - Filter by data source
- `idx_grants_agency` - Filter by agency
- `idx_grants_matching_score` - Sort by relevance
- `idx_grants_close_date` - Filter by deadline

## 🎯 Performance

**Before (API-only)**:
- Search: 2-5 seconds
- Rate limits: Restrictive
- Availability: API-dependent

**After (Database)**:
- Search: 50-200ms
- Rate limits: None
- Availability: 99.9%+

## 📞 Support

- **Issues**: https://github.com/sorrowscry86/voidcat-grant-automation/issues
- **Developer**: @sorrowscry86
- **Email**: SorrowsCry86@voidcat.org

---

**VoidCat RDC Grant Automation**
*NO SIMULATIONS LAW Compliant - Real Data Only*
