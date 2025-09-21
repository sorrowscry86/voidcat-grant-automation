import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { RegistrationModal } from './pages/RegistrationModal';
import { UpgradeModal } from './pages/UpgradeModal';
import { generateTestUser } from './utils/testDataGenerator';
import { TIMEOUTS } from './utils/testUtils';

/**
 * Comprehensive Payment System Stress Tests
 * 
 * This test suite is designed to run multiple times to validate
 * the reliability and consistency of the payment system under
 * repeated usage patterns.
 */

test.describe('Payment System Stress Testing', () => {
  test.describe.configure({ mode: 'serial' }); // Run tests in sequence for better stress testing
  
  let homePage: HomePage;
  let registrationModal: RegistrationModal;
  let upgradeModal: UpgradeModal;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    registrationModal = new RegistrationModal(page);
    upgradeModal = new UpgradeModal(page);
    
    await homePage.goto();
    await homePage.waitForPageLoad();
  });

  test('should handle multiple consecutive checkout attempts', async ({ page }, testInfo) => {
    testInfo.setTimeout(180000); // 3 minutes for this stress test
    
    const iterations = 3;
    const results = [];
    
    for (let i = 1; i <= iterations; i++) {
      const testUser = generateTestUser({ suffix: `stress${i}` });
      
      test.step(`Checkout attempt ${i}/${iterations}`, async () => {
        const startTime = Date.now();
        
        try {
          // Mock successful registration
          await page.route('**/api/users/register', route => {
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                success: true,
                api_key: `stress-test-token-${i}-${Date.now()}`
              })
            });
          });

          // Mock checkout response - testing both success and failure scenarios
          const shouldFail = i === 2; // Make second attempt fail to test error handling
          await page.route('**/api/stripe/create-checkout*', route => {
            if (shouldFail) {
              route.fulfill({
                status: 503,
                contentType: 'application/json',
                body: JSON.stringify({
                  success: false,
                  error: 'Payment service temporarily unavailable. Please try again in a few minutes.',
                  code: 'STRIPE_API_ERROR'
                })
              });
            } else {
              route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                  success: true,
                  sessionId: `cs_test_stress_${i}_${Date.now()}`,
                  url: `https://checkout.stripe.com/pay/cs_test_stress_${i}_${Date.now()}`
                })
              });
            }
          });

          // Register user
          await homePage.clickGetStarted();
          await registrationModal.registerUser(testUser);
          
          // Wait for registration to complete
          await expect(page.locator('text=Welcome')).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
          
          // Attempt to upgrade
          await homePage.upgradeButton.click();
          await upgradeModal.waitForVisible(TIMEOUTS.MEDIUM);
          
          // Click upgrade button
          await upgradeModal.upgradeButton.click();
          
          if (shouldFail) {
            // Expect error handling
            await expect(page.locator('text=/error|failed|unavailable/i')).toBeVisible({ 
              timeout: TIMEOUTS.MEDIUM 
            });
            
            // Verify user can retry
            await expect(upgradeModal.upgradeButton).toBeVisible({ timeout: TIMEOUTS.SHORT });
            
            results.push({
              attempt: i,
              success: false,
              expectedFailure: true,
              responseTime: Date.now() - startTime,
              error: 'Expected failure for error handling test'
            });
          } else {
            // Expect successful redirect simulation
            await expect(page.locator('text=/loading|processing|redirecting/i')).toBeVisible({ 
              timeout: TIMEOUTS.MEDIUM 
            });
            
            results.push({
              attempt: i,
              success: true,
              expectedFailure: false,
              responseTime: Date.now() - startTime
            });
          }
          
        } catch (error) {
          results.push({
            attempt: i,
            success: false,
            expectedFailure: shouldFail,
            responseTime: Date.now() - startTime,
            error: error.message
          });
          
          if (!shouldFail) {
            throw error; // Re-throw unexpected errors
          }
        }
        
        // Wait between attempts
        if (i < iterations) {
          await page.waitForTimeout(2000);
        }
      });
    }
    
    // Analyze results
    const successfulAttempts = results.filter(r => r.success).length;
    const expectedFailures = results.filter(r => r.expectedFailure).length;
    const unexpectedFailures = results.filter(r => !r.success && !r.expectedFailure).length;
    
    console.log('Stress Test Results:', {
      totalAttempts: iterations,
      successful: successfulAttempts,
      expectedFailures,
      unexpectedFailures,
      averageResponseTime: Math.round(
        results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
      )
    });
    
    // Verify acceptable success rate (should handle expected failures gracefully)
    expect(unexpectedFailures).toBe(0);
    expect(successfulAttempts).toBeGreaterThanOrEqual(iterations - expectedFailures);
  });

  test('should maintain session state across multiple payment attempts', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000); // 2 minutes
    
    const testUser = generateTestUser({ suffix: 'session' });
    
    // Mock registration
    await page.route('**/api/users/register', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          api_key: `session-test-token-${Date.now()}`
        })
      });
    });

    // Register user once
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    await expect(page.locator('text=Welcome')).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    
    // Attempt multiple payment flows
    for (let attempt = 1; attempt <= 3; attempt++) {
      await test.step(`Payment attempt ${attempt}`, async () => {
        // Mock checkout response
        await page.route('**/api/stripe/create-checkout*', route => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              sessionId: `cs_test_session_${attempt}_${Date.now()}`
            })
          });
        });
        
        // Open upgrade modal
        await homePage.upgradeButton.click();
        await upgradeModal.waitForVisible(TIMEOUTS.MEDIUM);
        
        // Verify user info is preserved
        await expect(page.locator(`text=${testUser.email}`)).toBeVisible({ 
          timeout: TIMEOUTS.SHORT 
        });
        
        // Close modal for next attempt (except last)
        if (attempt < 3) {
          await upgradeModal.closeButton.click();
          await upgradeModal.waitForHidden(TIMEOUTS.SHORT);
        }
      });
    }
  });

  test('should handle rapid successive payment requests', async ({ page }, testInfo) => {
    testInfo.setTimeout(90000); // 1.5 minutes
    
    const testUser = generateTestUser({ suffix: 'rapid' });
    
    // Mock registration
    await page.route('**/api/users/register', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          api_key: `rapid-test-token-${Date.now()}`
        })
      });
    });

    // Register user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    await expect(page.locator('text=Welcome')).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    
    // Track checkout requests
    const checkoutRequests = [];
    await page.route('**/api/stripe/create-checkout*', route => {
      checkoutRequests.push({
        timestamp: Date.now(),
        url: route.request().url(),
        method: route.request().method()
      });
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          sessionId: `cs_test_rapid_${checkoutRequests.length}_${Date.now()}`
        })
      });
    });
    
    // Make rapid successive requests
    await homePage.upgradeButton.click();
    await upgradeModal.waitForVisible(TIMEOUTS.MEDIUM);
    
    // Click upgrade button multiple times rapidly
    for (let i = 0; i < 3; i++) {
      await upgradeModal.upgradeButton.click({ delay: 100 });
    }
    
    // Wait for processing
    await page.waitForTimeout(3000);
    
    // Verify only one request was made (button should be disabled after first click)
    expect(checkoutRequests.length).toBeLessThanOrEqual(1);
    
    // Verify button state
    await expect(upgradeModal.upgradeButton).toBeDisabled();
  });

  test('should recover from network timeouts gracefully', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000); // 2 minutes
    
    const testUser = generateTestUser({ suffix: 'timeout' });
    
    // Mock registration
    await page.route('**/api/users/register', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          api_key: `timeout-test-token-${Date.now()}`
        })
      });
    });

    // Mock slow/timeout checkout response
    let attemptCount = 0;
    await page.route('**/api/stripe/create-checkout*', async route => {
      attemptCount++;
      
      if (attemptCount === 1) {
        // First attempt: simulate timeout
        await new Promise(resolve => setTimeout(resolve, 35000)); // Longer than typical timeout
        route.abort('timeout');
      } else {
        // Second attempt: succeed
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            sessionId: `cs_test_timeout_recovery_${Date.now()}`
          })
        });
      }
    });
    
    // Register user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    await expect(page.locator('text=Welcome')).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    
    // First attempt (should timeout)
    await homePage.upgradeButton.click();
    await upgradeModal.waitForVisible(TIMEOUTS.MEDIUM);
    await upgradeModal.upgradeButton.click();
    
    // Wait for timeout error
    await expect(page.locator('text=/timeout|error|try again/i')).toBeVisible({ 
      timeout: 45000 
    });
    
    // Verify user can retry
    await expect(upgradeModal.upgradeButton).toBeEnabled();
    
    // Second attempt (should succeed)
    await upgradeModal.upgradeButton.click();
    await expect(page.locator('text=/processing|redirecting/i')).toBeVisible({ 
      timeout: TIMEOUTS.MEDIUM 
    });
  });

  test('should validate payment form data integrity', async ({ page }, testInfo) => {
    testInfo.setTimeout(60000); // 1 minute
    
    const testUser = generateTestUser({ suffix: 'validation' });
    
    // Mock registration
    await page.route('**/api/users/register', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          api_key: `validation-test-token-${Date.now()}`
        })
      });
    });

    // Capture and validate checkout request
    let checkoutRequestData = null;
    await page.route('**/api/stripe/create-checkout*', async route => {
      const request = route.request();
      const requestBody = request.postData();
      
      try {
        checkoutRequestData = JSON.parse(requestBody);
      } catch (e) {
        checkoutRequestData = { error: 'Invalid JSON' };
      }
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          sessionId: `cs_test_validation_${Date.now()}`
        })
      });
    });
    
    // Register user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    await expect(page.locator('text=Welcome')).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    
    // Initiate payment
    await homePage.upgradeButton.click();
    await upgradeModal.waitForVisible(TIMEOUTS.MEDIUM);
    await upgradeModal.upgradeButton.click();
    
    // Wait for request to be captured
    await page.waitForTimeout(2000);
    
    // Validate request data
    expect(checkoutRequestData).toBeTruthy();
    expect(checkoutRequestData.email).toBe(testUser.email);
    expect(checkoutRequestData.plan).toBe('pro');
    expect(checkoutRequestData.error).toBeUndefined();
  });
});