import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { RegistrationModal } from './pages/RegistrationModal';

test.describe('User Registration Flow', () => {
  let homePage: HomePage;
  let registrationModal: RegistrationModal;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    registrationModal = new RegistrationModal(page);
    await homePage.goto();
    await homePage.waitForPageLoad();
  });

  test('should open registration modal when Get Started is clicked', async () => {
    await homePage.clickGetStarted();
    await registrationModal.waitForVisible();
    
    // Verify modal content
    await expect(registrationModal.heading).toHaveText('🚀 Register for Free Access');
    await registrationModal.verifyTierInfo();
  });

  test('should display all required form fields', async () => {
    await homePage.clickGetStarted();
    await registrationModal.waitForVisible();
    
    // Check all form fields are present
    await expect(registrationModal.nameInput).toBeVisible();
    await expect(registrationModal.emailInput).toBeVisible();
    await expect(registrationModal.companyInput).toBeVisible();
    
    // Check placeholders
    await expect(registrationModal.nameInput).toHaveAttribute('placeholder', 'Full Name');
    await expect(registrationModal.emailInput).toHaveAttribute('placeholder', 'Email Address');
    await expect(registrationModal.companyInput).toHaveAttribute('placeholder', 'Company Name (Optional)');
    
    // Check input types
    await expect(registrationModal.emailInput).toHaveAttribute('type', 'email');
    
    // Check required attributes
    await expect(registrationModal.nameInput).toHaveAttribute('required');
    await expect(registrationModal.emailInput).toHaveAttribute('required');
    await expect(registrationModal.companyInput).not.toHaveAttribute('required');
  });

  test('should allow filling out registration form', async () => {
    await homePage.clickGetStarted();
    await registrationModal.waitForVisible();
    
    const testData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      company: 'Awesome Startup Inc'
    };
    
    await registrationModal.fillRegistrationForm(
      testData.name,
      testData.email,
      testData.company
    );
    
    // Verify values are filled
    await expect(registrationModal.nameInput).toHaveValue(testData.name);
    await expect(registrationModal.emailInput).toHaveValue(testData.email);
    await expect(registrationModal.companyInput).toHaveValue(testData.company);
  });

  test('should handle optional company field', async () => {
    await homePage.clickGetStarted();
    await registrationModal.waitForVisible();
    
    await registrationModal.fillRegistrationForm(
      'Jane Smith',
      'jane@example.com'
      // No company provided
    );
    
    await expect(registrationModal.nameInput).toHaveValue('Jane Smith');
    await expect(registrationModal.emailInput).toHaveValue('jane@example.com');
    await expect(registrationModal.companyInput).toHaveValue('');
  });

  test('should close modal when Cancel is clicked', async () => {
    await homePage.clickGetStarted();
    await registrationModal.waitForVisible();
    
    // Fill some data
    await registrationModal.nameInput.fill('Test User');
    
    // Cancel registration
    await registrationModal.cancel();
    await registrationModal.verifyModalClosed();
    
    // Get Started button should be visible again
    await expect(homePage.getStartedButton).toBeVisible();
  });

  test('should validate form before submission', async () => {
    await homePage.clickGetStarted();
    await registrationModal.waitForVisible();
    
    // Try to submit empty form - should be prevented by HTML5 validation
    await registrationModal.registerButton.click();
    
    // Modal should still be visible (form validation prevents submission)
    await expect(registrationModal.heading).toBeVisible();
  });

  test('should handle email validation', async () => {
    await homePage.clickGetStarted();
    await registrationModal.waitForVisible();
    
    // Fill with invalid email
    await registrationModal.fillRegistrationForm(
      'Test User',
      'invalid-email',
      'Test Company'
    );
    
    // Try to submit - HTML5 validation should prevent it
    await registrationModal.registerButton.click();
    
    // Modal should still be visible
    await expect(registrationModal.heading).toBeVisible();
    
    // Email field should show validation error (browser dependent)
    await expect(registrationModal.emailInput).toBeFocused();
  });

  test.describe('Modal Interaction', () => {
    test('should show register button text correctly', async () => {
      await homePage.clickGetStarted();
      await registrationModal.waitForVisible();
      
      // Button should contain Register text (both spans are present but only one is visible)
      await expect(registrationModal.registerButton).toContainText('Register');
    });

    test('should display tier information clearly', async () => {
      await homePage.clickGetStarted();
      await registrationModal.waitForVisible();
      
      await expect(registrationModal.tierInfo).toContainText('Free tier includes 1 grant application per month');
      await expect(registrationModal.tierInfo).toContainText('Upgrade for unlimited access');
    });

    test('should have proper modal styling and accessibility', async () => {
      await homePage.clickGetStarted();
      await registrationModal.waitForVisible();
      
      // Modal should be properly positioned and visible
      const modalElement = registrationModal.modal;
      await expect(modalElement).toBeVisible();
      
      // All form elements should be accessible
      await expect(registrationModal.nameInput).toBeEnabled();
      await expect(registrationModal.emailInput).toBeEnabled();
      await expect(registrationModal.companyInput).toBeEnabled();
    });
  });
});