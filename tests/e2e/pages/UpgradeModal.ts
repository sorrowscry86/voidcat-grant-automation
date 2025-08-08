import { Locator, Page, expect } from '@playwright/test';

export class UpgradeModal {
  private readonly page: Page;
  readonly modal: Locator;
  readonly heading: Locator;
  readonly upgradeButton: Locator;
  readonly maybeLaterButton: Locator;
  readonly freeTierCard: Locator;
  readonly proTierCard: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('div[x-show*="upgrade"]').first();
    this.heading = this.modal.getByRole('heading', { name: /upgrade to pro/i });
    this.upgradeButton = this.modal.getByRole('button', { name: /upgrade now/i });
    this.maybeLaterButton = this.modal.getByRole('button', { name: /(maybe later|not now)/i });
    this.closeButton = this.modal.getByRole('button', { name: /close/i }).first();
    this.freeTierCard = this.modal.locator('.bg-gray-50, .bg-gray-100').filter({ hasText: 'Free' }).first();
    this.proTierCard = this.modal.locator('.bg-blue-50, .bg-blue-100').filter({ hasText: 'Pro' }).first();
  }

  async waitForVisible(timeout = 10000) {
    await this.modal.waitFor({ state: 'visible', timeout });
    await expect(this.heading).toBeVisible({ timeout });
    await this.page.waitForLoadState('networkidle');
  }

  async verifyFreeTierFeatures() {
    const freeFeatures = [
      '1 grant application per month',
      'basic',
      'search',
      'email',
      'matching'
    ];

    const freeTierText = await this.freeTierCard.textContent();
    for (const feature of freeFeatures) {
      expect(freeTierText?.toLowerCase()).toContain(feature.toLowerCase());
    }
  }

  async verifyProTierFeatures() {
    const proFeatures = [
      'unlimited',
      'proposal',
      'priority',
      'analytics',
      'dedicated',
      'manager'
    ];

    const proTierText = await this.proTierCard.textContent();
    for (const feature of proFeatures) {
      expect(proTierText?.toLowerCase()).toContain(feature.toLowerCase());
    }
  }

  async clickUpgrade() {
    await this.upgradeButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickMaybeLater() {
    await this.maybeLaterButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async close() {
    await this.closeButton.click();
    await this.page.waitForLoadState('networkidle');
  }
}
