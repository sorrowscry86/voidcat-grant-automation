import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { RegistrationModal } from './pages/RegistrationModal';

test.describe('Proposal Generation', () => {
  let homePage: HomePage;
  let registrationModal: RegistrationModal;
  
  // Test user credentials with unique email for each test run
  const testUser = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    company: 'Test Company'
  };

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
          subscription_tier: 'free'
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
    
    // Wait for proposal generation modal/section to appear
    await expect(page.locator('text=Proposal Generated')).toBeVisible({ timeout: 10000 });
    
    // Validate that the generated proposal contains the expected JSON structure
    // Check for executive summary content (should be substantive, not placeholder)
    const executiveSummaryContent = await page.locator('[data-testid="executive-summary"], .executive-summary, text=executive_summary').first();
    await expect(executiveSummaryContent).toBeVisible();
    
    // Check for technical approach content
    const technicalApproachContent = await page.locator('[data-testid="technical-approach"], .technical-approach, text=technical_approach').first();
    await expect(technicalApproachContent).toBeVisible();
    
    // Check for commercial potential content  
    const commercialPotentialContent = await page.locator('[data-testid="commercial-potential"], .commercial-potential, text=commercial_potential').first();
    await expect(commercialPotentialContent).toBeVisible();
    
    // Verify budget summary is displayed with proper structure
    const budgetContent = await page.locator('[data-testid="budget-summary"], .budget-summary, text=personnel').first();
    await expect(budgetContent).toBeVisible();
    
    // Verify timeline is displayed with multiple phases
    const timelineContent = await page.locator('[data-testid="timeline"], .timeline, text=Months').first();
    await expect(timelineContent).toBeVisible();
    
    // Optional: Verify the content is well-formed and substantive (not just placeholder text)
    // This would check that the AI-generated content meets quality standards
    const proposalText = await page.locator('.proposal-content, [data-testid="proposal-content"]').textContent();
    if (proposalText) {
      // Verify content contains domain-specific keywords indicating sophisticated generation
      expect(proposalText).toMatch(/(innovative|breakthrough|cutting-edge|advanced|methodology|optimization)/i);
      // Verify content is substantive (more than basic placeholder length)
      expect(proposalText.length).toBeGreaterThan(500);
    }
    
    // Verify proposal content is displayed
    await expect(page.locator('text=Executive Summary')).toBeVisible();
    await expect(page.locator('text=Technical Approach')).toBeVisible();
    await expect(page.locator('text=Commercial Potential')).toBeVisible();
    await expect(page.locator('text=Budget Summary')).toBeVisible();
    await expect(page.locator('text=Timeline')).toBeVisible();
    
    // Verify specific proposal content
    await expect(page.locator('text=This innovative project leverages cutting-edge AI technologies')).toBeVisible();
    await expect(page.locator('text=Personnel: $150,000')).toBeVisible();
    await expect(page.locator('text=Total: $250,000')).toBeVisible();
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
    await expect(page.locator('text=Unlimited grant applications')).toBeVisible();
    
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
    
    // Should show error message
    await expect(page.locator('text=Error generating proposal')).toBeVisible();
    await expect(page.locator('text=Please try again later')).toBeVisible();
  });

  test('should require authentication for proposal generation', async ({ page }) => {
    // Don't register user - try to generate proposal without authentication
    
    // Perform search (should work without auth)
    await homePage.performSearch('AI');
    await expect(page.locator('.grant-card').first()).toBeVisible();
    
    // Try to generate proposal without being logged in
    const generateButton = page.locator('button:has-text("Generate Proposal")').first();
    await generateButton.click();
    
    // Should show login/registration prompt
    await expect(page.locator('text=Please log in to generate proposals')).toBeVisible();
    // Or should redirect to registration modal
    await expect(page.locator('text=Register for Free Access')).toBeVisible();
  });
});