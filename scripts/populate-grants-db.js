#!/usr/bin/env node
// VoidCat Grant Automation Platform - CLI Database Population Tool
// Populates D1 grants database via local wrangler or production API
// NO SIMULATIONS LAW: Real API calls to federal sources only

import https from 'https';
import http from 'http';

const API_BASE = process.env.API_URL || 'https://grant-search-api.sorrowscry86.workers.dev';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''; // Optional authentication

/**
 * Make HTTP request to admin API
 */
function makeRequest(path, method = 'POST', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(ADMIN_TOKEN ? { 'Authorization': `Bearer ${ADMIN_TOKEN}` } : {})
      }
    };
    
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data, status: res.statusCode });
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

/**
 * Initialize database schema
 */
async function initSchema() {
  console.log('📋 Initializing grants database schema...');
  
  try {
    const result = await makeRequest('/api/admin/grants/init-schema', 'POST');
    
    if (result.success) {
      console.log('✅ Schema initialized successfully');
      return true;
    } else {
      console.error('❌ Schema initialization failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Schema initialization error:', error.message);
    return false;
  }
}

/**
 * Ingest grants from all sources
 */
async function ingestGrants(options = {}) {
  const { sources, query, forceRefresh } = options;
  
  console.log('🚀 Starting grant data ingestion...');
  console.log(`   Sources: ${sources?.join(', ') || 'all'}`);
  console.log(`   Query: ${query || 'default queries'}`);
  console.log(`   Force Refresh: ${forceRefresh || false}`);
  console.log('');
  
  try {
    const result = await makeRequest('/api/admin/grants/ingest', 'POST', {
      sources,
      query,
      forceRefresh
    });
    
    if (result.success) {
      console.log('✅ Ingestion completed successfully\n');
      console.log('📊 Summary:');
      console.log(`   Total Fetched: ${result.ingestion_summary.totals.fetched}`);
      console.log(`   Inserted: ${result.ingestion_summary.totals.inserted}`);
      console.log(`   Updated: ${result.ingestion_summary.totals.updated}`);
      console.log(`   Skipped: ${result.ingestion_summary.totals.skipped}`);
      console.log(`   Failed: ${result.ingestion_summary.totals.failed}`);
      console.log('');
      
      // Per-source breakdown
      console.log('📁 By Source:');
      for (const [source, stats] of Object.entries(result.ingestion_summary.sources)) {
        console.log(`   ${source}:`);
        console.log(`     Fetched: ${stats.grants_fetched || 0}`);
        console.log(`     Inserted: ${stats.grants_inserted || 0}`);
        console.log(`     Updated: ${stats.grants_updated || 0}`);
        console.log(`     Status: ${stats.status}`);
      }
      
      return true;
    } else {
      console.error('❌ Ingestion failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Ingestion error:', error.message);
    return false;
  }
}

/**
 * Get ingestion statistics
 */
async function getStats() {
  console.log('📈 Fetching ingestion statistics...\n');
  
  try {
    const result = await makeRequest('/api/admin/grants/ingestion-stats', 'GET');
    
    if (result.success) {
      console.log('📊 Current Database Status:');
      console.log(`   Total Grants: ${result.total_grants}`);
      console.log('');
      
      console.log('📁 Grants by Source:');
      for (const { source, count } of result.grants_by_source) {
        console.log(`   ${source}: ${count}`);
      }
      console.log('');
      
      console.log('🕐 Recent Ingestions:');
      for (const log of result.recent_ingestions.slice(0, 5)) {
        console.log(`   ${log.started_at} - ${log.source}`);
        console.log(`     Status: ${log.status}`);
        console.log(`     Fetched: ${log.grants_fetched || 0}, Inserted: ${log.grants_inserted || 0}`);
      }
      
      return true;
    } else {
      console.error('❌ Stats retrieval failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Stats error:', error.message);
    return false;
  }
}

/**
 * Clean up stale grants
 */
async function cleanup(daysOld = 180) {
  console.log(`🧹 Cleaning up grants older than ${daysOld} days...`);
  
  try {
    const result = await makeRequest('/api/admin/grants/cleanup', 'POST', { daysOld });
    
    if (result.success) {
      console.log(`✅ Removed ${result.grants_removed} stale grants`);
      return true;
    } else {
      console.error('❌ Cleanup failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
    return false;
  }
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  console.log('🐱 VoidCat Grant Database Population Tool\n');
  
  switch (command) {
    case 'init':
      await initSchema();
      break;
      
    case 'ingest':
      const sources = args.includes('--sources') 
        ? args[args.indexOf('--sources') + 1]?.split(',')
        : null;
      
      const query = args.includes('--query')
        ? args[args.indexOf('--query') + 1]
        : null;
      
      const forceRefresh = args.includes('--force');
      
      await ingestGrants({ sources, query, forceRefresh });
      break;
      
    case 'stats':
      await getStats();
      break;
      
    case 'cleanup':
      const days = args.includes('--days')
        ? parseInt(args[args.indexOf('--days') + 1])
        : 180;
      
      await cleanup(days);
      break;
      
    case 'full':
      console.log('🔄 Running full database setup and ingestion...\n');
      
      if (await initSchema()) {
        await ingestGrants({ forceRefresh: true });
      }
      break;
      
    case 'help':
    default:
      console.log('Usage: node populate-grants-db.js [command] [options]\n');
      console.log('Commands:');
      console.log('  init                 Initialize database schema');
      console.log('  ingest               Ingest grant data from federal sources');
      console.log('    --sources <list>   Comma-separated sources (grants.gov,sbir.gov,nsf.gov)');
      console.log('    --query <term>     Search query (default: broad queries)');
      console.log('    --force            Force refresh even for fresh data');
      console.log('  stats                Show ingestion statistics');
      console.log('  cleanup              Remove stale grants');
      console.log('    --days <number>    Age threshold in days (default: 180)');
      console.log('  full                 Initialize schema + full ingestion');
      console.log('  help                 Show this help message\n');
      console.log('Environment Variables:');
      console.log('  API_URL              Admin API base URL (default: production)');
      console.log('  ADMIN_TOKEN          Optional authentication token\n');
      console.log('Examples:');
      console.log('  node populate-grants-db.js init');
      console.log('  node populate-grants-db.js ingest --query "artificial intelligence"');
      console.log('  node populate-grants-db.js ingest --sources grants.gov,nsf.gov --force');
      console.log('  node populate-grants-db.js stats');
      console.log('  node populate-grants-db.js cleanup --days 90');
      console.log('  node populate-grants-db.js full');
      break;
  }
}

// Run CLI
main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
