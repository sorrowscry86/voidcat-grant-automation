// Data Service for VoidCat Grant Automation Platform
// Manages live grant data from federal sources with caching and multi-source aggregation

export class DataService {
  constructor(config = {}) {
    this.config = config;
  }

    /**
     * Format Date to MM/DD/YYYY for SAM.gov API
     * @param {Date} d
     * @returns {string}
     */
    formatDateMMDDYYYY(d) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    }

  /**
   * MINOR FIX: Generate unique ID with fallback for environments without crypto API
   * @returns {string} Random 8-character ID
   */
  generateId() {
    try {
      return crypto.randomUUID().substring(0, 8);
    } catch {
      // Fallback for environments without crypto API
      return Math.random().toString(36).substring(2, 10);
    }
  }


  /**
   * Parse amount string to number (handles ranges)
   * @param {string} amountStr - Amount string like "$250,000" or "$1,000 - $5,000"
   * @returns {number|null} Parsed amount or null if unparseable
   */
  parseAmount(amountStr) {
    if (!amountStr || typeof amountStr !== 'string') return null;

    // Remove $ and commas, handle ranges by taking the first number
    const cleaned = amountStr.replace(/[$,]/g, '').split('-')[0].trim();
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Parse date string with robust error handling
   * @param {string} dateString - Date string to parse
   * @returns {Date|null} Parsed date or null if unparseable
   */
  parseDate(dateString) {
    if (!dateString) return null;

    // Handle non-string inputs
    if (typeof dateString !== 'string') {
      if (dateString instanceof Date) {
        return isNaN(dateString.getTime()) ? null : dateString;
      }
      return null;
    }

    try {
      const date = new Date(dateString);
      // Check if date is valid (not NaN)
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date format: ${dateString}`);
        return null;
      }
      return date;
    } catch (e) {
      console.warn(`Date parsing error for: ${dateString}`, e);
      return null;
    }
  }


  /**
   * Calculate matching score for a grant based on query
   * @param {Object} grant - Grant object
   * @param {string} query - Search query
   * @returns {number} Matching score between 0 and 1
   */
  calculateMatchingScore(grant, query) {
    // Handle null or undefined grant
    if (!grant) return 0;

    // Default score for no query
    if (!query || typeof query !== 'string' || !query.trim()) return 0.75;

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);

    // Safely build grant text with null checks
    const grantText = [
      grant?.title || '',
      grant?.description || '',
      grant?.agency || '',
      grant?.program || ''
    ].join(' ').toLowerCase();

    let matches = 0;
    let totalScore = 0;

    searchTerms.forEach(term => {
      // Title matches get higher weight
      if (grant?.title && typeof grant.title === 'string' && grant.title.toLowerCase().includes(term)) {
        matches++;
        totalScore += 0.4;
      }
      // Description matches
      else if (grant?.description && typeof grant.description === 'string' && grant.description.toLowerCase().includes(term)) {
        matches++;
        totalScore += 0.3;
      }
      // Agency/program matches
      else if (grantText.includes(term)) {
        matches++;
        totalScore += 0.2;
      }
      // Tag matches
      else if (grant?.tags && Array.isArray(grant.tags)) {
        const hasTagMatch = grant.tags.some(tag =>
          tag && typeof tag === 'string' && tag.toLowerCase().includes(term)
        );
        if (hasTagMatch) {
          matches++;
          totalScore += 0.3;
        }
      }
    });

    const baseScore = matches / searchTerms.length;
    const weightedScore = totalScore / searchTerms.length;
    const finalScore = (baseScore * 0.6) + (weightedScore * 0.4);

    return Math.min(0.95, Math.max(0.1, finalScore));
  }


  /**
   * Validate grant data structure
   * @param {Object} grant - Grant object to validate
   * @returns {Object} Validation result with detailed errors
   */
  validateGrant(grant) {
    const errors = [];
    const warnings = [];

    // Check if grant object exists
    if (!grant || typeof grant !== 'object') {
      errors.push('Grant must be a valid object');
      return { valid: false, errors, warnings };
    }

    // Validate required fields
    const requiredFields = ['id', 'title', 'agency', 'program', 'deadline', 'amount', 'description'];

    requiredFields.forEach(field => {
      if (!grant[field] || (typeof grant[field] === 'string' && grant[field].trim() === '')) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Validate field types
    if (grant.id && typeof grant.id !== 'string') {
      errors.push('Field "id" must be a string');
    }

    if (grant.title && typeof grant.title !== 'string') {
      errors.push('Field "title" must be a string');
    }

    if (grant.agency && typeof grant.agency !== 'string') {
      errors.push('Field "agency" must be a string');
    }

    if (grant.program && typeof grant.program !== 'string') {
      errors.push('Field "program" must be a string');
    }

    if (grant.description && typeof grant.description !== 'string') {
      errors.push('Field "description" must be a string');
    }

    // Validate date format using robust parseDate
    if (grant.deadline) {
      const parsedDate = this.parseDate(grant.deadline);
      if (!parsedDate) {
        errors.push('Invalid deadline date format');
      }
    }

    // Validate matching score
    if (grant.matching_score !== undefined && grant.matching_score !== null) {
      if (typeof grant.matching_score !== 'number') {
        errors.push('Field "matching_score" must be a number');
      } else if (grant.matching_score < 0 || grant.matching_score > 1) {
        errors.push('Field "matching_score" must be between 0 and 1');
      }
    }

    // Validate tags (optional but must be array if present)
    if (grant.tags !== undefined && grant.tags !== null) {
      if (!Array.isArray(grant.tags)) {
        errors.push('Field "tags" must be an array');
      } else {
        grant.tags.forEach((tag, index) => {
          if (typeof tag !== 'string') {
            warnings.push(`Tag at index ${index} is not a string`);
          }
        });
      }
    }

    // Validate eligibility (optional but must be string if present)
    if (grant.eligibility !== undefined && grant.eligibility !== null) {
      if (typeof grant.eligibility !== 'string') {
        warnings.push('Field "eligibility" should be a string');
      }
    }

    // Validate data_source (optional but must be string if present)
    if (grant.data_source !== undefined && grant.data_source !== null) {
      if (typeof grant.data_source !== 'string') {
        warnings.push('Field "data_source" should be a string');
      }
    }

    // Validate amount format (optional validation for common patterns)
    if (grant.amount && typeof grant.amount === 'string') {
      // Check if it's parseable as amount
      const parsedAmount = this.parseAmount(grant.amount);
      if (parsedAmount === null && !grant.amount.toLowerCase().includes('tbd')) {
        warnings.push('Amount format may not be parseable');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }


  /**
   * Phase 2A: Fetch with KV caching (12-hour TTL)
   * @param {string} query - Search query
   * @param {string} agency - Agency filter
   * @param {Object} env - Cloudflare environment with FEDERAL_CACHE binding
   * @param {Object} telemetry - Telemetry service
   * @returns {Object} Cached or fresh grant data
   */
  async fetchWithCache(query, agency, env, telemetry = null) {
    // Feature flag check
    if (!env.FEATURE_LIVE_DATA) {
      return await this.fetchLiveGrantData(query, agency, telemetry);
    }

    try {
      // Generate cache key
      const cacheKey = `federal:q=${encodeURIComponent(query || '')}&a=${encodeURIComponent(agency || '')}`;
      
      // Check KV cache first
      if (env.FEDERAL_CACHE) {
        const cached = await env.FEDERAL_CACHE.get(cacheKey, 'json');
        if (cached) {
          console.log(`🎯 DataService: Cache HIT for key: ${cacheKey}`);
          if (telemetry) {
            telemetry.logInfo('Cache hit', { cache_key: cacheKey, data_source: 'cache' });
          }
          return {
            ...cached,
            fromCache: true,
            cacheKey,
            cacheTtl: 43200 // 12 hours
          };
        }
        console.log(`🔍 DataService: Cache MISS for key: ${cacheKey}`);
      }

      // Fetch fresh data with multi-source aggregation
      const freshData = await this.fetchMultiSourceData(query, agency, telemetry);
      
      // Cache the result for 12 hours
      if (env.FEDERAL_CACHE && freshData.grants.length > 0) {
        await env.FEDERAL_CACHE.put(cacheKey, JSON.stringify(freshData), {
          expirationTtl: 43200 // 12 hours
        });
        console.log(`💾 DataService: Cached ${freshData.grants.length} grants for 12 hours`);
      }
      
      return {
        ...freshData,
        fromCache: false,
        cacheKey
      };
      
    } catch (error) {
      console.error('DataService: Cache operation failed:', error);
      
      // NO SIMULATIONS LAW: Log failure and throw - do not silently fallback
      if (telemetry) {
        telemetry.logError('Cache operation FAILED - throwing error per NO SIMULATIONS LAW', error, {
          operation: 'fetchWithCache',
          execution: 'failed',
          query: query || '',
          agency: agency || '',
          timestamp: new Date().toISOString()
        });
      }
      
      throw new Error(`Live data fetch failed: ${error.message}`);
    }
  }

  /**
   * Phase 2A: Multi-source data aggregation with retry logic
   * @param {string} query - Search query
   * @param {string} agency - Agency filter
   * @param {Object} telemetry - Telemetry service
   * @returns {Object} Aggregated grant data from multiple sources
   */
  async fetchMultiSourceData(query, agency, telemetry = null) {
    const allGrants = [];
    const sources = [];
    const errors = [];

    // Source 1: SAM.gov (primary when configured)
    try {
      if ((typeof env !== 'undefined' && env.SAM_API_KEY) || typeof SAM_API_KEY !== 'undefined') {
        console.log('🔍 DataService: Fetching from SAM.gov...');
        const samResult = await this.fetchWithRetry(
          () => this.fetchFromSamGov(query, agency),
          3,
          1000,
          telemetry
        );
        if (samResult.grants && samResult.grants.length > 0) {
          allGrants.push(...samResult.grants);
          sources.push('sam.gov');
          console.log(`✅ DataService: SAM.gov returned ${samResult.grants.length} grants`);
        }
      } else {
        console.log('ℹ️ DataService: SAM_API_KEY not configured; skipping SAM.gov');
      }
    } catch (error) {
      console.warn('⚠️ DataService: SAM.gov fetch failed:', error.message || error);
      errors.push({ source: 'sam.gov', error: error.message || String(error) });
      if (telemetry) telemetry.logWarning('SAM.gov fetch failed', { error: error.message || String(error) });
    }

    // Source 2: Grants.gov
    try {
      console.log('🔍 DataService: Fetching from Grants.gov...');
      const grantsGovResult = await this.fetchWithRetry(
        () => this.fetchFromGrantsGov(query, agency),
        3,
        1000,
        telemetry
      );
      if (grantsGovResult.grants && grantsGovResult.grants.length > 0) {
        allGrants.push(...grantsGovResult.grants);
        sources.push('grants.gov');
        console.log(`✅ DataService: Grants.gov returned ${grantsGovResult.grants.length} grants`);
      }
    } catch (error) {
      console.warn('⚠️ DataService: Grants.gov fetch failed:', error.message || error);
      errors.push({ source: 'grants.gov', error: error.message || String(error) });
      if (telemetry) telemetry.logWarning('Grants.gov fetch failed', { error: error.message || String(error) });
    }

    // Source 3: SBIR.gov (may be down)
    try {
      console.log('🔍 DataService: Fetching from SBIR.gov...');
      const sbirResult = await this.fetchWithRetry(
        () => this.fetchFromSbirGov(query, agency),
        3,
        1000,
        telemetry
      );
      if (sbirResult.grants && sbirResult.grants.length > 0) {
        allGrants.push(...sbirResult.grants);
        sources.push('sbir.gov');
        console.log(`✅ DataService: SBIR.gov returned ${sbirResult.grants.length} grants`);
      }
    } catch (error) {
      console.warn('⚠️ DataService: SBIR.gov fetch failed:', error.message || error);
      errors.push({ source: 'sbir.gov', error: error.message || String(error) });
      if (telemetry) telemetry.logWarning('SBIR.gov fetch failed', { error: error.message || String(error) });
    }

    if (allGrants.length === 0) {
      console.error('DataService: All live data sources failed');
      if (telemetry) {
        telemetry.logError('All external data sources FAILED', new Error('All sources failed'), {
          execution: 'failed',
          sources_attempted: ['sam.gov', 'grants.gov', 'sbir.gov'],
          errors,
          query: query || '',
          agency: agency || '',
          timestamp: new Date().toISOString()
        });
      }
      throw new Error('All external grant data sources failed. Live data unavailable.');
    }

    const deduplicatedGrants = this.mergeAndDeduplicate(allGrants, query);
    return {
      grants: deduplicatedGrants,
      sources,
      source_count: sources.length,
      failed_sources: errors,
      partial_data: errors.length > 0,
      totalFromSources: allGrants.length,
      afterDeduplication: deduplicatedGrants.length
    };
  }

  /**
   * Phase 2A: Fetch from SBIR.gov API
   * @param {string} query - Search query
   * @param {string} agency - Agency filter
   * @returns {Object} SBIR grant data
   */
  async fetchFromSbirGov(query, agency) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const response = await fetch('https://www.sbir.gov/api/opportunities.json', {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'VoidCat Grant Search API/1.0',
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`SBIR API returned ${response.status}: ${response.statusText}`);
      }
    }

    /**
     * Fetch from SAM.gov Opportunities v2 API
     * Requires SAM API key configured as secret
     */
    async fetchFromSamGov(query, agency) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const now = new Date();
        const from = new Date(now);
        from.setDate(from.getDate() - 300); // within 1-year window; choose ~10 months

        const params = new URLSearchParams();
        // api_key is required
        const samKey = (typeof env !== 'undefined' && env.SAM_API_KEY) ? env.SAM_API_KEY : (typeof SAM_API_KEY !== 'undefined' ? SAM_API_KEY : '');
        if (!samKey) throw new Error('SAM_API_KEY is not configured');
        params.set('api_key', samKey);

        params.set('postedFrom', this.formatDateMMDDYYYY(from));
        params.set('postedTo', this.formatDateMMDDYYYY(now));
        params.set('limit', '100');
        params.set('offset', '0');
        if (query && query.trim()) params.set('title', query.trim());
        if (agency && agency.trim()) params.set('deptname', agency.trim());

        const url = `https://api.sam.gov/opportunities/v2/search?${params.toString()}`;
        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'VoidCat Grant Search API/1.0'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`SAM.gov API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const items = Array.isArray(data?.opportunitiesData) ? data.opportunitiesData : [];
        const transformedGrants = this.transformSamData(items, query, agency);

        return {
          grants: transformedGrants,
          source: 'sam.gov',
          raw_count: items.length
        };
      } catch (error) {
        clearTimeout(timeoutId);
        throw new Error(`SAM.gov fetch failed: ${error.message}`);
      }
    }

    /**
     * Transform SAM.gov data to internal format
     */
    transformSamData(items, query, agency) {
      if (!Array.isArray(items)) return [];
      return items.map(item => {
        const title = (item && (item.title || item.solicitationNumber)) || 'Federal Opportunity';
        const department = item?.department || item?.subTier || 'Federal Agency';
        const program = item?.baseType || item?.type || 'Federal Program';
        const deadline = item?.responseDeadLine || item?.archiveDate || item?.postedDate || '2025-12-31';
        const description = typeof item?.description === 'string' ? item.description : (title || 'Federal funding opportunity');
        const grant = {
          id: item?.noticeId || `SAM-${Date.now()}-${this.generateId()}`,
          title,
          agency: department,
          program,
          deadline,
          amount: 'Amount TBD',
          description,
          eligibility: 'See opportunity details for eligibility requirements',
          data_source: 'sam.gov'
        };
        grant.matching_score = this.calculateMatchingScore(grant, query);
        return grant;
      });
    }
      
      const data = await response.json();
      const opportunities = data.opportunities || data.results || data || [];
      
      if (!Array.isArray(opportunities)) {
        console.warn('SBIR API returned unexpected format');
        return { grants: [] };
      }
      
      const transformedGrants = this.transformSbirData(opportunities, query, agency);
      
      return {
        grants: transformedGrants,
        source: 'sbir.gov',
        raw_count: opportunities.length
      };
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw new Error(`SBIR.gov fetch failed: ${error.message}`);
    }
  }

  /**
   * Phase 2A: Transform SBIR.gov data to internal format
   * @param {Array} opportunities - Raw SBIR opportunities
   * @param {string} query - Search query for scoring
   * @param {string} agency - Agency filter
   * @returns {Array} Transformed grant objects
   */
  transformSbirData(opportunities, query, agency) {
    return opportunities
      .filter(opp => {
        // Basic data validation
        if (!opp.title && !opp.opportunity_title) return false;
        
        // Agency filter
        if (agency) {
          const oppAgency = (opp.agency || opp.funding_agency || '').toLowerCase();
          if (!oppAgency.includes(agency.toLowerCase())) return false;
        }
        
        return true;
      })
      .map(opp => ({
        id: opp.opportunity_id || opp.id || `SBIR-${Date.now()}-${this.generateId()}`,
        title: opp.title || opp.opportunity_title || 'SBIR/STTR Opportunity',
        agency: opp.agency || opp.funding_agency || 'SBIR Agency',
        program: opp.program || opp.solicitation_topic || 'SBIR/STTR',
        deadline: opp.proposals_due_date || opp.close_date || opp.deadline || '2025-12-31',
        amount: this.formatSbirAmount(opp.award_amount || opp.funding_amount),
        description: opp.description || opp.abstract || opp.title || 'SBIR/STTR funding opportunity',
        eligibility: 'Small businesses (<500 employees) with research partnerships',
        matching_score: this.calculateMatchingScore(opp, query),
        tags: this.extractSbirTags(opp),
        data_source: 'sbir.gov',
        opportunity_type: opp.type || 'SBIR/STTR',
        funding_agency_code: opp.agency_code || 'SBIR',
        cfda_number: opp.cfda_number || 'TBD'
      }));
  }

  /**
   * Format SBIR amount data
   * @param {*} amount - Raw amount data
   * @returns {string} Formatted amount string
   */
  formatSbirAmount(amount) {
    if (!amount) return 'Amount TBD';
    if (typeof amount === 'string') return amount;
    if (typeof amount === 'number') return `$${amount.toLocaleString()}`;
    if (amount.min && amount.max) {
      return `$${parseInt(amount.min).toLocaleString()} - $${parseInt(amount.max).toLocaleString()}`;
    }
    return 'Amount TBD';
  }

  /**
   * Extract tags from SBIR opportunity data
   * @param {Object} opp - SBIR opportunity
   * @returns {Array} Array of tags
   */
  extractSbirTags(opp) {
    const tags = [];
    
    if (opp.topic_keywords) {
      tags.push(...opp.topic_keywords.split(',').map(t => t.trim()));
    }
    
    if (opp.research_areas) {
      tags.push(...opp.research_areas);
    }
    
    // Add program type
    if (opp.type) {
      tags.push(opp.type);
    } else {
      tags.push('SBIR/STTR');
    }
    
    return tags.filter(tag => tag && tag.length > 0);
  }

  /**
   * Phase 2A: Fetch from Grants.gov with improved error handling
   * @param {string} query - Search query
   * @param {string} agency - Agency filter
   * @returns {Object} Grants.gov data
   */
  async fetchFromGrantsGov(query, agency) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const searchBody = {
        keyword: query || '',
        ...(agency && { agency: agency })
      };
      
      const response = await fetch('https://api.grants.gov/v1/api/search2', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'VoidCat Grant Search API/1.0'
        },
        body: JSON.stringify(searchBody)
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Grants.gov API returned ${response.status}: ${response.statusText}`);
      }
      
      const liveData = await response.json();
      
      // Handle flexible schema
      let opportunitiesRaw;
      if (Array.isArray(liveData)) {
        opportunitiesRaw = liveData;
      } else if (liveData && typeof liveData === 'object') {
        opportunitiesRaw = liveData.opportunities || liveData.data || liveData.results || [];
      } else {
        opportunitiesRaw = [];
      }
      
      if (!Array.isArray(opportunitiesRaw)) {
        opportunitiesRaw = [];
      }
      
      const transformedGrants = this.transformLiveGrantData(opportunitiesRaw, query);
      
      return {
        grants: transformedGrants,
        source: 'grants.gov',
        raw_count: opportunitiesRaw.length
      };
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw new Error(`Grants.gov fetch failed: ${error.message}`);
    }
  }

  /**
   * Phase 2A: Retry wrapper with exponential backoff
   * @param {Function} operation - Async operation to retry
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} initialDelay - Initial delay in ms
   * @param {Object} telemetry - Telemetry service
   * @returns {*} Operation result
   */
  async fetchWithRetry(operation, maxRetries = 3, initialDelay = 1000, telemetry = null) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        if (attempt > 1 && telemetry) {
          telemetry.logInfo('Retry successful', { attempt, maxRetries });
        }
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          console.error(`DataService: Operation failed after ${maxRetries} attempts:`, error);
          break;
        }
        
        const delay = initialDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`DataService: Attempt ${attempt} failed, retrying in ${delay}ms...`);
        
        if (telemetry) {
          telemetry.logWarning('Retry attempt', { attempt, maxRetries, delay, error: error.message });
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  /**
   * Phase 2A: Merge grants from multiple sources and deduplicate
   * @param {Array} allGrants - Grants from all sources
   * @param {string} query - Search query for re-scoring
   * @returns {Array} Deduplicated and sorted grants
   */
  mergeAndDeduplicate(allGrants, query) {
    const seenIds = new Set();
    const seenTitles = new Set();
    const deduplicated = [];
    
    // Sort by data source priority: live sources first, then mock
    const prioritized = allGrants.sort((a, b) => {
      const aPriority = a.data_source === 'mock' ? 3 : (a.data_source === 'sbir.gov' ? 1 : 2);
      const bPriority = b.data_source === 'mock' ? 3 : (b.data_source === 'sbir.gov' ? 1 : 2);
      return aPriority - bPriority;
    });
    
    for (const grant of prioritized) {
      // Skip duplicates by ID
      if (seenIds.has(grant.id)) continue;
      
      // Skip near-duplicates by title (fuzzy matching)
      const normalizedTitle = grant.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      let isDuplicate = false;
      
      for (const existingTitle of seenTitles) {
        if (this.calculateStringSimilarity(normalizedTitle, existingTitle) > 0.85) {
          isDuplicate = true;
          break;
        }
      }
      
      if (isDuplicate) continue;
      
      // Add to results
      seenIds.add(grant.id);
      seenTitles.add(normalizedTitle);
      
      // Recalculate matching score
      grant.matching_score = this.calculateMatchingScore(grant, query);
      
      deduplicated.push(grant);
    }
    
    // Sort by relevance score
    return deduplicated.sort((a, b) => b.matching_score - a.matching_score);
  }

  /**
   * Calculate string similarity (Jaccard similarity)
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score 0-1
   */
  calculateStringSimilarity(str1, str2) {
    const set1 = new Set(str1.split(' ').filter(w => w.length > 2));
    const set2 = new Set(str2.split(' ').filter(w => w.length > 2));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Fetch live grant data from external APIs (moved from grants route)
   */
  async fetchLiveGrantData(query, agency, telemetry = null) {
    const dataConfig = this.config.live_data || {
      USE_LIVE_DATA: true,
      FALLBACK_TO_MOCK: false, // PRODUCTION MODE: No mock fallback
      LIVE_DATA_TIMEOUT: 15000,
      LIVE_DATA_SOURCES: {
        GRANTS_GOV_API: 'https://api.grants.gov/v1/api/search2'
      }
    };

    const result = {
      grants: [],
      actualDataSource: 'live',
      fallbackOccurred: false,
      error: null
    };

    if (dataConfig.USE_LIVE_DATA) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), dataConfig.LIVE_DATA_TIMEOUT);
        
        const searchBody = {
          keyword: query || '',
          ...(agency && { agency: agency })
        };
        
        console.log(`🔍 DataService: Attempting live data fetch from grants.gov API...`);
        if (telemetry) {
          telemetry.logInfo('Live data fetch attempt', {
            endpoint: dataConfig.LIVE_DATA_SOURCES.GRANTS_GOV_API,
            query: query || '',
            agency: agency || ''
          });
        }
        
        const response = await fetch(dataConfig.LIVE_DATA_SOURCES.GRANTS_GOV_API, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'VoidCat Grant Search API/1.0'
          },
          body: JSON.stringify(searchBody)
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Grant data API returned ${response.status}: ${response.statusText}`);
        }
        
        const liveData = await response.json();

        // Accept flexible schema: array or wrapped object
        let opportunitiesRaw;
        if (Array.isArray(liveData)) {
          opportunitiesRaw = liveData;
        } else if (liveData && typeof liveData === 'object') {
          opportunitiesRaw = liveData.opportunities || liveData.data || liveData.results || [];
        } else {
          opportunitiesRaw = [];
        }

        if (!Array.isArray(opportunitiesRaw)) {
          console.warn('Live data schema unexpected, normalizing to empty array', { type: typeof opportunitiesRaw });
          opportunitiesRaw = [];
        }

        // Transform grants.gov data using DataService logic
        const transformedGrants = this.transformLiveGrantData(opportunitiesRaw, query);
        
        console.log(`✅ DataService: Live data fetch successful: ${transformedGrants.length} grants`);
        if (telemetry) {
          telemetry.logInfo('Live data fetch successful', {
            grants_count: transformedGrants.length,
            raw_data_length: opportunitiesRaw.length,
            data_source: 'live'
          });
        }

        result.grants = transformedGrants;
        result.actualDataSource = 'live';
        result.fallbackOccurred = false;
        return result;
        
      } catch (error) {
        console.error('DataService: Live data fetch FAILED:', {
          error: error.message,
          query,
          agency,
          timestamp: new Date().toISOString()
        });
        
        // NO SIMULATIONS LAW: Log failure and throw - no silent mock fallback in production
        if (telemetry) {
          telemetry.logError('Live data fetch FAILED - throwing error per NO SIMULATIONS LAW', error, {
            execution: 'failed',
            query: query || '',
            agency: agency || '',
            use_live_data: dataConfig.USE_LIVE_DATA,
            timestamp: new Date().toISOString()
          });
        }
        
        throw new Error(`Live grant data fetch failed: ${error.message}`);
      }
    }
    
    // Live data disabled - return error
    console.error('DataService: Live data is disabled');

    if (telemetry) {
      telemetry.logError('Live data is disabled', new Error('FEATURE_LIVE_DATA is false'), {
        execution: 'failed',
        query: query || '',
        agency: agency || '',
        use_live_data: false,
        timestamp: new Date().toISOString()
      });
    }

    throw new Error('Live grant data is disabled. Please enable FEATURE_LIVE_DATA to access grant information.');
  }

  /**
   * Transform live grant data to internal format
   */
  transformLiveGrantData(opportunitiesRaw, query) {
    return opportunitiesRaw.map(grant => ({
      id: grant.opportunityId || grant.id || `LIVE-${Date.now()}-${this.generateId()}`,
      title: grant.opportunityTitle || grant.title || 'Federal Grant Opportunity',
      agency: grant.agencyName || grant.agency || 'Federal Agency',
      program: grant.opportunityCategory || grant.program || 'Federal Program',
      deadline: grant.closeDate || grant.deadline || '2025-12-31',
      amount: grant.awardFloor ? `$${parseInt(grant.awardFloor).toLocaleString()} - $${parseInt(grant.awardCeiling || grant.awardFloor).toLocaleString()}` : 'Amount TBD',
      description: grant.description || grant.opportunityTitle || 'Federal funding opportunity',
      eligibility: grant.eligibilityDesc || 'See opportunity details for eligibility requirements',
      matching_score: this.calculateMatchingScore(grant, query),
      data_source: 'live'
    }));
  }
}

export default DataService;