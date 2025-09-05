import { Page, TestInfo } from '@playwright/test';

// Type for timeout values
type TimeoutValue = 5000 | 10000 | 15000 | 20000 | 30000 | 45000 | 60000 | 90000;

/**
 * Default timeout values in milliseconds
 * Increased values for better stability across different browsers and devices
 */
export const TIMEOUTS: { [key: string]: TimeoutValue } = {
  SHORT: 5000,      // 5 seconds - for quick assertions
  MEDIUM: 20000,    // 20 seconds - for most operations (increased from 15s)
  LONG: 45000,      // 45 seconds - for slow operations (increased from 30s)
  VERY_LONG: 90000, // 90 seconds - for very slow operations (increased from 60s)
  PAGE_LOAD: 20000, // 20 seconds - for page loads (increased from 15s)
  NETWORK_IDLE: 10000, // 10 seconds - for network idle (increased from 5s)
} as const;

/**
 * Safe wrapper for page actions with timeout and retry logic
 */
export async function safeAction<T>(
  action: () => Promise<T>,
  errorMessage: string,
  timeout: number = TIMEOUTS.MEDIUM as number,
  maxRetries = 2
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
 */
export async function waitForPageLoad(page: Page) {
  await safeAction(
    async () => {
      await page.waitForLoadState('load');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');
    },
    'Page load timed out',
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
