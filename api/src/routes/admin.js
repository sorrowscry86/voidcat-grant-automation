// VoidCat Grant Automation Platform - Admin Routes
// Administrative endpoints for grant data management and system operations
// NO SIMULATIONS LAW: Real operations only - actual database modifications

import { Hono } from 'hono';
import GrantIngestionService from '../services/grantIngestionService.js';
import { TelemetryService } from '../services/telemetryService.js';
import { initializeSchema } from '../db/connection.js';
import { GRANTS_SCHEMA_SQL } from '../db/grants-schema.js';

const app = new Hono();

// ============================================
// SECURITY: Admin Authentication Middleware
// ============================================
// Custom middleware to handle admin authentication with environment variable
const adminAuth = async (c, next) => {
  const adminToken = c.env.ADMIN_TOKEN;
  const authHeader = c.req.header('Authorization');
  const providedToken = authHeader?.replace('Bearer ', '').trim();

  console.log('[Admin Auth] Checking credentials...');
  console.log('[Admin Auth] Has ADMIN_TOKEN env:', !!adminToken);
  console.log('[Admin Auth] Token length:', adminToken?.length || 0);
  console.log('[Admin Auth] Has Authorization header:', !!authHeader);
  console.log('[Admin Auth] Provided token length:', providedToken?.length || 0);
  console.log('[Admin Auth] Tokens match:', adminToken === providedToken);

  // Check if ADMIN_TOKEN is configured
  if (!adminToken || adminToken === 'change-me-in-production') {
    console.error('[Admin] SECURITY ALERT: ADMIN_TOKEN not configured!');
    return c.json({
      success: false,
      error: 'Admin authentication not configured',
      code: 'AUTH_NOT_CONFIGURED'
    }, 500);
  }

  // Check if Authorization header is present
  if (!authHeader || !providedToken) {
    return c.json({
      success: false,
      error: 'Admin authentication required. Provide valid Bearer token.',
      code: 'AUTH_REQUIRED'
    }, 401);
  }

  // Verify token matches
  if (adminToken !== providedToken) {
    console.warn('[Admin Auth] Token mismatch - authentication failed');
    return c.json({
      success: false,
      error: 'Invalid admin credentials',
      code: 'INVALID_CREDENTIALS'
    }, 401);
  }

  console.log('[Admin Auth] Authentication successful');
  await next();
};

app.use('/*', adminAuth);

/**
 * Initialize grants database schema
 * POST /api/admin/grants/init-schema
 */
app.post('/grants/init-schema', async (c) => {
  try {
    const db = c.env.VOIDCAT_DB;

    // Split SQL properly - triggers contain semicolons, need smarter parsing
    const statements = [];
    let current = '';
    let inTrigger = false;

    for (const line of GRANTS_SCHEMA_SQL.split('\n')) {
      const trimmed = line.trim();

      // Skip pure comment lines
      if (trimmed.startsWith('--')) {
        continue;
      }

      if (trimmed.startsWith('CREATE TRIGGER') || trimmed.startsWith('CREATE TABLE') ||
          trimmed.startsWith('CREATE VIRTUAL TABLE') || trimmed.startsWith('CREATE INDEX')) {
        if (current.trim()) {
          statements.push(current.trim());
        }
        current = line + '\n';
        if (trimmed.startsWith('CREATE TRIGGER')) {
          inTrigger = true;
        }
      } else if (trimmed.length > 0) {
        current += line + '\n';
        if (inTrigger && trimmed === 'END;') {
          statements.push(current.trim());
          current = '';
          inTrigger = false;
        } else if (!inTrigger && trimmed.endsWith(';')) {
          statements.push(current.trim());
          current = '';
        }
      }
    }

    if (current.trim() && current.trim().length > 5) {
      statements.push(current.trim());
    }

    // Execute each statement
    console.log(`[Admin] Parsed ${statements.length} SQL statements`);
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement && statement.length > 5 && !statement.startsWith('--')) {
        console.log(`[Admin] Executing statement ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
        try {
          await db.prepare(statement).run();
        } catch (err) {
          console.error(`[Admin] Statement ${i + 1} failed:`, err.message);
          console.error(`[Admin] Failed statement:`, statement);
          throw err;
        }
      } else {
        console.log(`[Admin] Skipping empty/comment statement ${i + 1}`);
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
