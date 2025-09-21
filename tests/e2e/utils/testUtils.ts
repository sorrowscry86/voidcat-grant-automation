import { Page, TestInfo } from '@playwright/test';

// Extend Window interface to include frameworks
declare global {
  interface Window {
    Vue?: any;
    Alpine?: any;
  }
}

// Type for timeout values
type TimeoutValue = 5000 | 10000 | 15000 | 20000 | 30000 | 45000 | 60000 | 90000;

/**
 * Default timeout values in milliseconds
 * VICTORY ENHANCEMENT: Cascade timing harmony alignment
 */
export const TIMEOUTS: { [key: string]: TimeoutValue } = {
  SHORT: 15000,     // 15 seconds - enhanced for button interactions
  MEDIUM: 30000,    // 30 seconds - for most operations 
  LONG: 60000,      // 60 seconds - for slow operations
  VERY_LONG: 90000, // 90 seconds - for very slow operations
  PAGE_LOAD: 30000, // 30 seconds - for page loads
  NETWORK_IDLE: 20000, // 20 seconds - enhanced for network stability
} as const;

/**
 * Safe wrapper for page actions with timeout and retry logic
 */
export async function safeAction<T>(
  action: () => Promise<T>,
  errorMessage: string,
  timeout: number = TIMEOUTS.MEDIUM as number,
  maxRetries = 3 // Increased from 2 to 3 for better connection stability
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        action(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
        )
      ]);
      return result;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  throw new Error(`${errorMessage}. ${lastError?.message || ''}`);
}

/**
 * Get browser-specific timeout multiplier
 */
export function getBrowserTimeoutMultiplier(browserName: string): number {
  switch (browserName.toLowerCase()) {
    case 'webkit':
    case 'safari':
      return 1.5; // WebKit can be 50% slower
    case 'firefox':
      return 1.3; // Firefox can be 30% slower  
    case 'mobile chrome':
    case 'mobile safari':
      return 2.0; // Mobile can be 100% slower
    default:
      return 1.0; // Chromium baseline
  }
}

/**
 * Get adjusted timeout for specific browser
 */
export function getAdjustedTimeout(baseTimeout: number, browserName?: string): number {
  if (!browserName) return baseTimeout;
  const multiplier = getBrowserTimeoutMultiplier(browserName);
  return Math.floor(baseTimeout * multiplier);
}

/**
 * Set test timeout based on test name or other criteria
 */
export function setTestTimeout(testInfo: TestInfo) {
  const testName = testInfo.title.toLowerCase();
  
  // Set longer timeouts for specific test patterns
  if (testName.includes('checkout') || testName.includes('payment')) {
    testInfo.setTimeout(TIMEOUTS.VERY_LONG);
  } else if (testName.includes('modal') || testName.includes('form')) {
    testInfo.setTimeout(TIMEOUTS.LONG);
  } else {
    testInfo.setTimeout(TIMEOUTS.MEDIUM);
  }
}

/**
 * Wait for page to be fully loaded with network idle
 * Trinity Wisdom: Complete stability before interaction
 */
export async function waitForPageLoad(page: Page) {
  await safeAction(
    async () => {
      await page.waitForLoadState('load');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');
      // Trinity pause for perfect synchronization
      await page.waitForTimeout(1500);
    },
    'Page load timed out',
    TIMEOUTS.PAGE_LOAD
  );
}

/**
 * Trinity Wisdom: Complete page readiness verification
 */
export async function waitForPageReadiness(page: Page) {
  await safeAction(
    async () => {
      // Ensure all load states are complete
      await page.waitForLoadState('load');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');
      
      // Wait for Vue.js to be ready (if present)
      try {
        await page.waitForFunction(() => {
          return typeof window !== 'undefined' && 
                 document.readyState === 'complete' &&
                 (!window.Vue || window.Vue);
        }, { timeout: 5000 });
      } catch {
        // Continue if Vue check fails
      }
      
      // Final stability pause
      await page.waitForTimeout(2000);
    },
    'Page readiness verification failed',
    TIMEOUTS.PAGE_LOAD
  );
}

/**
 * Safe click with retry and timeout
 */
export async function safeClick(
  page: Page,
  selector: string,
  options?: { timeout?: number; maxRetries?: number }
) {
  const { timeout = TIMEOUTS.MEDIUM, maxRetries = 2 } = options || {};
  
  return safeAction(
    async () => {
      const element = page.locator(selector);
      await element.waitFor({ state: 'visible', timeout });
      await element.click();
    },
    `Failed to click element: ${selector}`,
    timeout,
    maxRetries
  );
}

/**
 * Safe fill with retry and timeout
 */
export async function safeFill(
  page: Page,
  selector: string,
  value: string,
  options?: { timeout?: number; maxRetries?: number }
) {
  const { timeout = TIMEOUTS.MEDIUM, maxRetries = 2 } = options || {};
  
  return safeAction(
    async () => {
      const element = page.locator(selector);
      await element.waitFor({ state: 'visible', timeout });
      await element.fill(value);
    },
    `Failed to fill element: ${selector}`,
    timeout,
    maxRetries
  );
}

/**
 * Create a promise that rejects after a timeout
 */
export function timeoutPromise<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  
  return Promise.race([promise, timeout]);
}

/**
 * VICTORY ENHANCEMENT: Harmonized button interaction with cascade timing
 */
export async function harmonizedButtonClick(
  page: Page,
  buttonLocator: any,
  options?: { timeout?: number; maxRetries?: number; gracePeriod?: number }
) {
  const { 
    timeout = TIMEOUTS.MEDIUM, 
    maxRetries = 3,
    gracePeriod = 750 
  } = options || {};
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Pre-interaction stability
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
      // Button readiness verification
      await buttonLocator.waitFor({ state: 'visible', timeout: 15000 });
      await buttonLocator.waitFor({ state: 'attached', timeout: 10000 });
      
      // Honor platform timing rhythms
      await page.waitForTimeout(gracePeriod);
      
      // Execute interaction
      await buttonLocator.click({ timeout: 12000 });
      
      // Post-interaction cascade pause
      await page.waitForTimeout(1000);
      
      return; // SUCCESS!
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Exponential backoff with cascade timing
      await page.waitForTimeout(1000 * attempt);
    }
  }
}
