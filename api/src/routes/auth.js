// Advanced Authentication Routes - Tier 4.2
// JWT and password-based authentication endpoints
import { Hono } from 'hono';
import JWTService from '../services/jwtService.js';
import PasswordService from '../services/passwordService.js';
import EmailService from '../services/emailService.js';
import MetricsService from '../services/metricsService.js';
import { validateInput, createResponse } from '../util/response.js';
import { getDB } from '../db/connection.js';

const auth = new Hono();

// Initialize services
const initServices = (env) => ({
  jwt: new JWTService(env),
  password: new PasswordService(env),
  email: new EmailService(env),
  metrics: new MetricsService(env)
});

/**
 * Login with email and password
 * POST /api/auth/login
 */
auth.post('/login', async (c) => {
  try {
    const { jwt, password: passwordService, metrics } = initServices(c.env);
    const requestData = await c.req.json();
    
    // Validate input
    const validation = validateInput(requestData, {
      email: { required: true, type: 'email' },
      password: { required: true, type: 'string', minLength: 1 }
    });
    
    if (!validation.valid) {
      return createResponse(c, false, validation.error, 400, 'VALIDATION_ERROR');
    }
    
    const { email, password } = requestData;
    
    const db = await getDB(c.env);
    
    // Find user by email
    const user = await db.prepare(`
      SELECT * FROM users WHERE email = ?
    `).bind(email).first();
    
    if (!user) {
      // Track failed login attempt
      await metrics.recordLoginAttempt(email, false, 'user_not_found');
      return createResponse(c, false, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }
    
    // Check if user has a password set
    if (!user.password_hash) {
      return createResponse(c, false, 'Please use API key authentication or set a password', 400, 'NO_PASSWORD_SET');
    }
    
    // Verify password
    const passwordValid = await passwordService.verifyPassword(password, user.password_hash);
    
    if (!passwordValid) {
      await metrics.recordLoginAttempt(email, false, 'invalid_password');
      return createResponse(c, false, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }
    
    // Generate JWT tokens
    const tokens = await jwt.generateTokens(user);
    
    // Update last login timestamp
    await db.prepare(`
      UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(user.id).run();
    
    // Record successful login
    await metrics.recordLoginAttempt(email, true, 'password');
    
    return createResponse(c, true, 'Login successful', 200, null, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscription_tier: user.subscription_tier,
        created_at: user.created_at
      },
      ...tokens
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return createResponse(c, false, 'Login failed. Please try again.', 500, 'LOGIN_ERROR');
  }
});

/**
 * Register with email and password
 * POST /api/auth/register
 */
auth.post('/register', async (c) => {
  try {
    const { jwt, password: passwordService, email: emailService, metrics } = initServices(c.env);
    const requestData = await c.req.json();
    
    // Validate input
    const validation = validateInput(requestData, {
      email: { required: true, type: 'email' },
      password: { required: true, type: 'string', minLength: 8 },
      name: { required: true, type: 'string', minLength: 2, maxLength: 100 }
    });
    
    if (!validation.valid) {
      return createResponse(c, false, validation.error, 400, 'VALIDATION_ERROR');
    }
    
    const { email, password, name, company } = requestData;
    
    try {
      // Validate password strength
      passwordService.validatePasswordStrength(password);
    } catch (error) {
      return createResponse(c, false, error.message, 400, 'WEAK_PASSWORD');
    }
    
    const db = await getDB(c.env);
    
    // Check if user already exists
    const existingUser = await db.prepare(`
      SELECT email FROM users WHERE email = ?
    `).bind(email).first();
    
    if (existingUser) {
      return createResponse(c, false, 'User already exists', 409, 'USER_EXISTS');
    }
    
    // Hash password
    const passwordHash = await passwordService.hashPassword(password);
    
    // Generate API key for backward compatibility
    const apiKey = jwt.generateApiKey();
    
    // Create user
    const result = await db.prepare(`
      INSERT INTO users (email, name, company, api_key, password_hash, subscription_tier, created_at)
      VALUES (?, ?, ?, ?, ?, 'free', CURRENT_TIMESTAMP)
    `).bind(email, name, company || null, apiKey, passwordHash).run();
    
    if (result.success) {
      const user = {
        id: result.meta.last_row_id,
        email,
        name,
        subscription_tier: 'free',
        created_at: new Date().toISOString()
      };
      
      // Generate JWT tokens
      const tokens = await jwt.generateTokens(user);
      
      // Send welcome email asynchronously
      c.executionCtx.waitUntil((async () => {
        try {
          const emailData = emailService.generateRegistrationEmail({
            name,
            email,
            apiKey,
            hasPassword: true
          });
          
          const emailResult = await emailService.sendEmail(emailData);
          await metrics.recordEmailDelivery(email, 'registration', emailResult.success, emailResult.provider);
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          await metrics.recordEmailDelivery(email, 'registration', false, null);
        }
      })());
      
      // Record user registration
      await metrics.recordUserRegistration(email, 'free', 'password_registration');
      
      return createResponse(c, true, 'Registration successful', 201, null, {
        user,
        api_key: apiKey, // For backward compatibility
        ...tokens
      });
    } else {
      return createResponse(c, false, 'Registration failed', 500, 'REGISTRATION_ERROR');
    }
    
  } catch (error) {
    console.error('Registration error:', error);
    return createResponse(c, false, 'Registration failed. Please try again.', 500, 'REGISTRATION_ERROR');
  }
});

/**
 * Refresh JWT access token
 * POST /api/auth/refresh
 */
auth.post('/refresh', async (c) => {
  try {
    const { jwt } = initServices(c.env);
    const requestData = await c.req.json();
    
    if (!requestData.refresh_token) {
      return createResponse(c, false, 'Refresh token is required', 400, 'MISSING_REFRESH_TOKEN');
    }
    
    const newTokens = await jwt.refreshAccessToken(requestData.refresh_token);
    
    return createResponse(c, true, 'Token refreshed successfully', 200, null, newTokens);
    
  } catch (error) {
    console.error('Token refresh error:', error);
    return createResponse(c, false, 'Failed to refresh token', 401, 'REFRESH_ERROR');
  }
});

/**
 * Set password for existing API key user
 * POST /api/auth/set-password
 */
auth.post('/set-password', async (c) => {
  try {
    const { password: passwordService } = initServices(c.env);
    const requestData = await c.req.json();
    
    // Validate input
    const validation = validateInput(requestData, {
      api_key: { required: true, type: 'string' },
      password: { required: true, type: 'string', minLength: 8 }
    });
    
    if (!validation.valid) {
      return createResponse(c, false, validation.error, 400, 'VALIDATION_ERROR');
    }
    
    const { api_key, password } = requestData;
    
    try {
      // Validate password strength
      passwordService.validatePasswordStrength(password);
    } catch (error) {
      return createResponse(c, false, error.message, 400, 'WEAK_PASSWORD');
    }
    
    const db = await getDB(c.env);
    
    // Find user by API key
    const user = await db.prepare(`
      SELECT * FROM users WHERE api_key = ?
    `).bind(api_key).first();
    
    if (!user) {
      return createResponse(c, false, 'Invalid API key', 401, 'INVALID_API_KEY');
    }
    
    // Hash new password
    const passwordHash = await passwordService.hashPassword(password);
    
    // Update user with password hash
    const result = await db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(passwordHash, user.id).run();
    
    if (result.success) {
      return createResponse(c, true, 'Password set successfully. You can now login with email and password.', 200);
    } else {
      return createResponse(c, false, 'Failed to set password', 500, 'PASSWORD_SET_ERROR');
    }
    
  } catch (error) {
    console.error('Set password error:', error);
    return createResponse(c, false, 'Failed to set password. Please try again.', 500, 'PASSWORD_SET_ERROR');
  }
});

/**
 * Request password reset
 * POST /api/auth/reset-password
 */
auth.post('/reset-password', async (c) => {
  try {
    const { password: passwordService, email: emailService, metrics } = initServices(c.env);
    const requestData = await c.req.json();
    
    if (!requestData.email) {
      return createResponse(c, false, 'Email is required', 400, 'MISSING_EMAIL');
    }
    
    const { email } = requestData;
    const db = await getDB(c.env);
    
    // Find user (don't reveal if user exists or not for security)
    const user = await db.prepare(`
      SELECT * FROM users WHERE email = ?
    `).bind(email).first();
    
    if (user) {
      // Generate reset token
      const resetToken = await passwordService.generatePasswordResetToken(email);
      
      // Store reset token in database (expires in 1 hour)
      await db.prepare(`
        UPDATE users SET 
          password_reset_token = ?, 
          password_reset_expires = datetime('now', '+1 hour'),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(resetToken, user.id).run();
      
      // Send reset email asynchronously
      c.executionCtx.waitUntil((async () => {
        try {
          const emailData = {
            to: email,
            subject: 'Password Reset - VoidCat Grant Automation',
            html: `
              <h2>Password Reset Request</h2>
              <p>Hello ${user.name},</p>
              <p>You requested a password reset for your VoidCat Grant Automation account.</p>
              <p>Use this reset token: <code>${resetToken}</code></p>
              <p>This token expires in 1 hour.</p>
              <p>If you didn't request this reset, please ignore this email.</p>
            `,
            text: `Password Reset Request\n\nHello ${user.name},\n\nYou requested a password reset for your VoidCat Grant Automation account.\n\nUse this reset token: ${resetToken}\n\nThis token expires in 1 hour.\n\nIf you didn't request this reset, please ignore this email.`
          };
          
          const emailResult = await emailService.sendEmail(emailData);
          await metrics.recordEmailDelivery(email, 'password_reset', emailResult.success, emailResult.provider);
        } catch (emailError) {
          console.error('Failed to send reset email:', emailError);
          await metrics.recordEmailDelivery(email, 'password_reset', false, null);
        }
      })());
    }
    
    // Always return success (don't reveal if user exists)
    return createResponse(c, true, 'If an account with that email exists, a reset token has been sent.', 200);
    
  } catch (error) {
    console.error('Password reset error:', error);
    return createResponse(c, false, 'Failed to process password reset request', 500, 'RESET_ERROR');
  }
});

/**
 * Confirm password reset with token
 * POST /api/auth/confirm-reset
 */
auth.post('/confirm-reset', async (c) => {
  try {
    const { password: passwordService } = initServices(c.env);
    const requestData = await c.req.json();
    
    // Validate input
    const validation = validateInput(requestData, {
      email: { required: true, type: 'email' },
      token: { required: true, type: 'string' },
      password: { required: true, type: 'string', minLength: 8 }
    });
    
    if (!validation.valid) {
      return createResponse(c, false, validation.error, 400, 'VALIDATION_ERROR');
    }
    
    const { email, token, password } = requestData;
    
    try {
      // Validate password strength
      passwordService.validatePasswordStrength(password);
    } catch (error) {
      return createResponse(c, false, error.message, 400, 'WEAK_PASSWORD');
    }
    
    const db = await getDB(c.env);
    
    // Find user with valid reset token
    const user = await db.prepare(`
      SELECT * FROM users 
      WHERE email = ? 
        AND password_reset_token = ? 
        AND password_reset_expires > datetime('now')
    `).bind(email, token).first();
    
    if (!user) {
      return createResponse(c, false, 'Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
    }
    
    // Hash new password
    const passwordHash = await passwordService.hashPassword(password);
    
    // Update password and clear reset token
    const result = await db.prepare(`
      UPDATE users SET 
        password_hash = ?,
        password_reset_token = NULL,
        password_reset_expires = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(passwordHash, user.id).run();
    
    if (result.success) {
      return createResponse(c, true, 'Password reset successfully. You can now login with your new password.', 200);
    } else {
      return createResponse(c, false, 'Failed to reset password', 500, 'RESET_CONFIRM_ERROR');
    }
    
  } catch (error) {
    console.error('Password reset confirmation error:', error);
    return createResponse(c, false, 'Failed to reset password. Please try again.', 500, 'RESET_CONFIRM_ERROR');
  }
});

/**
 * Logout (invalidate refresh token)
 * POST /api/auth/logout
 */
auth.post('/logout', async (c) => {
  try {
    // In a more sophisticated implementation, you would:
    // 1. Add refresh tokens to a blacklist in KV or database
    // 2. Implement token revocation
    
    // For now, just return success (client should discard tokens)
    return createResponse(c, true, 'Logged out successfully', 200);
    
  } catch (error) {
    console.error('Logout error:', error);
    return createResponse(c, false, 'Logout failed', 500, 'LOGOUT_ERROR');
  }
});

/**
 * Get current user info (supports both JWT and API key)
 * GET /api/auth/me
 */
auth.get('/me', async (c) => {
  try {
    const { jwt } = initServices(c.env);
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return createResponse(c, false, 'Authentication required', 401, 'NO_AUTH_HEADER');
    }
    
    const db = await getDB(c.env);
    let user = null;
    
    // Try JWT authentication first
    try {
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      
      if (jwt.isValidTokenFormat(token)) {
        const tokenPayload = await jwt.verifyToken(token, 'access');
        user = tokenPayload.user;
      } else {
        // Fallback to API key authentication
        const apiKeyUser = await db.prepare(`
          SELECT id, email, name, company, subscription_tier, created_at, updated_at, last_login_at
          FROM users WHERE api_key = ?
        `).bind(token).first();
        
        if (apiKeyUser) {
          user = apiKeyUser;
        }
      }
    } catch (error) {
      // Try API key as fallback
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      const apiKeyUser = await db.prepare(`
        SELECT id, email, name, company, subscription_tier, created_at, updated_at, last_login_at
        FROM users WHERE api_key = ?
      `).bind(token).first();
      
      if (apiKeyUser) {
        user = apiKeyUser;
      }
    }
    
    if (!user) {
      return createResponse(c, false, 'Invalid authentication', 401, 'INVALID_AUTH');
    }
    
    return createResponse(c, true, 'User retrieved successfully', 200, null, { user });
    
  } catch (error) {
    console.error('Get user error:', error);
    return createResponse(c, false, 'Failed to get user information', 500, 'GET_USER_ERROR');
  }
});

export default auth;