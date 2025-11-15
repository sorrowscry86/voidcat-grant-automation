// VoidCat Grant Automation Platform - Grant Data Ingestion Service
// Automates population of D1 database with real federal grant data
// NO SIMULATIONS LAW: Only real data from live APIs - no mocks, no fabrications

import { GrantsGovService } from './grantsGovService.js';
import { SbirService } from './sbirService.js';
import NsfService from './nsfService.js';

export class GrantIngestionService {
  constructor(env, telemetry = null) {
    this.env = env;
    this.db = env.VOIDCAT_DB;
    this.telemetry = telemetry;
    
    // Initialize data source services
    this.grantsGovService = new GrantsGovService();
    this.sbirService = new SbirService();
    this.nsfService = new NsfService();
    
    // Ingestion configuration
    this.config = {
      batchSize: 100,                    // Records per batch insert
      maxRecordsPerSource: 1000,         // Safety limit per source
      deduplicationWindow: 90,           // Days to look back for duplicates
      staleThreshold: 24 * 60 * 60 * 1000 // 24 hours in ms
    };
  }

  /**
   * Main ingestion orchestrator - fetches and stores grants from all sources
   * @param {Object} options - Ingestion options
   * @returns {Promise<Object>} Ingestion summary
   */
  async ingestAllSources(options = {}) {
    const {
      sources = ['grants.gov', 'sbir.gov', 'nsf.gov'],
      query = null,
      forceRefresh = false
    } = options;

    const summary = {
      started_at: new Date().toISOString(),
      sources: {},
      totals: {
        fetched: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: 0
      }
    };

    // Process each source sequentially to avoid overwhelming the database
    for (const source of sources) {
      try {
        console.log(`[GrantIngestion] Starting ingestion from ${source}...`);
        const result = await this.ingestFromSource(source, query, forceRefresh);
        summary.sources[source] = result;
        
        // Aggregate totals
        summary.totals.fetched += result.grants_fetched || 0;
        summary.totals.inserted += result.grants_inserted || 0;
        summary.totals.updated += result.grants_updated || 0;
        summary.totals.skipped += result.grants_skipped || 0;
        
      } catch (error) {
        console.error(`[GrantIngestion] Failed to ingest from ${source}:`, error);
        summary.sources[source] = {
          status: 'failed',
          error: error.message
        };
        summary.totals.failed++;
      }
    }

    summary.completed_at = new Date().toISOString();
    summary.duration_ms = new Date(summary.completed_at) - new Date(summary.started_at);

    console.log('[GrantIngestion] Ingestion complete:', JSON.stringify(summary, null, 2));
    return summary;
  }

  /**
   * Ingest grants from a single source
   * @param {string} source - Data source identifier
   * @param {string} query - Optional search query
   * @param {boolean} forceRefresh - Force re-fetch even if data is fresh
   * @returns {Promise<Object>} Source-specific ingestion result
   */
  async ingestFromSource(source, query = null, forceRefresh = false) {
    const logId = await this.createIngestionLog(source);
    const startTime = Date.now();
    
    try {
      // Fetch grants from source API
      const grants = await this.fetchGrantsFromSource(source, query);
      
      if (!grants || grants.length === 0) {
        await this.updateIngestionLog(logId, {
          status: 'success',
          grants_fetched: 0,
          grants_inserted: 0,
          grants_updated: 0,
          grants_skipped: 0,
          duration_ms: Date.now() - startTime
        });
        
        return {
          status: 'success',
          grants_fetched: 0,
          grants_inserted: 0,
          grants_updated: 0,
          grants_skipped: 0,
          message: 'No grants returned from source'
        };
      }

      // Transform and store grants in batches
      const result = await this.storeGrants(grants, source, forceRefresh);
      
      // Update audit log
      await this.updateIngestionLog(logId, {
        status: result.failed > 0 ? 'partial' : 'success',
        grants_fetched: grants.length,
        grants_inserted: result.inserted,
        grants_updated: result.updated,
        grants_skipped: result.skipped,
        duration_ms: Date.now() - startTime
      });

      return {
        status: result.failed > 0 ? 'partial' : 'success',
        grants_fetched: grants.length,
        grants_inserted: result.inserted,
        grants_updated: result.updated,
        grants_skipped: result.skipped,
        failed: result.failed
      };

    } catch (error) {
      console.error(`[GrantIngestion] Error ingesting from ${source}:`, error);
      
      await this.updateIngestionLog(logId, {
        status: 'failed',
        error_message: error.message,
        duration_ms: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Fetch grants from specific source API
   * @param {string} source - Data source identifier
   * @param {string} query - Optional search query
   * @returns {Promise<Array>} Raw grants data from source
   */
  async fetchGrantsFromSource(source, query = null) {
    const searchQuery = query || 'technology'; // Default broad query

    switch (source) {
      case 'grants.gov':
        return await this.grantsGovService.searchGrants(searchQuery, this.telemetry);
      
      case 'sbir.gov':
        return await this.sbirService.searchOpportunities(searchQuery, this.telemetry);
      
      case 'nsf.gov':
        return await this.nsfService.searchAwards(searchQuery, null, this.telemetry);
      
      default:
        throw new Error(`Unknown data source: ${source}`);
    }
  }

  /**
   * Store grants in database with deduplication and update logic
   * @param {Array} grants - Grants to store
   * @param {string} source - Data source identifier
   * @param {boolean} forceRefresh - Force update even if not stale
   * @returns {Promise<Object>} Storage statistics
   */
  async storeGrants(grants, source, forceRefresh = false) {
    const stats = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 0
    };

    // Process in batches to avoid overwhelming D1
    for (let i = 0; i < grants.length; i += this.config.batchSize) {
      const batch = grants.slice(i, i + this.config.batchSize);
      
      for (const grant of batch) {
        try {
          const transformed = this.transformGrantForStorage(grant, source);
          const action = await this.upsertGrant(transformed, forceRefresh);
          
          if (action === 'inserted') stats.inserted++;
          else if (action === 'updated') stats.updated++;
          else if (action === 'skipped') stats.skipped++;
          
        } catch (error) {
          console.error(`[GrantIngestion] Failed to store grant ${grant.id}:`, error);
          stats.failed++;
        }
      }
    }

    return stats;
  }

  /**
   * Transform grant data to database schema
   * @param {Object} grant - Raw grant data
   * @param {string} source - Data source identifier
   * @returns {Object} Transformed grant ready for storage
   */
  transformGrantForStorage(grant, source) {
    const now = new Date().toISOString();
    
    return {
      id: grant.id || `${source}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source,
      external_id: grant.external_id || grant.id,
      
      // Core fields
      title: grant.title || 'Untitled Grant',
      description: grant.description || grant.synopsis || '',
      agency: grant.agency || grant.funding_agency || 'Unknown Agency',
      agency_code: grant.agency_code || grant.funding_agency_code || null,
      program: grant.program || null,
      cfda_number: grant.cfda_number || grant.cfdaNumber || null,
      
      // Opportunity details
      opportunity_number: grant.opportunity_number || grant.opportunityNumber || null,
      opportunity_type: grant.opportunity_type || 'Grant',
      status: grant.status || 'active',
      
      // Financial (convert to cents)
      award_floor: grant.award_floor ? Math.round(grant.award_floor * 100) : null,
      award_ceiling: grant.award_ceiling ? Math.round(grant.award_ceiling * 100) : null,
      estimated_funding: grant.estimated_funding ? Math.round(grant.estimated_funding * 100) : null,
      
      // Dates
      post_date: grant.post_date || grant.postDate || now,
      close_date: grant.deadline || grant.close_date || grant.closeDate || null,
      archive_date: grant.archive_date || grant.archiveDate || null,
      
      // Eligibility
      eligibility: grant.eligibility || null,
      applicant_types: JSON.stringify(grant.applicant_types || grant.eligibleApplicants || []),
      funding_categories: JSON.stringify(grant.funding_categories || grant.categories || []),
      
      // Analytics
      matching_score: grant.matching_score || 0.0,
      keywords: JSON.stringify(grant.tags || grant.keywords || []),
      tags: JSON.stringify(grant.tags || []),
      
      // Metadata
      data_freshness: now,
      last_verified: now,
      updated_at: now
    };
  }

  /**
   * Insert or update grant with deduplication
   * @param {Object} grant - Transformed grant data
   * @param {boolean} forceRefresh - Force update
   * @returns {Promise<string>} Action taken: 'inserted', 'updated', or 'skipped'
   */
  async upsertGrant(grant, forceRefresh = false) {
    // Check if grant exists
    const existing = await this.db.prepare(`
      SELECT id, data_freshness, updated_at
      FROM grants
      WHERE id = ? OR (source = ? AND external_id = ?)
    `).bind(grant.id, grant.source, grant.external_id).first();

    if (!existing) {
      // Insert new grant
      await this.db.prepare(`
        INSERT INTO grants (
          id, source, external_id, title, description, agency, agency_code,
          program, cfda_number, opportunity_number, opportunity_type, status,
          award_floor, award_ceiling, estimated_funding, post_date, close_date,
          archive_date, eligibility, applicant_types, funding_categories,
          matching_score, keywords, tags, data_freshness, last_verified, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        grant.id, grant.source, grant.external_id, grant.title, grant.description,
        grant.agency, grant.agency_code, grant.program, grant.cfda_number,
        grant.opportunity_number, grant.opportunity_type, grant.status,
        grant.award_floor, grant.award_ceiling, grant.estimated_funding,
        grant.post_date, grant.close_date, grant.archive_date,
        grant.eligibility, grant.applicant_types, grant.funding_categories,
        grant.matching_score, grant.keywords, grant.tags,
        grant.data_freshness, grant.last_verified, grant.updated_at
      ).run();

      return 'inserted';
    }

    // Check if update needed (data is stale or forceRefresh)
    const isStale = forceRefresh || 
      (Date.now() - new Date(existing.data_freshness).getTime() > this.config.staleThreshold);

    if (!isStale) {
      return 'skipped';
    }

    // Update existing grant
    await this.db.prepare(`
      UPDATE grants SET
        title = ?, description = ?, agency = ?, agency_code = ?,
        program = ?, cfda_number = ?, opportunity_number = ?, opportunity_type = ?,
        status = ?, award_floor = ?, award_ceiling = ?, estimated_funding = ?,
        post_date = ?, close_date = ?, archive_date = ?,
        eligibility = ?, applicant_types = ?, funding_categories = ?,
        matching_score = ?, keywords = ?, tags = ?,
        data_freshness = ?, last_verified = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      grant.title, grant.description, grant.agency, grant.agency_code,
      grant.program, grant.cfda_number, grant.opportunity_number, grant.opportunity_type,
      grant.status, grant.award_floor, grant.award_ceiling, grant.estimated_funding,
      grant.post_date, grant.close_date, grant.archive_date,
      grant.eligibility, grant.applicant_types, grant.funding_categories,
      grant.matching_score, grant.keywords, grant.tags,
      grant.data_freshness, grant.last_verified, grant.updated_at,
      existing.id
    ).run();

    return 'updated';
  }

  /**
   * Create ingestion audit log entry
   * @param {string} source - Data source
   * @returns {Promise<number>} Log ID
   */
  async createIngestionLog(source) {
    const result = await this.db.prepare(`
      INSERT INTO grant_ingestion_log (source, status, started_at)
      VALUES (?, 'running', datetime('now'))
    `).bind(source).run();
    
    return result.meta.last_row_id;
  }

  /**
   * Update ingestion audit log
   * @param {number} logId - Log entry ID
   * @param {Object} data - Update data
   */
  async updateIngestionLog(logId, data) {
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    
    fields.push('completed_at = datetime(\'now\')');
    values.push(logId);
    
    await this.db.prepare(`
      UPDATE grant_ingestion_log
      SET ${fields.join(', ')}
      WHERE id = ?
    `).bind(...values).run();
  }

  /**
   * Clean up stale grants (closed + past archive date)
   * @param {number} daysOld - Remove grants older than this many days
   * @returns {Promise<number>} Number of grants removed
   */
  async cleanupStaleGrants(daysOld = 180) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await this.db.prepare(`
      DELETE FROM grants
      WHERE status = 'closed'
      AND (archive_date IS NULL OR archive_date < ?)
      AND close_date < ?
    `).bind(cutoffDate.toISOString(), cutoffDate.toISOString()).run();

    console.log(`[GrantIngestion] Cleaned up ${result.meta.changes} stale grants`);
    return result.meta.changes;
  }

  /**
   * Get ingestion statistics
   * @param {number} limit - Number of recent logs to retrieve
   * @returns {Promise<Array>} Recent ingestion logs
   */
  async getIngestionStats(limit = 10) {
    const logs = await this.db.prepare(`
      SELECT *
      FROM grant_ingestion_log
      ORDER BY started_at DESC
      LIMIT ?
    `).bind(limit).all();

    return logs.results || [];
  }
}

export default GrantIngestionService;
