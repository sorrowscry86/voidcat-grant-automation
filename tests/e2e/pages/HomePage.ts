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
    // Make empty state locators more flexible
    this.emptyStateIcon = page.locator('.text-gray-400').getByText('📋');
    this.emptyStateHeading = page.getByRole('heading', { name: 'No grants found' });
    this.emptyStateMessage = page.getByText('Try adjusting your search criteria or browse all opportunities.');
    this.featuresSection = page.getByRole('heading', { name: 'Everything You Need to Win Grants' });
    this.upgradeButton = page.getByRole('button', { name: 'Upgrade to Pro' });
  }

  async goto() {
    await safeAction(
      async () => {
        await this.page.goto('index.html?e2e_skip_autosearch=1');
        
        // Wait for basic page load states
        await this.page.waitForLoadState('load');
        await this.page.waitForLoadState('domcontentloaded');
        
        // Wait for Alpine.js to be available with type safety and timeout
        await this.page.waitForFunction(
          () => typeof window !== 'undefined' && window.Alpine !== undefined,
          null,
          { timeout: TIMEOUTS.LONG }
        );
        
        // Wait for critical elements to be visible
        await this.waitForPageLoad(TIMEOUTS.LONG);
      },
      'Failed to load home page',
      TIMEOUTS.VERY_LONG
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

  async performSearch(query: string, timeout: number = TIMEOUTS.VERY_LONG) {
    await safeAction(
      async () => {
        await this.searchInput.fill(query);
        await this.searchButton.click();
        // Pass the timeout to waitForSearchResults
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

  async waitForSearchResults(timeout: number = TIMEOUTS.LONG) {
    // Wait for loading indicator to disappear first
    await expect(this.loadingIndicator).not.toBeVisible({ timeout });
    
    // Add a small buffer for any remaining transitions
    await this.page.waitForTimeout(1000);
    
    // Wait for either results or empty state to be ready
    await expect.poll(async () => {
      const resultsCount = await this.page.locator('.grant-card').count();
      const emptyStateVisible = await this.emptyStateHeading.isVisible();
      
      // Return true if we have either results or properly displayed empty state
      return resultsCount > 0 || emptyStateVisible;
    }, {
      message: 'Timed out waiting for search results or empty state to appear',
      timeout: timeout,
    }).toBe(true);
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

  async verifyEmptyState(timeout: number = TIMEOUTS.LONG) {
    // Use expect.poll for more reliable waiting
    await expect.poll(async () => {
      const iconVisible = await this.emptyStateIcon.isVisible();
      const headingVisible = await this.emptyStateHeading.isVisible();
      const messageVisible = await this.emptyStateMessage.isVisible();
      
      console.log(`Empty state check - Icon: ${iconVisible}, Heading: ${headingVisible}, Message: ${messageVisible}`);
      
      // All three elements should be visible for a proper empty state
      return iconVisible && headingVisible && messageVisible;
    }, {
      message: 'Empty state elements are not all visible',
      timeout: timeout,
      intervals: [1000], // Check every second
    }).toBe(true);
  }

  async verifySearchResults(timeout: number = TIMEOUTS.VERY_LONG) {
    // Use a simpler and more reliable approach
    await expect.poll(async () => {
      const resultsCount = await this.page.locator('.grant-card').count();
      const emptyStateVisible = await this.emptyStateHeading.isVisible();
      
      if (resultsCount > 0) {
        console.log(`✅ Search results found: ${resultsCount} grant cards.`);
        return true;
      }
      
      if (emptyStateVisible) {
        console.log('✅ Empty state is visible.');
        return true;
      }
      
      // Log current state for debugging
      console.log(`Polling for results... Grant cards: ${resultsCount}, Empty state visible: ${emptyStateVisible}`);
      
      // Check if page is still loading or has error state
      const loadingVisible = await this.loadingIndicator.isVisible();
      if (loadingVisible) {
        console.log('Page is still loading...');
        return false;
      }
      
      // Log body content snippet for debugging if nothing is found
      const bodyContent = await this.page.locator('body').innerText();
      console.log(`Current body content snippet: ${bodyContent.substring(0, 300)}...`);
      
      return false;
    }, {
      message: 'Failed to find search results or empty state within the time limit.',
      timeout: timeout,
      intervals: [2000], // Check every 2 seconds instead of default 100ms
    }).toBe(true);
  }

  async verifyFeaturesVisible() {
    await expect(this.featuresSection).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'AI-Powered Matching' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Proposal Generation' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Time Savings' })).toBeVisible();
  }
}