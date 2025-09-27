// VoidCat RDC Grant Search API Worker - MODULAR VERSION
// Deploy as: grant-search-api

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Stripe from 'stripe';

// Import services
import TelemetryService from './services/telemetryService.js';
import ConfigService from './services/configService.js';

// Import routes
import healthRoutes from './routes/health.js';
import grantsRoutes from './routes/grants.js';
import usersRoutes from './routes/users.js';

// Initialize Hono app
const app = new Hono();

// CORS middleware - Use configurable origins
app.use('*', async (c, next) => {
  const configService = new ConfigService(c.env);
  const appConfig = configService.getAppConfig();
  
  return cors({
    origin: appConfig.CORS_ORIGINS,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })(c, next);
});

// Telemetry middleware for request/response logging and metrics
app.use('*', async (c, next) => {
  const telemetryService = new TelemetryService(c.env);
  await telemetryService.createMiddleware()(c, next);
});

// Mount route handlers
app.route('/health', healthRoutes);
app.route('/api/grants', grantsRoutes);
app.route('/api/users', usersRoutes);

// Stripe endpoints (keeping in main file for now as they require complex setup)
app.post('/api/stripe/create-checkout', async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email) {
      return c.json({ 
        success: false, 
        error: 'Email is required for checkout',
        code: 'MISSING_EMAIL'
      }, 400);
    }

    // Get Stripe configuration using ConfigService
    const configService = new ConfigService(c.env);
    const stripeConfig = configService.getStripeConfig();
    const appConfig = configService.getAppConfig();

    if (!stripeConfig.SECRET_KEY) {
      console.error('Stripe secret key not configured');
      return c.json({ 
        success: false, 
        error: 'Payment system is currently unavailable. Please contact support if this issue persists.',
        code: 'STRIPE_CONFIG_ERROR'
      }, 503);
    }

    if (!stripeConfig.PRICE_ID) {
      console.error('Stripe price ID not configured');
      return c.json({ 
        success: false, 
        error: 'Payment system configuration error. Please contact support.',
        code: 'STRIPE_PRICE_CONFIG_ERROR'
      }, 503);
    }

    const stripe = new Stripe(stripeConfig.SECRET_KEY, { apiVersion: stripeConfig.API_VERSION });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: stripeConfig.PRICE_ID,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${c.req.header('origin') || appConfig.CORS_ORIGINS[0]}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: c.req.header('origin') || appConfig.CORS_ORIGINS[0],
      customer_email: email,
      metadata: {
        source: 'voidcat-grant-automation'
      }
    });

    return c.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('Stripe checkout creation failed:', error);
    return c.json({ 
      success: false, 
      error: 'Unable to create checkout session. Please try again.',
      code: 'CHECKOUT_CREATION_ERROR'
    }, 500);
  }
});

app.post('/api/stripe/webhook', async (c) => {
  try {
    const sig = c.req.header('stripe-signature');
    
    // Get Stripe configuration using ConfigService
    const configService = new ConfigService(c.env);
    const stripeConfig = configService.getStripeConfig();

    if (!stripeConfig.WEBHOOK_SECRET) {
      console.error('Stripe webhook secret not configured');
      return c.json({ 
        success: false, 
        error: 'Webhook authentication error',
        code: 'WEBHOOK_CONFIG_ERROR'
      }, 400);
    }

    if (!stripeConfig.SECRET_KEY) {
      return c.json({ success: false, error: 'Stripe not configured' }, 500);
    }

    const stripe = new Stripe(stripeConfig.SECRET_KEY, { apiVersion: stripeConfig.API_VERSION });
    const body = await c.req.text();

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, stripeConfig.WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return c.json({ success: false, error: 'Invalid signature' }, 400);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Checkout session completed:', event.data.object.id);
        // TODO: Update user subscription tier in database
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return c.json({ success: true, received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return c.json({ success: false, error: 'Webhook processing failed' }, 500);
  }
});

// Root endpoint - API information
app.get('/', async (c) => {
  const configService = new ConfigService(c.env);
  const appConfig = configService.getAppConfig();
  
  return c.json({
    service: appConfig.SERVICE_NAME,
    version: appConfig.VERSION,
    environment: appConfig.ENVIRONMENT,
    description: 'Federal grant search and proposal automation platform',
    endpoints: [
      'GET /health',
      'GET /health/detailed',
      'GET /api/grants/search',
      'GET /api/grants/:id',
      'GET /api/grants/stats',
      'POST /api/users/register',
      'GET /api/users/me',
      'POST /api/grants/generate-proposal',
      'POST /api/stripe/create-checkout',
      'POST /api/stripe/webhook'
    ],
    documentation: 'https://github.com/sorrowscry86/voidcat-grant-automation',
    timestamp: new Date().toISOString()
  });
});

export default app;