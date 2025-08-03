import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { RegistrationModal } from './pages/RegistrationModal';

test.describe('VoidCat RDC Homepage', () => {
  let homePage: HomePage;
  let registrationModal: RegistrationModal;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    registrationModal = new RegistrationModal(page);
    await homePage.goto();
  });

  test('should display the main header and branding correctly', async () => {
    await expect(homePage.title).toHaveText('VoidCat RDC');
    await expect(homePage.subtitle).toHaveText('Federal Grant Automation Platform');
    await expect(homePage.statusBadge).toHaveText('🚀 Now Live - MVP Version');
  });

  test('should show get started button for new users', async () => {
    await expect(homePage.getStartedButton).toBeVisible();
    await expect(homePage.getStartedButton).toHaveText('Get Started Free');
  });

  test('should display search interface correctly', async () => {
    await expect(homePage.searchInput).toBeVisible();
    await expect(homePage.searchInput).toHaveAttribute('placeholder', 'Search keywords (AI, defense, energy...)');
    
    await expect(homePage.agencySelect).toBeVisible();
    await expect(homePage.searchButton).toBeVisible();
    
    // Check default agency option
    await expect(homePage.agencySelect).toHaveValue('');
    
    // Verify all agency options are available
    const agencyOptions = await homePage.agencySelect.locator('option').allTextContents();
    expect(agencyOptions).toContain('All Agencies');
    expect(agencyOptions).toContain('Department of Defense');
    expect(agencyOptions).toContain('National Science Foundation');
    expect(agencyOptions).toContain('Department of Energy');
    expect(agencyOptions).toContain('DARPA');
    expect(agencyOptions).toContain('NASA');
  });

  test('should hide features section after search is performed', async () => {
    // Wait for initial search to complete (auto-search on load)
    await homePage.waitForSearchResults();
    
    // After search, features section should be hidden
    await expect(homePage.featuresSection).not.toBeVisible();
  });

  test('should handle empty search results gracefully', async () => {
    // Wait for initial search to complete (auto-search on load)
    await homePage.waitForSearchResults();
    
    // Verify empty state is shown
    await homePage.verifyEmptyState();
    
    // Verify features section is hidden when search is performed
    await expect(homePage.featuresSection).not.toBeVisible();
  });
});