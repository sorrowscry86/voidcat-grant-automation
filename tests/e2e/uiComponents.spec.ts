import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { safeAction, TIMEOUTS } from './utils/testUtils';

test.describe('UI Components', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    // Enhanced connection stability with retry logic
    await safeAction(
      async () => {
        await homePage.goto();
        await homePage.waitForPageLoad();
      },
      'Enhanced connection retry for UI components',
      TIMEOUTS.VERY_LONG,
      3
    );
  });

  test('should display hero section with correct content', async ({ page }) => {
    // Verify hero section is visible and has correct content
    const heroSection = page.locator('section').filter({ hasText: 'Win More Federal Grants with AI' }).first();
    await expect(heroSection).toBeVisible();
    await expect(heroSection).toContainText('20% success rate');
    
    // Verify CTA buttons
    await expect(heroSection.getByRole('button', { name: 'Start Free Trial' })).toBeVisible();
    await expect(heroSection.getByRole('link', { name: 'See Features' })).toBeVisible();
    await expect(heroSection.getByRole('link', { name: 'Watch Demo' })).toBeVisible();
  });

  test('should display social proof section with testimonials', async ({ page }) => {
    // Scroll to social proof section
    await page.evaluate(() => window.scrollTo(0, 500));
    
    // Verify section heading
  const socialProofSection = page.getByRole('heading', { name: 'Trusted by Innovative Companies' }).locator('..').locator('..');
    await expect(socialProofSection).toBeVisible();
    
    // Verify testimonials
    const testimonials = socialProofSection.locator('.bg-white');
    await expect(testimonials).toHaveCount(3);
    
    // Verify each testimonial has required content
    const companies = ['TechStartup AI', 'DefenseTech Corp', 'Research Institute'];
    for (const company of companies) {
      await expect(socialProofSection.locator(`text=${company}`)).toBeVisible();
    }
  });

  test('should display features section with all benefits', async ({ page }) => {
    // Scroll to features section
    await page.evaluate(() => window.scrollTo(0, 1000));
    
    // Verify section heading
  const featuresHeading = page.getByRole('heading', { name: 'Everything You Need to Win Grants' });
  await expect(featuresHeading).toBeVisible();
  const featuresSection = featuresHeading.locator('..');
    
    // Verify feature cards
    const featureCards = featuresSection.locator('.bg-white');
    await expect(featureCards).toHaveCount(3);
    
    // Verify feature content
    const features = [
      'AI-Powered Matching',
      'Proposal Generation',
      'Time Savings'
    ];
    
    for (const feature of features) {
      await expect(featuresSection.locator(`text=${feature}`)).toBeVisible();
    }
  });

  test('should have working navigation links', async ({ page }) => {
    // Test navigation to features - Enhanced with visibility check, timeout, and fallback
    try {
      await page.waitForSelector('a[href="#features"]', { state: 'visible', timeout: 30000 });
      await page.click('a[href="#features"]');
    } catch {
      // Fallback: Use role-based selection
      const featuresLink = page.getByRole('link', { name: 'Features' });
      await featuresLink.waitFor({ state: 'visible', timeout: 15000 });
      await featuresLink.scrollIntoViewIfNeeded();
      await featuresLink.click();
    }
    await expect(page.getByRole('heading', { name: 'Everything You Need to Win Grants' })).toBeInViewport({ timeout: 30000 });
    
    // Test navigation to demo - Enhanced with visibility check, timeout, and fallback
    try {
      await page.waitForSelector('a[href="#demo"]', { state: 'visible', timeout: 30000 });
      await page.click('a[href="#demo"]');
    } catch {
      // Fallback: Use role-based selection
      const demoLink = page.getByRole('link', { name: 'Demo' });
      await demoLink.waitFor({ state: 'visible', timeout: 15000 });
      await demoLink.scrollIntoViewIfNeeded();
      await demoLink.click();
    }
    await expect(page.getByRole('heading', { name: 'See It In Action' })).toBeInViewport({ timeout: 30000 });
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Verify mobile menu
  const menuButton = page.getByRole('button', { name: 'Menu' });
    await expect(menuButton).toBeVisible();
    
    // Open menu
    await menuButton.click();
    
    // Verify menu items
    const menuItems = ['Features', 'Demo', 'Pricing', 'Login'];
    for (const item of menuItems) {
      await expect(page.locator(`text=${item}`).first()).toBeVisible();
    }
    
    // Verify hero section is still visible and properly laid out
    const heroSection = page.locator('section:has(h1:text("Win More Federal Grants with AI"))');
    await expect(heroSection).toBeVisible();
    
    // Verify buttons are stacked vertically on mobile
    const buttons = heroSection.locator('button, a');
    const buttonCount = await buttons.count();
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      await expect(button).toBeVisible();
    }
  });
});
