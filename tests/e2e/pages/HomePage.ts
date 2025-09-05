import { Page, Locator, expect } from '@playwright/test';
import { TIMEOUTS, safeAction, waitForPageLoad, safeClick, safeFill } from '../utils/testUtils';

// Extend Window interface to include Alpine.js
declare global {
  interface Window {
    Alpine?: {
      // Add Alpine.js types here if needed
      // This tells TypeScript that window.Alpine might exist
    };
  }
}

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
  readonly upgradeButton: Locator;

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
    this.emptyStateIcon = page.locator('.text-gray-400.text-6xl.mb-4').getByText('📋');
    this.emptyStateHeading = page.getByRole('heading', { name: 'No grants found' });
    this.emptyStateMessage = page.getByText('Try adjusting your search criteria or browse all opportunities.');
    this.featuresSection = page.getByRole('heading', { name: 'Everything You Need to Win Grants' });
    this.upgradeButton = page.getByRole('button', { name: 'Upgrade to Pro' });
  }

  async goto() {
    await safeAction(
      async () => {
        await this.page.goto('index.html?e2e_skip_autosearch=1');
        await waitForPageLoad(this.page);
        
        // Wait for Alpine.js to be available with type safety and timeout
        await this.page.waitForFunction(
          () => typeof window !== 'undefined' && window.Alpine !== undefined,
          null,
          { timeout: TIMEOUTS.MEDIUM }
        );
        
        // Wait for critical elements to be visible
        await this.waitForPageLoad(TIMEOUTS.LONG);
      },
      'Failed to load home page',
      TIMEOUTS.VERY_LONG * 2 // Doubled timeout for slower environments
    );
  }

  async waitForPageLoad(timeout = TIMEOUTS.LONG) { // Increased default timeout
    await safeAction(
      async () => {
        await expect(this.title).toBeVisible({ timeout });
        await expect(this.subtitle).toBeVisible({ timeout });
        await expect(this.searchInput).toBeVisible({ timeout });
      },
      'Page did not load successfully',
      timeout
    );
  }

  async performSearch(query: string, timeout: number = TIMEOUTS.LONG) {
    await safeAction(
      async () => {
        await this.searchInput.fill(query);
        await this.searchButton.click();
        await this.waitForSearchResults(timeout);
      },
      `Failed to perform search for query: ${query}`,
      timeout
    );
  }

  async searchFor(keywords: string, agency?: string) {
    await this.searchInput.fill(keywords);
    if (agency) {
      await this.agencySelect.selectOption(agency);
    }
    await this.searchButton.click();
  }

  async waitForSearchResults(timeout = 10000) {
    await expect(this.loadingIndicator).not.toBeVisible({ timeout });
    // Additional wait for any animations or transitions
    await this.page.waitForTimeout(500);
  }

  async clickGetStarted(timeout: number = TIMEOUTS.MEDIUM) {
    await safeAction(
      async () => {
        await this.getStartedButton.click();
        await this.page.waitForLoadState('networkidle');
      },
      'Failed to click Get Started button',
      timeout
    );
  }

  async waitForGrants(timeout: number = TIMEOUTS.MEDIUM) {
    await safeAction(
      async () => {
        const element = this.page.locator('.grant-card');
        await element.waitFor({ state: 'attached', timeout });
      },
      'Timed out waiting for grant cards to load',
      timeout
    );
  }

  async verifyEmptyState(timeout: number = TIMEOUTS.MEDIUM) {
    const assertions = [
      this.emptyStateIcon.isVisible(),
      this.emptyStateHeading.isVisible(),
      this.emptyStateMessage.isVisible()
    ];
    
    // Wait for all assertions to pass or fail together
    await Promise.all(assertions.map(assertion => 
      expect(assertion).resolves.toBe(true)
    ));
  }

  async verifySearchResults(timeout: number = TIMEOUTS.VERY_LONG) {
    await expect.poll(async () => {
      const resultsCount = await this.page.locator('.grant-card').count();
      const emptyStateVisible = await this.emptyStateHeading.isVisible();
      const pageContent = await this.page.content();

      if (resultsCount > 0) {
        console.log(`✅ Search results found: ${resultsCount} grant cards.`);
        return true;
      }
      if (emptyStateVisible) {
        console.log('✅ Empty state is visible.');
        return true;
      }
      
      console.log(`Polling for results... Grant cards: ${resultsCount}, Empty state visible: ${emptyStateVisible}`);
      // Log a snippet of the body content if something is really wrong
      if (resultsCount === 0 && !emptyStateVisible) {
        const bodyContent = await this.page.locator('body').innerText();
        console.log(`Current body content snippet: ${bodyContent.substring(0, 500)}`);
      }

      return false;
    }, {
      message: 'Failed to find search results or empty state within the time limit.',
      timeout: timeout,
    }).toBe(true);
  }

  async verifyFeaturesVisible() {
    await expect(this.featuresSection).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'AI-Powered Matching' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Proposal Generation' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Time Savings' })).toBeVisible();
  }
}