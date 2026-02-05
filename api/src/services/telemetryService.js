// Telemetry Service for VoidCat Grant Automation Platform
// Provides request/response logging, performance metrics, and error tracking

export class TelemetryService {
  constructor(env) {
    this.env = env;
    this.logLevel = env.LOG_LEVEL || 'INFO';
    this.enabledFeatures = {
      requestLogging: true,
      performanceMetrics: true,
      errorTracking: true
    };
  }

  /**
   * Create telemetry middleware for Hono
   */
  createMiddleware() {
    return async (c, next) => {
      const requestId = (() => { try { return crypto.randomUUID(); } catch { return `req-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`; } })();
      const startTime = Date.now();

      // Attach telemetry instance to context
      c.set('telemetry', this);
      c.set('requestId', requestId);

      // Log request start
      this.logRequestStart(
        c.req.method,
        c.req.path,
        c.req.header('user-agent'),
        c.req.header('cf-connecting-ip')
      );

      await next();

      // Log request completion
      const duration = Date.now() - startTime;
      this.logRequestComplete(
        c.req.method,
        c.req.path,
        c.res.status,
        duration,
        requestId
      );
    };
  }

  /**
   * Structure log entry with consistent format
   */
  createLogEntry(level, message, metadata = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: level,
      service: 'voidcat-grant-api',
      message: message,
      ...metadata
    };
  }

  /**
   * Log request start
   */
  logRequestStart(method, path, userAgent, ip) {
    if (!this.shouldLog('INFO') || !this.enabledFeatures.requestLogging) return;

    const logEntry = this.createLogEntry('INFO', 'Request started', {
      http: {
        method: method,
        path: path,
        user_agent: userAgent,
        client_ip: ip
      },
      request_id: (() => { try { return crypto.randomUUID(); } catch { return `req-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`; } })()
    });

    console.log(JSON.stringify(logEntry));
    return logEntry.request_id;
  }

  /**
   * Log request completion
   */
  logRequestComplete(method, path, status, duration, requestId) {
    if (!this.shouldLog('INFO') || !this.enabledFeatures.requestLogging) return;

    const logEntry = this.createLogEntry('INFO', 'Request completed', {
      http: {
        method: method,
        path: path,
        status_code: status,
        duration_ms: duration
      },
      request_id: requestId,
      performance: {
        slow_request: duration > 1000
      },
      endpoint_identifier: this.identifyEndpoint(method, path),
      feature_flags: {
        live_data: this.env.FEATURE_LIVE_DATA || false,
        real_ai: this.env.FEATURE_REAL_AI || false
      }
    });

    console.log(JSON.stringify(logEntry));
  }

  /**
   * Identify endpoint by method and path for better tracking
   */
  identifyEndpoint(method, path) {
    const routes = [
      { pattern: /^\/health$/, name: 'health_check' },
      { pattern: /^\/health\/detailed$/, name: 'health_detailed' },
      { pattern: /^\/api\/grants\/search/, name: 'grants_search' },
      { pattern: /^\/api\/grants\/federal-agencies/, name: 'federal_agencies_list' },
      { pattern: /^\/api\/grants\/validate-eligibility/, name: 'compliance_validate_eligibility' },
      { pattern: /^\/api\/grants\/generate-budget-justification/, name: 'compliance_budget_justification' },
      { pattern: /^\/api\/grants\/generate-ai-proposal/, name: 'ai_proposal_generation' },
      { pattern: /^\/api\/grants\/generate-proposal/, name: 'proposal_generation' },
      { pattern: /^\/api\/grants\/stats/, name: 'grants_stats' },
      { pattern: /^\/api\/grants\/[^\/]+$/, name: 'grants_get_by_id' },
      { pattern: /^\/api\/users\/register/, name: 'user_registration' },
      { pattern: /^\/api\/users\/me/, name: 'user_profile' },
      { pattern: /^\/api\/auth\/login/, name: 'auth_login' },
      { pattern: /^\/api\/auth\/refresh/, name: 'auth_refresh_token' },
      { pattern: /^\/api\/dashboard\/metrics/, name: 'dashboard_metrics' },
      { pattern: /^\/api\/admin\/populate-database/, name: 'admin_db_populate' },
      { pattern: /^\/api\/stripe\/create-checkout/, name: 'stripe_checkout' },
      { pattern: /^\/api\/stripe\/webhook/, name: 'stripe_webhook' },
      { pattern: /^\/$/, name: 'root_info' }
    ];

    for (const route of routes) {
      if (route.pattern.test(path)) {
        return `${method.toUpperCase()}_${route.name}`;
      }
    }

    return `${method.toUpperCase()}_unknown_${path.replace(/\//g, '_')}`;
  }

  /**
   * Log info message
   */
  logInfo(message, metadata = {}) {
    if (!this.shouldLog('INFO')) return;

    const logEntry = this.createLogEntry('INFO', message, metadata);
    console.log(JSON.stringify(logEntry));
  }

  /**
   * Log debug message
   */
  logDebug(message, metadata = {}) {
    if (!this.shouldLog('DEBUG')) return;

    const logEntry = this.createLogEntry('DEBUG', message, metadata);
    console.log(JSON.stringify(logEntry));
  }

  /**
   * Log warning message
   */
  logWarning(message, metadata = {}) {
    if (!this.shouldLog('WARN')) return;

    const logEntry = this.createLogEntry('WARN', message, metadata);
    console.log(JSON.stringify(logEntry));
  }

  /**
   * Log error message
   */
  logError(message, error, metadata = {}) {
    if (!this.shouldLog('ERROR')) return;

    const logEntry = this.createLogEntry('ERROR', message, {
      error: {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      },
      ...metadata
    });

    console.log(JSON.stringify(logEntry));
  }

  /**
   * Track grant search metrics
   */
  trackGrantSearch(query, agency, resultsCount, dataSource, fallbackOccurred) {
    if (!this.enabledFeatures.performanceMetrics) return;

    this.logInfo('Grant search performed', {
      metrics: {
        type: 'grant_search',
        query_length: query ? query.length : 0,
        agency: agency || 'all',
        results_count: resultsCount,
        data_source: dataSource,
        fallback_occurred: fallbackOccurred,
        search_successful: resultsCount > 0
      }
    });
  }

  /**
   * Track external data source fetch
   */
  trackDataSourceFetch(source, success, durationMs, resultCount, errorMessage = null) {
    if (!this.enabledFeatures.performanceMetrics) return;

    this.logInfo('Data source fetch', {
      metrics: {
        type: 'data_source_fetch',
        source,
        success,
        duration_ms: durationMs,
        result_count: resultCount,
        error: errorMessage
      }
    });
  }

  /**
   * Track user registration
   */
  trackUserRegistration(email, emailSent, subscriptionTier = 'free') {
    if (!this.enabledFeatures.performanceMetrics) return;

    this.logInfo('User registration completed', {
      metrics: {
        type: 'user_registration',
        email_domain: email.split('@')[1],
        welcome_email_sent: emailSent,
        subscription_tier: subscriptionTier,
        registration_successful: true
      }
    });
  }

  /**
   * Track email delivery
   */
  trackEmailDelivery(email, emailType, success, provider) {
    if (!this.enabledFeatures.performanceMetrics) return;

    this.logInfo('Email delivery attempt', {
      metrics: {
        type: 'email_delivery',
        email_type: emailType,
        provider: provider,
        success: success,
        email_domain: email.split('@')[1]
      }
    });
  }

  /**
   * Track proposal generation and AI token usage
   */
  trackProposalGeneration(grantId, userId, success, generationTimeMs, aiMetadata = null) {
    if (!this.enabledFeatures.performanceMetrics) return;

    this.logInfo('Proposal generation completed', {
      metrics: {
        type: 'proposal_generation',
        grant_id: grantId,
        user_id: userId,
        success: success,
        generation_time_ms: generationTimeMs,
        ...aiMetadata // Include model, tokens, etc if provided
      }
    });
  }

  /**
   * Track specific AI token usage for cost estimation
   */
  trackAITokenUsage(userId, model, promptTokens, completionTokens, requestId) {
    if (!this.enabledFeatures.performanceMetrics) return;

    // Estimate cost (Placeholder rates - Aligned with VoidCat RDC financial tracking)
    const rates = {
      'claude-3-sonnet': { prompt: 0.003 / 1000, completion: 0.015 / 1000 },
      'gpt-4': { prompt: 0.03 / 1000, completion: 0.06 / 1000 },
      'default': { prompt: 0.01 / 1000, completion: 0.03 / 1000 }
    };

    const modelRates = rates[model] || rates['default'];
    const estimatedCost = (promptTokens * modelRates.prompt) + (completionTokens * modelRates.completion);

    this.logInfo('AI Token Usage Tracked', {
      metrics: {
        type: 'ai_token_usage',
        user_id: userId,
        model: model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        estimated_cost_usd: parseFloat(estimatedCost.toFixed(6)),
        request_id: requestId
      }
    });
  }

  /**
   * Check if we should log at the given level
   */
  shouldLog(level) {
    const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    return levels[level] >= levels[this.logLevel];
  }

  /**
   * Get basic health metrics
   */
  getHealthMetrics() {
    return {
      service: 'voidcat-grant-api',
      timestamp: new Date().toISOString(),
      log_level: this.logLevel,
      features_enabled: this.enabledFeatures
    };
  }
}

export default TelemetryService;