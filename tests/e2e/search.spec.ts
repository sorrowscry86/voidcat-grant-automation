import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { mockGrantSearchAPI, mockGrantSearchAPIEmpty, mockGrantSearchAPIFailure } from './utils/apiMockHelpers';

let homePage: HomePage;

test.describe('Grant Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocking before navigating to the page
    await mockGrantSearchAPI(page);
    
    homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForPageLoad();
  });

  test('should allow searching with keywords only', async () => {
    const searchKeywords = 'artificial intelligence';
    
    await homePage.searchFor(searchKeywords);
    await homePage.waitForSearchResults();
    
    // Verify search input maintains the value
    await expect(homePage.searchInput).toHaveValue(searchKeywords);
    
    // Check for either API results or demo data fallback
    await homePage.verifySearchResults();
  });

  test('should allow filtering by agency', async () => {
    await homePage.searchFor('AI', 'Department of Defense');
    await homePage.waitForSearchResults();
    
    // Verify form maintains values
    await expect(homePage.searchInput).toHaveValue('AI');
    await expect(homePage.agencySelect).toHaveValue('defense');
    
    // Check for either API results or demo data fallback
    await homePage.verifySearchResults();
  });

  test('should handle different agency selections', async () => {
    const testCases = [
      { agency: 'National Science Foundation', value: 'nsf' },
      { agency: 'Department of Energy', value: 'energy' },
      { agency: 'DARPA', value: 'darpa' },
      { agency: 'NASA', value: 'nasa' }
    ];

    for (const testCase of testCases) {
      await homePage.agencySelect.selectOption(testCase.agency);
      await expect(homePage.agencySelect).toHaveValue(testCase.value);
    }
  });

  test('should reset to All Agencies option', async () => {
    // First select a specific agency
    await homePage.agencySelect.selectOption('Department of Defense');
    await expect(homePage.agencySelect).toHaveValue('defense');
    
    // Then reset to All Agencies
    await homePage.agencySelect.selectOption('All Agencies');
    await expect(homePage.agencySelect).toHaveValue('');
  });

  test('should show loading state during search', async () => {
    // Fill search input
    await homePage.searchInput.fill('robotics');
    
    // Click search and immediately check for loading state
    await homePage.searchButton.click();
    
    // The button should show "Searching..." temporarily
    await expect(homePage.searchButton).toContainText('Searching...');
    
    // Wait for search to complete
    await homePage.waitForSearchResults();
    
    // Button should return to normal state
    await expect(homePage.searchButton).toContainText('Search Grants');
  });

  test.describe('Search Input Validation', () => {
    test('should accept various search terms', async () => {
      const searchTerms = [
        'AI',
        'artificial intelligence',
        'defense technology',
        'renewable energy',
        'biomedical research',
        'cybersecurity'
      ];

      for (const term of searchTerms) {
        await homePage.searchInput.clear();
        await homePage.searchInput.fill(term);
        await expect(homePage.searchInput).toHaveValue(term);
      }
    });

    test('should handle empty search', async () => {
      await homePage.searchInput.clear();
      await homePage.searchButton.click();
      await homePage.waitForSearchResults();
      
      // Should show either results or empty state
      await homePage.verifySearchResults();
    });
  });

  test.describe('Search Results Display', () => {
    test('should display grant cards with correct data', async () => {
      await homePage.searchFor('AI');
      await homePage.waitForSearchResults();
      
      // Verify grant cards are present
      const grantCards = await homePage.page.locator('.grant-card').count();
      expect(grantCards).toBeGreaterThan(0);
      
      // Verify first grant card has expected content
      const firstCard = homePage.page.locator('.grant-card').first();
      await expect(firstCard).toContainText('AI Research Grant');
      await expect(firstCard).toContainText('National Science Foundation');
    });

    test('should display empty state when no results', async ({ page }) => {
      // Mock empty results
      await mockGrantSearchAPIEmpty(page);
      
      await homePage.searchFor('nonexistent grant');
      await homePage.waitForSearchResults();
      
      // Verify empty state is shown
      await homePage.verifyEmptyState();
    });

    test('should show error message when API fails', async ({ page }) => {
      // Mock API failure
      await mockGrantSearchAPIFailure(page);
      
      await homePage.searchFor('AI');
      await homePage.waitForSearchResults();
      
      // Should show error notification
      const errorMessage = page.getByText(/temporarily unavailable/i);
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Search Persistence', () => {
    test('should maintain search parameters after search', async () => {
      const searchTerm = 'defense technology';
      const agency = 'Department of Defense';
      
      await homePage.searchFor(searchTerm, agency);
      await homePage.waitForSearchResults();
      
      // Verify values are maintained
      await expect(homePage.searchInput).toHaveValue(searchTerm);
      await expect(homePage.agencySelect).toHaveValue('defense');
    });
  });
});