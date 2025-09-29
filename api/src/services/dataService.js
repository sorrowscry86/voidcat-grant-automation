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
   * Get mock grant by ID
   * @param {string} grantId - Grant ID to find
   * @returns {Object|null} Grant object or null if not found
   */
  getMockGrantById(grantId) {
    return this.mockGrants.find(grant => grant.id === grantId) || null;
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
}

export default DataService;