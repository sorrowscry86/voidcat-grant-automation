import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { RegistrationModal } from './pages/RegistrationModal';

test.describe('Usage Limiting for Free Tier', () => {
  let homePage: HomePage;
  let registrationModal: RegistrationModal;
  
  // Test user credentials
  const testUser = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    company: 'Test Company'
  };

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    registrationModal = new RegistrationModal(page);
    
    // Navigate to the home page
    await homePage.goto();
    await homePage.waitForPageLoad();
  });

  test('should allow free tier user to perform initial search', async ({ page }) => {
    // Register a new test user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Perform a search
    await homePage.performSearch('AI');
    
    // Verify search results are shown
    await expect(page.locator('.grant-card').first()).toBeVisible();
    
    // Verify usage counter is updated
    await expect(page.locator('text=1/1 free grants used')).toBeVisible();
  });

  test('should show upgrade prompt when free tier limit is reached', async ({ page }) => {
    // Register a new test user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Mock the API to simulate that the user has used their free search
    await page.route('**/api/grants/search*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          upgrade_required: true,
          message: 'Free tier limit reached. Upgrade to Pro for unlimited searches.'
        })
      });
    });
    
    // Perform a search that will hit the limit
    await homePage.performSearch('blockchain');
    
    // Verify upgrade prompt is shown
    await expect(page.locator('text=You\'ve Reached Your Free Limit')).toBeVisible();
    await expect(page.locator('button:has-text("Upgrade to Pro")')).toBeVisible();
  });

  test('should prevent additional searches when limit is reached', async ({ page }) => {
    // Register a new test user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Mock the API to simulate that the user has used their free search
    await page.route('**/api/grants/search*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          grants: [{
            id: 'test-1',
            title: 'Test Grant',
            agency: 'Test Agency',
            amount: '$100,000',
            deadline: '2025-12-31',
            description: 'Test description',
            matching_score: 0.95
          }]
        })
      });
    });
    
    // Perform first search (should work)
    await homePage.performSearch('test');
    
    // Update the mock to simulate limit reached
    await page.route('**/api/grants/search*', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Free tier limit reached',
          upgrade_required: true,
          message: 'Upgrade to Pro for unlimited searches'
        })
      });
    });
    
    // Try to perform another search
    await homePage.performSearch('another search');
    
    // Verify upgrade prompt is shown
    await expect(page.locator('text=You\'ve Reached Your Free Limit')).toBeVisible();
  });

  test('should show correct usage counter', async ({ page }) => {
    // Register a new test user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Mock the API to include usage data
    await page.route('**/api/users/me', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-123',
            email: testUser.email,
            name: testUser.name,
            company: testUser.company,
            subscription_tier: 'free',
            usage_count: 1,
            usage_limit: 1
          }
        })
      });
    });
    
    // Refresh the page to load the updated user data
    await page.reload();
    
    // Verify usage counter is displayed correctly
    await expect(page.locator('text=1/1 free grants used')).toBeVisible();
  });
});
