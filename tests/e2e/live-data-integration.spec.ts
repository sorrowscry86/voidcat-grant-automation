// Test for live data integration fixes
import { test, expect } from '@playwright/test';

test.describe('Live Data Integration Fixes', () => {
  test('Grants search correctly reports data source and fallback status', async ({ page }) => {
    console.log('🔍 Testing grant search data source reporting...');
    
    // Test grants search endpoint directly
    const searchResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:8787/api/grants/search?query=AI');
        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    console.log('🔍 Search Response:', JSON.stringify(searchResponse.data, null, 2));
    
    expect(searchResponse.success).toBe(true);
    expect(searchResponse.data.success).toBe(true);
    
    // Verify new data source reporting fields
    expect(searchResponse.data).toHaveProperty('data_source');
    expect(searchResponse.data).toHaveProperty('fallback_occurred');
    expect(searchResponse.data).toHaveProperty('timestamp');
    
    // Verify data source and fallback status flexibly
    expect(['mock', 'live']).toContain(searchResponse.data.data_source);
    if (searchResponse.data.data_source === 'mock') {
      expect(searchResponse.data.fallback_occurred).toBe(true);
      expect(searchResponse.data).toHaveProperty('fallback_reason');
    } else {
      expect(searchResponse.data.fallback_occurred).toBe(false);
    }
    
    // Verify each grant also has correct data_source
    for (const grant of searchResponse.data.grants) {
      expect(grant.data_source).toBe('mock');
    }
    
    console.log('✅ Grant search data source reporting test passed!');
  });
  
  test('Grant details endpoint correctly reports data source and fallback', async ({ page }) => {
    console.log('📄 Testing grant details data source reporting...');
    
    const detailsResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:8787/api/grants/SBIR-25-001');
        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    console.log('📄 Details Response:', JSON.stringify(detailsResponse.data, null, 2));
    
    expect(detailsResponse.success).toBe(true);
    expect(detailsResponse.data.success).toBe(true);
    
    // Verify new data source reporting fields  
    expect(detailsResponse.data).toHaveProperty('data_source');
    expect(detailsResponse.data).toHaveProperty('fallback_occurred');
    
    // Should fallback to mock for grant details
    expect(detailsResponse.data.data_source).toBe('mock');
    expect(detailsResponse.data.fallback_occurred).toBe(true);
    expect(detailsResponse.data).toHaveProperty('fallback_reason');
    
    // Verify grant details structure
    expect(detailsResponse.data.grant).toHaveProperty('id');
    expect(detailsResponse.data.grant).toHaveProperty('title');
    expect(detailsResponse.data.grant).toHaveProperty('data_source');
    expect(detailsResponse.data.grant.data_source).toBe('mock');
    
    console.log('✅ Grant details data source reporting test passed!');
  });
  
  test('API responses include transparency fields for debugging', async ({ page }) => {
    console.log('🔍 Testing API transparency fields...');
    
    const searchResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:8787/api/grants/search?query=AI&agency=defense');
        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    expect(searchResponse.success).toBe(true);
    
    // Verify transparency and debugging fields
    expect(searchResponse.data).toHaveProperty('live_data_ready');
    expect(searchResponse.data).toHaveProperty('search_params');
    expect(searchResponse.data.search_params).toEqual({
      query: 'AI',
      agency: 'defense'
    });
    
    // When fallback occurs, should have fallback_reason
    if (searchResponse.data.fallback_occurred) {
      expect(searchResponse.data).toHaveProperty('fallback_reason');
      expect(typeof searchResponse.data.fallback_reason).toBe('string');
    }
    
    console.log('✅ API transparency fields test passed!');
  });
  
  test('Health endpoint works correctly', async ({ page }) => {
    console.log('🏥 Testing health endpoint...');
    
    const healthResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:8787/health');
        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    expect(healthResponse.success).toBe(true);
    expect(healthResponse.data.status).toBe('healthy');
    expect(healthResponse.data.service).toBe('VoidCat Grant Search API');
    expect(healthResponse.data).toHaveProperty('timestamp');
    
    console.log('✅ Health endpoint test passed!');
  });
  
  test('Grant search filters work with fallback data', async ({ page }) => {
    console.log('🔎 Testing grant search filters with fallback data...');
    
    // Test agency filter
    const agencyFilterResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:8787/api/grants/search?agency=defense');
        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    expect(agencyFilterResponse.success).toBe(true);
    expect(agencyFilterResponse.data.success).toBe(true);
    
    // Should filter to defense-related grants
    const defenseGrants = agencyFilterResponse.data.grants.filter(g => 
      g.agency.toLowerCase().includes('defense') || g.agency.toLowerCase().includes('darpa')
    );
    expect(defenseGrants.length).toBeGreaterThan(0);
    
    console.log('✅ Grant search filters test passed!');
  });
  
  test('Error handling works correctly for invalid grant IDs', async ({ page }) => {
    console.log('❌ Testing error handling for invalid grant IDs...');
    
    const invalidIdResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:8787/api/grants/INVALID-ID-999');
        const data = await response.json();
        return { success: true, data, status: response.status };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    expect(invalidIdResponse.success).toBe(true);
    expect(invalidIdResponse.status).toBe(404);
    expect(invalidIdResponse.data.success).toBe(false);
    expect(invalidIdResponse.data.code).toBe('GRANT_NOT_FOUND');
    
    console.log('✅ Error handling test passed!');
  });
});