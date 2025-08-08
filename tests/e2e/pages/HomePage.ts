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
    this.emptyStateIcon = page.getByText('📋');
    this.emptyStateHeading = page.getByRole('heading', { name: 'No grants found' });
    this.emptyStateMessage = page.getByText('Try adjusting your search criteria or browse all opportunities.');
    this.featuresSection = page.getByRole('heading', { name: '🎯 Why Choose VoidCat RDC?' });
    this.upgradeButton = page.getByRole('button', { name: 'Upgrade to Pro' });
  }

  async goto() {
    await safeAction(
      async () => {
        await this.page.goto('index.html');
        await waitForPageLoad(this.page);
        
        // Wait for Alpine.js to be available with type safety and timeout
        await this.page.waitForFunction(
          () => typeof window !== 'undefined' && window.Alpine !== undefined,
          null,
          { timeout: TIMEOUTS.MEDIUM }
        );
        
        // Wait for critical elements to be visible
        await this.waitForPageLoad();
      },
      'Failed to load home page',
      TIMEOUTS.PAGE_LOAD
    );
  }

  async waitForPageLoad(timeout = TIMEOUTS.MEDIUM) {
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

  async performSearch(query: string, timeout: number = TIMEOUTS.MEDIUM) {
    await safeAction(
      async () => {
        await this.searchInput.fill(query);
        await this.searchButton.click();
        await this.page.waitForLoadState('networkidle');
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
    // Wait for loading state to finish with proper type safety
    await this.page.waitForFunction(([selector, xShowAttr]) => {
      const loadingSpinner = document.querySelector(selector);
      if (!loadingSpinner) return true;
      
      const parent = loadingSpinner.closest(`[${xShowAttr}]`);
      if (!parent) return true;
      
      // Type-safe check for style.display
      const style = window.getComputedStyle(parent);
      return style.display === 'none';
    }, ['.animate-spin', 'x-show'], { timeout });
    
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

  async verifyFeaturesVisible() {
    await expect(this.featuresSection).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Smart Matching' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Fast Proposals' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Success Tracking' })).toBeVisible();
  }
}