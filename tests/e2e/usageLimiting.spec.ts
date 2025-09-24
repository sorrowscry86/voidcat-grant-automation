import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { RegistrationModal } from './pages/RegistrationModal';
import { generateTestUser } from './utils/testDataGenerator';
import { TIMEOUTS } from './utils/testUtils';

test.describe('Usage Limiting for Free Tier', () => {
  let homePage: HomePage;
  let registrationModal: RegistrationModal;
  
  // Test user credentials with unique identifiers
  // Using crypto.randomUUID() instead of Date.now() to prevent collisions in parallel test execution
  const testUser = generateTestUser();

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    registrationModal = new RegistrationModal(page);
    
    // Navigate to the home page
    await homePage.goto();
    await homePage.waitForPageLoad();
  });

  test('should allow free tier user to perform initial search', async ({ page }) => {
    // This test is now designed to run against the live API
    // All mocking has been removed to ensure it tests real-world behavior
    
    // Register a new test user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Perform a search
    await homePage.performSearch('AI', TIMEOUTS.VERY_LONG);
    
    // Verify search results are shown
    await homePage.verifySearchResults(TIMEOUTS.VERY_LONG);
    
    // Verify usage counter is updated
    const usageCounter = page.locator('text=/1\\s*\\/\\s*1 free grants used/');
    await expect(usageCounter).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
  });

  test('should show upgrade prompt when free tier limit is reached', async ({ page }) => {
    // This test is now designed to run against the live API
    // All mocking has been removed to ensure it tests real-world behavior
    
    // Register a new test user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Perform a search to use up the free grant
    await homePage.performSearch('initial search', TIMEOUTS.VERY_LONG);
    await homePage.verifySearchResults(TIMEOUTS.VERY_LONG);

    // Perform a second search that should hit the limit
    await homePage.performSearch('blockchain', TIMEOUTS.VERY_LONG);
    
    // Enhanced modal readiness verification before checking elements
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(2000); // Cascade timing pause
    
    // Wait for upgrade modal container before checking elements
    try {
      await page.waitForSelector('[data-modal="upgrade"]', { timeout: 30000 });
    } catch {
      // Fallback: wait for modal overlay or upgrade prompt text
      try {
        await page.waitForSelector('.fixed.inset-0.bg-black.bg-opacity-50', { timeout: 20000 });
      } catch {
        // Second fallback: wait for the upgrade prompt text directly
        await page.waitForSelector('text=Free Limit Reached!', { timeout: 15000 });
      }
    }
    
    // Add additional buffer after modal appears
    await page.waitForTimeout(1000);
    
    // Verify upgrade prompt is shown
    const upgradePrompt = page.locator('text=Free Limit Reached!');
    await expect(upgradePrompt).toBeVisible({ timeout: TIMEOUTS.LONG }); // Increased timeout
    
    // Enhanced upgrade button verification with extended timeout
    const upgradeButton = page.locator('button:has-text("Upgrade Now")').first();
    await expect(upgradeButton).toBeVisible({ timeout: 60000 }); // Extended from 30s to 60s
  });

  test('should prevent additional searches when limit is reached', async ({ page }) => {
    // This test is now designed to run against the live API
    // All mocking has been removed to ensure it tests real-world behavior
    
    // Register a new test user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Perform first search (should work)
    await homePage.performSearch('test', TIMEOUTS.VERY_LONG);
    await homePage.verifySearchResults(TIMEOUTS.VERY_LONG);
    
    // Try to perform another search
    await homePage.performSearch('another search', TIMEOUTS.VERY_LONG);
    
    // Enhanced modal readiness verification before checking elements
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(2000); // Cascade timing pause
    
    // Wait for upgrade modal container before checking elements
    try {
      await page.waitForSelector('[data-modal="upgrade"]', { timeout: 30000 });
    } catch {
      // Fallback: wait for modal overlay or upgrade prompt text
      try {
        await page.waitForSelector('.fixed.inset-0.bg-black.bg-opacity-50', { timeout: 20000 });
      } catch {
        // Second fallback: wait for the upgrade prompt text directly
        await page.waitForSelector('text=Free Limit Reached!', { timeout: 15000 });
      }
    }
    
    // Verify upgrade prompt is shown with enhanced timeout
    const upgradePrompt = page.locator('text=Free Limit Reached!');
    await expect(upgradePrompt).toBeVisible({ timeout: TIMEOUTS.LONG }); // Increased from MEDIUM to LONG
  });

  test('should show correct usage counter', async ({ page }) => {
    // This test is now designed to run against the live API
    // All mocking has been removed to ensure it tests real-world behavior
    
    // Register a new test user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Perform a search to update the usage count on the backend
    await homePage.performSearch('test search', TIMEOUTS.VERY_LONG);
    await homePage.verifySearchResults(TIMEOUTS.VERY_LONG);

    // Refresh the page to load the updated user data
    await page.reload();
    await homePage.waitForPageLoad();
    
    // Verify usage counter is displayed correctly
    const usageCounter = page.locator('text=/1\\s*\\/\\s*1 free grants used/');
    await expect(usageCounter).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
  });
});
