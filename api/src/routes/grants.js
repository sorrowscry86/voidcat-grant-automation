// Grant-related endpoints for VoidCat Grant Automation Platform

import { Hono } from 'hono';
import RateLimiter from '../services/rateLimiter.js';
import ConfigService from '../services/configService.js';
import dataServiceFactory from '../services/dataServiceFactory.js';
import FederalAgencyService from '../services/federalAgencyService.js';
import SemanticAnalysisService from '../services/semanticAnalysisService.js';
import DeadlineTrackingService from '../services/deadlineTrackingService.js';
import ComplianceService from '../services/complianceService.js';
import AIProposalService from '../services/aiProposalService.js';

const grants = new Hono();

// Initialize stateless services once at module level for better performance
const federalAgencyService = new FederalAgencyService();
const semanticAnalysisService = new SemanticAnalysisService();
const deadlineTrackingService = new DeadlineTrackingService();
const complianceService = new ComplianceService();
const aiProposalService = new AIProposalService();

// DataService is now managed by factory to prevent inconsistent instantiation


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
      // Get DataService instance from factory with proper configuration
      const dataService = await dataServiceFactory.getInstance({ live_data: dataConfig });
      let fetchResult;
      
      // Phase 2A: Use enhanced data fetching with caching and multi-source aggregation
      if (c.env.FEATURE_LIVE_DATA && dataConfig.USE_LIVE_DATA) {
        // Use Phase 2A enhanced method with KV caching and multi-source
        fetchResult = await dataService.fetchWithCache(query, agency, c.env, c.get('telemetry'));
      } else {
        // Use mock data only when FEATURE_LIVE_DATA is false or USE_LIVE_DATA is false
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
        // Get DataService instance from factory (reuses existing instance)
        const dataService = await dataServiceFactory.getInstance({ live_data: dataConfig });
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
    // Get DataService instance from factory (uses default config)
    const dataService = await dataServiceFactory.getInstance({});
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
    // Get DataService instance from factory (uses default config)
    const dataService = await dataServiceFactory.getInstance({});
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
    // Get DataService instance from factory (uses default config)
    const dataService = await dataServiceFactory.getInstance({});
    const grant = dataService.getMockGrantById(grant_id);
    
    const grantTitle = grant ? grant.title : 'Federal Grant Opportunity';
    const grantAmount = grant ? grant.amount : 'Amount TBD';
    const grantAgency = grant ? grant.agency : 'Federal Agency';
    
    // Generate mock proposal (in production, this would use AI service)
    // Safe ID generator (avoids hard dependency on crypto.randomUUID)
    const safeId = () => {
      try { return crypto.randomUUID(); } catch { return `id-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`; }
    };

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
*Proposal ID: ${safeId()}*
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
    // Correlate and sanitize error for client; log full details for ops
    const getRequestId = () => {
      try { return c.get('requestId') || crypto.randomUUID(); } catch { return `req-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`; }
    };
    const requestId = getRequestId();

    const telemetry = c.get('telemetry');
    if (telemetry) {
      telemetry.logError('Proposal generation error', error, { request_id: requestId, route: 'POST /api/grants/generate-proposal' });
    } else {
      console.error('Proposal generation error:', { message: error?.message, stack: error?.stack, requestId });
    }

    // Do not expose internal error details to clients
    return c.json({
      success: false,
      error: 'Proposal generation service encountered an unexpected error. Please try again.',
      code: 'PROPOSAL_GENERATION_ERROR',
      correlation_id: requestId
    }, 500);
  }
});

// Get federal agency portals endpoint
grants.get('/federal-agencies', async (c) => {
  try {
    // Use module-level federalAgencyService
    const agencies = federalAgencyService.getActiveAgencies();
    const stats = federalAgencyService.getStatistics();
    const schedule = federalAgencyService.getScanningSchedule();

    return c.json({
      success: true,
      total_agencies: agencies.length,
      agencies: agencies.map(agency => ({
        id: agency.id,
        name: agency.name,
        acronym: agency.acronym,
        portal_url: agency.portal_url,
        program_types: agency.program_types,
        solicitation_schedule: agency.solicitation_schedule
      })),
      statistics: stats,
      scanning_schedule: schedule
    });
  } catch (error) {
    console.error('Federal agencies endpoint error:', error);
    return c.json({
      success: false,
      error: 'Failed to retrieve federal agency information',
      code: 'AGENCY_INFO_ERROR'
    }, 500);
  }
});

// Semantic analysis endpoint - Calculate matching score
grants.post('/analyze-match', async (c) => {
  try {
    const requestData = await c.req.json();
    const { company_profile, grant_id } = requestData;

    if (!company_profile || !grant_id) {
      return c.json({
        success: false,
        error: 'Both company_profile and grant_id are required',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }

    // Get grant details
    // Get DataService instance from factory
    const dataService = await dataServiceFactory.getInstance({});
    const grant = dataService.getMockGrantById(grant_id);

    if (!grant) {
      return c.json({
        success: false,
        error: 'Grant not found',
        code: 'GRANT_NOT_FOUND'
      }, 404);
    }

    // Perform semantic analysis
    // Use module-level semanticAnalysisService
    const analysis = semanticAnalysisService.calculateMatchingScore(company_profile, grant);

    return c.json({
      success: true,
      grant_id: grant_id,
      matching_analysis: analysis,
      grant_details: {
        title: grant.title,
        agency: grant.agency,
        deadline: grant.deadline
      }
    });
  } catch (error) {
    console.error('Semantic analysis error:', error);
    return c.json({
      success: false,
      error: 'Matching analysis failed',
      code: 'ANALYSIS_ERROR'
    }, 500);
  }
});

// Deadline tracking endpoint - Get application timeline
grants.post('/application-timeline', async (c) => {
  try {
    const requestData = await c.req.json();
    const { grant_id, buffer_days } = requestData;

    if (!grant_id) {
      return c.json({
        success: false,
        error: 'Grant ID is required',
        code: 'MISSING_GRANT_ID'
      }, 400);
    }

    // Get grant details
    // Get DataService instance from factory
    const dataService = await dataServiceFactory.getInstance({});
    const grant = dataService.getMockGrantById(grant_id);

    if (!grant) {
      return c.json({
        success: false,
        error: 'Grant not found',
        code: 'GRANT_NOT_FOUND'
      }, 404);
    }

    // Generate timeline
    // Use module-level deadlineTrackingService
    const timeline = deadlineTrackingService.generateApplicationTimeline(grant, { buffer_days });

    return c.json({
      success: true,
      grant_id: grant_id,
      timeline: timeline,
      grant_details: {
        title: grant.title,
        deadline: grant.deadline
      }
    });
  } catch (error) {
    console.error('Timeline generation error:', error);
    return c.json({
      success: false,
      error: 'Timeline generation failed',
      code: 'TIMELINE_ERROR'
    }, 500);
  }
});

// Strategic calendar endpoint
grants.get('/strategic-calendar', async (c) => {
  try {
    const { max_concurrent } = c.req.query();
    
    // Get all grants
    // Get DataService instance from factory
    const dataService = await dataServiceFactory.getInstance({});
    const allGrants = dataService.getGrants({ limit: 100 });

    // Generate strategic calendar
    // Use module-level deadlineTrackingService
    const calendar = deadlineTrackingService.generateStrategicCalendar(
      allGrants.grants,
      { 
        max_concurrent_proposals: parseInt(max_concurrent) || 3 
      }
    );

    return c.json({
      success: true,
      calendar: calendar
    });
  } catch (error) {
    console.error('Strategic calendar error:', error);
    return c.json({
      success: false,
      error: 'Calendar generation failed',
      code: 'CALENDAR_ERROR'
    }, 500);
  }
});

// Compliance validation endpoint
grants.post('/validate-eligibility', async (c) => {
  try {
    const requestData = await c.req.json();
    const { company_profile, grant_requirements } = requestData;

    if (!company_profile || !grant_requirements) {
      return c.json({
        success: false,
        error: 'Both company_profile and grant_requirements are required',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }

    // Validate eligibility
    // Use module-level complianceService
    const validation = complianceService.validateEligibility(company_profile, grant_requirements);

    return c.json({
      success: true,
      validation: validation
    });
  } catch (error) {
    console.error('Eligibility validation error:', error);
    return c.json({
      success: false,
      error: 'Eligibility validation failed',
      code: 'VALIDATION_ERROR'
    }, 500);
  }
});

// Budget justification endpoint
grants.post('/generate-budget-justification', async (c) => {
  try {
    const requestData = await c.req.json();
    const { budget, project_details } = requestData;

    if (!budget || !project_details) {
      return c.json({
        success: false,
        error: 'Both budget and project_details are required',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }

    // Generate budget justification
    // Use module-level complianceService
    const justification = complianceService.generateBudgetJustification(budget, project_details);

    return c.json({
      success: true,
      budget_justification: justification
    });
  } catch (error) {
    console.error('Budget justification error:', error);
    return c.json({
      success: false,
      error: 'Budget justification generation failed',
      code: 'BUDGET_ERROR'
    }, 500);
  }
});

// Certifications checklist endpoint
grants.get('/certifications-checklist', async (c) => {
  try {
    const { grant_type, agency } = c.req.query();

    if (!grant_type || !agency) {
      return c.json({
        success: false,
        error: 'Both grant_type and agency parameters are required',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }

    // Generate certifications checklist
    // Use module-level complianceService
    const checklist = complianceService.generateCertificationsChecklist(grant_type, agency);

    return c.json({
      success: true,
      grant_type: grant_type,
      agency: agency,
      certifications: checklist
    });
  } catch (error) {
    console.error('Certifications checklist error:', error);
    return c.json({
      success: false,
      error: 'Certifications checklist generation failed',
      code: 'CHECKLIST_ERROR'
    }, 500);
  }
});

// Pre-submission review endpoint
grants.post('/pre-submission-review', async (c) => {
  try {
    const requestData = await c.req.json();
    const { proposal, grant_requirements } = requestData;

    if (!proposal || !grant_requirements) {
      return c.json({
        success: false,
        error: 'Both proposal and grant_requirements are required',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }

    // Perform pre-submission review
    // Use module-level complianceService
    const review = complianceService.performPreSubmissionReview(proposal, grant_requirements);

    return c.json({
      success: true,
      review: review
    });
  } catch (error) {
    console.error('Pre-submission review error:', error);
    return c.json({
      success: false,
      error: 'Pre-submission review failed',
      code: 'REVIEW_ERROR'
    }, 500);
  }
});

// AI-powered proposal generation endpoint (enhanced)
grants.post('/generate-ai-proposal', async (c) => {
  try {
    const requestData = await c.req.json();
    const { grant_id, company_profile, options } = requestData;

    if (!grant_id || !company_profile) {
      return c.json({
        success: false,
        error: 'Both grant_id and company_profile are required',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }

    // Get grant details
    // Get DataService instance from factory
    const dataService = await dataServiceFactory.getInstance({});
    const grant = dataService.getMockGrantById(grant_id);

    if (!grant) {
      return c.json({
        success: false,
        error: 'Grant not found',
        code: 'GRANT_NOT_FOUND'
      }, 404);
    }

    // Phase 2A: Generate AI-powered proposal with real AI integration
    let proposal;
    if (c.env.FEATURE_REAL_AI) {
      // Use Phase 2A enhanced AI generation with Claude and GPT-4
      proposal = await aiProposalService.generateProposalWithAI(grant, company_profile, c.env, c.get('telemetry'));
    } else {
      // Use template-based generation (fallback)
      proposal = await aiProposalService.generateProposal(grant, company_profile, options || {});
    }

    return c.json({
      success: true,
      proposal: proposal,
      grant_details: {
        id: grant.id,
        title: grant.title,
        agency: grant.agency
      }
    });
  } catch (error) {
    console.error('AI proposal generation error:', error);
    return c.json({
      success: false,
      error: 'AI proposal generation failed',
      code: 'AI_PROPOSAL_ERROR'
    }, 500);
  }
});

// Template compliance check endpoint
grants.get('/agency-template', async (c) => {
  try {
    const { agency } = c.req.query();

    if (!agency) {
      return c.json({
        success: false,
        error: 'Agency parameter is required',
        code: 'MISSING_AGENCY'
      }, 400);
    }

    // Get agency template
    // Use module-level aiProposalService
    const template = Object.prototype.hasOwnProperty.call(aiProposalService.templateLibrary, agency)
      ? aiProposalService.templateLibrary[agency]
      : null;

    if (!template) {
      return c.json({
        success: false,
        error: 'Template not found for specified agency',
        code: 'TEMPLATE_NOT_FOUND',
        available_agencies: Object.keys(aiProposalService.templateLibrary)
      }, 404);
    }

    return c.json({
      success: true,
      agency: agency,
      template: template
    });
  } catch (error) {
    console.error('Template retrieval error:', error);
    return c.json({
      success: false,
      error: 'Template retrieval failed',
      code: 'TEMPLATE_ERROR'
    }, 500);
  }
});

export default grants;
