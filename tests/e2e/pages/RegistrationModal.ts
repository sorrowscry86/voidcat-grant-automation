import { Page, Locator, expect } from '@playwright/test';

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
    await expect(this.heading).toBeVisible();
    await expect(this.nameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.companyInput).toBeVisible();
  }

  async fillRegistrationForm(name: string, email: string, company?: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    if (company) {
      await this.companyInput.fill(company);
    }
  }

  async submitRegistration() {
    await this.registerButton.click();
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
}