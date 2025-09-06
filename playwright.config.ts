import { defineConfig, devices } from '@playwright/test';
import { TIMEOUTS } from './tests/e2e/utils/testUtils';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Global timeout for each test - increased for stability */
  timeout: 180000, // 3 minutes per test (increased from 2 minutes)
  /* Expect timeout for assertions - increased for stability */
  expect: {
    timeout: 45000, // 45 seconds for assertions (increased from 30s)
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry failed tests */
  retries: process.env.CI ? 2 : 1,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.GITHUB_PAGES_URL || 'file://' + process.cwd() + '/frontend/',
    
    /* Timeout for each action - increased for more reliable tests */
    actionTimeout: TIMEOUTS.LONG,
    navigationTimeout: TIMEOUTS.LONG,
    
    /* Disable trace to avoid ffmpeg dependency */
    trace: 'off',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Disable video recording to avoid ffmpeg dependency */
    video: 'off',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use system chromium executable directly
        launchOptions: {
          executablePath: '/usr/bin/chromium-browser',
        },
      },
    },

    /* Temporarily disable other browsers until we can install them
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox needs longer timeouts for some operations
        actionTimeout: TIMEOUTS.VERY_LONG,
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        // WebKit needs longer timeouts for some operations
        actionTimeout: TIMEOUTS.VERY_LONG,
      },
    },

    /* Test against mobile viewports with increased timeouts */
    /*
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        // Mobile devices need longer timeouts
        actionTimeout: TIMEOUTS.VERY_LONG,
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        // Mobile devices need longer timeouts
        actionTimeout: TIMEOUTS.VERY_LONG,
      },
    },
    */
  ],

  /* Comment out webServer since we're testing static files
  webServer: {
    command: 'npm run start',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
  */
});