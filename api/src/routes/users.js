// User management endpoints for VoidCat Grant Automation Platform

import { Hono } from 'hono';
import EmailService from '../services/emailService.js';
import { getDB, initializeSchema } from '../db/connection.js';

const users = new Hono();

// Database initialization flag to prevent multiple schema initializations
let schemaInitialized = false;

// User registration endpoint
users.post('/register', async (c) => {
  try {
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
    
    const { email, company, name } = requestData;
    
    // Comprehensive input validation
    if (!email || !name) {
      return c.json({
        success: false,
        error: 'Email and name are required fields',
        code: 'MISSING_REQUIRED_FIELDS'
      }, 400);
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({
        success: false,
        error: 'Please provide a valid email address',
        code: 'INVALID_EMAIL_FORMAT'
      }, 400);
    }
    
    // Name length validation
    if (name.trim().length < 2 || name.trim().length > 100) {
      return c.json({
        success: false,
        error: 'Name must be between 2 and 100 characters',
        code: 'INVALID_NAME_LENGTH'
      }, 400);
    }
    
    // Generate API key with safe fallback
    const apiKey = (() => { try { return crypto.randomUUID(); } catch { return `key_${Math.random().toString(36).slice(2)}_${Date.now()}`; } })();
    
    try {
      const db = await getDB(c.env);
      
      // Initialize database schema if not already done
      if (!schemaInitialized) {
        console.log('Initializing database schema...');
        const initResult = await initializeSchema(db);
        if (initResult) {
          schemaInitialized = true;
          console.log('Database schema initialized successfully');
        } else {
          console.warn('Database schema initialization failed, proceeding anyway');
        }
      }
      
      // Check if user already exists
      const existingUser = await db.prepare(`
        SELECT email FROM users WHERE email = ?
      `).bind(email).first();
      
      if (existingUser) {
        return c.json({
          success: false,
          error: 'User already exists',
          message: 'An account with this email already exists'
        }, 409);
      }
      
      const result = await db.prepare(`
        INSERT INTO users (email, name, company, api_key, subscription_tier, created_at)
        VALUES (?, ?, ?, ?, 'free', CURRENT_TIMESTAMP)
      `).bind(email, name, company || null, apiKey).run();

      if (result.success) {
        console.log(`User registered successfully: ${email}`);
        
        // Send welcome email asynchronously (don't block registration response)
        c.executionCtx.waitUntil((async () => {
          try {
            const emailService = new EmailService(c.env);
            const emailData = emailService.generateRegistrationEmail({
              name: name,
              email: email,
              apiKey: apiKey
            });
            
            const emailResult = await emailService.sendEmail(emailData);
            const telemetry = c.get('telemetry');
            
            if (emailResult.success) {
              console.log(`Welcome email sent successfully to: ${email}`);
              if (telemetry) {
                telemetry.trackEmailDelivery(email, 'registration', true, emailResult.provider);
              }
            } else {
              console.error(`Failed to send welcome email to ${email}:`, emailResult.error);
              if (telemetry) {
                telemetry.trackEmailDelivery(email, 'registration', false, emailResult.provider);
              }
            }
          } catch (emailError) {
            console.error(`Error sending welcome email to ${email}:`, emailError.message);
            const telemetry = c.get('telemetry');
            if (telemetry) {
              telemetry.trackEmailDelivery(email, 'registration', false, 'unknown');
            }
          }
        })());

        // Track successful registration
        const telemetry = c.get('telemetry');
        if (telemetry) {
          telemetry.trackUserRegistration(email, true, 'free');
        }

        return c.json({
          success: true,
          message: 'User registered successfully',
          api_key: apiKey,
          subscription_tier: 'free'
        });
      } else {
        console.error('Database insertion failed:', result);
        throw new Error(`Database insertion failed: ${result.error || 'Unknown error'}`);
      }
    } catch (dbError) {
      console.error('Database error during registration:', {
        error: dbError.message,
        email: email,
        timestamp: new Date().toISOString()
      });
      
      // For production, return proper error instead of demo mode
      if (c.env.ENVIRONMENT === 'production') {
        return c.json({
          success: false,
          error: 'Registration service is temporarily unavailable. Please try again in a few minutes.',
          message: 'If this problem persists, please contact support',
          code: 'REGISTRATION_SERVICE_ERROR'
        }, 503);
      }
      
      // Demo mode fallback only for development
      console.warn('Using demo mode fallback - this should not happen in production');
      return c.json({
        success: true,
        message: 'User registered successfully (demo mode)',
        api_key: apiKey,
        subscription_tier: 'free',
        demo_mode: true
      });
    }

  } catch (error) {
    console.error('Registration endpoint error:', error);
    return c.json({
      success: false,
      error: 'Registration service encountered an unexpected error. Please try again.',
      code: 'REGISTRATION_UNEXPECTED_ERROR'
    }, 500);
  }
});

// User authentication check
users.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: 'Authentication required. Please provide a valid API key.',
        code: 'AUTH_REQUIRED'
      }, 401);
    }

    const apiKey = authHeader.replace('Bearer ', '');
    
    try {
      const db = await getDB(c.env);
      const user = await db.prepare(`
        SELECT id, email, subscription_tier, usage_count, created_at 
        FROM users WHERE api_key = ?
      `).bind(apiKey).first();

      if (!user) {
        return c.json({ 
          success: false, 
          error: 'Invalid API key. Please check your authentication credentials.',
          code: 'INVALID_API_KEY'
        }, 401);
      }

      // Return user information
      return c.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          subscription_tier: user.subscription_tier,
          usage_count: user.usage_count || 0,
          created_at: user.created_at
        }
      });

    } catch (dbError) {
      console.error('Database error during authentication:', {
        error: dbError.message,
        timestamp: new Date().toISOString()
      });
      
      // For production, return proper error instead of demo mode
      if (c.env.ENVIRONMENT === 'production') {
        return c.json({
          success: false,
          error: 'Authentication service is temporarily unavailable. Please try again in a few minutes.',
          message: 'If this problem persists, please contact support',
          code: 'AUTH_SERVICE_UNAVAILABLE'
        }, 503);
      }
      
      // Demo mode fallback only for development
      console.warn('Using demo mode fallback for authentication');
      return c.json({
        success: true,
        user: {
          id: 1,
          email: 'demo@voidcat.com',
          subscription_tier: 'free',
          usage_count: 0,
          created_at: new Date().toISOString()
        },
        demo_mode: true
      });
    }

  } catch (error) {
    console.error('Authentication endpoint error:', error);
    return c.json({
      success: false,
      error: 'Authentication service encountered an unexpected error. Please try again.',
      code: 'AUTH_UNEXPECTED_ERROR'
    }, 500);
  }
});

export default users;