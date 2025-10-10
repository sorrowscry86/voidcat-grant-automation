// Data Service for VoidCat Grant Automation Platform
// Manages mock grant data and provides data access abstraction

export class DataService {
  constructor(config = {}) {
    this.config = config;
    this.mockGrants = null;
    this.mockMeta = null;
    this.loadMockData();
  }

  /**
   * Load mock data from JSON file
   */
  loadMockData() {
    try {
      // In Cloudflare Workers, we need to embed the data
      const mockData = {
        "meta": {
          "version": "1.0.0",
          "last_updated": "2025-09-26T00:00:00.000Z",
          "total_grants": 7,
          "source": "VoidCat Mock Data System",
          "description": "Mock federal grant data for development and testing"
        },
        "grants": [
          {
            "id": "SBIR-25-001",
            "title": "AI for Defense Applications",
            "agency": "Department of Defense",
            "program": "SBIR Phase I",
            "deadline": "2025-09-15",
            "amount": "$250,000",
            "description": "Seeking innovative AI solutions for defense applications including autonomous systems, cybersecurity, and logistics optimization.",
            "eligibility": "Small businesses with <500 employees",
            "matching_score": 0.95,
            "tags": ["AI", "Defense", "Autonomous Systems", "Cybersecurity"],
            "data_source": "mock",
            "opportunity_type": "SBIR",
            "funding_agency_code": "DOD",
            "cfda_number": "12.800"
          },
          {
            "id": "NSF-25-002",
            "title": "Artificial Intelligence Research Institutes",
            "agency": "National Science Foundation",
            "program": "AI Institutes",
            "deadline": "2025-11-30",
            "amount": "$20,000,000",
            "description": "Multi-institutional AI research institutes focused on advancing AI for materials discovery, climate science, and healthcare.",
            "eligibility": "Academic institutions with industry partners",
            "matching_score": 0.87,
            "tags": ["AI", "Research", "Materials Science", "Healthcare"],
            "data_source": "mock",
            "opportunity_type": "Grant",
            "funding_agency_code": "NSF",
            "cfda_number": "47.070"
          },
          {
            "id": "DARPA-25-004",
            "title": "Explainable AI for Military Decision Making",
            "agency": "DARPA",
            "program": "XAI",
            "deadline": "2025-08-30",
            "amount": "$1,500,000",
            "description": "Developing AI systems that can explain their decision-making processes for military applications.",
            "eligibility": "U.S. organizations with security clearance capability",
            "matching_score": 0.91,
            "tags": ["AI", "Military", "Explainable AI", "Decision Making"],
            "data_source": "mock",
            "opportunity_type": "Research",
            "funding_agency_code": "DARPA",
            "cfda_number": "12.910"
          },
          {
            "id": "NASA-25-005",
            "title": "AI for Space Exploration",
            "agency": "NASA",
            "program": "ROSES",
            "deadline": "2025-10-15",
            "amount": "$800,000",
            "description": "AI technologies for autonomous spacecraft operations, planetary exploration, and space science data analysis.",
            "eligibility": "U.S. and foreign entities (excluding China)",
            "matching_score": 0.88,
            "tags": ["AI", "Space", "Autonomous Systems", "Data Analysis"],
            "data_source": "mock",
            "opportunity_type": "Research",
            "funding_agency_code": "NASA",
            "cfda_number": "43.001"
          },
          {
            "id": "DARPA-25-006",
            "title": "Artificial Intelligence Next Campaign",
            "agency": "DARPA",
            "program": "AI Next",
            "deadline": "2025-03-15",
            "amount": "$5,000,000",
            "description": "Revolutionary AI research for national security applications including autonomous systems, cybersecurity, and logistics optimization.",
            "eligibility": "Research institutions and innovative companies",
            "matching_score": 0.91,
            "tags": ["AI", "Machine Learning", "Defense", "Research"],
            "data_source": "mock",
            "opportunity_type": "Research",
            "funding_agency_code": "DARPA",
            "cfda_number": "12.910"
          },
          {
            "id": "NIH-25-007",
            "title": "AI for Medical Diagnosis",
            "agency": "National Institutes of Health",
            "program": "STTR Phase II",
            "deadline": "2025-04-30",
            "amount": "$2,000,000",
            "description": "Developing AI systems for early disease detection and personalized treatment recommendations.",
            "eligibility": "Small businesses partnering with research institutions",
            "matching_score": 0.88,
            "tags": ["Healthcare", "AI", "Diagnostics", "STTR"],
            "data_source": "mock",
            "opportunity_type": "STTR",
            "funding_agency_code": "NIH",
            "cfda_number": "93.213"
          },
          {
            "id": "DOE-25-008",
            "title": "Smart Grid AI Optimization",
            "agency": "Department of Energy",
            "program": "Grid Modernization",
            "deadline": "2025-06-01",
            "amount": "$3,500,000",
            "description": "AI-powered optimization of electrical grid systems for improved efficiency and renewable energy integration.",
            "eligibility": "US companies with energy sector experience",
            "matching_score": 0.85,
            "tags": ["Energy", "Smart Grid", "AI", "Infrastructure"],
            "data_source": "mock",
            "opportunity_type": "Grant",
            "funding_agency_code": "DOE",
            "cfda_number": "81.041"
          }
        ]
      };
      
      this.mockGrants = mockData.grants;
      this.mockMeta = mockData.meta;
    } catch (error) {
      console.error('Failed to load mock data:', error);
      this.mockGrants = [];
      this.mockMeta = {
        version: "1.0.0",
        last_updated: new Date().toISOString(),
        total_grants: 0,
        source: "VoidCat Mock Data System",
        description: "Mock federal grant data for development and testing"
      };
    }
  }

  /**
   * Get all mock grants
   * @returns {Array} Array of grant objects
   */
  getMockGrants() {
    return this.mockGrants;
  }

  /**
   * Get mock grant by ID with enriched details
   * @param {string} grantId - Grant ID to find
   * @returns {Object|null} Grant object with detailed information or null if not found
   */
  getMockGrantById(grantId) {
    const grant = this.mockGrants.find(grant => grant.id === grantId);
    if (!grant) return null;
    
    // Enrich grant with detailed fields expected by frontend
    return {
      ...grant,
      full_description: grant.description + ' This opportunity represents a significant funding opportunity for organizations developing cutting-edge technologies. The program seeks to advance the state of the art while addressing critical gaps in current capabilities.',
      requirements: [
        'Must be a U.S. small business or eligible organization',
        'Meet size standards for the program',
        'Principal investigator time commitment as specified',
        'Compliance with all federal regulations',
        'Demonstrated technical capability and relevant experience'
      ],
      evaluation_criteria: [
        'Technical merit and innovation',
        'Potential for commercialization or impact',
        'Qualifications of research team',
        'Feasibility of proposed approach',
        'Relevance to agency mission and priorities'
      ],
      submission_requirements: [
        'Technical proposal (15-25 pages)',
        'Budget justification and cost breakdown',
        'Team qualifications and biosketches',
        'Letters of support (if applicable)',
        'Compliance documentation'
      ],
      contact: {
        name: `${grant.agency} Program Officer`,
        email: `grants@${grant.funding_agency_code?.toLowerCase() || 'federal'}.gov`,
        phone: '1-800-XXX-XXXX'
      }
    };
  }

  /**
   * Search mock grants by query
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters (agency, program, etc.)
   * @returns {Array} Filtered grant array
   */
  searchMockGrants(query, filters = {}) {
    let results = [...this.mockGrants];

    // Apply text search
    if (query && query.trim()) {
      const searchQuery = query.toLowerCase().trim();
      results = results.filter(grant => 
        grant.title.toLowerCase().includes(searchQuery) ||
        grant.description.toLowerCase().includes(searchQuery) ||
        grant.program.toLowerCase().includes(searchQuery) ||
        grant.agency.toLowerCase().includes(searchQuery) ||
        (grant.tags && grant.tags.some(tag => tag.toLowerCase().includes(searchQuery)))
      );
    }

    // Apply agency filter
    if (filters.agency) {
      const agencyMap = {
        'defense': 'department of defense',
        'nsf': 'national science foundation',
        'energy': 'department of energy',
        'darpa': 'darpa',
        'nasa': 'nasa',
        'nih': 'national institutes of health'
      };
      const searchAgency = agencyMap[filters.agency.toLowerCase()] || filters.agency.toLowerCase();
      results = results.filter(grant => 
        grant.agency.toLowerCase().includes(searchAgency)
      );
    }

    // Apply deadline filter
    if (filters.deadline) {
      const targetDate = new Date(filters.deadline);
      if (!isNaN(targetDate.getTime())) {
        results = results.filter(grant => {
          const grantDeadline = new Date(grant.deadline);
          return grantDeadline <= targetDate;
        });
      }
    }

    // Apply program filter
    if (filters.program) {
      results = results.filter(grant => 
        grant.program.toLowerCase().includes(filters.program.toLowerCase())
      );
    }

    // Apply amount filter (parse amount strings)
    if (filters.minAmount || filters.maxAmount) {
      results = results.filter(grant => {
        const amount = this.parseAmount(grant.amount);
        if (amount === null) return true; // Keep grants with unparseable amounts
        
        if (filters.minAmount && amount < filters.minAmount) return false;
        if (filters.maxAmount && amount > filters.maxAmount) return false;
        return true;
      });
    }

    // Apply opportunity type filter
    if (filters.opportunityType) {
      results = results.filter(grant => 
        grant.opportunity_type && 
        grant.opportunity_type.toLowerCase() === filters.opportunityType.toLowerCase()
      );
    }

    return results;
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
   * Get mock data metadata
   * @returns {Object} Metadata about the mock dataset
   */
  getMockMeta() {
    return {
      ...this.mockMeta,
      total_grants: this.mockGrants.length,
      last_accessed: new Date().toISOString()
    };
  }

  /**
   * Calculate matching score for a grant based on query
   * @param {Object} grant - Grant object
   * @param {string} query - Search query
   * @returns {number} Matching score between 0 and 1
   */
  calculateMatchingScore(grant, query) {
    if (!query || !query.trim()) return 0.75; // Default score for no query
    
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    const grantText = `${grant.title || ''} ${grant.description || ''} ${grant.agency || ''} ${grant.program || ''}`.toLowerCase();
    
    let matches = 0;
    let totalScore = 0;
    
    searchTerms.forEach(term => {
      // Title matches get higher weight
      if (grant.title && grant.title.toLowerCase().includes(term)) {
        matches++;
        totalScore += 0.4;
      }
      // Description matches
      else if (grant.description && grant.description.toLowerCase().includes(term)) {
        matches++;
        totalScore += 0.3;
      }
      // Agency/program matches
      else if (grantText.includes(term)) {
        matches++;
        totalScore += 0.2;
      }
      // Tag matches
      else if (grant.tags && grant.tags.some(tag => tag.toLowerCase().includes(term))) {
        matches++;
        totalScore += 0.3;
      }
    });
    
    const baseScore = matches / searchTerms.length;
    const weightedScore = totalScore / searchTerms.length;
    const finalScore = (baseScore * 0.6) + (weightedScore * 0.4);
    
    return Math.min(0.95, Math.max(0.1, finalScore));
  }

  /**
   * Get grants filtered and sorted
   * @param {Object} options - Search and filter options
   * @returns {Object} Results with grants array and metadata
   */
  getGrants(options = {}) {
    const {
      query,
      agency,
      program,
      deadline,
      minAmount,
      maxAmount,
      opportunityType,
      limit = 50,
      offset = 0
    } = options;

    // Search and filter
    let results = this.searchMockGrants(query, {
      agency,
      program,
      deadline,
      minAmount,
      maxAmount,
      opportunityType
    });

    // Update matching scores
    results = results.map(grant => ({
      ...grant,
      matching_score: this.calculateMatchingScore(grant, query)
    }));

    // Sort by matching score (highest first)
    results.sort((a, b) => b.matching_score - a.matching_score);

    // Apply pagination
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      grants: paginatedResults,
      total,
      offset,
      limit,
      hasMore: offset + limit < total,
      meta: this.getMockMeta()
    };
  }

  /**
   * Validate grant data structure
   * @param {Object} grant - Grant object to validate
   * @returns {Object} Validation result
   */
  validateGrant(grant) {
    const errors = [];
    const requiredFields = ['id', 'title', 'agency', 'program', 'deadline', 'amount', 'description'];
    
    requiredFields.forEach(field => {
      if (!grant[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Validate date format
    if (grant.deadline) {
      const date = new Date(grant.deadline);
      if (isNaN(date.getTime())) {
        errors.push('Invalid deadline date format');
      }
    }

    // Validate matching score
    if (grant.matching_score !== undefined) {
      if (typeof grant.matching_score !== 'number' || grant.matching_score < 0 || grant.matching_score > 1) {
        errors.push('Invalid matching_score: must be a number between 0 and 1');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get grant statistics
   * @returns {Object} Statistics about the grant dataset
   */
  getStatistics() {
    const agencies = {};
    const programs = {};
    const opportunityTypes = {};
    let totalAmount = 0;
    let validAmounts = 0;

    this.mockGrants.forEach(grant => {
      // Count agencies
      agencies[grant.agency] = (agencies[grant.agency] || 0) + 1;
      
      // Count programs
      programs[grant.program] = (programs[grant.program] || 0) + 1;
      
      // Count opportunity types
      if (grant.opportunity_type) {
        opportunityTypes[grant.opportunity_type] = (opportunityTypes[grant.opportunity_type] || 0) + 1;
      }
      
      // Sum amounts
      const amount = this.parseAmount(grant.amount);
      if (amount !== null) {
        totalAmount += amount;
        validAmounts++;
      }
    });

    return {
      total_grants: this.mockGrants.length,
      agencies: Object.keys(agencies).length,
      programs: Object.keys(programs).length,
      opportunity_types: Object.keys(opportunityTypes).length,
      average_amount: validAmounts > 0 ? Math.round(totalAmount / validAmounts) : 0,
      agency_distribution: agencies,
      program_distribution: programs,
      opportunity_type_distribution: opportunityTypes,
      last_updated: this.mockMeta.last_updated
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
      console.error('DataService: Cache operation failed, falling back to direct fetch:', error);
      if (telemetry) {
        telemetry.logError('Cache operation failed', error);
      }
      return await this.fetchLiveGrantData(query, agency, telemetry);
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
    let hasErrors = false;
    
    try {
      // Source 1: Grants.gov API (existing)
      console.log('🔍 DataService: Fetching from Grants.gov...');
      const grantsGovResult = await this.fetchWithRetry(
        () => this.fetchFromGrantsGov(query, agency),
        3, // max retries
        1000, // initial delay
        telemetry
      );
      
      if (grantsGovResult.grants && grantsGovResult.grants.length > 0) {
        allGrants.push(...grantsGovResult.grants);
        sources.push('grants.gov');
        console.log(`✅ DataService: Grants.gov returned ${grantsGovResult.grants.length} grants`);
      }
      
    } catch (error) {
      console.error('DataService: Grants.gov fetch failed:', error);
      hasErrors = true;
      if (telemetry) {
        telemetry.logError('Grants.gov fetch failed', error);
      }
    }

    try {
      // Source 2: SBIR.gov API (new)
      console.log('🔍 DataService: Fetching from SBIR.gov...');
      const sbirResult = await this.fetchWithRetry(
        () => this.fetchFromSbirGov(query, agency),
        3, // max retries
        1000, // initial delay  
        telemetry
      );
      
      if (sbirResult.grants && sbirResult.grants.length > 0) {
        allGrants.push(...sbirResult.grants);
        sources.push('sbir.gov');
        console.log(`✅ DataService: SBIR.gov returned ${sbirResult.grants.length} grants`);
      }
      
    } catch (error) {
      console.error('DataService: SBIR.gov fetch failed:', error);
      hasErrors = true;
      if (telemetry) {
        telemetry.logError('SBIR.gov fetch failed', error);
      }
    }

    // If no live data was fetched, fallback to mock
    if (allGrants.length === 0) {
      console.log('🔄 DataService: No live data available, using mock fallback');
      const mockResult = this.getGrants({ query, agency });
      return {
        grants: mockResult.grants,
        actualDataSource: 'mock',
        fallbackOccurred: true,
        sources: ['mock'],
        error: hasErrors ? 'All external sources failed' : null
      };
    }

    // Merge and deduplicate results
    const deduplicatedGrants = this.mergeAndDeduplicate(allGrants, query);
    
    return {
      grants: deduplicatedGrants,
      actualDataSource: 'live',
      fallbackOccurred: false,
      sources,
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
        id: opp.opportunity_id || opp.id || `SBIR-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`,
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
      FALLBACK_TO_MOCK: true,
      LIVE_DATA_TIMEOUT: 15000,
      LIVE_DATA_SOURCES: {
        GRANTS_GOV_API: 'https://api.grants.gov/v1/api/search2'
      }
    };

    const result = {
      grants: [],
      actualDataSource: 'mock',
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
        console.error('DataService: Live data fetch failed, falling back to mock data:', {
          error: error.message,
          query,
          agency,
          timestamp: new Date().toISOString()
        });
        
        if (telemetry) {
          telemetry.logError('Live data fetch failed, using fallback', error, {
            query: query || '',
            agency: agency || '',
            fallback_enabled: dataConfig.FALLBACK_TO_MOCK
          });
        }
        
        if (dataConfig.FALLBACK_TO_MOCK) {
          const mockResult = this.getGrants({ query, agency });
          
          result.grants = mockResult.grants;
          result.actualDataSource = 'mock';
          result.fallbackOccurred = true;
          result.error = error.message;
          return result;
        } else {
          result.error = error.message;
          return result;
        }
      }
    }
    
    if (dataConfig.FALLBACK_TO_MOCK) {
      console.log('DataService: Using mock data (live data disabled)');
      const mockResult = this.getGrants({ query, agency });
      
      result.grants = mockResult.grants;
      result.actualDataSource = 'mock';
      result.fallbackOccurred = false;
      return result;
    } else {
      result.error = 'Live data is disabled and fallback to mock data is not allowed';
      return result;
    }
  }

  /**
   * Transform live grant data to internal format
   */
  transformLiveGrantData(opportunitiesRaw, query) {
    return opportunitiesRaw.map(grant => ({
      id: grant.opportunityId || grant.id || `LIVE-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`,
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