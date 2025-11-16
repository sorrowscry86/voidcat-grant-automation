// VoidCat Grant Automation Platform - Admin Routes
// Administrative endpoints for grant data management and system operations
// NO SIMULATIONS LAW: Real operations only - actual database modifications

import { Hono } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';
import GrantIngestionService from '../services/grantIngestionService.js';
import { TelemetryService } from '../services/telemetryService.js';
import { initializeSchema } from '../db/connection.js';
import { GRANTS_SCHEMA_SQL } from '../db/grants-schema.js';

const app = new Hono();

// ============================================
// SECURITY: Admin Authentication Middleware
// ============================================
const adminAuth = bearerAuth({
  token: async (c) => {
    const adminToken = c.env.ADMIN_TOKEN;
    if (!adminToken || adminToken === 'change-me-in-production') {
      console.error('[Admin] SECURITY ALERT: ADMIN_TOKEN not configured!');
      return null;
    }
    return adminToken;
  },
  invalidMessage: 'Invalid admin credentials',
  unauthorizedMessage: 'Admin authentication required. Provide valid Bearer token.'
});

app.use('/*', adminAuth);

/**
 * Initialize grants database schema
 * POST /api/admin/grants/init-schema
 */
app.post('/grants/init-schema', async (c) => {
  try {
    const db = c.env.VOIDCAT_DB;
    
    // Execute schema SQL statements from canonical JS export
    const statements = GRANTS_SCHEMA_SQL.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await db.prepare(statement).run();
      }
    }
    
    return c.json({
      success: true,
      message: 'Grants database schema initialized successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Admin] Schema initialization failed:', error);
    return c.json({
      success: false,
      error: error.message,
      code: 'SCHEMA_INIT_FAILED'
    }, 500);
  }
});

/**
 * Trigger grant data ingestion from all sources
 * POST /api/admin/grants/ingest
 * Body: { sources?: string[], query?: string, forceRefresh?: boolean }
 */
app.post('/grants/ingest', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { sources, query, forceRefresh } = body;
    
    const telemetry = new TelemetryService(c.env);
    const ingestionService = new GrantIngestionService(c.env, telemetry);
    
    console.log('[Admin] Starting grant ingestion...', { sources, query, forceRefresh });
    
    const result = await ingestionService.ingestAllSources({
      sources,
      query,
      forceRefresh
    });
    
    return c.json({
      success: true,
      ingestion_summary: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Admin] Ingestion failed:', error);
    return c.json({
      success: false,
      error: error.message,
      code: 'INGESTION_FAILED'
    }, 500);
  }
});

/**
 * Trigger ingestion from single source
 * POST /api/admin/grants/ingest/:source
 */
app.post('/grants/ingest/:source', async (c) => {
  try {
    const source = c.req.param('source');
    const body = await c.req.json().catch(() => ({}));
    const { query, forceRefresh } = body;
    
    const validSources = ['grants.gov', 'sbir.gov', 'nsf.gov'];
    if (!validSources.includes(source)) {
      return c.json({
        success: false,
        error: `Invalid source. Must be one of: ${validSources.join(', ')}`,
        code: 'INVALID_SOURCE'
      }, 400);
    }
    
    const telemetry = new TelemetryService(c.env);
    const ingestionService = new GrantIngestionService(c.env, telemetry);
    
    console.log(`[Admin] Starting ingestion from ${source}...`, { query, forceRefresh });
    
    const result = await ingestionService.ingestFromSource(source, query, forceRefresh);
    
    return c.json({
      success: true,
      source,
      ingestion_result: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`[Admin] Ingestion from ${c.req.param('source')} failed:`, error);
    return c.json({
      success: false,
      error: error.message,
      code: 'INGESTION_FAILED'
    }, 500);
  }
});

/**
 * Get ingestion statistics and logs
 * GET /api/admin/grants/ingestion-stats?limit=10
 */
app.get('/grants/ingestion-stats', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');
    
    const ingestionService = new GrantIngestionService(c.env);
    const stats = await ingestionService.getIngestionStats(limit);
    
    // Get total grants count
    const db = c.env.VOIDCAT_DB;
    const totalGrants = await db.prepare(`
      SELECT COUNT(*) as count FROM grants
    `).first();
    
    const grantsBySource = await db.prepare(`
      SELECT source, COUNT(*) as count
      FROM grants
      GROUP BY source
    `).all();
    
    return c.json({
      success: true,
      total_grants: totalGrants?.count || 0,
      grants_by_source: grantsBySource.results || [],
      recent_ingestions: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Admin] Failed to get ingestion stats:', error);
    return c.json({
      success: false,
      error: error.message,
      code: 'STATS_RETRIEVAL_FAILED'
    }, 500);
  }
});

/**
 * Clean up stale grants
 * POST /api/admin/grants/cleanup
 * Body: { daysOld?: number }
 */
app.post('/grants/cleanup', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const daysOld = body.daysOld || 180;
    
    const ingestionService = new GrantIngestionService(c.env);
    const removed = await ingestionService.cleanupStaleGrants(daysOld);
    
    return c.json({
      success: true,
      grants_removed: removed,
      threshold_days: daysOld,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Admin] Cleanup failed:', error);
    return c.json({
      success: false,
      error: error.message,
      code: 'CLEANUP_FAILED'
    }, 500);
  }
});

/**
 * Get database health status
 * GET /api/admin/health
 */
app.get('/health', async (c) => {
  try {
    const db = c.env.VOIDCAT_DB;
    
    // Test database connectivity
    await db.prepare('SELECT 1').first();
    
    // Get table stats
    const grants = await db.prepare(`
      SELECT COUNT(*) as count FROM grants
    `).first();
    
    const users = await db.prepare(`
      SELECT COUNT(*) as count FROM users
    `).first();
    
    const recentIngestion = await db.prepare(`
      SELECT * FROM grant_ingestion_log
      ORDER BY started_at DESC
      LIMIT 1
    `).first();
    
    return c.json({
      success: true,
      status: 'healthy',
      database: {
        connected: true,
        grants_count: grants?.count || 0,
        users_count: users?.count || 0,
        last_ingestion: recentIngestion
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Admin] Health check failed:', error);
    return c.json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      code: 'HEALTH_CHECK_FAILED'
    }, 500);
  }
});

export default app;
