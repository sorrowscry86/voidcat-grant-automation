// Grant-related endpoints for VoidCat Grant Automation Platform

import { Hono } from 'hono';
import RateLimiter from '../services/rateLimiter.js';
import ConfigService from '../services/configService.js';
import DataService from '../services/dataService.js';

const grants = new Hono();

// Live data integration function
async function fetchLiveGrantData(query, agency, telemetry = null, config = null) {
  const dataConfig = config || {
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
      
      console.log(`🔍 Attempting live data fetch from grants.gov API...`);
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
        matching_score: 0.8, // Will be calculated by DataService
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
          fallback_enabled: dataConfig.FALLBACK_TO_MOCK
        });
      }
      
      if (dataConfig.FALLBACK_TO_MOCK) {
        // Use DataService for mock data
        const dataService = new DataService();
        const mockResult = dataService.getGrants({ query, agency });
        
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
    console.log('Using mock data (live data disabled in configuration)');
    const dataService = new DataService();
    const mockResult = dataService.getGrants({ query, agency });
    
    result.grants = mockResult.grants;
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
    const configService = new ConfigService(c.env);
    const validationConfig = configService.getValidationConfig();
    const dataConfig = configService.getDataConfig();
    
    const { query, agency, deadline, amount, program, opportunityType } = c.req.query();
    
    // Validate input parameters
    if (query && query.length > validationConfig.MAX_SEARCH_QUERY_LENGTH) {
      return c.json({
        success: false,
        error: `Search query is too long. Please use fewer than ${validationConfig.MAX_SEARCH_QUERY_LENGTH} characters.`,
        code: 'QUERY_TOO_LONG'
      }, 400);
    }
    
    // Fetch grants from configured data source
    let filteredGrants;
    let actualDataSource;
    let fallbackOccurred;
    let dataSourceError;
    
    try {
      const fetchResult = await fetchLiveGrantData(query, agency, c.get('telemetry'), dataConfig);
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
      // If we got mock data, apply additional filters using DataService
      if (actualDataSource === 'mock') {
        const dataService = new DataService();
        const searchOptions = {
          query,
          agency,
          deadline,
          program,
          opportunityType
        };
        
        // Parse amount filter if provided
        if (amount) {
          const amountNum = parseInt(amount.replace(/[$,]/g, ''), 10);
          if (!isNaN(amountNum)) {
            searchOptions.maxAmount = amountNum;
          }
        }
        
        const mockResult = dataService.getGrants(searchOptions);
        filteredGrants = mockResult.grants;
      } else {
        // Apply basic filters to live data
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
        live_data_ready: dataConfig.USE_LIVE_DATA,
        search_params: { query, agency, deadline, amount, program, opportunityType },
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

// Get grant statistics endpoint (must be before /:id route)
grants.get('/stats', async (c) => {
  try {
    const dataService = new DataService();
    const stats = dataService.getStatistics();
    
    return c.json({
      success: true,
      statistics: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Grant statistics error:', error);
    return c.json({
      success: false,
      error: 'Unable to retrieve grant statistics. Please try again later.',
      code: 'STATS_ERROR'
    }, 500);
  }
});

// Get specific grant details
grants.get('/:id', async (c) => {
  try {
    const configService = new ConfigService(c.env);
    const validationConfig = configService.getValidationConfig();
    
    const grantId = c.req.param('id');
    
    // Validate grant ID format
    if (!grantId || grantId.trim().length === 0) {
      return c.json({ 
        success: false, 
        error: 'Grant ID is required',
        code: 'MISSING_GRANT_ID'
      }, 400);
    }
    
    if (grantId.length > validationConfig.MAX_GRANT_ID_LENGTH) {
      return c.json({ 
        success: false, 
        error: 'Invalid grant ID format',
        code: 'INVALID_GRANT_ID'
      }, 400);
    }
    
    // Try to find grant in mock data using DataService
    const dataService = new DataService();
    const mockGrant = dataService.getMockGrantById(grantId);
    
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
    const configService = new ConfigService(c.env);
    const rateLimitConfig = configService.getRateLimitConfig();
    
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
    const rateLimitResult = await rateLimiter.checkAndIncrement(apiKey, 'proposal_generation', rateLimitConfig.PROPOSALS_PER_MINUTE);
    
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
        error: `Rate limit exceeded. You can generate proposals at most ${rateLimitResult.limit} times per minute.`,
        code: 'RATE_LIMIT_EXCEEDED',
        rate_limit: {
          limit: rateLimitResult.limit,
          current: rateLimitResult.currentCount,
          retry_after: rateLimitResult.retryAfter,
          reset_time: rateLimitResult.resetTime.toISOString()
        }
      }, 429);
    }
    
    // Parse request data
    let requestData;
    try {
      requestData = await c.req.json();
    } catch (parseError) {
      return c.json({
        success: false,
        error: 'Invalid request format. Please send valid JSON data.',
        code: 'INVALID_JSON'
      }, 400);
    }
    
    const { grant_id, company_info } = requestData;
    
    if (!grant_id) {
      return c.json({
        success: false,
        error: 'Grant ID is required for proposal generation',
        code: 'MISSING_GRANT_ID'
      }, 400);
    }
    
    // Get grant details for proposal context
    const dataService = new DataService();
    const grant = dataService.getMockGrantById(grant_id);
    
    const grantTitle = grant ? grant.title : 'Federal Grant Opportunity';
    const grantAmount = grant ? grant.amount : 'Amount TBD';
    const grantAgency = grant ? grant.agency : 'Federal Agency';
    
    // Generate mock proposal (in production, this would use AI service)
    const mockProposal = `# Grant Proposal for ${grantTitle}

## Executive Summary
This proposal outlines our innovative approach to address the requirements of the ${grantTitle} grant. ${company_info ? `${company_info} brings` : 'Our company brings'} extensive experience in the relevant field and cutting-edge technology solutions.

## Project Description
We propose to develop innovative solutions that will address the grant requirements through:

### Technical Approach
- Advanced research methodologies and proven frameworks
- Cutting-edge technology implementation
- Comprehensive testing and validation protocols
- Scalable and sustainable solution architecture

### Key Innovations
1. **Novel Approach**: Development of innovative solutions that push the boundaries of current technology
2. **Real-time Implementation**: High-performance processing capabilities for immediate impact
3. **Secure Architecture**: Industry-standard security protocols and best practices

## Budget Justification
The requested funding of ${grantAmount} will be allocated across:
- Personnel (60%): Senior researchers, engineers, and project managers
- Equipment (25%): Specialized equipment and infrastructure
- Travel (10%): Collaboration with partners and stakeholders
- Other Direct Costs (5%): Software licenses, materials, and indirect costs

## Timeline
**Phase 1 (Months 1-6)**: Research and development of core components
**Phase 2 (Months 7-12)**: System integration and comprehensive testing
**Phase 3 (Months 13-18)**: Validation, optimization, and deployment preparation

## Team Qualifications
Our team consists of experienced professionals with proven track records in:
- Advanced research and development
- Technology innovation and implementation
- ${grantAgency} collaboration and compliance
- Project management and delivery

## Expected Outcomes
Upon successful completion, this project will deliver:
- Fully functional prototype or system
- Comprehensive technical documentation
- Training materials and user guides
- Recommendations for full-scale implementation
- Measurable impact on the target domain

## Conclusion
This proposal represents a significant opportunity to advance the field through innovative technology and research. We are committed to delivering exceptional results that exceed expectations and provide lasting value to ${grantAgency} and the broader community.

---
*Generated by VoidCat RDC Grant Automation Platform*
*Proposal ID: ${crypto.randomUUID()}*
*Generated: ${new Date().toISOString()}*`;

    return c.json({
      success: true,
      message: 'Proposal generated successfully',
      grant_id: grant_id,
      proposal: mockProposal,
      word_count: mockProposal.split(' ').length,
      generated_at: new Date().toISOString(),
      grant_details: grant ? {
        title: grant.title,
        agency: grant.agency,
        amount: grant.amount,
        deadline: grant.deadline
      } : null
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