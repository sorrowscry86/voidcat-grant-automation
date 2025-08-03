import { Page, Locator, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly statusBadge: Locator;
  readonly getStartedButton: Locator;
  readonly searchInput: Locator;
  readonly agencySelect: Locator;
  readonly searchButton: Locator;
  readonly loadingIndicator: Locator;
  readonly emptyStateIcon: Locator;
  readonly emptyStateHeading: Locator;
  readonly emptyStateMessage: Locator;
  readonly featuresSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByRole('heading', { level: 1, name: 'VoidCat RDC' });
    this.subtitle = page.locator('header').getByText('Federal Grant Automation Platform');
    this.statusBadge = page.getByText('🚀 Now Live - MVP Version');
    this.getStartedButton = page.getByRole('button', { name: 'Get Started Free' });
    this.searchInput = page.getByRole('textbox', { name: /Search keywords/ });
    this.agencySelect = page.getByRole('combobox');
    this.searchButton = page.getByRole('button', { name: /Search Grants|Searching/ });
    this.loadingIndicator = page.getByText('Loading grant opportunities...');
    this.emptyStateIcon = page.getByText('📋');
    this.emptyStateHeading = page.getByRole('heading', { name: 'No grants found' });
    this.emptyStateMessage = page.getByText('Try adjusting your search criteria or browse all opportunities.');
    this.featuresSection = page.getByRole('heading', { name: '🎯 Why Choose VoidCat RDC?' });
  }

  async goto() {
    await this.page.goto('index.html');
    // Wait for Alpine.js to initialize
    await this.page.waitForFunction(() => window.Alpine !== undefined);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForPageLoad() {
    await expect(this.title).toBeVisible();
    await expect(this.subtitle).toBeVisible();
    await expect(this.searchInput).toBeVisible();
  }

  async searchFor(keywords: string, agency?: string) {
    await this.searchInput.fill(keywords);
    if (agency) {
      await this.agencySelect.selectOption(agency);
    }
    await this.searchButton.click();
  }

  async waitForSearchResults() {
    // Wait for loading state to finish
    await this.page.waitForFunction(() => {
      const loadingSpinner = document.querySelector('.animate-spin');
      return !loadingSpinner || loadingSpinner.closest('[x-show="loading"]')?.style.display === 'none';
    });
  }

  async clickGetStarted() {
    await this.getStartedButton.click();
  }

  async verifyEmptyState() {
    await expect(this.emptyStateIcon).toBeVisible();
    await expect(this.emptyStateHeading).toBeVisible();
    await expect(this.emptyStateMessage).toBeVisible();
  }

  async verifyFeaturesVisible() {
    await expect(this.featuresSection).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Smart Matching' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Fast Proposals' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Success Tracking' })).toBeVisible();
  }
}