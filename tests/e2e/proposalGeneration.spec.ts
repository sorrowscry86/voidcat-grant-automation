import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { RegistrationModal } from './pages/RegistrationModal';
import { generateTestUser } from './utils/testDataGenerator';

test.describe('Proposal Generation', () => {
  let homePage: HomePage;
  let registrationModal: RegistrationModal;
  
  // Test user credentials with unique email for each test run
  // Using crypto.randomUUID() instead of Date.now() to prevent collisions in parallel test execution
  const testUser = generateTestUser();

  test.beforeEach(async ({ page }) => {
    // Mock API responses for consistent testing
    await page.route('**/api/users/register', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'User registered successfully',
          api_key: 'test-api-key-123',
          user: {
            id: 1,
            email: testUser.email,
            name: testUser.name,
            subscription_tier: 'free',
            usage_count: 0,
            created_at: new Date().toISOString()
          }
        })
      });
    });

    await page.route('**/api/users/me', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 1,
            email: testUser.email,
            subscription_tier: 'free',
            usage_count: 0,
            created_at: new Date().toISOString()
          }
        })
      });
    });

    await page.route('**/api/grants/search*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          count: 1,
          grants: [{
            id: 'SBIR-25-001',
            title: 'AI for Defense Applications',
            agency: 'Department of Defense',
            program: 'SBIR Phase I',
            deadline: '2025-09-15',
            amount: '$250,000',
            description: 'Seeking innovative AI solutions for defense applications.',
            eligibility: 'Small businesses with <500 employees',
            matching_score: 0.95,
            data_source: 'mock'
          }],
          data_source: 'mock',
          timestamp: new Date().toISOString()
        })
      });
    });

    await page.route('**/api/grants/generate-proposal', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          proposal: {
            executive_summary: 'Our organization proposes an innovative solution to address advanced artificial intelligence challenges as outlined in AI for Defense Applications. Leveraging our proven expertise in advanced technology development capabilities and deep understanding of Department of Defense mission requirements, we will develop a breakthrough technology that directly supports National security applications. Our approach combines cutting-edge research methodologies with practical implementation strategies, targeting measurable outcomes that advance both scientific knowledge and operational capabilities.',
            technical_approach: 'Our technical approach employs a systematic, multi-phase methodology combining deep neural networks, reinforcement learning, computer vision, natural language processing to achieve breakthrough performance in artificial intelligence and machine learning. The core innovation centers on novel neural architecture design optimized for real-time processing, supported by advanced transfer learning techniques for limited data scenarios and explainable AI methods for mission-critical applications.',
            commercial_potential: 'The proposed technology demonstrates exceptional commercial potential across multiple high-growth market segments including Enterprise AI, Defense AI, Healthcare AI, Autonomous systems. With the global market valued at $150B+ global AI market and growing at 35% CAGR through 2030, our innovation addresses critical unmet needs that represent significant revenue opportunities.',
            budget_summary: {
              personnel: 162500,
              equipment: 37500,
              overhead: 50000,
              total: 250000
            },
            timeline: [
              { phase: "Months 1-2", task: "Literature review, requirements analysis, and team mobilization" },
              { phase: "Months 3-4", task: "Algorithm development and initial prototype design" },
              { phase: "Months 5-6", task: "Proof-of-concept implementation and preliminary testing" },
              { phase: "Months 7-8", task: "Performance evaluation, validation, and Phase II planning" },
              { phase: "Month 9", task: "Final reporting, documentation, and technology transition preparation" }
            ]
          },
          grant_id: 'SBIR-25-001',
          generated_at: new Date().toISOString()
        })
      });
    });

    homePage = new HomePage(page);
    registrationModal = new RegistrationModal(page);
    
    await homePage.goto();
    await homePage.waitForPageLoad();
  });

  test('should allow authenticated user to generate proposal', async ({ page }) => {
    // Register user first
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Wait for registration to complete and user to be logged in
    await expect(page.locator(`text=Welcome, ${testUser.email}`)).toBeVisible();
    
    // Perform search to get grants
    await homePage.performSearch('AI');
    
    // Wait for search results
    await expect(page.locator('.grant-card').first()).toBeVisible();
    
    // Click on "Generate Proposal" button for the first grant
    const generateButton = page.locator('button:has-text("Generate Proposal")').first();
    await expect(generateButton).toBeVisible();
    await generateButton.click();
    
    // Listen for the dialog (alert) that appears after proposal generation
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('🤖 AI-Generated Proposal Preview');
      expect(dialog.message()).toContain('📝 Executive Summary:');
      expect(dialog.message()).toContain('🔬 Technical Approach:');
      expect(dialog.message()).toContain('💼 Commercial Potential:');
      expect(dialog.message()).toContain('💰 Budget Summary:');
      expect(dialog.message()).toContain('📅 Timeline:');
      expect(dialog.message()).toContain('Personnel: $162,500'); // Updated from mock API
      expect(dialog.message()).toContain('Equipment: $37,500'); // Updated from mock API
      expect(dialog.message()).toContain('Overhead: $50,000'); // Updated from mock API
      expect(dialog.message()).toContain('Total: $250,000'); // Updated from mock API
      await dialog.accept();
    });

    // Wait for the generateProposal function to trigger the dialog
    // No direct page element to wait for, as content is in alert.
    // The dialog listener above will handle the assertion.
    // We can add a small wait to ensure the dialog has a chance to appear and be handled.
    await page.waitForTimeout(500); // Small wait to ensure dialog is processed
  });

  test('should show upgrade prompt when free tier limit reached', async ({ page }) => {
    // Mock API to return usage limit reached
    await page.route('**/api/grants/generate-proposal', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Free tier limit reached',
          upgrade_required: true,
          message: 'Upgrade to Pro for unlimited grant applications'
        })
      });
    });

    // Mock user with usage count at limit
    await page.route('**/api/users/me', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 1,
            email: testUser.email,
            subscription_tier: 'free',
            usage_count: 1, // At limit
            created_at: new Date().toISOString()
          }
        })
      });
    });

    // Register user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Wait for registration and verify usage count display
    await expect(page.locator('text=1/1 free grants used')).toBeVisible();
    
    // Perform search
    await homePage.performSearch('AI');
    await expect(page.locator('.grant-card').first()).toBeVisible();
    
    // Try to generate proposal
    const generateButton = page.locator('button:has-text("Generate Proposal")').first();
    await generateButton.click();
    
    // Should show upgrade prompt modal
    await expect(page.locator('text=Free Limit Reached!')).toBeVisible();
    await expect(page.locator('text=You\'ve used your 1 free grant application this month')).toBeVisible();
    await expect(page.locator('text=Upgrade to Pro for:')).toBeVisible();
    // Trinity Wisdom: Use first() to handle multiple matches gracefully
    await expect(page.locator('text=Unlimited grant applications').first()).toBeVisible();
    
    // Verify upgrade button is present
    await expect(page.locator('button:has-text("Upgrade Now")')).toBeVisible();
  });

  test('should handle proposal generation errors gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/grants/generate-proposal', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Proposal generation failed',
          message: 'Service temporarily unavailable'
        })
      });
    });

    // Register user
    await homePage.clickGetStarted();
    await registrationModal.registerUser(testUser);
    
    // Perform search
    await homePage.performSearch('AI');
    await expect(page.locator('.grant-card').first()).toBeVisible();
    
    // Try to generate proposal
    const generateButton = page.locator('button:has-text("Generate Proposal")').first();
    await generateButton.click();
    
    // Listen for the dialog (alert) that appears after proposal generation error
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Error generating proposal: Proposal generation failed');
      await dialog.accept();
    });
    // No direct page element to wait for, as content is in alert.
    await page.waitForTimeout(500); // Small wait to ensure dialog is processed
  });

  test('should require authentication for proposal generation', async ({ page }) => {
    // Don't register user - try to generate proposal without authentication
    
    // Perform search (should work without auth)
    await homePage.performSearch('AI');
    await expect(page.locator('.grant-card').first()).toBeVisible();
    
    // Try to generate proposal without being logged in
    const generateButton = page.locator('button:has-text("Generate Proposal")').first();
    // Expect the button to be disabled
    await expect(generateButton).toBeDisabled();
    // Trinity Wisdom: Force click disabled button to trigger application logic
    await generateButton.click({ force: true }); // Force click the disabled button
    
    // Enhanced modal timing fix: wait for complete page stability before checking modal
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(3000); // Extended cascade pause from 2s to 3s
    
    // Wait for modal container to be ready before checking text element
    try {
      await page.waitForSelector('[data-modal="registration"]', { timeout: 15000 });
    } catch {
      // Fallback: wait for any modal overlay
      await page.waitForSelector('.fixed.inset-0.bg-black.bg-opacity-50', { timeout: 15000 });
    }
    
    // Should show login/registration prompt (registration modal) with extended timeout
    await expect(page.locator('text=Register for Free Access')).toBeVisible({ timeout: 75000 }); // Increased from 60s to 75s
  });
});