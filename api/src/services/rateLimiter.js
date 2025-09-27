// Rate Limiter Service for VoidCat Grant Automation Platform
// Uses Cloudflare KV for distributed rate limiting

export class RateLimiter {
  constructor(env) {
    this.env = env;
    this.kv = env.OAUTH_KV; // Using existing KV namespace
    this.defaultLimitPerMinute = parseInt(env.RATE_LIMIT_PER_MIN || '12');
  }

  /**
   * Generate rate limit key for a user/API key
   * @param {string} identifier - User identifier (API key hash or user ID)
   * @param {string} operation - Operation type (e.g., 'proposal_generation')
   * @returns {string} Rate limit key
   */
  generateKey(identifier, operation = 'proposal_generation') {
    const now = new Date();
    const windowStart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Hash the identifier for privacy
    const hashedIdentifier = this.hashIdentifier(identifier);
    
    return `rl:${hashedIdentifier}:${operation}:${windowStart}`;
  }

  /**
   * Simple hash function for identifiers
   * @param {string} identifier 
   * @returns {string} Hashed identifier
   */
  hashIdentifier(identifier) {
    if (!identifier) return 'anonymous';
    
    // Simple hash for privacy (in production, use crypto.subtle)
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      const char = identifier.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if request is within rate limit and increment counter
   * @param {string} identifier - User identifier (API key hash or user ID)
   * @param {string} operation - Operation type
   * @param {number} limitPerMinute - Custom limit (optional)
   * @returns {Promise<{allowed: boolean, currentCount: number, limit: number, resetTime: Date, retryAfter?: number}>}
   */
  async checkAndIncrement(identifier, operation = 'proposal_generation', limitPerMinute = null) {
    const limit = limitPerMinute || this.defaultLimitPerMinute;
    const key = this.generateKey(identifier, operation);
    
    try {
      // Get current count
      const currentCountStr = await this.kv.get(key);
      const currentCount = currentCountStr ? parseInt(currentCountStr) : 0;
      
      // Calculate reset time (next minute boundary)
      const now = new Date();
      const resetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 0, 0);
      
      // Check if limit exceeded
      if (currentCount >= limit) {
        const retryAfter = Math.ceil((resetTime.getTime() - now.getTime()) / 1000);
        return {
          allowed: false,
          currentCount,
          limit,
          resetTime,
          retryAfter
        };
      }
      
      // Increment counter
      const newCount = currentCount + 1;
      const ttl = Math.max(60, Math.ceil((resetTime.getTime() - now.getTime()) / 1000) + 5); // Ensure minimum 60 seconds TTL
      
      await this.kv.put(key, newCount.toString(), { expirationTtl: ttl });
      
      return {
        allowed: true,
        currentCount: newCount,
        limit,
        resetTime,
        retryAfter: 0
      };
      
    } catch (error) {
      // If KV fails, allow the request but log the error
      console.error('Rate limiter KV error:', error);
      return {
        allowed: true,
        currentCount: 0,
        limit,
        resetTime: new Date(),
        retryAfter: 0,
        error: 'Rate limiter temporarily unavailable'
      };
    }
  }

  /**
   * Get current rate limit status without incrementing
   * @param {string} identifier 
   * @param {string} operation 
   * @returns {Promise<{currentCount: number, limit: number, remaining: number, resetTime: Date}>}
   */
  async getStatus(identifier, operation = 'proposal_generation') {
    const limit = this.defaultLimitPerMinute;
    const key = this.generateKey(identifier, operation);
    
    try {
      const currentCountStr = await this.kv.get(key);
      const currentCount = currentCountStr ? parseInt(currentCountStr) : 0;
      
      const now = new Date();
      const resetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 0, 0);
      
      return {
        currentCount,
        limit,
        remaining: Math.max(0, limit - currentCount),
        resetTime
      };
    } catch (error) {
      console.error('Rate limiter status check error:', error);
      return {
        currentCount: 0,
        limit,
        remaining: limit,
        resetTime: new Date()
      };
    }
  }

  /**
   * Reset rate limit for a specific identifier (admin function)
   * @param {string} identifier 
   * @param {string} operation 
   * @returns {Promise<boolean>}
   */
  async reset(identifier, operation = 'proposal_generation') {
    const key = this.generateKey(identifier, operation);
    
    try {
      await this.kv.delete(key);
      return true;
    } catch (error) {
      console.error('Rate limiter reset error:', error);
      return false;
    }
  }

  /**
   * Create rate limiting middleware for Hono
   * @param {Object} options - Rate limiting options
   * @returns {Function} Middleware function
   */
  createMiddleware(options = {}) {
    const {
      operation = 'api_request',
      limitPerMinute = null,
      keyExtractor = (c) => c.req.header('authorization') || c.req.header('x-api-key') || c.req.header('cf-connecting-ip') || 'anonymous',
      onRateLimited = null
    } = options;

    return async (c, next) => {
      const identifier = keyExtractor(c);
      const result = await this.checkAndIncrement(identifier, operation, limitPerMinute);
      
      // Set rate limit headers
      c.header('X-RateLimit-Limit', result.limit.toString());
      c.header('X-RateLimit-Remaining', Math.max(0, result.limit - result.currentCount).toString());
      c.header('X-RateLimit-Reset', Math.floor(result.resetTime.getTime() / 1000).toString());
      
      if (!result.allowed) {
        if (result.retryAfter) {
          c.header('Retry-After', result.retryAfter.toString());
        }
        
        // Log rate limit hit
        const telemetry = c.get('telemetry');
        if (telemetry) {
          telemetry.logInfo('Rate limit exceeded', {
            rate_limit: {
              identifier: this.hashIdentifier(identifier),
              operation,
              current_count: result.currentCount,
              limit: result.limit,
              retry_after: result.retryAfter
            }
          });
        }
        
        if (onRateLimited) {
          return onRateLimited(c, result);
        }
        
        return c.json({
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          rate_limit: {
            limit: result.limit,
            current: result.currentCount,
            retry_after: result.retryAfter,
            reset_time: result.resetTime.toISOString()
          }
        }, 429);
      }
      
      await next();
    };
  }
}

export default RateLimiter;