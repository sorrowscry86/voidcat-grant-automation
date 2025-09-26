// Telemetry Service for VoidCat Grant Automation Platform
// Provides request/response logging, performance metrics, and error tracking

export class TelemetryService {
  constructor(env) {
    this.env = env;
    this.logLevel = env.LOG_LEVEL || 'INFO';
    this.enabledFeatures = {
      requestLogging: true,
      performanceMetrics: true,
      errorTracking: true,
      healthMonitoring: true
    };
  }

  /**
   * Log levels: ERROR = 0, WARN = 1, INFO = 2, DEBUG = 3
   */
  getLogLevel(level) {
    const levels = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
    return levels[level] || 2;
  }

  /**
   * Check if message should be logged based on current log level
   */
  shouldLog(messageLevel) {
    return this.getLogLevel(messageLevel) <= this.getLogLevel(this.logLevel);
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
      request_id: crypto.randomUUID()
    });

    console.log(JSON.stringify(logEntry));
    return logEntry.request_id;
  }

  /**
   * Log request completion
   */
  logRequestComplete(requestId, method, path, statusCode, duration, responseSize = null) {
    if (!this.shouldLog('INFO') || !this.enabledFeatures.requestLogging) return;

    const logEntry = this.createLogEntry('INFO', 'Request completed', {
      request_id: requestId,
      http: {
        method: method,
        path: path,
        status_code: statusCode,
        duration_ms: duration,
        ...(responseSize && { response_size_bytes: responseSize })
      },
      performance: {
        duration_ms: duration,
        ...(duration > 1000 && { slow_request: true }),
        ...(statusCode >= 500 && { server_error: true }),
        ...(statusCode >= 400 && statusCode < 500 && { client_error: true })
      }
    });

    console.log(JSON.stringify(logEntry));
  }

  /**
   * Log error with context
   */
  logError(error, context = {}) {
    if (!this.shouldLog('ERROR') || !this.enabledFeatures.errorTracking) return;

    const logEntry = this.createLogEntry('ERROR', error.message || 'Unknown error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error.code && { code: error.code })
      },
      context: context
    });

    console.error(JSON.stringify(logEntry));
  }

  /**
   * Log warning
   */
  logWarning(message, metadata = {}) {
    if (!this.shouldLog('WARN')) return;

    const logEntry = this.createLogEntry('WARN', message, metadata);
    console.warn(JSON.stringify(logEntry));
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
   * Track proposal generation
   */
  trackProposalGeneration(grantId, userId, success, duration) {
    if (!this.enabledFeatures.performanceMetrics) return;

    this.logInfo('Proposal generation attempted', {
      metrics: {
        type: 'proposal_generation',
        grant_id: grantId,
        user_id: userId ? 'authenticated' : 'anonymous',
        generation_successful: success,
        duration_ms: duration
      }
    });
  }

  /**
   * Track email delivery
   */
  trackEmailDelivery(recipient, type, success, provider) {
    if (!this.enabledFeatures.performanceMetrics) return;

    this.logInfo('Email delivery attempted', {
      metrics: {
        type: 'email_delivery',
        email_type: type,
        provider: provider,
        delivery_successful: success,
        recipient_domain: recipient.split('@')[1]
      }
    });
  }

  /**
   * Track API health status
   */
  trackHealthCheck(endpoint, healthy, responseTime) {
    if (!this.enabledFeatures.healthMonitoring) return;

    this.logInfo('Health check performed', {
      metrics: {
        type: 'health_check',
        endpoint: endpoint,
        healthy: healthy,
        response_time_ms: responseTime
      }
    });
  }

  /**
   * Create telemetry middleware for Hono
   */
  createMiddleware() {
    return async (c, next) => {
      const startTime = Date.now();
      const method = c.req.method;
      const path = c.req.path;
      const userAgent = c.req.header('User-Agent') || 'unknown';
      const clientIP = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';

      // Start request logging
      const requestId = this.logRequestStart(method, path, userAgent, clientIP);

      // Add telemetry service to context
      c.set('telemetry', this);
      c.set('requestId', requestId);

      try {
        await next();
      } catch (error) {
        // Log the error with context
        this.logError(error, {
          request_id: requestId,
          method: method,
          path: path,
          user_agent: userAgent,
          client_ip: clientIP
        });
        throw error; // Re-throw to maintain error handling flow
      } finally {
        // Complete request logging
        const duration = Date.now() - startTime;
        const statusCode = c.res.status || 200;
        
        this.logRequestComplete(requestId, method, path, statusCode, duration);
      }
    };
  }

  /**
   * Get basic health metrics
   */
  getHealthMetrics() {
    return {
      service: 'voidcat-grant-api',
      version: '1.0.0',
      uptime: 'unknown', // process.uptime() is not available in the Cloudflare Workers runtime
      timestamp: new Date().toISOString(),
      telemetry: {
        enabled_features: this.enabledFeatures,
        log_level: this.logLevel
      }
    };
  }
}

export default TelemetryService;