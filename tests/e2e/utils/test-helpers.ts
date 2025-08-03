import { Page } from '@playwright/test';

/**
 * Utility functions for E2E tests
 */

/**
 * Wait for Alpine.js to be fully initialized
 */
export async function waitForAlpine(page: Page) {
  await page.waitForFunction(() => window.Alpine !== undefined);
  await page.waitForFunction(() => window.Alpine.version !== undefined);
}

/**
 * Mock API responses for offline testing
 */
export async function mockAPIResponses(page: Page) {
  await page.route('**/api/grants/search*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        grants: []
      })
    });
  });

  await page.route('**/api/users/register*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          subscription_tier: 'free'
        },
        api_key: 'test-api-key'
      })
    });
  });
}

/**
 * Clear local storage and reset application state
 */
export async function resetAppState(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Take a screenshot with a descriptive filename
 */
export async function takeScreenshot(page: Page, testName: string, step: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${testName}-${step}-${timestamp}.png`;
  await page.screenshot({ 
    path: `test-results/screenshots/${filename}`,
    fullPage: true 
  });
  return filename;
}

/**
 * Wait for any loading states to complete
 */
export async function waitForPageReady(page: Page) {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle');
  
  // Wait for any spinning loaders to disappear
  await page.waitForFunction(() => {
    const spinners = document.querySelectorAll('.animate-spin');
    return Array.from(spinners).every(spinner => {
      const parent = spinner.closest('[x-show]');
      return !parent || getComputedStyle(parent).display === 'none';
    });
  });
}