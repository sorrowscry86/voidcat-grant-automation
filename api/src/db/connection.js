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
 * Initialize database schema (for development/testing)
 * @param {Object} db - Database instance
 * @returns {Promise<boolean>} Initialization success
 */
export async function initializeSchema(db) {
  try {
    // Create users table
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        api_key TEXT UNIQUE NOT NULL,
        subscription_tier TEXT DEFAULT 'free',
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    console.log('Database schema initialized successfully');
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