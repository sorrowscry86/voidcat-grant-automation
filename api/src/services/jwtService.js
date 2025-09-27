// JWT Service for VoidCat Grant Automation Platform - Tier 4.2
// Provides JWT token generation and validation for advanced authentication

/**
 * JWT Service for advanced authentication
 * Implements secure token-based authentication with refresh tokens
 */
export class JWTService {
  constructor(env) {
    this.env = env;
    this.secretKey = env.JWT_SECRET_KEY || 'voidcat-jwt-secret-key-change-in-production';
    this.algorithm = 'HS256';
    this.issuer = 'voidcat-grant-api';
    this.accessTokenTTL = parseInt(env.JWT_ACCESS_TOKEN_TTL || '3600'); // 1 hour
    this.refreshTokenTTL = parseInt(env.JWT_REFRESH_TOKEN_TTL || '604800'); // 7 days
  }

  /**
   * Generate access and refresh tokens for a user
   */
  async generateTokens(user) {
    try {
      const now = Math.floor(Date.now() / 1000);
      
      // Access token payload
      const accessPayload = {
        sub: user.id || user.email, // Subject (user identifier)
        iss: this.issuer, // Issuer
        aud: 'voidcat-grant-platform', // Audience
        iat: now, // Issued at
        exp: now + this.accessTokenTTL, // Expires
        type: 'access',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          subscription_tier: user.subscription_tier || 'free',
          created_at: user.created_at
        }
      };

      // Refresh token payload
      const refreshPayload = {
        sub: user.id || user.email,
        iss: this.issuer,
        aud: 'voidcat-grant-platform',
        iat: now,
        exp: now + this.refreshTokenTTL,
        type: 'refresh',
        user_id: user.id || user.email
      };

      const accessToken = await this.signToken(accessPayload);
      const refreshToken = await this.signToken(refreshPayload);

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: this.accessTokenTTL,
        expires_at: now + this.accessTokenTTL
      };
    } catch (error) {
      console.error('JWT token generation error:', error);
      throw new Error('Failed to generate authentication tokens');
    }
  }

  /**
   * Verify and decode a JWT token
   */
  async verifyToken(token, expectedType = 'access') {
    try {
      const payload = await this.decodeToken(token);
      
      // Verify token type
      if (payload.type !== expectedType) {
        throw new Error(`Invalid token type. Expected ${expectedType}, got ${payload.type}`);
      }

      // Verify expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new Error('Token has expired');
      }

      // Verify issuer and audience
      if (payload.iss !== this.issuer) {
        throw new Error('Invalid token issuer');
      }

      if (payload.aud !== 'voidcat-grant-platform') {
        throw new Error('Invalid token audience');
      }

      return payload;
    } catch (error) {
      console.error('JWT token verification error:', error);
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Extract user information from a verified token
   */
  async extractUser(token) {
    try {
      const payload = await this.verifyToken(token, 'access');
      return payload.user;
    } catch (error) {
      throw new Error(`Failed to extract user from token: ${error.message}`);
    }
  }

  /**
   * Refresh an access token using a refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const payload = await this.verifyToken(refreshToken, 'refresh');
      
      // Get user data (in a real implementation, you'd fetch from database)
      const user = {
        id: payload.user_id,
        email: payload.sub,
        // Note: In production, fetch full user details from database
      };

      // Generate new access token
      const tokens = await this.generateTokens(user);
      
      return {
        access_token: tokens.access_token,
        token_type: tokens.token_type,
        expires_in: tokens.expires_in,
        expires_at: tokens.expires_at
      };
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  /**
   * Sign a JWT token using HMAC-SHA256
   */
  async signToken(payload) {
    try {
      const header = {
        alg: this.algorithm,
        typ: 'JWT'
      };

      const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
      const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
      
      const message = `${encodedHeader}.${encodedPayload}`;
      const signature = await this.signMessage(message);
      
      return `${message}.${signature}`;
    } catch (error) {
      throw new Error(`Failed to sign token: ${error.message}`);
    }
  }

  /**
   * Decode and verify a JWT token
   */
  async decodeToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const [encodedHeader, encodedPayload, signature] = parts;
      
      // Verify signature
      const message = `${encodedHeader}.${encodedPayload}`;
      const isValid = await this.verifySignature(message, signature);
      
      if (!isValid) {
        throw new Error('Invalid token signature');
      }

      // Decode payload
      const payload = JSON.parse(this.base64UrlDecode(encodedPayload));
      return payload;
    } catch (error) {
      throw new Error(`Failed to decode token: ${error.message}`);
    }
  }

  /**
   * Sign a message using HMAC-SHA256
   */
  async signMessage(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const key = encoder.encode(this.secretKey);
    
    // Import key for HMAC
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign the message
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
    return this.base64UrlEncode(new Uint8Array(signature));
  }

  /**
   * Verify a message signature
   */
  async verifySignature(message, signature) {
    try {
      const expectedSignature = await this.signMessage(message);
      return expectedSignature === signature;
    } catch (error) {
      return false;
    }
  }

  /**
   * Base64 URL-safe encoding
   */
  base64UrlEncode(data) {
    if (typeof data === 'string') {
      data = new TextEncoder().encode(data);
    }
    
    // Convert Uint8Array to regular array for btoa
    const bytes = Array.from(data);
    const base64 = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    return base64;
  }

  /**
   * Base64 URL-safe decoding
   */
  base64UrlDecode(encoded) {
    // Add padding if needed
    let padded = encoded;
    while (padded.length % 4) {
      padded += '=';
    }
    
    // Convert URL-safe characters back
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    
    try {
      return atob(base64);
    } catch (error) {
      throw new Error('Invalid base64 encoding');
    }
  }

  /**
   * Generate secure API key for backward compatibility
   */
  generateApiKey() {
    return crypto.randomUUID();
  }

  /**
   * Create middleware for JWT authentication
   */
  createAuthMiddleware() {
    return async (c, next) => {
      const authHeader = c.req.header('Authorization');
      
      if (!authHeader) {
        return next(); // Allow unauthenticated requests
      }

      try {
        // Support both "Bearer token" and "token" formats
        const token = authHeader.startsWith('Bearer ') 
          ? authHeader.slice(7) 
          : authHeader;

        const user = await this.extractUser(token);
        c.set('user', user);
        c.set('authenticated', true);
      } catch (error) {
        console.error('JWT authentication error:', error);
        c.set('authenticated', false);
        c.set('auth_error', error.message);
      }

      return next();
    };
  }

  /**
   * Validate token format (basic check)
   */
  isValidTokenFormat(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    return parts.length === 3;
  }

  /**
   * Get token expiration time
   */
  async getTokenExpiration(token) {
    try {
      const payload = await this.decodeToken(token);
      return new Date(payload.exp * 1000);
    } catch (error) {
      throw new Error(`Failed to get token expiration: ${error.message}`);
    }
  }
}

export default JWTService;