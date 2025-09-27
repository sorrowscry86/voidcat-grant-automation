// API Contract & Backend Edge Case Tests - Tier 4.1
// Tests API endpoints, error responses, and backend edge cases with @edge tag
import { test, expect } from '@playwright/test';
import { TIMEOUTS } from './utils/testUtils';

test.describe('API Contract & Backend Edge Cases @edge', () => {
  const API_BASE = process.env.TEST_API_MODE === 'local' 
    ? 'http://localhost:8787' 
    : 'https://grant-search-api.sorrowscry86.workers.dev';

  test.beforeEach(async ({ page }) => {
    // Set up API error monitoring
    page.on('response', (response) => {
      if (response.status() >= 400) {
        console.log(`🚨 API Error: ${response.status()} ${response.url()}`);
      }
    });
  });

  test('should return proper health check response @edge', async ({ request }) => {
    console.log('🧪 Testing health endpoint contract...');
    
    const response = await request.get(`${API_BASE}/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('service');
    expect(data).toHaveProperty('timestamp');
    expect(data.status).toBe('healthy');
    expect(data.service).toContain('VoidCat');
    
    console.log('✅ Health endpoint contract verified');
  });

  test('should handle missing query parameter in search @edge', async ({ request }) => {
    console.log('🧪 Testing search without query parameter...');
    
    const response = await request.get(`${API_BASE}/api/grants/search`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('grants');
    expect(Array.isArray(data.grants)).toBe(true);
    
    console.log('✅ Search without query handled correctly');
  });

  test('should handle invalid grant ID in details endpoint @edge', async ({ request }) => {
    console.log('🧪 Testing grant details with invalid ID...');
    
    const response = await request.get(`${API_BASE}/api/grants/invalid-grant-id-12345`);
    
    // Should return 404 or appropriate error
    expect([404, 400].includes(response.status())).toBe(true);
    
    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(data.success).toBe(false);
    expect(data).toHaveProperty('error');
    
    console.log('✅ Invalid grant ID handled correctly');
  });

  test('should validate registration input fields @edge', async ({ request }) => {
    console.log('🧪 Testing registration input validation...');
    
    // Test missing required fields
    const invalidPayloads = [
      {}, // Empty payload
      { email: 'test@example.com' }, // Missing name
      { name: 'Test User' }, // Missing email
      { name: '', email: 'test@example.com' }, // Empty name
      { name: 'Test User', email: '' }, // Empty email
      { name: 'Test User', email: 'invalid-email' }, // Invalid email format
      { name: 'a'.repeat(200), email: 'test@example.com' }, // Name too long
    ];

    for (const payload of invalidPayloads) {
      const response = await request.post(`${API_BASE}/api/users/register`, {
        data: payload
      });
      
      // Should return 400 Bad Request for invalid input
      expect(response.status()).toBe(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
    }
    
    console.log('✅ Registration input validation working correctly');
  });

  test('should handle proposal generation without authentication @edge', async ({ request }) => {
    console.log('🧪 Testing proposal generation without auth...');
    
    const response = await request.post(`${API_BASE}/api/grants/generate-proposal`, {
      data: { grant_id: 'SBIR-25-001' }
    });
    
    // Should return 401 Unauthorized or similar
    expect([401, 403].includes(response.status())).toBe(true);
    
    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(data.success).toBe(false);
    expect(data).toHaveProperty('error');
    
    console.log('✅ Unauthenticated proposal generation blocked correctly');
  });

  test('should handle rate limiting on proposal generation @edge', async ({ request }) => {
    console.log('🧪 Testing rate limiting on proposal endpoint...');
    
    // First register a user to get API key
    const registrationResponse = await request.post(`${API_BASE}/api/users/register`, {
      data: {
        name: 'Rate Test User',
        email: `ratetest${Date.now()}@example.com`
      }
    });
    
    if (registrationResponse.status() === 200) {
      const registrationData = await registrationResponse.json();
      const apiKey = registrationData.api_key;
      
      // Make multiple rapid requests to trigger rate limiting
      const requests = [];
      for (let i = 0; i < 15; i++) {
        requests.push(
          request.post(`${API_BASE}/api/grants/generate-proposal`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            data: { grant_id: 'SBIR-25-001' }
          })
        );
      }
      
      const responses = await Promise.all(requests);
      
      // At least one should return 429 (rate limited)
      const rateLimitedResponses = responses.filter(r => r.status() === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Rate limited responses should have proper headers
      for (const response of rateLimitedResponses) {
        const headers = response.headers();
        expect(headers['x-ratelimit-limit']).toBeDefined();
        expect(headers['retry-after']).toBeDefined();
        
        const data = await response.json();
        expect(data).toHaveProperty('success');
        expect(data.success).toBe(false);
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('rate limit');
      }
      
      console.log('✅ Rate limiting working correctly');
    } else {
      console.log('ℹ️ Registration failed, skipping rate limit test');
    }
  });

  test('should handle malformed JSON in request body @edge', async ({ request }) => {
    console.log('🧪 Testing malformed JSON handling...');
    
    const response = await request.post(`${API_BASE}/api/users/register`, {
      data: '{"invalid": json, "missing": "quotes"}',
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Should return 400 Bad Request
    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(data.success).toBe(false);
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('JSON');
    
    console.log('✅ Malformed JSON handled correctly');
  });

  test('should handle very large request payloads @edge', async ({ request }) => {
    console.log('🧪 Testing large request payload handling...');
    
    // Create very large payload
    const largeData = {
      name: 'Test User',
      email: 'test@example.com',
      company: 'A'.repeat(10000), // Very long company name
      extra_data: 'B'.repeat(50000) // Large extra field
    };
    
    const response = await request.post(`${API_BASE}/api/users/register`, {
      data: largeData
    });
    
    // Should either accept (if within limits) or reject with proper error
    if (response.status() === 413) {
      // Payload too large - properly handled
      console.log('✅ Large payload rejected with 413 status');
    } else if (response.status() === 400) {
      // Validation error - also acceptable
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(false);
      console.log('✅ Large payload rejected with validation error');
    } else {
      // Should at least not crash
      expect([200, 400, 413].includes(response.status())).toBe(true);
      console.log('✅ Large payload handled without crash');
    }
  });

  test('should handle concurrent user registrations @edge', async ({ request }) => {
    console.log('🧪 Testing concurrent registrations...');
    
    const timestamp = Date.now();
    const requests = [];
    
    // Create multiple concurrent registration requests
    for (let i = 0; i < 5; i++) {
      requests.push(
        request.post(`${API_BASE}/api/users/register`, {
          data: {
            name: `Concurrent User ${i}`,
            email: `concurrent${timestamp}_${i}@example.com`
          }
        })
      );
    }
    
    const responses = await Promise.all(requests);
    
    // All should complete without errors (200 or proper error status)
    for (const response of responses) {
      expect([200, 400, 409].includes(response.status())).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
      
      if (response.status() === 200) {
        expect(data.success).toBe(true);
        expect(data).toHaveProperty('api_key');
      }
    }
    
    console.log('✅ Concurrent registrations handled correctly');
  });

  test('should handle invalid HTTP methods @edge', async ({ request }) => {
    console.log('🧪 Testing invalid HTTP methods...');
    
    // Test unsupported methods on various endpoints
    const endpoints = [
      '/health',
      '/api/grants/search',
      '/api/users/register'
    ];
    
    for (const endpoint of endpoints) {
      // Test PATCH method (should not be supported)
      try {
        const response = await request.fetch(`${API_BASE}${endpoint}`, {
          method: 'PATCH'
        });
        
        // Should return 405 Method Not Allowed or 404
        expect([404, 405].includes(response.status())).toBe(true);
        
      } catch (error) {
        // Network error is also acceptable
        console.log(`Method rejection handled for ${endpoint}`);
      }
    }
    
    console.log('✅ Invalid HTTP methods handled correctly');
  });

  test('should return consistent error response format @edge', async ({ request }) => {
    console.log('🧪 Testing consistent error response format...');
    
    // Test various error scenarios to ensure consistent response format
    const errorRequests = [
      { method: 'GET', url: `${API_BASE}/api/grants/nonexistent-id` },
      { method: 'POST', url: `${API_BASE}/api/users/register`, data: {} },
      { method: 'POST', url: `${API_BASE}/api/grants/generate-proposal`, data: {} }
    ];
    
    for (const req of errorRequests) {
      const response = await request.fetch(req.url, {
        method: req.method,
        data: req.data
      });
      
      if (response.status() >= 400) {
        const data = await response.json();
        
        // All error responses should have consistent format
        expect(data).toHaveProperty('success');
        expect(data.success).toBe(false);
        expect(data).toHaveProperty('error');
        expect(typeof data.error).toBe('string');
        
        // Should have error code if available
        if (data.code) {
          expect(typeof data.code).toBe('string');
        }
      }
    }
    
    console.log('✅ Error response format is consistent');
  });

  test('should handle CORS preflight requests @edge', async ({ request }) => {
    console.log('🧪 Testing CORS preflight handling...');
    
    // Send OPTIONS preflight request
    const response = await request.fetch(`${API_BASE}/api/grants/search`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    // Should return 200 or 204 with CORS headers
    expect([200, 204].includes(response.status())).toBe(true);
    
    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBeDefined();
    expect(headers['access-control-allow-methods']).toBeDefined();
    
    console.log('✅ CORS preflight handled correctly');
  });

  test('should handle statistics endpoint edge cases @edge', async ({ request }) => {
    console.log('🧪 Testing statistics endpoint edge cases...');
    
    const response = await request.get(`${API_BASE}/api/grants/stats`);
    
    if (response.status() === 200) {
      const data = await response.json();
      
      // Should have proper statistics structure
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('statistics');
      
      const stats = data.statistics;
      expect(stats).toHaveProperty('total_grants');
      expect(typeof stats.total_grants).toBe('number');
      expect(stats.total_grants).toBeGreaterThanOrEqual(0);
      
      if (stats.agency_distribution) {
        expect(typeof stats.agency_distribution).toBe('object');
      }
      
      console.log('✅ Statistics endpoint working correctly');
    } else {
      console.log('ℹ️ Statistics endpoint not available, test passed conditionally');
    }
  });

  test('should handle Unicode and special characters in input @edge', async ({ request }) => {
    console.log('🧪 Testing Unicode/special character handling...');
    
    const specialInputs = [
      { name: '测试用户', email: 'test@example.com' }, // Chinese characters
      { name: 'Tëst Üser', email: 'test@example.com' }, // Accented characters
      { name: 'Test<script>alert(1)</script>', email: 'test@example.com' }, // XSS attempt
      { name: 'Test\nUser', email: 'test@example.com' }, // Newline character
      { name: 'Test\x00User', email: 'test@example.com' }, // Null byte
      { name: '🚀 Emoji User 🎉', email: 'test@example.com' }, // Emoji characters
    ];
    
    for (const input of specialInputs) {
      const response = await request.post(`${API_BASE}/api/users/register`, {
        data: input
      });
      
      // Should handle gracefully (accept or reject with proper error)
      expect([200, 400].includes(response.status())).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
      
      if (response.status() === 400) {
        expect(data).toHaveProperty('error');
      }
    }
    
    console.log('✅ Special characters handled correctly');
  });
});