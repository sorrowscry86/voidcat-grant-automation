// Grant-related endpoints for VoidCat Grant Automation Platform

import { Hono } from 'hono';
import RateLimiter from '../services/rateLimiter.js';

const grants = new Hono();

// Mock grant data (will be moved to separate data file in future)
const MOCK_GRANTS = [
  {
    id: 'SBIR-25-001',
    title: 'AI for Defense Applications',
    agency: 'Department of Defense',
    program: 'SBIR Phase I',
    deadline: '2025-09-15',
    amount: '$250,000',
    description: 'Seeking innovative AI solutions for defense applications including autonomous systems, cybersecurity, and logistics optimization.',
    eligibility: 'Small businesses with <500 employees',
    matching_score: 0.95,
    data_source: 'mock'
  },
  {
    id: 'NSF-25-002',
    title: 'Artificial Intelligence Research Institutes',
    agency: 'National Science Foundation',
    program: 'AI Institutes',
    deadline: '2025-11-30',
    amount: '$20,000,000',
    description: 'Multi-institutional AI research institutes focused on advancing AI for materials discovery, climate science, and healthcare.',
    eligibility: 'Academic institutions with industry partners',
    matching_score: 0.87,
    data_source: 'mock'
  },
  {
    id: 'DARPA-25-004',
    title: 'Explainable AI for Military Decision Making',
    agency: 'DARPA',
    program: 'XAI',
    deadline: '2025-08-30',
    amount: '$1,500,000',
    description: 'Developing AI systems that can explain their decision-making processes for military applications.',
    eligibility: 'U.S. organizations with security clearance capability',
    matching_score: 0.91,
    data_source: 'mock'
  },
  {
    id: 'NASA-25-005',
    title: 'AI for Space Exploration',
    agency: 'NASA',
    program: 'ROSES',
    deadline: '2025-10-15',
    amount: '$800,000',
    description: 'AI technologies for autonomous spacecraft operations, planetary exploration, and space science data analysis.',
    eligibility: 'U.S. and foreign entities (excluding China)',
    matching_score: 0.88,
    data_source: 'mock'
  },
  {
    id: 'DARPA-25-006',
    title: 'Artificial Intelligence Next Campaign',
    agency: 'DARPA',
    program: 'AI Next',
    deadline: '2025-03-15',
    amount: '$5,000,000',
    description: 'Revolutionary AI research for national security applications including autonomous systems, cybersecurity, and logistics optimization.',
    eligibility: 'Research institutions and innovative companies',
    matching_score: 0.91,
    tags: ['AI', 'Machine Learning', 'Defense', 'Research'],
    data_source: 'mock'
  },
  {
    id: 'NIH-25-007',
    title: 'AI for Medical Diagnosis',
    agency: 'National Institutes of Health',
    program: 'STTR Phase II',
    deadline: '2025-04-30',
    amount: '$2,000,000',
    description: 'Developing AI systems for early disease detection and personalized treatment recommendations.',
    eligibility: 'Small businesses partnering with research institutions',
    matching_score: 0.88,
    tags: ['Healthcare', 'AI', 'Diagnostics', 'STTR'],
    data_source: 'mock'
  },
  {
    id: 'DOE-25-008',
    title: 'Smart Grid AI Optimization',
    agency: 'Department of Energy',
    program: 'Grid Modernization',
    deadline: '2025-06-01',
    amount: '$3,500,000',
    description: 'AI-powered optimization of electrical grid systems for improved efficiency and renewable energy integration.',
    eligibility: 'US companies with energy sector experience',
    matching_score: 0.85,
    tags: ['Energy', 'Smart Grid', 'AI', 'Infrastructure'],
    data_source: 'mock'
  }
];

// Configuration for data sources
const DATA_CONFIG = {
  USE_LIVE_DATA: true,
  FALLBACK_TO_MOCK: true,
  LIVE_DATA_SOURCES: {
    GRANTS_GOV_API: 'https://api.grants.gov/v1/api/search2',
    SBIR_API: 'https://www.sbir.gov/api/opportunities.json',
    NSF_API: 'https://www.nsf.gov/awardsearch/download.jsp'
  }
};

// Helper functions (will be moved to utils in future)
function calculateMatchingScore(grant, query) {
  if (!query) return 0.75;
  
  const searchTerms = query.toLowerCase().split(' ');
  const grantText = `${grant.title || ''} ${grant.description || ''}`.toLowerCase();
  
  let matches = 0;
  searchTerms.forEach(term => {
    if (grantText.includes(term)) matches++;
  });
  
  return Math.min(0.95, Math.max(0.1, matches / searchTerms.length * 0.9 + 0.1));
}

// Live data integration function
async function fetchLiveGrantData(query, agency, telemetry = null) {
  const result = {
    grants: [],
    actualDataSource: 'mock',
    fallbackOccurred: false,
    error: null
  };

  if (DATA_CONFIG.USE_LIVE_DATA) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const searchBody = {
        keyword: query || '',
        ...(agency && { agency: agency })
      };
      
      console.log(`🔍 Attempting live data fetch from grants.gov API...`);
      if (telemetry) {
        telemetry.logInfo('Live data fetch attempt', {
          endpoint: DATA_CONFIG.LIVE_DATA_SOURCES.GRANTS_GOV_API,
          query: query || '',
          agency: agency || ''
        });
      }
      
      const response = await fetch(DATA_CONFIG.LIVE_DATA_SOURCES.GRANTS_GOV_API, {
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

      // Transform grants.gov data to internal format
      const transformedGrants = opportunitiesRaw.map(grant => ({
        id: grant.opportunityId || grant.id || `LIVE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: grant.opportunityTitle || grant.title || 'Federal Grant Opportunity',
        agency: grant.agencyName || grant.agency || 'Federal Agency',
        program: grant.opportunityCategory || grant.program || 'Federal Program',
        deadline: grant.closeDate || grant.deadline || '2025-12-31',
        amount: grant.awardFloor ? `$${parseInt(grant.awardFloor).toLocaleString()} - $${parseInt(grant.awardCeiling || grant.awardFloor).toLocaleString()}` : 'Amount TBD',
        description: grant.description || grant.opportunityTitle || 'Federal funding opportunity',
        eligibility: grant.eligibilityDesc || 'See opportunity details for eligibility requirements',
        matching_score: calculateMatchingScore(grant, query),
        data_source: 'live'
      }));
      
      console.log(`✅ Live data fetch successful: ${transformedGrants.length} grants (raw length: ${opportunitiesRaw.length})`);
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
      console.error('Live data fetch failed, falling back to mock data:', {
        error: error.message,
        query,
        agency,
        timestamp: new Date().toISOString()
      });
      
      if (telemetry) {
        telemetry.logError('Live data fetch failed, using fallback', error, {
          query: query || '',
          agency: agency || '',
          fallback_enabled: DATA_CONFIG.FALLBACK_TO_MOCK
        });
      }
      
      if (DATA_CONFIG.FALLBACK_TO_MOCK) {
        result.grants = MOCK_GRANTS;
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
  
  if (DATA_CONFIG.FALLBACK_TO_MOCK) {
    console.log('Using mock data (live data disabled in configuration)');
    result.grants = MOCK_GRANTS;
    result.actualDataSource = 'mock';
    result.fallbackOccurred = false;
    return result;
  } else {
    result.error = 'Live data is disabled and fallback to mock data is not allowed';
    return result;
  }
}

// Grant search endpoint
grants.get('/search', async (c) => {
  try {
    const { query, agency, deadline, amount } = c.req.query();
    
    // Validate input parameters
    if (query && query.length > 200) {
      return c.json({
        success: false,
        error: 'Search query is too long. Please use fewer than 200 characters.',
        code: 'QUERY_TOO_LONG'
      }, 400);
    }
    
    // Fetch grants from configured data source
    let filteredGrants;
    let actualDataSource;
    let fallbackOccurred;
    let dataSourceError;
    
    try {
      const fetchResult = await fetchLiveGrantData(query, agency, c.get('telemetry'));
      filteredGrants = fetchResult.grants;
      actualDataSource = fetchResult.actualDataSource;
      fallbackOccurred = fetchResult.fallbackOccurred;
      dataSourceError = fetchResult.error;
    } catch (dataError) {
      console.error('Grant data fetch failed:', dataError);
      return c.json({
        success: false,
        error: 'Grant database is temporarily unavailable. Please try again in a few minutes.',
        code: 'DATA_SOURCE_UNAVAILABLE'
      }, 503);
    }
    
    try {
      // Apply search filters
      if (query) {
        const searchQuery = query.toLowerCase().trim();
        filteredGrants = filteredGrants.filter(grant => 
          grant.title.toLowerCase().includes(searchQuery) ||
          grant.description.toLowerCase().includes(searchQuery) ||
          grant.program.toLowerCase().includes(searchQuery)
        );
      }
      
      if (agency) {
        const agencyMap = {
          'defense': 'department of defense',
          'nsf': 'national science foundation',
          'energy': 'department of energy',
          'darpa': 'darpa',
          'nasa': 'nasa'
        };
        const searchAgency = agencyMap[agency.toLowerCase()] || agency.toLowerCase();
        filteredGrants = filteredGrants.filter(grant => 
          grant.agency.toLowerCase().includes(searchAgency)
        );
      }
      
      // Apply deadline filter if provided
      if (deadline) {
        const targetDate = new Date(deadline);
        if (isNaN(targetDate.getTime())) {
          return c.json({
            success: false,
            error: 'Invalid deadline format. Please use YYYY-MM-DD format.',
            code: 'INVALID_DATE_FORMAT'
          }, 400);
        }
        
        filteredGrants = filteredGrants.filter(grant => {
          const grantDeadline = new Date(grant.deadline);
          return grantDeadline <= targetDate;
        });
      }

      // Track grant search metrics
      const telemetry = c.get('telemetry');
      if (telemetry) {
        telemetry.trackGrantSearch(query, agency, filteredGrants.length, actualDataSource, fallbackOccurred);
      }

      return c.json({
        success: true,
        count: filteredGrants.length,
        grants: filteredGrants,
        data_source: actualDataSource,
        fallback_occurred: fallbackOccurred,
        timestamp: new Date().toISOString(),
        live_data_ready: DATA_CONFIG.USE_LIVE_DATA,
        search_params: { query, agency, deadline, amount },
        ...(fallbackOccurred && dataSourceError && { fallback_reason: dataSourceError })
      });
    } catch (filterError) {
      console.error('Grant filtering failed:', filterError);
      return c.json({
        success: false,
        error: 'Error processing search results. Please try again.',
        code: 'SEARCH_PROCESSING_ERROR'
      }, 500);
    }

  } catch (error) {
    console.error('Grant search endpoint error:', error);
    return c.json({
      success: false,
      error: 'Grant search service is temporarily unavailable. Please try again later.',
      code: 'SEARCH_SERVICE_ERROR'
    }, 500);
  }
});

// Get specific grant details
grants.get('/:id', async (c) => {
  try {
    const grantId = c.req.param('id');
    
    // Validate grant ID format
    if (!grantId || grantId.trim().length === 0) {
      return c.json({ 
        success: false, 
        error: 'Grant ID is required',
        code: 'MISSING_GRANT_ID'
      }, 400);
    }
    
    if (grantId.length > 50) {
      return c.json({ 
        success: false, 
        error: 'Invalid grant ID format',
        code: 'INVALID_GRANT_ID'
      }, 400);
    }
    
    // Try to find grant in mock data first
    const mockGrant = MOCK_GRANTS.find(g => g.id === grantId);
    if (mockGrant) {
      return c.json({
        success: true,
        grant: mockGrant,
        data_source: 'mock',
        timestamp: new Date().toISOString()
      });
    }
    
    return c.json({
      success: false,
      error: 'Grant not found',
      message: 'The requested grant ID was not found in our database. Please check the ID and try again.',
      code: 'GRANT_NOT_FOUND'
    }, 404);

  } catch (error) {
    console.error('Grant details endpoint error:', error);
    return c.json({
      success: false,
      error: 'Grant details service is temporarily unavailable. Please try again later.',
      code: 'GRANT_DETAILS_ERROR'
    }, 500);
  }
});

// AI proposal generation endpoint (with rate limiting)
grants.post('/generate-proposal', async (c) => {
  try {
    // Check authentication
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: 'Authentication required. Please provide an API key to generate proposals.',
        code: 'AUTH_REQUIRED'
      }, 401);
    }

    const apiKey = authHeader.replace('Bearer ', '');
    
    // Apply rate limiting for proposal generation
    const rateLimiter = new RateLimiter(c.env);
    const rateLimitResult = await rateLimiter.checkAndIncrement(apiKey, 'proposal_generation');
    
    // Set rate limit headers
    c.header('X-RateLimit-Limit', rateLimitResult.limit.toString());
    c.header('X-RateLimit-Remaining', Math.max(0, rateLimitResult.limit - rateLimitResult.currentCount).toString());
    c.header('X-RateLimit-Reset', Math.floor(rateLimitResult.resetTime.getTime() / 1000).toString());
    
    if (!rateLimitResult.allowed) {
      if (rateLimitResult.retryAfter) {
        c.header('Retry-After', rateLimitResult.retryAfter.toString());
      }
      
      // Log rate limit hit
      const telemetry = c.get('telemetry');
      if (telemetry) {
        telemetry.logInfo('Rate limit exceeded for proposal generation', {
          rate_limit: {
            operation: 'proposal_generation',
            current_count: rateLimitResult.currentCount,
            limit: rateLimitResult.limit,
            retry_after: rateLimitResult.retryAfter
          }
        });
      }
      
      return c.json({
        success: false,
        error: 'Rate limit exceeded. You can generate proposals at most 12 times per minute.',
        code: 'RATE_LIMIT_EXCEEDED',
        rate_limit: {
          limit: rateLimitResult.limit,
          current: rateLimitResult.currentCount,
          retry_after: rateLimitResult.retryAfter,
          reset_time: rateLimitResult.resetTime.toISOString()
        }
      }, 429);
    }
    
    // Demo mode response (database not configured in local development)
    const grantId = 'SBIR-25-001'; // Default for demo
    console.log('Using mock data for grant details:', grantId);
    
    const mockProposal = `# Grant Proposal for ${grantId}

## Executive Summary
This proposal outlines our innovative approach to address the requirements of the AI for Defense Applications grant. Our company brings extensive experience in artificial intelligence, machine learning, and defense technology applications.

## Project Description
We propose to develop cutting-edge AI solutions that will revolutionize defense applications through:

### Technical Approach
- Advanced machine learning algorithms
- Autonomous system development
- Cybersecurity enhancement protocols
- Logistics optimization frameworks

### Key Innovations
1. **Explainable AI Systems**: Development of transparent AI models that provide clear reasoning for decisions
2. **Real-time Processing**: Implementation of high-speed data processing capabilities
3. **Secure Architecture**: Military-grade security protocols and encryption

## Budget Justification
The requested funding of $250,000 will be allocated across:
- Personnel (60%): Senior AI researchers and engineers
- Equipment (25%): High-performance computing infrastructure
- Travel (10%): Collaboration with defense partners
- Other Direct Costs (5%): Software licenses and materials

## Timeline
**Phase 1 (Months 1-6)**: Research and development of core algorithms
**Phase 2 (Months 7-12)**: System integration and testing
**Phase 3 (Months 13-18)**: Validation and deployment preparation

## Team Qualifications
Our team consists of experienced professionals with proven track records in:
- AI/ML development for defense applications
- Cybersecurity and secure system design
- Defense contractor collaboration

## Expected Outcomes
Upon successful completion, this project will deliver:
- Operational AI system prototype
- Technical documentation and user manuals
- Training materials for deployment personnel
- Recommendations for full-scale implementation

## Conclusion
This proposal represents a significant opportunity to advance defense capabilities through innovative AI technology. We are committed to delivering exceptional results that exceed expectations and provide lasting value to the defense community.

---
*Generated by VoidCat RDC Grant Automation Platform*
*Proposal ID: ${crypto.randomUUID()}*
*Generated: ${new Date().toISOString()}*`;

    return c.json({
      success: true,
      message: 'Proposal generated successfully',
      grant_id: grantId,
      proposal: mockProposal,
      word_count: mockProposal.split(' ').length,
      generated_at: new Date().toISOString(),
      demo_mode: true
    });

  } catch (error) {
    console.error('Proposal generation error:', error);
    return c.json({
      success: false,
      error: 'Proposal generation service encountered an unexpected error. Please try again.',
      code: 'PROPOSAL_GENERATION_ERROR'
    }, 500);
  }
});

export default grants;