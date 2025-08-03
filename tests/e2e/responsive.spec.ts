import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { RegistrationModal } from './pages/RegistrationModal';

test.describe('Responsive Design Tests', () => {
  let homePage: HomePage;
  let registrationModal: RegistrationModal;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    registrationModal = new RegistrationModal(page);
  });

  test.describe('Desktop Layout', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await homePage.goto();
      await homePage.waitForPageLoad();
    });

    test('should display desktop layout correctly', async () => {
      // Header should be horizontal layout
      await expect(homePage.title).toBeVisible();
      await expect(homePage.getStartedButton).toBeVisible();
      
      // Search form should be in grid layout (3 columns)
      await expect(homePage.searchInput).toBeVisible();
      await expect(homePage.agencySelect).toBeVisible();
      await expect(homePage.searchButton).toBeVisible();
      
      // After auto-search, features should be hidden but empty state should be visible
      await homePage.waitForSearchResults();
      await homePage.verifyEmptyState();
    });
  });

  test.describe('Tablet Layout', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await homePage.goto();
      await homePage.waitForPageLoad();
    });

    test('should adapt to tablet viewport', async () => {
      // All main elements should still be visible
      await expect(homePage.title).toBeVisible();
      await expect(homePage.getStartedButton).toBeVisible();
      await expect(homePage.searchInput).toBeVisible();
      await expect(homePage.agencySelect).toBeVisible();
      await expect(homePage.searchButton).toBeVisible();
    });

    test('should show registration modal properly on tablet', async () => {
      await homePage.clickGetStarted();
      await registrationModal.waitForVisible();
      
      // Modal should be responsive
      await expect(registrationModal.heading).toBeVisible();
      await expect(registrationModal.nameInput).toBeVisible();
      await expect(registrationModal.emailInput).toBeVisible();
    });
  });

  test.describe('Mobile Layout', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await homePage.goto();
      await homePage.waitForPageLoad();
    });

    test('should adapt to mobile viewport', async () => {
      // All elements should be stacked vertically and visible
      await expect(homePage.title).toBeVisible();
      await expect(homePage.subtitle).toBeVisible();
      await expect(homePage.getStartedButton).toBeVisible();
      
      // Search elements should stack
      await expect(homePage.searchInput).toBeVisible();
      await expect(homePage.agencySelect).toBeVisible();
      await expect(homePage.searchButton).toBeVisible();
    });

    test('should handle mobile search interaction', async () => {
      await homePage.searchFor('mobile test', 'NASA');
      await homePage.waitForSearchResults();
      
      // Should maintain values
      await expect(homePage.searchInput).toHaveValue('mobile test');
      await expect(homePage.agencySelect).toHaveValue('nasa');
      
      // Empty state should be visible
      await homePage.verifyEmptyState();
    });

    test('should show mobile registration modal', async () => {
      await homePage.clickGetStarted();
      await registrationModal.waitForVisible();
      
      // Modal should adapt to mobile screen
      await expect(registrationModal.heading).toBeVisible();
      await expect(registrationModal.nameInput).toBeVisible();
      await expect(registrationModal.emailInput).toBeVisible();
      await expect(registrationModal.companyInput).toBeVisible();
      
      // Buttons should be properly sized for mobile
      await expect(registrationModal.registerButton).toBeVisible();
      await expect(registrationModal.cancelButton).toBeVisible();
    });

    test('should handle mobile form input', async () => {
      await homePage.clickGetStarted();
      await registrationModal.waitForVisible();
      
      // Fill form on mobile
      await registrationModal.fillRegistrationForm(
        'Mobile User',
        'mobile@example.com',
        'Mobile Corp'
      );
      
      // Values should be maintained
      await expect(registrationModal.nameInput).toHaveValue('Mobile User');
      await expect(registrationModal.emailInput).toHaveValue('mobile@example.com');
      await expect(registrationModal.companyInput).toHaveValue('Mobile Corp');
    });
  });

  test.describe('Touch Interactions', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await homePage.goto();
      await homePage.waitForPageLoad();
    });

    test('should handle touch interactions for buttons', async () => {
      // Touch Get Started button
      await homePage.getStartedButton.click();
      await registrationModal.waitForVisible();
      
      // Touch Cancel button
      await registrationModal.cancelButton.click();
      await registrationModal.verifyModalClosed();
    });

    test('should handle touch interactions for form elements', async () => {
      await homePage.clickGetStarted();
      await registrationModal.waitForVisible();
      
      // Touch and fill input fields
      await registrationModal.nameInput.click();
      await registrationModal.nameInput.fill('Touch User');
      
      await registrationModal.emailInput.click();
      await registrationModal.emailInput.fill('touch@example.com');
      
      // Verify values
      await expect(registrationModal.nameInput).toHaveValue('Touch User');
      await expect(registrationModal.emailInput).toHaveValue('touch@example.com');
    });
  });
});