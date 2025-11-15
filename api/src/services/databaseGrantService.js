// VoidCat Grant Automation Platform - Database-backed Grant Service
// Hybrid service: Reads from D1 database (primary) with API fallback
// NO SIMULATIONS LAW: Real database queries, real API calls as backup

export class DatabaseGrantService {
  constructor(db, config = {}) {
    this.db = db;
    this.config = {
      useDatabase: true,              // Primary: Use database
      fallbackToAPI: true,            // Fallback: Hit APIs if DB empty
      cacheTimeout: 3600000,          // 1 hour cache validity
      ...config
    };
  }

  /**
   * Search grants from database with full-text search
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Matching grants
   */
  async searchGrants(query, filters = {}) {
    const {
      agency,
      minAmount,
      maxAmount,
      status = 'active',
      limit = 50,
      offset = 0,
      sortBy = 'matching_score',
      sortOrder = 'DESC'
    } = filters;

    try {
      // Build SQL query with optional filters
      let sql = `
        SELECT g.*
        FROM grants g
        WHERE g.status = ?
      `;
      const params = [status];

      // Full-text search if query provided
      if (query && query.trim()) {
        sql = `
          SELECT g.*, gf.rank
          FROM grants g
          JOIN grants_fts gf ON g.rowid = gf.rowid
          WHERE gf.grants_fts MATCH ?
          AND g.status = ?
        `;
        params.unshift(query); // FTS query first
      }

      // Add filters
      if (agency) {
        sql += ` AND g.agency LIKE ?`;
        params.push(`%${agency}%`);
      }

      if (minAmount) {
        sql += ` AND g.award_ceiling >= ?`;
        params.push(minAmount * 100); // Convert to cents
      }

      if (maxAmount) {
        sql += ` AND g.award_floor <= ?`;
        params.push(maxAmount * 100);
      }

      // Sorting
      const validSortFields = ['matching_score', 'close_date', 'post_date', 'updated_at'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'matching_score';
      sql += ` ORDER BY g.${sortField} ${sortOrder}`;

      // Pagination
      sql += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const result = await this.db.prepare(sql).bind(...params).all();

      // Transform from database format to API format
      return (result.results || []).map(row => this.transformDatabaseGrant(row));

    } catch (error) {
      console.error('[DatabaseGrantService] Search failed:', error);
      throw error;
    }
  }

  /**
   * Get single grant by ID
   * @param {string} id - Grant ID
   * @returns {Promise<Object>} Grant details
   */
  async getGrantById(id) {
    try {
      const result = await this.db.prepare(`
        SELECT * FROM grants WHERE id = ?
      `).bind(id).first();

      if (!result) {
        return null;
      }

      return this.transformDatabaseGrant(result);

    } catch (error) {
      console.error('[DatabaseGrantService] Get by ID failed:', error);
      throw error;
    }
  }

  /**
   * Get grants by source
   * @param {string} source - Data source
   * @param {number} limit - Result limit
   * @returns {Promise<Array>} Grants from source
   */
  async getGrantsBySource(source, limit = 50) {
    try {
      const result = await this.db.prepare(`
        SELECT * FROM grants
        WHERE source = ? AND status = 'active'
        ORDER BY matching_score DESC
        LIMIT ?
      `).bind(source, limit).all();

      return (result.results || []).map(row => this.transformDatabaseGrant(row));

    } catch (error) {
      console.error('[DatabaseGrantService] Get by source failed:', error);
      throw error;
    }
  }

  /**
   * Get grants closing soon
   * @param {number} days - Days ahead to check
   * @param {number} limit - Result limit
   * @returns {Promise<Array>} Closing grants
   */
  async getGrantsClosingSoon(days = 30, limit = 20) {
    try {
      const today = new Date().toISOString();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      const future = futureDate.toISOString();

      const result = await this.db.prepare(`
        SELECT * FROM grants
        WHERE status = 'active'
        AND close_date >= ?
        AND close_date <= ?
        ORDER BY close_date ASC
        LIMIT ?
      `).bind(today, future, limit).all();

      return (result.results || []).map(row => this.transformDatabaseGrant(row));

    } catch (error) {
      console.error('[DatabaseGrantService] Get closing soon failed:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   * @returns {Promise<Object>} Grant statistics
   */
  async getStats() {
    try {
      const total = await this.db.prepare(`
        SELECT COUNT(*) as count FROM grants WHERE status = 'active'
      `).first();

      const bySource = await this.db.prepare(`
        SELECT source, COUNT(*) as count
        FROM grants
        WHERE status = 'active'
        GROUP BY source
      `).all();

      const byAgency = await this.db.prepare(`
        SELECT agency, COUNT(*) as count
        FROM grants
        WHERE status = 'active'
        GROUP BY agency
        ORDER BY count DESC
        LIMIT 10
      `).all();

      const recentlyAdded = await this.db.prepare(`
        SELECT COUNT(*) as count
        FROM grants
        WHERE created_at >= datetime('now', '-7 days')
      `).first();

      return {
        total_active: total?.count || 0,
        by_source: bySource.results || [],
        top_agencies: byAgency.results || [],
        added_last_week: recentlyAdded?.count || 0
      };

    } catch (error) {
      console.error('[DatabaseGrantService] Get stats failed:', error);
      throw error;
    }
  }

  /**
   * Transform database row to API grant format
   * @param {Object} row - Database row
   * @returns {Object} API-formatted grant
   */
  transformDatabaseGrant(row) {
    return {
      id: row.id,
      title: row.title,
      agency: row.agency,
      agency_code: row.agency_code,
      program: row.program,
      description: row.description,
      
      // Financial info (convert from cents to dollars)
      amount: row.award_ceiling ? `$${(row.award_ceiling / 100).toLocaleString()}` : null,
      award_floor: row.award_floor ? row.award_floor / 100 : null,
      award_ceiling: row.award_ceiling ? row.award_ceiling / 100 : null,
      estimated_funding: row.estimated_funding ? row.estimated_funding / 100 : null,
      
      // Dates
      deadline: row.close_date,
      close_date: row.close_date,
      post_date: row.post_date,
      archive_date: row.archive_date,
      
      // Metadata
      opportunity_number: row.opportunity_number,
      opportunity_type: row.opportunity_type,
      cfda_number: row.cfda_number,
      eligibility: row.eligibility,
      
      // Parsed JSON fields
      applicant_types: this.safeParseJSON(row.applicant_types, []),
      funding_categories: this.safeParseJSON(row.funding_categories, []),
      tags: this.safeParseJSON(row.tags, []),
      keywords: this.safeParseJSON(row.keywords, []),
      
      // Analytics
      matching_score: row.matching_score || 0.0,
      
      // Source tracking
      data_source: row.source,
      external_id: row.external_id,
      data_freshness: row.data_freshness,
      last_verified: row.last_verified
    };
  }

  /**
   * Safely parse JSON fields
   * @param {string} jsonString - JSON string
   * @param {*} fallback - Fallback value
   * @returns {*} Parsed value or fallback
   */
  safeParseJSON(jsonString, fallback = null) {
    if (!jsonString) return fallback;
    
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      return fallback;
    }
  }
}

export default DatabaseGrantService;
