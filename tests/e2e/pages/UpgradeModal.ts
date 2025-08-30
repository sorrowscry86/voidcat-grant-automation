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
    this.modal = page.locator('div[ x-show="upgradeToProModal"], div[x-show="upgradeToProModal"], .fixed.inset-0 >> text=/Upgrade to/').first();
    this.heading = page.getByRole('heading', { name: /upgrade to pro/i });
    this.upgradeButton = page.getByRole('button', { name: /upgrade now/i });
    this.maybeLaterButton = page.getByRole('button', { name: /(maybe later|not now)/i });
    this.closeButton = page.getByRole('button', { name: /close/i }).first();
    this.freeTierCard = page.locator('div').filter({ hasText: 'Free Tier' }).first();
    this.proTierCard = page.locator('div').filter({ hasText: 'Pro Tier' }).first();
  }

  async waitForVisible(timeout = 10000) {
    await this.modal.waitFor({ state: 'visible', timeout });
    await expect(this.heading).toBeVisible({ timeout });
    await this.page.waitForLoadState('networkidle');
  }

  async verifyFreeTierFeatures() {
    const freeFeatures = [
      '1 grant application per month',
      'Basic grant search',
      'Limited proposal generation',
      'Basic matching',
      'Email support'
    ];

    const freeTierText = await this.freeTierCard.textContent();
    for (const feature of freeFeatures) {
      expect(freeTierText?.toLowerCase()).toContain(feature.toLowerCase());
    }
  }

  async verifyProTierFeatures() {
    const proFeatures = [
      'Unlimited',
      'AI proposal',
      'Priority',
      'analytics',
      'Early access',
      'Dedicated',
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
