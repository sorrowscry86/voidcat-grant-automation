// Simple test to verify API integration without full Playwright test suite
import { test, expect } from '@playwright/test';

test('API Integration Test - Verify Local API Connection', async ({ page }) => {
  console.log('🚀 Starting API integration test...');
  
  // Navigate to frontend with test API mode
  await page.goto('/?test_api=true');
  
  // Wait a bit for Alpine.js to initialize
  await page.waitForTimeout(3000);
  
  // Check if page loaded
  const title = await page.textContent('h1');
  console.log('📄 Page title:', title);
  expect(title).toContain('VoidCat RDC');
  
  // Check if we can access the API from browser context
  const apiResponse = await page.evaluate(async () => {
    try {
      const response = await fetch('http://localhost:8787/health');
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  console.log('🏥 API Health Response:', apiResponse);
  expect(apiResponse.success).toBe(true);
  expect(apiResponse.data.status).toBe('healthy');
  
  // Test grants search
  const searchResponse = await page.evaluate(async () => {
    try {
      const response = await fetch('http://localhost:8787/api/grants/search?query=AI');
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  console.log('🔍 Grants Search Response:', searchResponse.success ? 'SUCCESS' : 'FAILED');
  expect(searchResponse.success).toBe(true);
  expect(searchResponse.data.success).toBe(true);
  expect(searchResponse.data.count).toBeGreaterThan(0);
  
  console.log('✅ All API integration tests passed!');
});