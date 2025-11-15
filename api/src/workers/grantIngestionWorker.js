// VoidCat Grant Automation Platform - Scheduled Grant Ingestion Worker
// Cloudflare Cron Trigger for automated grant data refresh
// NO SIMULATIONS LAW: Real scheduled operations pulling live federal data

import GrantIngestionService from '../services/grantIngestionService.js';
import { TelemetryService } from '../services/telemetryService.js';

/**
 * Cron-triggered grant ingestion handler
 * Scheduled to run daily to refresh grant data from federal sources
 * 
 * Cron schedule (set in wrangler.toml):
 * - Daily at 2 AM UTC: "0 2 * * *"
 * - Every 6 hours: "0 */6 * * *"
 * - Every 12 hours: "0 */12 * * *"
 * 
 * @param {Event} event - Cloudflare scheduled event
 * @param {Object} env - Environment bindings
 * @param {Object} ctx - Execution context
 */
export async function handleScheduledIngestion(event, env, ctx) {
  const startTime = Date.now();
  console.log('[ScheduledIngestion] Starting automated grant data refresh...');
  
  try {
    const telemetry = new TelemetryService(env);
    const ingestionService = new GrantIngestionService(env, telemetry);
    
    // Ingest from all sources with broad queries to maximize coverage
    const queries = ['technology', 'research', 'innovation', 'development'];
    const allResults = [];
    
    for (const query of queries) {
      console.log(`[ScheduledIngestion] Processing query: "${query}"...`);
      
      const result = await ingestionService.ingestAllSources({
        sources: ['grants.gov', 'sbir.gov', 'nsf.gov'],
        query,
        forceRefresh: false // Only update stale data
      });
      
      allResults.push({ query, result });
    }
    
    // Aggregate results
    const totalStats = {
      fetched: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 0
    };
    
    for (const { result } of allResults) {
      totalStats.fetched += result.totals.fetched;
      totalStats.inserted += result.totals.inserted;
      totalStats.updated += result.totals.updated;
      totalStats.skipped += result.totals.skipped;
      totalStats.failed += result.totals.failed;
    }
    
    // Cleanup stale grants (closed for 180+ days)
    const removed = await ingestionService.cleanupStaleGrants(180);
    
    const duration = Date.now() - startTime;
    console.log('[ScheduledIngestion] Completed successfully:', {
      duration_ms: duration,
      queries_processed: queries.length,
      ...totalStats,
      stale_grants_removed: removed
    });
    
    // Track telemetry
    await telemetry.trackEvent('scheduled_ingestion', {
      success: true,
      duration_ms: duration,
      stats: totalStats,
      cleaned_up: removed
    });
    
  } catch (error) {
    console.error('[ScheduledIngestion] Failed:', error);
    
    // Track failure
    const telemetry = new TelemetryService(env);
    await telemetry.trackEvent('scheduled_ingestion', {
      success: false,
      error: error.message,
      duration_ms: Date.now() - startTime
    });
    
    throw error; // Re-throw to mark cron job as failed
  }
}

/**
 * On-demand ingestion trigger (can be called via queue or HTTP)
 * @param {Object} options - Ingestion configuration
 * @param {Object} env - Environment bindings
 */
export async function triggerIngestion(options, env) {
  console.log('[OnDemandIngestion] Triggered with options:', options);
  
  const telemetry = new TelemetryService(env);
  const ingestionService = new GrantIngestionService(env, telemetry);
  
  const result = await ingestionService.ingestAllSources(options);
  
  console.log('[OnDemandIngestion] Completed:', result);
  return result;
}

export default {
  handleScheduledIngestion,
  triggerIngestion
};
