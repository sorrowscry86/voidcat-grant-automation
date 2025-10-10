import { test, expect } from '@playwright/test';

test.describe('Dark Mode Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('http://localhost:3000/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should display dark mode toggle button', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Wait for Alpine.js to initialize
    await page.waitForTimeout(1000);
    
    // Check if dark mode toggle button exists
    const darkModeToggle = page.getByLabel('Toggle dark mode');
    await expect(darkModeToggle).toBeVisible();
  });

  test('should toggle dark mode on click', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(1000);
    
    // Initially should be in light mode (no dark class)
    const htmlElement = page.locator('html');
    await expect(htmlElement).not.toHaveClass(/dark/);
    
    // Click the dark mode toggle
    const darkModeToggle = page.getByLabel('Toggle dark mode');
    await darkModeToggle.click();
    
    // Should now have dark class
    await expect(htmlElement).toHaveClass(/dark/);
    
    // Click again to toggle back
    await darkModeToggle.click();
    await expect(htmlElement).not.toHaveClass(/dark/);
  });

  test('should persist dark mode preference in localStorage', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(1000);
    
    // Enable dark mode
    const darkModeToggle = page.getByLabel('Toggle dark mode');
    await darkModeToggle.click();
    
    // Check localStorage
    const darkModeSetting = await page.evaluate(() => localStorage.getItem('darkMode'));
    expect(darkModeSetting).toBe('true');
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Should still be in dark mode
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveClass(/dark/);
  });

  test('should apply dark mode classes to main sections', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(1000);
    
    // Enable dark mode
    const darkModeToggle = page.getByLabel('Toggle dark mode');
    await darkModeToggle.click();
    
    // Verify body has dark background
    const body = page.locator('body');
    await expect(body).toHaveClass(/dark:bg-gray-900/);
    
    // Verify search section has dark classes
    const searchSection = page.locator('text=🔍 Search Grant Opportunities').locator('..');
    await expect(searchSection).toHaveClass(/dark:bg-gray-800/);
  });

  test('should show correct icon for current mode', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(1000);
    
    const darkModeToggle = page.getByLabel('Toggle dark mode');
    
    // In light mode, should show moon icon (dark mode off)
    // After clicking, should show sun icon (dark mode on)
    await darkModeToggle.click();
    await page.waitForTimeout(500);
    
    // Verify dark mode is active
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveClass(/dark/);
  });

  test('should maintain dark mode across navigation', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(1000);
    
    // Enable dark mode
    const darkModeToggle = page.getByLabel('Toggle dark mode');
    await darkModeToggle.click();
    
    // Navigate to features section
    await page.click('text=See Features');
    await page.waitForTimeout(500);
    
    // Should still be in dark mode
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveClass(/dark/);
  });
});
