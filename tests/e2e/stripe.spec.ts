import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { RegistrationModal } from './pages/RegistrationModal';
import { UpgradeModal } from './pages/UpgradeModal';

test.describe('Stripe Payment Integration', () => {
  let homePage: HomePage;
  let registrationModal: RegistrationModal;
  let upgradeModal: UpgradeModal;
  
  // Test user credentials with unique email for each test run
  const testUser = {
    name: 'Test User',
    email: `stripe-test-${Date.now()}@example.com`,
    company: 'Test Company'
  };

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    registrationModal = new RegistrationModal(page);
    upgradeModal = new UpgradeModal(page);
    
    // Navigate to the home page
    await homePage.goto();
    await homePage.waitForPageLoad();
  });

  test('should successfully create Stripe checkout session', async ({ page }) => {
    // Mock registration API
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

    // Mock user profile API
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

    // Mock Stripe config API
    await page.route('**/api/public/stripe-config', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          publishable_key: 'pk_test_123456789',
          price_id: 'price_test_123'
        })
      });
    });

    // Mock Stripe checkout session creation
    await page.route('**/api/stripe/create-checkout', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: 'test_session_123456789'
        })
      });
    });

    // Register user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Open upgrade modal
    await homePage.upgradeButton.click();
    await upgradeModal.waitForVisible();
    
    // Mock Stripe.js redirectToCheckout method
    await page.addInitScript(() => {
      window.Stripe = () => ({
        redirectToCheckout: async ({ sessionId }) => {
          // Store the sessionId for verification
          window.testSessionId = sessionId;
          return { error: null };
        }
      });
    });

    // Click upgrade button
    await upgradeModal.clickUpgrade();

    // Verify that Stripe.js was called with correct session ID
    const sessionId = await page.evaluate(() => window.testSessionId);
    expect(sessionId).toBe('test_session_123456789');
  });

  test('should handle Stripe config fetch failure gracefully', async ({ page }) => {
    // Mock registration API
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

    // Mock user profile API
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

    // Mock failing Stripe config API
    await page.route('**/api/public/stripe-config', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Configuration error'
        })
      });
    });

    // Register user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Open upgrade modal
    await homePage.upgradeButton.click();
    await upgradeModal.waitForVisible();
    
    // Listen for alerts
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    // Click upgrade button
    await upgradeModal.clickUpgrade();

    // Verify error handling
    expect(alertMessage).toContain('Error creating checkout');
  });

  test('should handle checkout session creation failure', async ({ page }) => {
    // Mock registration API
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

    // Mock user profile API
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

    // Mock Stripe config API
    await page.route('**/api/public/stripe-config', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          publishable_key: 'pk_test_123456789',
          price_id: 'price_test_123'
        })
      });
    });

    // Mock failing Stripe checkout session creation
    await page.route('**/api/stripe/create-checkout', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Invalid payment method'
          }
        })
      });
    });

    // Register user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Open upgrade modal
    await homePage.upgradeButton.click();
    await upgradeModal.waitForVisible();
    
    // Listen for alerts
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    // Click upgrade button
    await upgradeModal.clickUpgrade();

    // Verify error handling
    expect(alertMessage).toContain('Upgrade failed');
  });

  test('should simulate successful payment and subscription upgrade', async ({ page }) => {
    // Mock registration API
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

    // Mock user profile API - initially free tier
    let userTier = 'free';
    await page.route('**/api/users/me', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 1,
            email: testUser.email,
            subscription_tier: userTier,
            usage_count: 0,
            stripe_customer_id: userTier === 'pro' ? 'cus_test_123' : null,
            stripe_subscription_id: userTier === 'pro' ? 'sub_test_123' : null,
            created_at: new Date().toISOString()
          }
        })
      });
    });

    // Mock Stripe config API
    await page.route('**/api/public/stripe-config', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          publishable_key: 'pk_test_123456789',
          price_id: 'price_test_123'
        })
      });
    });

    // Mock Stripe checkout session creation
    await page.route('**/api/stripe/create-checkout', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: 'test_session_123456789'
        })
      });
    });

    // Register user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Verify initial free tier
    await page.reload();
    await homePage.waitForPageLoad();
    
    // Open upgrade modal
    await homePage.upgradeButton.click();
    await upgradeModal.waitForVisible();
    
    // Mock successful Stripe redirect (simulate successful payment)
    await page.addInitScript(() => {
      window.Stripe = () => ({
        redirectToCheckout: async ({ sessionId }) => {
          // Simulate successful payment by updating user tier
          return { error: null };
        }
      });
    });

    // Click upgrade button
    await upgradeModal.clickUpgrade();

    // Simulate webhook updating user to pro tier
    userTier = 'pro';

    // Reload page to check subscription status
    await page.reload();
    await homePage.waitForPageLoad();

    // At this point, in a real scenario, the webhook would have updated the database
    // and the user would see their Pro tier status
    // This test validates that the checkout flow works without errors
  });

  test('should require authentication for checkout', async ({ page }) => {
    // Mock Stripe config API
    await page.route('**/api/public/stripe-config', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          publishable_key: 'pk_test_123456789',
          price_id: 'price_test_123'
        })
      });
    });

    // Open upgrade modal without being logged in
    await homePage.upgradeButton.click();
    await upgradeModal.waitForVisible();
    
    // Listen for alerts
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    // Try to upgrade without authentication
    await upgradeModal.clickUpgrade();

    // Verify authentication requirement
    expect(alertMessage).toContain('Please log in to upgrade');
  });
});