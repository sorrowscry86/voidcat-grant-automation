import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { RegistrationModal } from './pages/RegistrationModal';

test.describe('Proposal Generation', () => {
  let homePage: HomePage;
  let registrationModal: RegistrationModal;
  
  // Test user credentials with unique email for each test run
  const testUser = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    company: 'Test Company'
  };

  test.beforeEach(async ({ page }) => {
    // Mock API responses for consistent testing
    await page.route('**/api/users/register', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'User registered successfully',
          api_key: 'test-api-key-123',
          subscription_tier: 'free'
        })
      });
    });

    await page.route('**/api/users/me', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 1,
            email: testUser.email,
            subscription_tier: 'free',
            usage_count: 0,
            created_at: new Date().toISOString()
          }
        })
      });
    });

    await page.route('**/api/grants/search*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          count: 1,
          grants: [{
            id: 'SBIR-25-001',
            title: 'AI for Defense Applications',
            agency: 'Department of Defense',
            program: 'SBIR Phase I',
            deadline: '2025-09-15',
            amount: '$250,000',
            description: 'Seeking innovative AI solutions for defense applications.',
            eligibility: 'Small businesses with <500 employees',
            matching_score: 0.95,
            data_source: 'mock'
          }],
          data_source: 'mock',
          timestamp: new Date().toISOString()
        })
      });
    });

    await page.route('**/api/grants/generate-proposal', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          proposal: {
            executive_summary: 'This innovative project leverages cutting-edge AI technologies...',
            technical_approach: 'Our solution employs a multi-layered approach...',
            commercial_potential: 'The proposed technology has significant commercial applications...',
            budget_summary: {
              personnel: 150000,
              equipment: 50000,
              overhead: 50000,
              total: 250000
            },
            timeline: [
              { phase: "Months 1-3", task: "Requirements analysis and system design" },
              { phase: "Months 4-6", task: "Core algorithm development and testing" },
              { phase: "Months 7-9", task: "System integration and validation" },
              { phase: "Months 10-12", task: "Performance evaluation and delivery" }
            ]
          },
          grant_id: 'SBIR-25-001',
          generated_at: new Date().toISOString()
        })
      });
    });

    homePage = new HomePage(page);
    registrationModal = new RegistrationModal(page);
    
    await homePage.goto();
    await homePage.waitForPageLoad();
  });

  test('should allow authenticated user to generate proposal', async ({ page }) => {
    // Register user first
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Wait for registration to complete and user to be logged in
    await expect(page.locator(`text=Welcome, ${testUser.email}`)).toBeVisible();
    
    // Perform search to get grants
    await homePage.performSearch('AI');
    
    // Wait for search results
    await expect(page.locator('.grant-card').first()).toBeVisible();
    
    // Click on "Generate Proposal" button for the first grant
    const generateButton = page.locator('button:has-text("Generate Proposal")').first();
    await expect(generateButton).toBeVisible();
    await generateButton.click();
    
    // Wait for proposal generation modal/section to appear
    await expect(page.locator('text=Proposal Generated')).toBeVisible({ timeout: 10000 });
    
    // Verify proposal content is displayed
    await expect(page.locator('text=Executive Summary')).toBeVisible();
    await expect(page.locator('text=Technical Approach')).toBeVisible();
    await expect(page.locator('text=Commercial Potential')).toBeVisible();
    await expect(page.locator('text=Budget Summary')).toBeVisible();
    await expect(page.locator('text=Timeline')).toBeVisible();
    
    // Verify specific proposal content
    await expect(page.locator('text=This innovative project leverages cutting-edge AI technologies')).toBeVisible();
    await expect(page.locator('text=Personnel: $150,000')).toBeVisible();
    await expect(page.locator('text=Total: $250,000')).toBeVisible();
  });

  test('should show upgrade prompt when free tier limit reached', async ({ page }) => {
    // Mock API to return usage limit reached
    await page.route('**/api/grants/generate-proposal', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Free tier limit reached',
          upgrade_required: true,
          message: 'Upgrade to Pro for unlimited grant applications'
        })
      });
    });

    // Mock user with usage count at limit
    await page.route('**/api/users/me', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 1,
            email: testUser.email,
            subscription_tier: 'free',
            usage_count: 1, // At limit
            created_at: new Date().toISOString()
          }
        })
      });
    });

    // Register user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Wait for registration and verify usage count display
    await expect(page.locator('text=1/1 free grants used')).toBeVisible();
    
    // Perform search
    await homePage.performSearch('AI');
    await expect(page.locator('.grant-card').first()).toBeVisible();
    
    // Try to generate proposal
    const generateButton = page.locator('button:has-text("Generate Proposal")').first();
    await generateButton.click();
    
    // Should show upgrade prompt modal
    await expect(page.locator('text=Free Limit Reached!')).toBeVisible();
    await expect(page.locator('text=You\'ve used your 1 free grant application this month')).toBeVisible();
    await expect(page.locator('text=Upgrade to Pro for:')).toBeVisible();
    await expect(page.locator('text=Unlimited grant applications')).toBeVisible();
    
    // Verify upgrade button is present
    await expect(page.locator('button:has-text("Upgrade Now")')).toBeVisible();
  });

  test('should handle proposal generation errors gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/grants/generate-proposal', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Proposal generation failed',
          message: 'Service temporarily unavailable'
        })
      });
    });

    // Register user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Perform search
    await homePage.performSearch('AI');
    await expect(page.locator('.grant-card').first()).toBeVisible();
    
    // Try to generate proposal
    const generateButton = page.locator('button:has-text("Generate Proposal")').first();
    await generateButton.click();
    
    // Should show error message
    await expect(page.locator('text=Error generating proposal')).toBeVisible();
    await expect(page.locator('text=Please try again later')).toBeVisible();
  });

  test('should require authentication for proposal generation', async ({ page }) => {
    // Don't register user - try to generate proposal without authentication
    
    // Perform search (should work without auth)
    await homePage.performSearch('AI');
    await expect(page.locator('.grant-card').first()).toBeVisible();
    
    // Try to generate proposal without being logged in
    const generateButton = page.locator('button:has-text("Generate Proposal")').first();
    await generateButton.click();
    
    // Should show login/registration prompt
    await expect(page.locator('text=Please log in to generate proposals')).toBeVisible();
    // Or should redirect to registration modal
    await expect(page.locator('text=Register for Free Access')).toBeVisible();
  });
});