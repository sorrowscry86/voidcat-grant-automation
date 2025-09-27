// Database connection utilities for VoidCat Grant Automation Platform

/**
 * Get database connection from environment
 * @param {Object} env - Worker environment
 * @returns {Object} D1 database instance
 */
export async function getDB(env) {
  return env.VOIDCAT_DB;
}

/**
 * Test database connection
 * @param {Object} db - Database instance
 * @returns {Promise<boolean>} Connection status
 */
export async function testConnection(db) {
  try {
    await db.prepare('SELECT 1').first();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Initialize database schema with Tier 4 enhancements
 * @param {Object} db - Database instance  
 * @returns {Promise<boolean>} Initialization success
 */
export async function initializeSchema(db) {
  try {
    // Create enhanced users table with password auth support
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        company TEXT,
        api_key TEXT UNIQUE NOT NULL,
        password_hash TEXT, -- New: Support for password authentication
        password_reset_token TEXT, -- New: Password reset functionality
        password_reset_expires DATETIME, -- New: Reset token expiration
        subscription_tier TEXT DEFAULT 'free',
        usage_count INTEGER DEFAULT 0,
        last_login_at DATETIME, -- New: Track login activity
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Create metrics table for dashboard analytics
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL, -- 'user_registration', 'grant_search', 'proposal_generation', etc.
        user_id TEXT, -- User identifier (email or ID)
        data JSON, -- Metric-specific data
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        date TEXT -- Date string for easy grouping (YYYY-MM-DD)
      )
    `).run();

    // Create refresh tokens table for JWT management
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `).run();

    // Create API usage logs for rate limiting and analytics
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS api_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        status_code INTEGER,
        response_time_ms INTEGER,
        ip_address TEXT,
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Add indexes for better performance
    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `).run();

    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key)
    `).run();

    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_metrics_type_date ON metrics(type, date)
    `).run();

    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_metrics_user_id ON metrics(user_id)
    `).run();

    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)
    `).run();

    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint)
    `).run();

    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON api_logs(timestamp)
    `).run();

    console.log('Enhanced database schema initialized successfully (Tier 4)');
    return true;
  } catch (error) {
    console.error('Database schema initialization failed:', error);
    return false;
  }
}

export default {
  getDB,
  testConnection,
  initializeSchema
};