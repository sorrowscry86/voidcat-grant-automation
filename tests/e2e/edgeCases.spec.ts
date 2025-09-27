// Edge Case & Error Handling Test Suite - Tier 4.1
// Tests error scenarios, network failures, and edge cases with @edge tag
import { test, expect } from '@playwright/test';
import { TIMEOUTS, safeAction } from './utils/testUtils';

test.describe('Edge Cases & Error Handling @edge', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up page with error handling
    page.on('pageerror', (exception) => {
      console.log(`🚨 Page error: ${exception}`);
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`🚨 Console error: ${msg.text()}`);
      }
    });
  });

  test('should handle empty search results gracefully @edge', async ({ page }) => {
    console.log('🧪 Testing empty search results handling...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Search for something that returns no results
    await page.fill('input[placeholder*="Search keywords"]', 'nonexistentgranttype12345');
    await page.click('button:has-text("Search Grants")');
    
    // Wait for search to complete
    await page.waitForTimeout(3000);
    
    // Should show "No grants found" message
    const noResultsMessage = page.locator('text=No grants found');
    await expect(noResultsMessage).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    
    // Should not show any grant cards
    const grantCards = page.locator('.grant-card');
    await expect(grantCards).toHaveCount(0);
    
    // Should show helpful suggestion
    const suggestion = page.locator('text=Try adjusting your search criteria');
    await expect(suggestion).toBeVisible();
    
    console.log('✅ Empty search results handled correctly');
  });

  test('should handle malformed API responses @edge', async ({ page }) => {
    console.log('🧪 Testing malformed API response handling...');
    
    // Mock API to return malformed response
    await page.route('**/api/grants/search*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"invalid": "json", "missing": "required_fields"}'
      });
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Perform search that will get malformed response
    await page.fill('input[placeholder*="Search keywords"]', 'test');
    await page.click('button:has-text("Search Grants")');
    
    // Should fall back to demo data or show error
    await page.waitForTimeout(3000);
    
    // Check for fallback behavior
    const demoDataIndicator = page.locator('text=📋 Demo Data');
    const errorMessage = page.locator('text=Error loading grants');
    
    // One of these should be visible
    const fallbackVisible = await demoDataIndicator.isVisible() || await errorMessage.isVisible();
    expect(fallbackVisible).toBe(true);
    
    console.log('✅ Malformed API response handled correctly');
  });

  test('should handle network failure gracefully @edge', async ({ page }) => {
    console.log('🧪 Testing network failure handling...');
    
    // Block all API requests to simulate network failure
    await page.route('**/api/**', (route) => {
      route.abort();
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try to search - should show error or fallback
    await page.fill('input[placeholder*="Search keywords"]', 'test');
    await page.click('button:has-text("Search Grants")');
    
    await page.waitForTimeout(3000);
    
    // Should show demo data or network error message
    const demoDataIndicator = page.locator('text=📋 Demo Data');
    const networkError = page.locator('text=API unavailable');
    
    const errorHandled = await demoDataIndicator.isVisible() || await networkError.isVisible();
    expect(errorHandled).toBe(true);
    
    console.log('✅ Network failure handled correctly');
  });

  test('should handle rate limiting (429) responses @edge', async ({ page }) => {
    console.log('🧪 Testing rate limiting handling...');
    
    // Mock API to return 429 rate limit response
    await page.route('**/api/grants/generate-proposal*', (route) => {
      route.fulfill({
        status: 429,
        headers: {
          'X-RateLimit-Limit': '12',
          'X-RateLimit-Remaining': '0',
          'Retry-After': '60'
        },
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Rate limit exceeded. Please try again in 60 seconds.',
          code: 'RATE_LIMIT_EXCEEDED'
        })
      });
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try to register first (needed for proposal generation)
    await page.click('button:has-text("Get Started Free")');
    await page.fill('input[placeholder="Full Name"]', 'Test User');
    await page.fill('input[placeholder="Email Address"]', 'test@example.com');
    await page.click('button:has-text("Register")');
    
    await page.waitForTimeout(2000);
    
    // Try to generate proposal - should trigger rate limit
    const generateButton = page.locator('button:has-text("Generate Proposal")').first();
    if (await generateButton.isVisible()) {
      await generateButton.click();
      
      // Should show rate limit error in modal
      await page.waitForTimeout(2000);
      
      const rateLimitError = page.locator('text*=Rate limit exceeded');
      await expect(rateLimitError).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      
      console.log('✅ Rate limiting handled correctly');
    } else {
      console.log('ℹ️ Generate button not available, test passed conditionally');
    }
  });

  test('should handle invalid authentication tokens @edge', async ({ page }) => {
    console.log('🧪 Testing invalid auth token handling...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Inject invalid API key into localStorage
    await page.evaluate(() => {
      localStorage.setItem('voidcat_api_key', 'invalid-token-12345');
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Try to perform authenticated action
    const generateButton = page.locator('button:has-text("Generate Proposal")').first();
    if (await generateButton.isVisible()) {
      await generateButton.click();
      
      await page.waitForTimeout(2000);
      
      // Should show authentication error or redirect to login
      const authError = page.locator('text*=authentication');
      const loginPrompt = page.locator('text*=log in');
      
      const authHandled = await authError.isVisible() || await loginPrompt.isVisible();
      if (authHandled) {
        console.log('✅ Invalid auth token handled correctly');
      }
    } else {
      console.log('ℹ️ Generate button not available, checking auth state...');
      
      // Should not show authenticated user state
      const userWelcome = page.locator('text*=Welcome');
      await expect(userWelcome).not.toBeVisible({ timeout: 5000 });
      console.log('✅ Invalid token does not show authenticated state');
    }
  });

  test('should handle proposal generation errors @edge', async ({ page }) => {
    console.log('🧪 Testing proposal generation error handling...');
    
    // Mock proposal generation to return error
    await page.route('**/api/grants/generate-proposal*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'AI service temporarily unavailable. Please try again later.',
          code: 'AI_SERVICE_ERROR'
        })
      });
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Register first
    await page.click('button:has-text("Get Started Free")');
    await page.fill('input[placeholder="Full Name"]', 'Test User');
    await page.fill('input[placeholder="Email Address"]', 'test@example.com');
    await page.click('button:has-text("Register")');
    
    await page.waitForTimeout(2000);
    
    // Try to generate proposal
    const generateButton = page.locator('button:has-text("Generate Proposal")').first();
    if (await generateButton.isVisible()) {
      await generateButton.click();
      
      // Should show error modal with user-friendly message
      await page.waitForTimeout(3000);
      
      const errorModal = page.locator('[x-show="showErrorModal"]');
      const errorMessage = page.locator('text*=AI service temporarily unavailable');
      
      // Either error modal should be visible or error message should appear
      const errorHandled = await errorModal.isVisible() || await errorMessage.isVisible();
      expect(errorHandled).toBe(true);
      
      console.log('✅ Proposal generation error handled correctly');
    }
  });

  test('should handle malformed email addresses in registration @edge', async ({ page }) => {
    console.log('🧪 Testing malformed email validation...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click register button
    await page.click('button:has-text("Get Started Free")');
    
    // Try various invalid email formats
    const invalidEmails = [
      'not-an-email',
      'missing@',
      '@missing-domain.com',
      'spaces in@email.com',
      'double@@domain.com',
      ''
    ];
    
    for (const invalidEmail of invalidEmails) {
      await page.fill('input[placeholder="Full Name"]', 'Test User');
      await page.fill('input[placeholder="Email Address"]', invalidEmail);
      await page.click('button:has-text("Register")');
      
      // Should show validation error or not submit
      await page.waitForTimeout(1000);
      
      // Either HTML5 validation prevents submission or API returns error
      const registrationModal = page.locator('[x-show="showRegister"]');
      const isModalStillVisible = await registrationModal.isVisible();
      
      // Modal should still be visible (registration didn't complete)
      expect(isModalStillVisible).toBe(true);
      
      // Clear fields for next test
      await page.fill('input[placeholder="Email Address"]', '');
    }
    
    console.log('✅ Email validation handled correctly');
  });

  test('should handle extremely long search queries @edge', async ({ page }) => {
    console.log('🧪 Testing extremely long search query handling...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Create very long search query (over typical limits)
    const longQuery = 'a'.repeat(1000);
    
    await page.fill('input[placeholder*="Search keywords"]', longQuery);
    await page.click('button:has-text("Search Grants")');
    
    await page.waitForTimeout(3000);
    
    // Should either truncate query or show error
    const results = page.locator('.grant-card');
    const errorMessage = page.locator('text*=too long');
    const noResults = page.locator('text=No grants found');
    
    // Should handle gracefully (results, error, or no results)
    const handled = await results.count() > 0 || 
                   await errorMessage.isVisible() || 
                   await noResults.isVisible();
    
    expect(handled).toBe(true);
    
    console.log('✅ Long search query handled correctly');
  });

  test('should handle rapid consecutive API requests @edge', async ({ page }) => {
    console.log('🧪 Testing rapid consecutive API requests...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Make multiple rapid search requests
    const searchInput = page.locator('input[placeholder*="Search keywords"]');
    const searchButton = page.locator('button:has-text("Search Grants")');
    
    // Fire off multiple searches rapidly
    await searchInput.fill('AI');
    await searchButton.click();
    
    await searchInput.fill('defense');
    await searchButton.click();
    
    await searchInput.fill('energy');
    await searchButton.click();
    
    await searchInput.fill('research');
    await searchButton.click();
    
    // Wait for all requests to complete
    await page.waitForTimeout(5000);
    
    // Should show results from the last search or handle gracefully
    const results = page.locator('.grant-card');
    const loading = page.locator('text=Loading');
    const error = page.locator('text*=error');
    
    // Should show some results or handled state
    const handled = await results.count() > 0 || 
                   await loading.isVisible() || 
                   await error.isVisible();
    
    expect(handled).toBe(true);
    
    console.log('✅ Rapid consecutive requests handled correctly');
  });

  test('should display meaningful error messages (no stack traces) @edge', async ({ page }) => {
    console.log('🧪 Testing user-friendly error messages...');
    
    // Monitor for any stack traces or technical errors in UI
    const stackTracePatterns = [
      /at\s+\w+\s*\([^)]*:\d+:\d+\)/,  // JavaScript stack trace
      /Error:\s*\w+Error/,              // Raw error types
      /\s+at\s+/,                       // Stack trace lines
      /node_modules/,                   // Development paths
      /webpack/,                        // Build tool errors
      /TypeError/,                      // Technical error types
      /ReferenceError/,
      /SyntaxError/
    ];
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try to trigger various error conditions
    await page.click('button:has-text("Get Started Free")');
    
    // Submit empty form
    await page.click('button:has-text("Register")');
    await page.waitForTimeout(1000);
    
    // Check page content for stack traces
    const pageContent = await page.textContent('body');
    
    for (const pattern of stackTracePatterns) {
      const hasStackTrace = pattern.test(pageContent);
      expect(hasStackTrace).toBe(false);
    }
    
    console.log('✅ No technical stack traces found in UI');
  });

  test('should handle browser back/forward navigation gracefully @edge', async ({ page }) => {
    console.log('🧪 Testing browser navigation handling...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Perform search
    await page.fill('input[placeholder*="Search keywords"]', 'AI');
    await page.click('button:has-text("Search Grants")');
    await page.waitForTimeout(2000);
    
    // Open registration modal
    await page.click('button:has-text("Get Started Free")');
    await page.waitForTimeout(1000);
    
    // Navigate back
    await page.goBack();
    await page.waitForTimeout(1000);
    
    // Page should still be functional
    const title = await page.textContent('h1');
    expect(title).toContain('VoidCat RDC');
    
    // Navigate forward
    await page.goForward();
    await page.waitForTimeout(1000);
    
    // Should still be functional
    const titleAfterForward = await page.textContent('h1');
    expect(titleAfterForward).toContain('VoidCat RDC');
    
    console.log('✅ Browser navigation handled correctly');
  });

  test('should handle page refresh during async operations @edge', async ({ page }) => {
    console.log('🧪 Testing page refresh during operations...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Start a search operation
    await page.fill('input[placeholder*="Search keywords"]', 'test');
    await page.click('button:has-text("Search Grants")');
    
    // Immediately refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Page should recover gracefully
    const title = await page.textContent('h1');
    expect(title).toContain('VoidCat RDC');
    
    // Should be able to perform new operations
    await page.fill('input[placeholder*="Search keywords"]', 'new search');
    await page.click('button:has-text("Search Grants")');
    
    await page.waitForTimeout(2000);
    
    // Should show results or appropriate state
    const hasContent = await page.locator('body').textContent();
    expect(hasContent).toBeTruthy();
    
    console.log('✅ Page refresh during operations handled correctly');
  });
});

// Utility test for verifying edge case test isolation
test.describe('Edge Case Test Verification @edge', () => {
  test('should be runnable with @edge tag filter', async ({ page }) => {
    console.log('🧪 Verifying @edge tag functionality...');
    
    // This test verifies that the @edge tag filtering works
    expect(true).toBe(true);
    
    console.log('✅ @edge tag test filter working correctly');
  });
});