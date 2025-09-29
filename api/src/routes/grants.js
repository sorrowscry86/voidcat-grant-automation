// Grant-related endpoints for VoidCat Grant Automation Platform

import { Hono } from 'hono';
import RateLimiter from '../services/rateLimiter.js';
import ConfigService from '../services/configService.js';
import DataService from '../services/dataService.js';

const grants = new Hono();



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
    
    // Use DataService for both live and mock data
    let filteredGrants;
    let actualDataSource;
    let fallbackOccurred;
    let dataSourceError;
    
    try {
      const dataService = new DataService({ live_data: dataConfig });
      let fetchResult;
      
      if (dataConfig.USE_LIVE_DATA) {
        // Try live data first with fallback to mock
        fetchResult = await dataService.fetchLiveGrantData(query, agency, c.get('telemetry'));
      } else {
        // Use mock data only
        const mockResult = dataService.getGrants({ query, agency });
        fetchResult = {
          grants: mockResult.grants,
          actualDataSource: 'mock',
          fallbackOccurred: false,
          error: null
        };
      }
      
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