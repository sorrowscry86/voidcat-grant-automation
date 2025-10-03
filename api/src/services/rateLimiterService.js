// VoidCat RDC Rate Limiting Service
// Cloudflare KV-based rate limiting for proposal generation and other expensive operations

export class RateLimiterService {
  constructor(kv, config = {}) {
    this.kv = kv;
    this.config = {
      proposalLimit: config.proposalLimit || 12, // requests per minute
      windowMinutes: config.windowMinutes || 1,
      keyPrefix: config.keyPrefix || 'rl',
      enabled: config.enabled !== false,
      ...config
    };
  }

  /**
   * Generate rate limiting key
   * @param {string} apiKey - User's API key
   * @param {string} endpoint - Endpoint identifier
   * @returns {string} - Rate limiting key
   */
  generateKey(apiKey, endpoint = 'proposal') {
    const hashedKey = this.hashApiKey(apiKey);
    const windowStart = this.getCurrentWindowStart();
    return `${this.config.keyPrefix}:${endpoint}:${hashedKey}:${windowStart}`;
  }

  /**
   * Hash API key for privacy
   * @param {string} apiKey - User's API key
   * @returns {string} - Hashed key
   */
  hashApiKey(apiKey) {
    // Simple hash for rate limiting (not cryptographic security)
    let hash = 0;
    for (let i = 0; i < apiKey.length; i++) {
      const char = apiKey.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get current time window start (minute precision)
   * @returns {string} - Window identifier
   */
  getCurrentWindowStart() {
    const now = new Date();
    const windowStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
      0,
      0
    );
    return windowStart.toISOString().substring(0, 16); // YYYY-MM-DDTHH:MM
  }

  /**
   * Check if request should be rate limited
   * @param {string} apiKey - User's API key
   * @param {string} endpoint - Endpoint identifier
   * @returns {Promise<{allowed: boolean, count: number, limit: number, resetTime: Date}>}
   */
  async checkLimit(apiKey, endpoint = 'proposal') {
    if (!this.config.enabled) {
      return {
        allowed: true,
        count: 0,
        limit: this.config.proposalLimit,
        resetTime: new Date(Date.now() + 60000),
        bypassReason: 'rate_limiting_disabled'
      };
    }

    if (!this.kv) {
      console.warn('KV store not available, bypassing rate limiting');
      return {
        allowed: true,
        count: 0,
        limit: this.config.proposalLimit,
        resetTime: new Date(Date.now() + 60000),
        bypassReason: 'kv_unavailable'
      };
    }

    const key = this.generateKey(apiKey, endpoint);
    const limit = this.getEndpointLimit(endpoint);

    try {
      // Get current count
      const currentCountStr = await this.kv.get(key);
      const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;

      // Calculate reset time (next minute)
      const resetTime = new Date();
      resetTime.setMinutes(resetTime.getMinutes() + 1);
      resetTime.setSeconds(0);
      resetTime.setMilliseconds(0);

      if (currentCount >= limit) {
        return {
          allowed: false,
          count: currentCount,
          limit,
          resetTime,
          key: key.substring(0, 20) + '...', // Partial key for debugging
        };
      }

      return {
        allowed: true,
        count: currentCount,
        limit,
        resetTime,
        key: key.substring(0, 20) + '...', // Partial key for debugging
      };

    } catch (error) {
      console.error('Rate limiting check failed:', error);
      // Fail open - allow request if KV is having issues
      return {
        allowed: true,
        count: 0,
        limit,
        resetTime: new Date(Date.now() + 60000),
        bypassReason: 'check_error',
        error: error.message
      };
    }
  }

  /**
   * Increment rate limiting counter
   * @param {string} apiKey - User's API key
   * @param {string} endpoint - Endpoint identifier
   * @returns {Promise<{count: number, ttl: number}>}
   */
  async incrementCount(apiKey, endpoint = 'proposal') {
    if (!this.config.enabled || !this.kv) {
      return { count: 1, ttl: 60 };
    }

    const key = this.generateKey(apiKey, endpoint);

    try {
      // Get current count
      const currentCountStr = await this.kv.get(key);
      const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
      const newCount = currentCount + 1;

      // Set with TTL (expire at end of current minute + buffer)
      const ttl = 60 + 5; // 65 seconds to handle clock skew
      await this.kv.put(key, newCount.toString(), {
        expirationTtl: ttl
      });

      return { count: newCount, ttl };

    } catch (error) {
      console.error('Rate limiting increment failed:', error);
      return { count: 1, ttl: 60, error: error.message };
    }
  }

  /**
   * Get rate limit for specific endpoint
   * @param {string} endpoint - Endpoint identifier
   * @returns {number} - Rate limit for endpoint
   */
  getEndpointLimit(endpoint) {
    const limits = {
      'proposal': this.config.proposalLimit,
      'search': this.config.searchLimit || 60,
      'register': this.config.registerLimit || 5
    };
    return limits[endpoint] || this.config.proposalLimit;
  }

  /**
   * Create middleware for Hono
   * @param {string} endpoint - Endpoint identifier
   * @returns {Function} - Hono middleware function
   */
  middleware(endpoint = 'proposal') {
    return async (c, next) => {
      const authHeader = c.req.header('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No API key, skip rate limiting (will be handled by auth middleware)
        await next();
        return;
      }

      const apiKey = authHeader.replace('Bearer ', '');
      
      // Check rate limit
      const limitResult = await this.checkLimit(apiKey, endpoint);
      
      if (!limitResult.allowed) {
        // Add rate limit headers
        c.header('X-RateLimit-Limit', limitResult.limit.toString());
        c.header('X-RateLimit-Remaining', '0');
        c.header('X-RateLimit-Reset', limitResult.resetTime.toISOString());
        c.header('Retry-After', '60');

        return c.json({
          success: false,
          error: 'Rate limit exceeded',
          message: `Too many requests. Limit: ${limitResult.limit} per minute. Try again in 60 seconds.`,
          code: 'RATE_LIMIT_EXCEEDED',
          limit: limitResult.limit,
          reset_time: limitResult.resetTime.toISOString()
        }, 429);
      }

      // Increment counter for successful requests
      const incrementResult = await this.incrementCount(apiKey, endpoint);
      
      // Add rate limit headers
      const remaining = Math.max(0, limitResult.limit - incrementResult.count);
      c.header('X-RateLimit-Limit', limitResult.limit.toString());
      c.header('X-RateLimit-Remaining', remaining.toString());
      c.header('X-RateLimit-Reset', limitResult.resetTime.toISOString());

      await next();
    };
  }

  /**
   * Get rate limiting statistics
   * @returns {Object} - Current configuration and stats
   */
  getStats() {
    return {
      enabled: this.config.enabled,
      limits: {
        proposal: this.config.proposalLimit,
        search: this.config.searchLimit || 60,
        register: this.config.registerLimit || 5
      },
      windowMinutes: this.config.windowMinutes,
      kvAvailable: !!this.kv
    };
  }
}

/**
 * Create rate limiter instance with environment config
 * @param {Object} env - Cloudflare Worker environment
 * @returns {RateLimiterService} - Configured rate limiter
 */
export function createRateLimiter(env) {
  const config = {
    proposalLimit: parseInt(env.RATE_LIMIT_PER_MIN || '12', 10),
    enabled: env.RATE_LIMITING_ENABLED !== 'false',
    searchLimit: parseInt(env.SEARCH_RATE_LIMIT_PER_MIN || '60', 10),
    registerLimit: parseInt(env.REGISTER_RATE_LIMIT_PER_MIN || '5', 10)
  };

  return new RateLimiterService(env.OAUTH_KV, config);
}