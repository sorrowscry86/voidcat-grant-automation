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
      }
    });

    console.log(JSON.stringify(logEntry));
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
   * Track proposal generation
   */
  trackProposalGeneration(grantId, userId, success, generationTimeMs) {
    if (!this.enabledFeatures.performanceMetrics) return;

    this.logInfo('Proposal generation completed', {
      metrics: {
        type: 'proposal_generation',
        grant_id: grantId,
        user_id: userId,
        success: success,
        generation_time_ms: generationTimeMs
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