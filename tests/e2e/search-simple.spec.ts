import { test, expect } from '@playwright/test';
import { mockGrantSearchAPI } from './utils/apiMockHelpers';

test('simple search test', async ({ page }) => {
  // Listen to console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('grant') || text.includes('search') || text.includes('API')) {
      console.log('PAGE LOG:', text);
    }
  });
  
  // Listen to API requests
  page.on('request', request => {
    if (request.url().includes('localhost:8787') || request.url().includes('/api/grants')) {
      console.log('API REQUEST:', request.method(), request.url());
    }
  });
  page.on('response', response => {
    if (response.url().includes('localhost:8787') || response.url().includes('/api/grants')) {
      console.log('API RESPONSE:', response.status(), response.url());
    }
  });
  
  // Setup API mocking
  await mockGrantSearchAPI(page);
  
  // Navigate to the page
  console.log('Navigating to page...');
  await page.goto('/?e2e_skip_autosearch=1');
  
  console.log('Waiting for page to load...');
  await page.waitForLoadState('load', { timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  
  // Wait for Alpine.js to load
  console.log('Waiting for Alpine.js...');
  await page.waitForFunction(
    () => typeof window.Alpine !== 'undefined',
    null,
    { timeout: 30000 }
  );
  console.log('Alpine.js is loaded!');
  
  // Give Alpine time to initialize
  await page.waitForTimeout(2000);
  
  console.log('Checking for title...');
  const title = await page.locator('h1').first().textContent();
  console.log('Title:', title);
  
  expect(title).toContain('VoidCat');
  
  // Test search functionality
  console.log('Testing search...');
  const searchInput = page.getByRole('textbox', { name: /Search keywords/ });
  const searchButton = page.getByRole('button', { name: /Search Grants/ });
  
  // Check if elements are visible
  await expect(searchInput).toBeVisible();
  await expect(searchButton).toBeVisible();
  
  await searchInput.fill('AI');
  console.log('Clicking search button...');
  await searchButton.click();
  
  // Wait for results
  console.log('Waiting for results...');
  await page.waitForTimeout(5000);
  
  // Check if grant cards appear
  const grantCards = page.locator('.grant-card');
  const count = await grantCards.count();
  console.log(`Found ${count} grant cards`);
  
  // Check page content
  const bodyText = await page.locator('body').innerText();
  console.log('Body contains "No grants found":', bodyText.includes('No grants found'));
  console.log('Body contains "temporarily unavailable":', bodyText.includes('temporarily unavailable'));
  
  if (count === 0) {
    // Take screenshot for debugging
    await page.screenshot({ path: '/tmp/search-debug.png' });
    console.log('Screenshot saved to /tmp/search-debug.png');
  }
  
  expect(count).toBeGreaterThan(0);
  
  console.log('Test passed!');
});

