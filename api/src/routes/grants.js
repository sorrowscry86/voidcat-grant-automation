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
      
      // PRODUCTION MODE: Use enhanced data fetching with caching and multi-source aggregation
      try {
        // Use Phase 2A enhanced method with KV caching and multi-source
        fetchResult = await dataService.fetchWithCache(query, agency, c.env, c.get('telemetry'));

        // Log successful real data fetch
        const telemetry = c.get('telemetry');
        if (telemetry) {
          telemetry.logInfo('Live data fetch SUCCESS', {
            execution: 'real',
            query: query || '',
            agency: agency || '',
            count: fetchResult.grants.length,
            timestamp: new Date().toISOString()
          });
        }
      } catch (liveDataError) {
        // NO SIMULATIONS LAW: Log failure and return error response
        console.error('Live data fetch failed:', liveDataError);

        const telemetry = c.get('telemetry');
        if (telemetry) {
          telemetry.logError('Live data fetch FAILED', liveDataError, {
            execution: 'failed',
            query: query || '',
            agency: agency || '',
            timestamp: new Date().toISOString()
          });
        }

        return c.json({
          success: false,
          error: 'Live grant data is temporarily unavailable. Please try again later.',
          code: 'LIVE_DATA_UNAVAILABLE',
          message: liveDataError.message,
          execution_type: 'failed'
        }, 503);
      }
      
      filteredGrants = fetchResult.grants;
      actualDataSource = fetchResult.actualDataSource;
      fallbackOccurred = fetchResult.fallbackOccurred;
      dataSourceError = fetchResult.error;
    } catch (dataError) {
      console.error('Grant data fetch failed:', dataError);
      
      const telemetry = c.get('telemetry');
      if (telemetry) {
        telemetry.logError('Grant data service error', dataError, {
          execution: 'failed',
          timestamp: new Date().toISOString()
        });
      }
      
      return c.json({
        success: false,
        error: 'Grant database is temporarily unavailable. Please try again in a few minutes.',
        code: 'DATA_SOURCE_UNAVAILABLE',
        execution_type: 'failed'
      }, 503);
    }
    
    try {
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
    const telemetry = c.get('telemetry');
    if (telemetry) {
      telemetry.logError('Grant statistics not available', new Error('Feature requires live data aggregation'), {
        execution: 'failed',
        timestamp: new Date().toISOString()
      });
    }

    return c.json({
      success: false,
      error: 'Grant statistics are not available. This feature requires live data aggregation.',
      code: 'FEATURE_NOT_AVAILABLE'
    }, 501);
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
    
    // In production mode, grant details must be fetched from live sources
    const telemetry = c.get('telemetry');
    if (telemetry) {
      telemetry.logInfo('Grant details request', {
        grant_id: grantId,
        timestamp: new Date().toISOString()
      });
    }

    return c.json({
      success: false,
      error: 'Grant details not available',
      message: 'Grant details are only available through live grant search. Please use the /api/grants/search endpoint to find and view grants.',
      code: 'FEATURE_REQUIRES_SEARCH'
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
    
    // NO SIMULATIONS LAW: Mock proposals are not allowed
    return c.json({
      success: false,
      error: 'This endpoint is deprecated. Please use /api/grants/generate-ai-proposal with real AI execution.',
      code: 'ENDPOINT_DEPRECATED',
      message: 'NO SIMULATIONS LAW: Mock proposal generation is not allowed. Use AI-powered endpoint with FEATURE_REAL_AI=true.',
      alternative_endpoint: '/api/grants/generate-ai-proposal',
      required_feature_flag: 'FEATURE_REAL_AI=true'
    }, 410);

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

    // Production mode: semantic analysis requires live grant data
    return c.json({
      success: false,
      error: 'Semantic analysis not available',
      message: 'This feature requires integration with live grant search results. Please perform a grant search first to access matching analysis.',
      code: 'FEATURE_REQUIRES_LIVE_DATA'
    }, 501);
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

    // Production mode: timeline generation requires live grant data
    return c.json({
      success: false,
      error: 'Timeline generation not available',
      message: 'This feature requires integration with live grant search results. Please perform a grant search first to access timeline generation.',
      code: 'FEATURE_REQUIRES_LIVE_DATA'
    }, 501);
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
    
    // Production mode: strategic calendar requires live grant data
    return c.json({
      success: false,
      error: 'Strategic calendar not available',
      message: 'This feature requires integration with live grant search results. Please perform a grant search first to access strategic calendar generation.',
      code: 'FEATURE_REQUIRES_LIVE_DATA'
    }, 501);
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

    // Production mode: Grant details must be provided in request
    // User should get grant details from search results first
    const grant = {
      id: grant_id,
      title: requestData.grant_title || 'Federal Grant Opportunity',
      agency: requestData.grant_agency || 'Federal Agency',
      description: requestData.grant_description || 'Grant opportunity description not provided',
      amount: requestData.grant_amount || 'Amount TBD',
      deadline: requestData.grant_deadline || '2025-12-31'
    };

    if (!requestData.grant_title || !requestData.grant_agency) {
      return c.json({
        success: false,
        error: 'Grant details required',
        message: 'Please provide grant_title and grant_agency from your search results. Other fields (grant_description, grant_amount, grant_deadline) are recommended.',
        code: 'MISSING_GRANT_DETAILS'
      }, 400);
    }

    // Phase 2A: Generate AI-powered proposal with real AI integration
    let proposal;
    let executionType;
    
    if (c.env.FEATURE_REAL_AI) {
      try {
        // Use Phase 2A enhanced AI generation with Claude and GPT-4
        proposal = await aiProposalService.generateProposalWithAI(grant, company_profile, c.env, c.get('telemetry'));
        executionType = 'real';
        
        // Log successful real AI execution
        const telemetry = c.get('telemetry');
        if (telemetry) {
          telemetry.logInfo('AI proposal generation SUCCESS - REAL execution', {
            grant_id: grant.id,
            execution: 'real',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        // NO SIMULATIONS LAW: Throw error on AI failure in production
        console.error('AI proposal generation failed:', error);
        
        const telemetry = c.get('telemetry');
        if (telemetry) {
          telemetry.logError('AI proposal generation FAILED', error, {
            grant_id: grant.id,
            execution: 'failed',
            timestamp: new Date().toISOString()
          });
        }
        
        return c.json({
          success: false,
          error: 'AI proposal generation failed. Real AI execution is required in production.',
          code: 'AI_EXECUTION_FAILED',
          message: error.message,
          grant_details: {
            id: grant.id,
            title: grant.title,
            agency: grant.agency
          }
        }, 500);
      }
    } else {
      // Template-based generation only allowed in development
      console.log('⚠️ FEATURE_REAL_AI disabled - using template generation (development only)');
      
      const telemetry = c.get('telemetry');
      if (telemetry) {
        telemetry.logWarning('Using template generation - AI disabled', {
          grant_id: grant.id,
          execution: 'template',
          ai_enabled: false,
          timestamp: new Date().toISOString()
        });
      }
      
      proposal = await aiProposalService.generateProposal(grant, company_profile, options || {});
      executionType = 'template';
    }

    return c.json({
      success: true,
      proposal: proposal,
      execution_type: executionType, // ← Explicit marking per NO SIMULATIONS LAW
      ai_enhanced: c.env.FEATURE_REAL_AI || false,
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
