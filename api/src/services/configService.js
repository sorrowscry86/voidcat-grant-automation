// Configuration Service for VoidCat Grant Automation Platform
// Centralizes all configuration with environment variable support and defaults

export class ConfigService {
  constructor(env = {}) {
    this.env = env;
  }

  /**
   * Get data source configuration
   */
  getDataConfig() {
    return {
      USE_LIVE_DATA: this.getBooleanConfig('USE_LIVE_DATA', true),
      FALLBACK_TO_MOCK: false, // PRODUCTION MODE: No mock data fallback allowed
      LIVE_DATA_TIMEOUT: this.getNumberConfig('LIVE_DATA_TIMEOUT', 15000),
      LIVE_DATA_SOURCES: {
        GRANTS_GOV_API: this.getStringConfig('GRANTS_GOV_API_URL', 'https://api.grants.gov/v1/api/search2'),
        SBIR_API: this.getStringConfig('SBIR_API_URL', 'https://www.sbir.gov/api/opportunities.json'),
        NSF_API: this.getStringConfig('NSF_API_URL', 'https://www.nsf.gov/awardsearch/download.jsp')
      }
    };
  }

  /**
   * Get rate limiting configuration
   */
  getRateLimitConfig() {
    return {
      PROPOSALS_PER_MINUTE: this.getNumberConfig('RATE_LIMIT_PER_MIN', 12),
      SEARCH_PER_MINUTE: this.getNumberConfig('SEARCH_RATE_LIMIT_PER_MIN', 60),
      REGISTRATION_PER_HOUR: this.getNumberConfig('REGISTRATION_RATE_LIMIT_PER_HOUR', 5)
    };
  }

  /**
   * Get email service configuration
   */
  getEmailConfig() {
    return {
      PROVIDER: this.getStringConfig('MAIL_PROVIDER', 'mailchannels'),
      FROM_EMAIL: this.getStringConfig('MAIL_FROM', 'noreply@voidcat.org'),
      FROM_NAME: this.getStringConfig('MAIL_FROM_NAME', 'VoidCat RDC'),
      MAILCHANNELS_DKIM_PRIVATE_KEY: this.getStringConfig('MAILCHANNELS_DKIM_PRIVATE_KEY'),
      RESEND_API_KEY: this.getStringConfig('RESEND_API_KEY')
    };
  }

  /**
   * Get telemetry configuration
   */
  getTelemetryConfig() {
    return {
      LOG_LEVEL: this.getStringConfig('LOG_LEVEL', 'INFO'),
      TELEMETRY_ENDPOINT: this.getStringConfig('TELEMETRY_ENDPOINT'),
      REQUEST_LOGGING: this.getBooleanConfig('ENABLE_REQUEST_LOGGING', true),
      PERFORMANCE_METRICS: this.getBooleanConfig('ENABLE_PERFORMANCE_METRICS', true),
      ERROR_TRACKING: this.getBooleanConfig('ENABLE_ERROR_TRACKING', true)
    };
  }

  /**
   * Get Stripe configuration
   */
  getStripeConfig() {
    return {
      SECRET_KEY: this.getStringConfig('STRIPE_SECRET_KEY') || this.getStringConfig('STRIPE_SK'),
      PUBLISHABLE_KEY: this.getStringConfig('STRIPE_PUBLISHABLE_KEY') || this.getStringConfig('STRIPE_PUBLIC_KEY'),
      PRICE_ID: this.getStringConfig('STRIPE_PRICE_ID') || this.getStringConfig('STRIPE_PRODUCT_PRICE_ID'),
      WEBHOOK_SECRET: this.getStringConfig('STRIPE_WEBHOOK_SECRET') || this.getStringConfig('STRIPE_WH_SECRET'),
      API_VERSION: this.getStringConfig('STRIPE_API_VERSION', '2024-06-20')
    };
  }

  /**
   * Get application configuration
   */
  getAppConfig() {
    return {
      ENVIRONMENT: this.getStringConfig('ENVIRONMENT', 'development'),
      SERVICE_NAME: this.getStringConfig('SERVICE_NAME', 'VoidCat Grant Search API'),
      VERSION: this.getStringConfig('API_VERSION', '1.0.0'),
      CORS_ORIGINS: this.getArrayConfig('CORS_ORIGINS', [
        'https://sorrowscry86.github.io',
        'https://voidcat.org',
        'https://www.voidcat.org',
        'http://localhost:3000',
        'http://localhost:8080'
      ])
    };
  }

  /**
   * Get validation limits configuration
   */
  getValidationConfig() {
    return {
      MAX_SEARCH_QUERY_LENGTH: this.getNumberConfig('MAX_SEARCH_QUERY_LENGTH', 200),
      MAX_NAME_LENGTH: this.getNumberConfig('MAX_NAME_LENGTH', 100),
      MIN_NAME_LENGTH: this.getNumberConfig('MIN_NAME_LENGTH', 2),
      MAX_COMPANY_LENGTH: this.getNumberConfig('MAX_COMPANY_LENGTH', 200),
      MAX_GRANT_ID_LENGTH: this.getNumberConfig('MAX_GRANT_ID_LENGTH', 50)
    };
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig() {
    return {
      CONNECTION_TIMEOUT: this.getNumberConfig('DB_CONNECTION_TIMEOUT', 10000),
      RETRY_ATTEMPTS: this.getNumberConfig('DB_RETRY_ATTEMPTS', 3),
      POOL_SIZE: this.getNumberConfig('DB_POOL_SIZE', 10)
    };
  }

  /**
   * Get feature flags configuration
   */
  getFeatureFlags() {
    return {
      ENABLE_LIVE_DATA: this.getBooleanConfig('ENABLE_LIVE_DATA', true),
      ENABLE_EMAIL_NOTIFICATIONS: this.getBooleanConfig('ENABLE_EMAIL_NOTIFICATIONS', true),
      ENABLE_ADVANCED_FILTERS: this.getBooleanConfig('ENABLE_ADVANCED_FILTERS', false),
      ENABLE_PROPOSAL_GENERATION: this.getBooleanConfig('ENABLE_PROPOSAL_GENERATION', true),
      ENABLE_RATE_LIMITING: this.getBooleanConfig('ENABLE_RATE_LIMITING', true),
      ENABLE_TELEMETRY: this.getBooleanConfig('ENABLE_TELEMETRY', true),
      ENABLE_JWT_AUTH: this.getBooleanConfig('ENABLE_JWT_AUTH', true),
      ENABLE_PASSWORD_AUTH: this.getBooleanConfig('ENABLE_PASSWORD_AUTH', true),
      ENABLE_DASHBOARD: this.getBooleanConfig('ENABLE_DASHBOARD', true),
      ENABLE_ADVANCED_METRICS: this.getBooleanConfig('ENABLE_ADVANCED_METRICS', true)
    };
  }

  /**
   * Get dashboard configuration
   */
  getDashboardConfig() {
    return {
      ADMIN_EMAILS: this.getArrayConfig('DASHBOARD_ADMIN_EMAILS', ['admin@voidcat.org']),
      METRICS_RETENTION_DAYS: this.getNumberConfig('METRICS_RETENTION_DAYS', 30),
      ENABLE_EXPORTS: this.getBooleanConfig('DASHBOARD_ENABLE_EXPORTS', true),
      ENABLE_REALTIME: this.getBooleanConfig('DASHBOARD_ENABLE_REALTIME', true),
      MAX_EXPORT_RECORDS: this.getNumberConfig('DASHBOARD_MAX_EXPORT_RECORDS', 10000)
    };
  }

  /**
   * Get JWT authentication configuration
   */
  getJWTConfig() {
    return {
      SECRET_KEY: this.getStringConfig('JWT_SECRET_KEY'), // No default - must be provided
      ACCESS_TOKEN_TTL: this.getNumberConfig('JWT_ACCESS_TOKEN_TTL', 3600),
      REFRESH_TOKEN_TTL: this.getNumberConfig('JWT_REFRESH_TOKEN_TTL', 604800),
      ISSUER: this.getStringConfig('JWT_ISSUER', 'voidcat-grant-api'),
      AUDIENCE: this.getStringConfig('JWT_AUDIENCE', 'voidcat-grant-platform')
    };
  }

  /**
   * Get password security configuration
   */
  getPasswordConfig() {
    return {
      HASH_ITERATIONS: this.getNumberConfig('PASSWORD_HASH_ITERATIONS', 100000),
      MIN_LENGTH: this.getNumberConfig('PASSWORD_MIN_LENGTH', 8),
      MAX_LENGTH: this.getNumberConfig('PASSWORD_MAX_LENGTH', 128),
      REQUIRE_COMPLEXITY: this.getBooleanConfig('PASSWORD_REQUIRE_COMPLEXITY', true),
      RESET_TOKEN_TTL_MINUTES: this.getNumberConfig('PASSWORD_RESET_TOKEN_TTL_MINUTES', 60)
    };
  }

  // Helper methods for type-safe config retrieval

  /**
   * Get string configuration value
   */
  getStringConfig(key, defaultValue = null) {
    const value = this.env[key];
    return value !== undefined ? String(value) : defaultValue;
  }

  /**
   * Get number configuration value
   */
  getNumberConfig(key, defaultValue = 0) {
    const value = this.env[key];
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Get boolean configuration value
   */
  getBooleanConfig(key, defaultValue = false) {
    const value = this.env[key];
    if (value === undefined) return defaultValue;
    if (typeof value === 'boolean') return value;
    const str = String(value).toLowerCase();
    return str === 'true' || str === '1' || str === 'yes' || str === 'on';
  }

  /**
   * Get array configuration value (comma-separated string)
   */
  getArrayConfig(key, defaultValue = []) {
    const value = this.env[key];
    if (value === undefined) return defaultValue;
    if (Array.isArray(value)) return value;
    return String(value).split(',').map(item => item.trim()).filter(item => item.length > 0);
  }

  /**
   * Get JSON configuration value
   */
  getJsonConfig(key, defaultValue = {}) {
    const value = this.env[key];
    if (value === undefined) return defaultValue;
    try {
      return JSON.parse(String(value));
    } catch (error) {
      console.warn(`Failed to parse JSON config for ${key}:`, error.message);
      return defaultValue;
    }
  }

  /**
   * Validate required configuration
   */
  validateRequiredConfig() {
    const errors = [];
    const config = this.getStripeConfig();
    
    // Check Stripe configuration for production
    if (this.getStringConfig('ENVIRONMENT') === 'production') {
      if (!config.SECRET_KEY) {
        errors.push('STRIPE_SECRET_KEY is required for production');
      }
      if (!config.PUBLISHABLE_KEY) {
        errors.push('STRIPE_PUBLISHABLE_KEY is required for production');
      }
      if (!config.PRICE_ID) {
        errors.push('STRIPE_PRICE_ID is required for production');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get all configuration as a single object (for debugging)
   */
  getAllConfig() {
    return {
      app: this.getAppConfig(),
      data: this.getDataConfig(),
      rateLimit: this.getRateLimitConfig(),
      email: this.getEmailConfig(),
      telemetry: this.getTelemetryConfig(),
      stripe: this.getStripeConfig(),
      validation: this.getValidationConfig(),
      database: this.getDatabaseConfig(),
      features: this.getFeatureFlags()
    };
  }
}

export default ConfigService;