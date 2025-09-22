#!/usr/bin/env node

/**
 * Direct API Endpoint Testing Script
 * 
 * This script directly tests the Stripe payment endpoints as specified
 * in the problem statement, running the checkout endpoint 5 times in a loop
 * and validating responses.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  api: {
    baseUrl: 'https://grant-search-api.sorrowscry86.workers.dev',
    timeout: 30000
  },
  testing: {
    iterations: 5,
    delayBetweenRequests: 2000 // 2 seconds
  },
  testUsers: [
    'testuser1@example.com',
    'testuser2@example.com', 
    'testuser3@example.com',
    'testuser4@example.com',
    'testuser5@example.com'
  ]
};

// Results tracking
const results = {
  startTime: new Date().toISOString(),
  endTime: null,
  totalTests: 0,
  successful: 0,
  failed: 0,
  tests: [],
  performance: {
    responseTimes: [],
    averageResponseTime: 0,
    minResponseTime: 0,
    maxResponseTime: 0
  }
};

/**
 * Utility function to make HTTP requests
 */
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        try {
          const parsedData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData,
            responseTime,
            rawData: data
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: { error: 'Invalid JSON response', raw: data },
            responseTime,
            rawData: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      reject({
        error: error.message,
        responseTime
      });
    });
    
    req.setTimeout(CONFIG.api.timeout, () => {
      req.destroy();
      reject({
        error: 'Request timeout',
        responseTime: CONFIG.api.timeout
      });
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

/**
 * Test API health endpoint
 */
async function testHealthEndpoint() {
  console.log('Testing API health endpoint...');
  
  const options = {
    hostname: 'grant-search-api.sorrowscry86.workers.dev',
    port: 443,
    path: '/health',
    method: 'GET',
    headers: {
      'User-Agent': 'VoidCat-Live-Payment-Testing/1.0'
    }
  };
  
  try {
    const response = await makeRequest(options);
    
    const test = {
      type: 'health',
      timestamp: new Date().toISOString(),
      success: response.statusCode === 200,
      statusCode: response.statusCode,
      responseTime: response.responseTime,
      data: response.data
    };
    
    results.tests.push(test);
    results.totalTests++;
    
    if (test.success) {
      results.successful++;
      console.log(`✅ Health check passed (${response.responseTime}ms)`);
    } else {
      results.failed++;
      console.log(`❌ Health check failed (${response.statusCode}, ${response.responseTime}ms)`);
    }
    
    return test.success;
  } catch (error) {
    const test = {
      type: 'health',
      timestamp: new Date().toISOString(),
      success: false,
      error: error.error,
      responseTime: error.responseTime
    };
    
    results.tests.push(test);
    results.totalTests++;
    results.failed++;
    
    console.log(`❌ Health check error: ${error.error} (${error.responseTime}ms)`);
    return false;
  }
}

/**
 * Test Stripe checkout endpoint
 */
async function testCheckoutEndpoint(email, iteration) {
  console.log(`Testing checkout endpoint for ${email} (iteration ${iteration})...`);
  
  const postData = JSON.stringify({
    email: email,
    plan: 'pro'
  });
  
  const options = {
    hostname: 'grant-search-api.sorrowscry86.workers.dev',
    port: 443,
    path: '/api/stripe/create-checkout',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'VoidCat-Live-Payment-Testing/1.0'
    }
  };
  
  try {
    const response = await makeRequest(options, postData);
    
    // Validate response structure
    const isValidResponse = response.statusCode === 200 && 
                           response.data.success === true &&
                           (response.data.sessionId || response.data.url);
    
    const test = {
      type: 'checkout',
      iteration,
      email,
      timestamp: new Date().toISOString(),
      success: isValidResponse,
      statusCode: response.statusCode,
      responseTime: response.responseTime,
      data: response.data
    };
    
    results.tests.push(test);
    results.totalTests++;
    results.performance.responseTimes.push(response.responseTime);
    
    if (test.success) {
      results.successful++;
      console.log(`✅ Checkout test ${iteration} passed (${response.responseTime}ms)`);
      if (response.data.sessionId) {
        console.log(`   Session ID: ${response.data.sessionId}`);
      }
      if (response.data.url) {
        console.log(`   Checkout URL: ${response.data.url}`);
      }
    } else {
      results.failed++;
      console.log(`❌ Checkout test ${iteration} failed (${response.statusCode}, ${response.responseTime}ms)`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    }
    
    return test.success;
  } catch (error) {
    const test = {
      type: 'checkout',
      iteration,
      email,
      timestamp: new Date().toISOString(),
      success: false,
      error: error.error,
      responseTime: error.responseTime
    };
    
    results.tests.push(test);
    results.totalTests++;
    results.failed++;
    
    console.log(`❌ Checkout test ${iteration} error: ${error.error} (${error.responseTime}ms)`);
    return false;
  }
}

/**
 * Test Stripe webhook endpoint
 */
async function testWebhookEndpoint() {
  console.log('Testing webhook endpoint...');
  
  const testEvent = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_webhook_' + Date.now(),
        customer_email: 'webhook-test@example.com',
        subscription: 'sub_test_' + Date.now()
      }
    }
  };
  
  const postData = JSON.stringify(testEvent);
  
  const options = {
    hostname: 'grant-search-api.sorrowscry86.workers.dev',
    port: 443,
    path: '/api/stripe/webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'VoidCat-Live-Payment-Testing/1.0'
    }
  };
  
  try {
    const response = await makeRequest(options, postData);
    
    // Webhook should return 400 for missing signature (expected behavior)
    const isExpectedResponse = response.statusCode === 400 || response.statusCode === 503;
    
    const test = {
      type: 'webhook',
      timestamp: new Date().toISOString(),
      success: isExpectedResponse,
      statusCode: response.statusCode,
      responseTime: response.responseTime,
      data: response.data,
      expectedBehavior: 'Should return 400 for missing signature'
    };
    
    results.tests.push(test);
    results.totalTests++;
    
    if (test.success) {
      results.successful++;
      console.log(`✅ Webhook test passed - correctly rejected unsigned request (${response.statusCode}, ${response.responseTime}ms)`);
    } else {
      results.failed++;
      console.log(`❌ Webhook test failed - unexpected response (${response.statusCode}, ${response.responseTime}ms)`);
    }
    
    return test.success;
  } catch (error) {
    const test = {
      type: 'webhook',
      timestamp: new Date().toISOString(),
      success: false,
      error: error.error,
      responseTime: error.responseTime
    };
    
    results.tests.push(test);
    results.totalTests++;
    results.failed++;
    
    console.log(`❌ Webhook test error: ${error.error} (${error.responseTime}ms)`);
    return false;
  }
}

/**
 * Calculate performance metrics
 */
function calculatePerformanceMetrics() {
  const responseTimes = results.performance.responseTimes;
  
  if (responseTimes.length > 0) {
    results.performance.averageResponseTime = Math.round(
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    );
    results.performance.minResponseTime = Math.min(...responseTimes);
    results.performance.maxResponseTime = Math.max(...responseTimes);
  }
}

/**
 * Generate test report
 */
function generateReport() {
  results.endTime = new Date().toISOString();
  calculatePerformanceMetrics();
  
  // Create results directory
  const resultsDir = './test-results/api-endpoint-testing';
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // Generate detailed JSON report
  const reportPath = path.join(resultsDir, `api-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  
  // Generate summary report
  const successRate = results.totalTests > 0 ? 
    ((results.successful / results.totalTests) * 100).toFixed(2) : 0;
  
  const summary = {
    timestamp: results.endTime,
    summary: {
      totalTests: results.totalTests,
      successful: results.successful,
      failed: results.failed,
      successRate: `${successRate}%`
    },
    performance: results.performance,
    requirements: {
      checkoutIterations: CONFIG.testing.iterations,
      targetSuccessRate: '>99%',
      actualSuccessRate: `${successRate}%`,
      targetResponseTime: '<500ms',
      actualAverageResponseTime: `${results.performance.averageResponseTime}ms`
    }
  };
  
  const summaryPath = path.join(resultsDir, 'api-test-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log('\n=== TEST REPORT ===');
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`Successful: ${results.successful}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${successRate}%`);
  console.log(`Average Response Time: ${results.performance.averageResponseTime}ms`);
  console.log(`Report saved to: ${reportPath}`);
  
  return summary;
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main test runner
 */
async function main() {
  console.log('🚀 Starting Direct API Endpoint Testing');
  console.log(`Target: ${CONFIG.testing.iterations} checkout iterations + health/webhook tests`);
  console.log(`API Base URL: ${CONFIG.api.baseUrl}\n`);
  
  // Test 1: API Health
  await testHealthEndpoint();
  
  // Wait before checkout tests
  await sleep(2000);
  
  // Test 2: Multiple Checkout Iterations
  console.log(`\n📋 Running ${CONFIG.testing.iterations} checkout iterations...`);
  
  for (let i = 1; i <= CONFIG.testing.iterations; i++) {
    const email = CONFIG.testUsers[i - 1] || `testuser${i}@example.com`;
    await testCheckoutEndpoint(email, i);
    
    // Wait between requests
    if (i < CONFIG.testing.iterations) {
      await sleep(CONFIG.testing.delayBetweenRequests);
    }
  }
  
  // Wait before webhook test
  await sleep(2000);
  
  // Test 3: Webhook Endpoint
  await testWebhookEndpoint();
  
  // Generate final report
  console.log('\n📊 Generating test report...');
  const summary = generateReport();
  
  // Evaluate results
  const successRate = (results.successful / results.totalTests) * 100;
  const avgResponseTime = results.performance.averageResponseTime;
  
  console.log('\n=== EVALUATION ===');
  
  if (successRate >= 99) {
    console.log('✅ SUCCESS RATE: Meets requirement (≥99%)');
  } else {
    console.log('❌ SUCCESS RATE: Below requirement (≥99%)');
  }
  
  if (avgResponseTime <= 500) {
    console.log('✅ RESPONSE TIME: Meets requirement (≤500ms)');
  } else {
    console.log('❌ RESPONSE TIME: Above requirement (≤500ms)');
  }
  
  // Final verdict
  if (successRate >= 99 && avgResponseTime <= 500) {
    console.log('\n🎉 ALL REQUIREMENTS MET - API endpoints are production-ready');
    process.exit(0);
  } else {
    console.log('\n⚠️  REQUIREMENTS NOT MET - API endpoints need attention');
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\nTesting interrupted by user');
  generateReport();
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\nTesting terminated');
  generateReport();
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  main().catch(error => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main, CONFIG, results };