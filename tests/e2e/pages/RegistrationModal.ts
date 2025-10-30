import { Page, Locator, expect } from '@playwright/test';
import { TIMEOUTS, harmonizedButtonClick } from '../utils/testUtils';

export class RegistrationModal {
  readonly page: Page;
  readonly modal: Locator;
  readonly heading: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly companyInput: Locator;
  readonly tierInfo: Locator;
  readonly registerButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('[x-show="showRegister"]');
    this.heading = page.getByRole('heading', { name: '🚀 Register for Free Access' });
    this.nameInput = page.getByRole('textbox', { name: 'Full Name' });
    this.emailInput = page.getByRole('textbox', { name: 'Email Address' });
    this.companyInput = page.getByRole('textbox', { name: 'Company Name (Optional)' });
    this.tierInfo = page.getByText('Free tier includes 1 grant application per month');
    this.registerButton = page.getByRole('button', { name: 'Register' }).or(page.getByRole('button', { name: 'Registering...' }));
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
  }

  async waitForVisible() {
    // Enhanced modal timing fix: wait for page stability before checking modal elements
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
    
    // VICTORY ENHANCEMENT: Sequential visibility with timing harmony and extended timeouts
    await this.heading.waitFor({ state: 'visible', timeout: 60000 });
    await this.nameInput.waitFor({ state: 'visible', timeout: TIMEOUTS.SHORT });
    await this.emailInput.waitFor({ state: 'visible', timeout: TIMEOUTS.SHORT });
    await this.companyInput.waitFor({ state: 'visible', timeout: TIMEOUTS.SHORT });
    
    // Cascade stability pause
    await this.page.waitForTimeout(500);
  }

  async fillRegistrationForm(name: string, email: string, company?: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    if (company) {
      await this.companyInput.fill(company);
    }
  }

  async submitRegistration() {
    // VICTORY ENHANCEMENT: Harmonized submission with cascade timing
    await harmonizedButtonClick(this.page, this.registerButton, {
      timeout: TIMEOUTS.MEDIUM,
      maxRetries: 3,
      gracePeriod: 750
    });
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async verifyModalClosed() {
    await expect(this.heading).not.toBeVisible();
  }

  async verifyTierInfo() {
    await expect(this.tierInfo).toBeVisible();
  }

  async registerUser(user: { name: string; email: string; company?: string }) {
    await this.waitForVisible();
    await this.fillRegistrationForm(user.name, user.email, user.company);
    
    // This test is now designed to run against the live API
    // All mocking has been removed to ensure it tests real-world behavior
    
    await this.submitRegistration();
    
    // Wait for the registration to complete and the page to update
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }); // Increased timeout

    // Explicitly wait for the modal to disappear to prevent race conditions
    await this.verifyModalClosed();

    // After registration, the page should update with the user info in the header
    // The welcome message appears in: <div class="text-right"><p class="text-sm text-gray-600">Welcome, <span x-text="user.name || user.email"></span></p>
    // Use a robust text-based selector that doesn't depend on exact class names
    const welcomeMessage = this.page.getByText(/^Welcome,\s+/);

    // Increase timeout and add a retry mechanism for UI reactivity; capture diagnostics on failure
    try {
      await expect(welcomeMessage).toBeVisible({ timeout: 30000 });
    } catch (error) {
      // If first attempt fails, wait briefly and retry (Alpine.js rendering can be delayed)
      await this.page.waitForTimeout(2000);
      try {
        await expect(welcomeMessage).toBeVisible({ timeout: 10000 });
      } catch (finalError) {
        // Enhanced diagnostics for debugging
        console.error('Welcome message not visible after registration');
        console.error('User data:', user);
        console.error('Current URL:', this.page.url());
        await this.page.screenshot({ path: `test-results/registration-failure-${Date.now()}.png`, fullPage: true });
        throw finalError;
      }
    }
  }

  async verifyTierInfoText() {
    await expect(this.tierInfo).toContainText('Free tier includes');
    await expect(this.tierInfo).toContainText('1 grant application per month');
  }
}