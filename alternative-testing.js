#!/usr/bin/env node

/**
 * Alternative Testing Suite for VoidCat Grant Automation Platform
 * 
 * This script provides comprehensive testing without relying on Playwright browser downloads
 * when they're not available. It tests all critical functionality including API endpoints,
 * frontend components, and integration flows.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const CONFIG = {
  API_BASE_URL: 'https://grant-search-api.sorrowscry86.workers.dev',
  LOCAL_API_PORT: 8787,
  FRONTEND_PORT: 8080,
  TIMEOUT: 10000,
  RETRY_COUNT: 3
};

// Test Results Tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility Functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      timeout: CONFIG.TIMEOUT,
      ...options
    };

    const client = url.startsWith('https:') ? https : http;
    
    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: jsonData, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function runTest(testName, testFunction) {
  testResults.total++;
  try {
    log(`Running: ${testName}`);
    await testFunction();
    testResults.passed++;
    testResults.details.push({ name: testName, status: 'PASSED' });
    log(`✅ PASSED: ${testName}`, 'success');
  } catch (error) {
    testResults.failed++;
    testResults.details.push({ name: testName, status: 'FAILED', error: error.message });
    log(`❌ FAILED: ${testName} - ${error.message}`, 'error');
  }
}

// Test Suite
async function testAPIHealth() {
  const response = await makeRequest(`${CONFIG.API_BASE_URL}/health`);
  if (response.status !== 200) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  if (!response.data || response.data.status !== 'healthy') {
    throw new Error('Health check returned invalid response');
  }
}

async function testGrantSearch() {
  const response = await makeRequest(`${CONFIG.API_BASE_URL}/api/grants/search?query=AI`);
  if (response.status !== 200) {
    throw new Error(`Grant search failed with status ${response.status}`);
  }
  if (!response.data || !response.data.success) {
    throw new Error('Grant search returned failure response');
  }
  if (!Array.isArray(response.data.grants) || response.data.grants.length === 0) {
    throw new Error('Grant search returned no grants');
  }
}

async function testGrantDetails() {
  const response = await makeRequest(`${CONFIG.API_BASE_URL}/api/grants/SBIR-25-001`);
  if (response.status !== 200) {
    throw new Error(`Grant details failed with status ${response.status}`);
  }
  if (!response.data || !response.data.success) {
    throw new Error('Grant details returned failure response');
  }
}

async function testUserRegistration() {
  const testUser = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    company: 'Test Company'
  };

  const response = await makeRequest(`${CONFIG.API_BASE_URL}/api/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: testUser
  });

  if (response.status !== 200) {
    throw new Error(`User registration failed with status ${response.status}`);
  }
  if (!response.data || !response.data.success) {
    throw new Error('User registration returned failure response');
  }
  if (!response.data.api_key) {
    throw new Error('User registration did not return API key');
  }
}

async function testFrontendAccessibility() {
  // Start a local frontend server for testing
  return new Promise((resolve, reject) => {
    const server = spawn('python3', ['-m', 'http.server', CONFIG.FRONTEND_PORT.toString()], {
      cwd: path.join(__dirname, 'frontend'),
      stdio: 'pipe'
    });

    setTimeout(async () => {
      try {
        const response = await makeRequest(`http://localhost:${CONFIG.FRONTEND_PORT}/`);
        if (response.status !== 200) {
          throw new Error(`Frontend not accessible: status ${response.status}`);
        }
        if (!response.raw || !response.raw.includes('VoidCat RDC')) {
          throw new Error('Frontend content invalid');
        }
        server.kill();
        resolve();
      } catch (error) {
        server.kill();
        reject(error);
      }
    }, 2000);
  });
}

async function testAPIEndpoints() {
  const endpoints = [
    { path: '/health', expectedStatus: 200 },
    { path: '/api/grants/search', expectedStatus: 200 },
    { path: '/api/grants/SBIR-25-001', expectedStatus: 200 }
  ];

  for (const endpoint of endpoints) {
    const response = await makeRequest(`${CONFIG.API_BASE_URL}${endpoint.path}`);
    if (response.status !== endpoint.expectedStatus) {
      throw new Error(`Endpoint ${endpoint.path} returned status ${response.status}, expected ${endpoint.expectedStatus}`);
    }
  }
}

async function testCORSHeaders() {
  const response = await makeRequest(`${CONFIG.API_BASE_URL}/health`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://sorrowscry86.github.io',
      'Access-Control-Request-Method': 'GET'
    }
  });

  if (response.status !== 200 && response.status !== 204) {
    throw new Error(`CORS preflight failed with status ${response.status}`);
  }
}

async function testErrorHandling() {
  // Test non-existent endpoint
  const response = await makeRequest(`${CONFIG.API_BASE_URL}/api/nonexistent`);
  if (response.status === 200) {
    throw new Error('Non-existent endpoint should not return 200');
  }
}

async function validateFrontendStaticFiles() {
  const frontendDir = path.join(__dirname, 'frontend');
  const requiredFiles = ['index.html', 'privacy-policy.html', 'terms-of-service.html'];
  
  for (const file of requiredFiles) {
    const filePath = path.join(frontendDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Required frontend file missing: ${file}`);
    }
  }
  
  // Validate main HTML file structure
  const indexContent = fs.readFileSync(path.join(frontendDir, 'index.html'), 'utf8');
  if (!indexContent.includes('VoidCat RDC')) {
    throw new Error('Frontend index.html missing expected content');
  }
  if (!indexContent.includes('grantApp()')) {
    throw new Error('Frontend index.html missing Alpine.js app');
  }
}

async function testAPIResponseTimes() {
  const startTime = Date.now();
  await makeRequest(`${CONFIG.API_BASE_URL}/health`);
  const responseTime = Date.now() - startTime;
  
  if (responseTime > 2000) {
    throw new Error(`API response time too slow: ${responseTime}ms`);
  }
}

// Main Test Runner
async function runAllTests() {
  log('🚀 Starting VoidCat Grant Automation Platform Test Suite');
  log(`API Base URL: ${CONFIG.API_BASE_URL}`);
  
  // Core API Tests
  await runTest('API Health Check', testAPIHealth);
  await runTest('Grant Search Functionality', testGrantSearch);
  await runTest('Grant Details Retrieval', testGrantDetails);
  await runTest('User Registration', testUserRegistration);
  await runTest('API Endpoints Accessibility', testAPIEndpoints);
  await runTest('CORS Configuration', testCORSHeaders);
  await runTest('Error Handling', testErrorHandling);
  await runTest('API Response Times', testAPIResponseTimes);
  
  // Frontend Tests
  await runTest('Frontend Static Files Validation', validateFrontendStaticFiles);
  await runTest('Frontend Accessibility', testFrontendAccessibility);
  
  // Results Summary
  log('\n📊 TEST RESULTS SUMMARY');
  log(`Total Tests: ${testResults.total}`);
  log(`Passed: ${testResults.passed}`, 'success');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'success');
  log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    log('\n❌ FAILED TESTS:');
    testResults.details
      .filter(test => test.status === 'FAILED')
      .forEach(test => log(`  - ${test.name}: ${test.error}`));
  }
  
  // Return exit code based on results
  return testResults.failed === 0 ? 0 : 1;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      log(`Fatal error: ${error.message}`, 'error');
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testResults,
  CONFIG
};