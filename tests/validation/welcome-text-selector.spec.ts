/**
 * Test Validation for Welcome Text Selector
 * 
 * This file validates the selector logic used in the fix for the
 * "Welcome, " text visibility timeout issue.
 * 
 * To run this validation:
 * npx playwright test tests/validation/welcome-text-selector.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Welcome Text Selector Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Create a mock HTML page that simulates the Alpine.js structure
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
      </head>
      <body>
        <div x-data="{ user: null }">
          <!-- Button to simulate registration -->
          <button @click="user = { name: 'Test User', email: 'test@example.com', subscription_tier: 'free' }">
            Register
          </button>
          
          <!-- Welcome message that appears after registration -->
          <template x-if="user">
            <div class="text-right">
              <p class="text-sm text-gray-600">Welcome, <span x-text="user.name || user.email"></span></p>
              <p class="text-xs text-gray-500 capitalize">Tier: <span x-text="user.subscription_tier"></span></p>
            </div>
          </template>
        </div>
      </body>
      </html>
    `);
    
    // Wait for Alpine.js to initialize
    await page.waitForTimeout(500);
  });

  test('should NOT find welcome text before registration', async ({ page }) => {
    // The welcome message should not be visible initially
    const welcomeText = page.locator('.text-right p.text-sm.text-gray-600').filter({ hasText: 'Welcome,' });
    await expect(welcomeText).not.toBeVisible();
  });

  test('should find welcome text after simulated registration', async ({ page }) => {
    // Click the register button to set the user
    await page.click('button:has-text("Register")');
    
    // Wait for Alpine.js to update the DOM (simulating our fix)
    await page.waitForTimeout(1000);
    
    // The new selector should find the welcome message
    const welcomeText = page.locator('.text-right p.text-sm.text-gray-600').filter({ hasText: 'Welcome,' });
    await expect(welcomeText).toBeVisible({ timeout: 20000 });
  });

  test('should verify welcome text contains user name', async ({ page }) => {
    // Click the register button to set the user
    await page.click('button:has-text("Register")');
    
    // Wait for Alpine.js to update the DOM
    await page.waitForTimeout(1000);
    
    // Verify the welcome text contains the expected content
    const welcomeText = page.locator('.text-right p.text-sm.text-gray-600').filter({ hasText: 'Welcome,' });
    await expect(welcomeText).toContainText('Test User');
  });

  test('NEW SELECTOR is more specific and reliable', async ({ page }) => {
    // Add an extra element with "Welcome, " text to test selector specificity
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.innerHTML = '<p>Welcome, to our app!</p>';
      document.body.appendChild(div);
    });
    
    // Click the register button to set the user
    await page.click('button:has-text("Register")');
    
    // Wait for Alpine.js to update the DOM
    await page.waitForTimeout(1000);
    
    // The new selector should ONLY match the welcome message in the header,
    // not the extra text we added
    const welcomeText = page.locator('.text-right p.text-sm.text-gray-600').filter({ hasText: 'Welcome,' });
    
    // Count should be exactly 1, not 2
    await expect(welcomeText).toHaveCount(1);
    
    // And it should contain the user name
    await expect(welcomeText).toContainText('Test User');
  });
});

test.describe('Selector Performance Comparison', () => {
  test('compare old vs new selector specificity', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <div class="text-right">
          <p class="text-sm text-gray-600">Welcome, John Doe</p>
        </div>
        <div>
          <p>Welcome, to our site</p>
        </div>
        <div>
          <span>Welcome, everyone</span>
        </div>
      </body>
      </html>
    `);
    
    // Old selector matches ALL of these
    const oldSelector = page.locator('text=/Welcome, /');
    const oldCount = await oldSelector.count();
    console.log('Old selector matches:', oldCount, 'elements');
    
    // New selector only matches the specific one
    const newSelector = page.locator('.text-right p.text-sm.text-gray-600').filter({ hasText: 'Welcome,' });
    const newCount = await newSelector.count();
    console.log('New selector matches:', newCount, 'element(s)');
    
    // Verify the new selector is more specific
    expect(newCount).toBeLessThan(oldCount);
    expect(newCount).toBe(1);
  });
});
