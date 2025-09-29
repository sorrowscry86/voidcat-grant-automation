// Health check endpoints for VoidCat Grant Automation Platform

import { Hono } from 'hono';

const health = new Hono();

// Health check endpoint
health.get('/', async (c) => {
  const telemetry = c.get('telemetry');
  
  // Get basic health metrics
  const healthData = {
    status: 'healthy',
    service: 'VoidCat Grant Search API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  };

  // Add telemetry health metrics if available
  if (telemetry) {
    const metrics = telemetry.getHealthMetrics();
    healthData.telemetry = metrics;
  }

  return c.json(healthData);
});

// Detailed health check with component status
health.get('/detailed', async (c) => {
  const telemetry = c.get('telemetry');
  
  const healthData = {
    status: 'healthy',
    service: 'VoidCat Grant Search API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    components: {
      database: 'unknown',
      kv_store: 'unknown',
      email_service: 'unknown',
      live_data_api: 'unknown'
    }
  };

  // Test database connection
  try {
    const db = c.env.VOIDCAT_DB;
    if (db) {
      // Simple query to test connection
      await db.prepare('SELECT 1').first();
      healthData.components.database = 'healthy';
    }
  } catch (error) {
    healthData.components.database = 'unhealthy';
    healthData.status = 'degraded';
  }

  // Test KV store
  try {
    const kv = c.env.OAUTH_KV;
    if (kv) {
      await kv.get('health-check-test');
      healthData.components.kv_store = 'healthy';
    }
  } catch (error) {
    healthData.components.kv_store = 'unhealthy';
  }

  // Email service status (basic check)
  healthData.components.email_service = c.env.MAIL_PROVIDER ? 'configured' : 'not_configured';

  // Live data API status (basic check)
  healthData.components.live_data_api = 'configured'; // Always configured, actual connectivity checked during searches

  if (telemetry) {
    const metrics = telemetry.getHealthMetrics();
    healthData.telemetry = metrics;
  }

  return c.json(healthData);
});

export default health;