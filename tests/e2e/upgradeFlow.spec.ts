import { test, expect } from '@playwright/test';

// Configure global test timeout and retries
test.setTimeout(120000); // 2 minutes global timeout
test.slow(); // Extend timeouts for all tests by 3x
import { HomePage } from './pages/HomePage';
import { RegistrationModal } from './pages/RegistrationModal';
import { UpgradeModal } from './pages/UpgradeModal';
import { generateTestUser } from './utils/testDataGenerator';

test.describe('Upgrade Flow', () => {
  let homePage: HomePage;
  let registrationModal: RegistrationModal;
  let upgradeModal: UpgradeModal;
  
  // Test user credentials with unique email for each test run
  // Using crypto.randomUUID() instead of Date.now() to prevent collisions in parallel test execution
  const testUser = generateTestUser({
    password: 'Test@1234!'
  });

  test.beforeEach(async ({ page }, testInfo) => {
    // Add a 30-second timeout for setup
    testInfo.setTimeout(30000);
    // Mock network requests for consistent test environment
    await page.route('**/api/*', route => {
      // Default mock response for any API requests
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    homePage = new HomePage(page);
    registrationModal = new RegistrationModal(page);
    upgradeModal = new UpgradeModal(page);
    
    // Navigate to the home page
    await homePage.goto();
    await homePage.waitForPageLoad();
  });

  test('should show upgrade button for free tier users', async ({ page }, testInfo) => {
    testInfo.setTimeout(60000); // 1 minute timeout for this test
    
    // Mock the registration API response
    await page.route('**/api/register', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'test-user-123',
            email: testUser.email,
            name: testUser.name,
            company: testUser.company,
            subscription_tier: 'free',
            usage_count: 0,
            usage_limit: 1
          },
          token: 'test-jwt-token-123'
        })
      });
    });

    // Register a new test user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Verify user is logged in and upgrade button is visible
    await expect(page.getByText(new RegExp(`Welcome, ${testUser.name}`, 'i'))).toBeVisible({ timeout: 10000 });
    await expect(homePage.upgradeButton).toBeVisible();
  });

  test('should display upgrade modal with correct features', async ({ page }, testInfo) => {
    testInfo.setTimeout(90000); // 1.5 minute timeout for this test
    
    // Mock the registration API response
    await page.route('**/api/register', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'test-user-123',
            email: testUser.email,
            name: testUser.name,
            company: testUser.company,
            subscription_tier: 'free',
            usage_count: 0,
            usage_limit: 1
          },
          token: 'test-jwt-token-123'
        })
      });
    });

    // Register a new test user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Open upgrade modal
    await homePage.upgradeButton.click();
    
    // Verify modal content with retries for stability
    await upgradeModal.waitForVisible(15000);
    await expect(upgradeModal.heading).toBeVisible();
    
    // Verify feature lists with retries for stability
    await expect(async () => {
      await upgradeModal.verifyFreeTierFeatures();
      await upgradeModal.verifyProTierFeatures();
    }).toPass({ timeout: 10000 });
  });

  test('should show upgrade prompt when free tier limit is reached', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000); // 2 minute timeout for this test
    
    // Mock the registration API response
    await page.route('**/api/register', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'test-user-123',
            email: testUser.email,
            name: testUser.name,
            company: testUser.company,
            subscription_tier: 'free',
            usage_count: 0,
            usage_limit: 1
          },
          token: 'test-jwt-token-123'
        })
      });
    });

    // Register a new test user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Mock the first search response (successful)
    await page.route('**/api/grants/search*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          grants: [
            { id: 'grant-1', title: 'Test Grant', agency: 'Test Agency' }
          ]
        })
      });
    });
    
    // Perform first search (should succeed)
    await homePage.performSearch('AI');
    
    // Mock the second search response (limit reached)
    await page.route('**/api/grants/search*', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Usage limit reached',
          upgrade_required: true,
          message: 'You have reached your free tier limit. Please upgrade to Pro.'
        })
      });
    });
    
    // Try to perform another search
    await homePage.performSearch('blockchain');
    
    // Verify upgrade prompt is shown
    await expect(page.getByText(/you['"]?ve reached your free limit/i)).toBeVisible({ timeout: 10000 });
    await expect(homePage.upgradeButton).toBeVisible();
  });

  test('should allow proceeding to checkout', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000); // 2 minute timeout for this test
    
    // Mock the registration API response
    await page.route('**/api/register', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'test-user-123',
            email: testUser.email,
            name: testUser.name,
            company: testUser.company,
            subscription_tier: 'free',
            usage_count: 0,
            usage_limit: 1
          },
          token: 'test-jwt-token-123'
        })
      });
    });

    // Register a new test user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Open upgrade modal
    await homePage.upgradeButton.click();
    await upgradeModal.waitForVisible(15000);
    
    // Mock the API response for checkout session creation
    await page.route('**/api/stripe/create-checkout*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          checkout_url: 'https://checkout.stripe.com/test_123',
          session_id: 'test_session_123'
        })
      });
    });
    
    // Mock the success URL to prevent actual navigation to Stripe
    await page.route('https://checkout.stripe.com/test_123', route => {
      route.fulfill({
        status: 200,
        body: 'Mocked Stripe Checkout'
      });
    });
    
    // Click upgrade button and verify navigation to checkout
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'),
      upgradeModal.clickUpgrade()
    ]);
    
    // Verify new tab was opened with checkout URL
    await expect(newPage).toHaveURL(/checkout.stripe.com/);
    
    // Close the checkout page
    await newPage.close();
  });

  test('should handle failed checkout gracefully', async ({ page }, testInfo) => {
    testInfo.setTimeout(90000); // 1.5 minute timeout for this test
    
    // Mock the registration API response
    await page.route('**/api/register', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'test-user-123',
            email: testUser.email,
            name: testUser.name,
            company: testUser.company,
            subscription_tier: 'free',
            usage_count: 0,
            usage_limit: 1
          },
          token: 'test-jwt-token-123'
        })
      });
    });

    // Register a new test user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Open upgrade modal
    await homePage.upgradeButton.click();
    await upgradeModal.waitForVisible(15000);
    
    // Mock a failed API response
    await page.route('**/api/stripe/create-checkout*', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Payment processing failed',
          message: 'Could not create checkout session'
        })
      });
    });
    
    // Spy on page for error message
    const errorPromise = page.waitForEvent('console', msg => 
      msg.type() === 'error' && msg.text().includes('Upgrade failed')
    );
    
    // Click upgrade button
    await upgradeModal.clickUpgrade();
    
    // Wait for error handling to complete
    await expect(async () => {
      const errorMsg = await page.locator('.error-message, [role="alert"]').first();
      await expect(errorMsg).toBeVisible({ timeout: 5000 });
      await expect(errorMsg).toContainText(/error|failed|upgrade/i);
    }).toPass({ timeout: 10000 });
  });

  test('should allow dismissing the upgrade modal', async ({ page }, testInfo) => {
    testInfo.setTimeout(90000); // 1.5 minute timeout for this test
    
    // Mock the registration API response
    await page.route('**/api/register', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'test-user-123',
            email: testUser.email,
            name: testUser.name,
            company: testUser.company,
            subscription_tier: 'free',
            usage_count: 0,
            usage_limit: 1
          },
          token: 'test-jwt-token-123'
        })
      });
    });

    // Register a new test user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Open and then close the modal using different methods
    await homePage.upgradeButton.click();
    await upgradeModal.waitForVisible(15000);
    
    // Test close button
    await upgradeModal.close();
    await expect(upgradeModal.modal).not.toBeVisible({ timeout: 5000 });
    
    // Reopen modal
    await homePage.upgradeButton.click();
    await upgradeModal.waitForVisible(15000);
    
    // Test "Maybe Later" button
    await upgradeModal.clickMaybeLater();
    await expect(upgradeModal.modal).not.toBeVisible({ timeout: 5000 });
  });
});
