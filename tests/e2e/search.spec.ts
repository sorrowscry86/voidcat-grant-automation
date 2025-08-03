import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';

test.describe('Grant Search Functionality', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
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
    
    // Should show empty state since API call will fail locally
    await homePage.verifyEmptyState();
  });

  test('should allow filtering by agency', async () => {
    await homePage.searchFor('AI', 'Department of Defense');
    await homePage.waitForSearchResults();
    
    // Verify form maintains values
    await expect(homePage.searchInput).toHaveValue('AI');
    await expect(homePage.agencySelect).toHaveValue('defense');
    
    await homePage.verifyEmptyState();
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
      
      // Should still show results (empty state)
      await homePage.verifyEmptyState();
    });
  });
});