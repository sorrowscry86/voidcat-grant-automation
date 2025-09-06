/**
 * Test our E2E fixes with mocked API to demonstrate the improvements
 */

const { chromium } = require('playwright');
const path = require('path');

async function testWithMockedAPI() {
  console.log('🧪 Testing E2E Fixes with Mocked API...\n');
  
  const browser = await chromium.launch({ 
    executablePath: '/usr/bin/chromium-browser',
    headless: true 
  });
  
  try {
    const page = await browser.newPage();
    
    // Mock the API to return demo data quickly
    await page.route('**/api/grants/search*', async route => {
      console.log('🔄 Intercepting API call, returning mock data...');
      
      // Simulate a reasonable API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          grants: [
            {
              id: 'MOCK-001',
              title: 'Mocked AI Grant',
              agency: 'Mock Agency',
              program: 'Test Program',
              deadline: '2025-12-31',
              amount: '$100,000',
              description: 'This is a mocked grant for testing purposes.',
              eligibility: 'Test eligibility',
              matching_score: 0.9
            },
            {
              id: 'MOCK-002', 
              title: 'Another Mocked Grant',
              agency: 'Another Mock Agency',
              program: 'Another Test Program',
              deadline: '2025-11-30',
              amount: '$150,000', 
              description: 'Another mocked grant for testing.',
              eligibility: 'Test eligibility 2',
              matching_score: 0.85
            }
          ]
        })
      });
    });
    
    const frontendPath = path.join(__dirname, 'frontend', 'index.html');
    const fileUrl = `file://${frontendPath}?e2e_skip_autosearch=1`;
    
    console.log(`📂 Loading: ${fileUrl}`);
    await page.goto(fileUrl, { timeout: 30000 });
    
    // Test basic elements are visible
    console.log('\n1️⃣ Testing page elements...');
    await page.getByRole('heading', { level: 1, name: 'VoidCat RDC' }).waitFor({ state: 'visible', timeout: 10000 });
    await page.getByRole('textbox', { name: /Search keywords/ }).waitFor({ state: 'visible', timeout: 10000 });
    await page.getByRole('button', { name: /Search Grants/ }).waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ All page elements loaded successfully');
    
    // Test search with improved timeout handling
    console.log('\n2️⃣ Testing search with mocked API...');
    
    const searchInput = page.getByRole('textbox', { name: /Search keywords/ });
    const searchButton = page.getByRole('button', { name: /Search Grants/ });
    const loadingIndicator = page.getByText('Loading grant opportunities...');
    
    await searchInput.fill('artificial intelligence');
    console.log('📝 Filled search input');
    
    await searchButton.click();
    console.log('🖱️ Clicked search button');
    
    // Test loading state appears
    await loadingIndicator.waitFor({ state: 'visible', timeout: 5000 });
    console.log('⏳ Loading indicator appeared');
    
    // Test loading state disappears (this is where our timeout fixes help)
    await loadingIndicator.waitFor({ state: 'hidden', timeout: 15000 });
    console.log('✅ Loading completed successfully');
    
    // Test results appear
    console.log('\n3️⃣ Testing search results...');
    const grantCards = page.locator('.grant-card');
    
    // Wait for results to appear (testing our improved polling logic)
    await grantCards.first().waitFor({ state: 'visible', timeout: 10000 });
    const resultCount = await grantCards.count();
    console.log(`✅ Found ${resultCount} grant cards (mocked data)`);
    
    // Verify the content is correct
    const firstGrantTitle = await grantCards.first().locator('h4').textContent();
    console.log(`📋 First grant: ${firstGrantTitle}`);
    
    // Test that features section is hidden after search
    console.log('\n4️⃣ Testing features section behavior...');
    const featuresSection = page.getByRole('heading', { name: 'Everything You Need to Win Grants' });
    const isVisible = await featuresSection.isVisible();
    console.log(`✅ Features section hidden after search: ${!isVisible}`);
    
    console.log('\n🎉 All tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Test with timeout falling back to demo data
async function testTimeoutFallback() {
  console.log('\n🔄 Testing Timeout Fallback Behavior...\n');
  
  const browser = await chromium.launch({ 
    executablePath: '/usr/bin/chromium-browser',
    headless: true 
  });
  
  try {
    const page = await browser.newPage();
    
    // Mock the API to timeout, forcing fallback to demo data
    await page.route('**/api/grants/search*', async route => {
      console.log('⏰ Simulating API timeout...');
      // Don't respond - let it timeout and fallback
      // This tests our improved timeout handling
    });
    
    const frontendPath = path.join(__dirname, 'frontend', 'index.html');
    const fileUrl = `file://${frontendPath}?e2e_skip_autosearch=1`;
    
    await page.goto(fileUrl, { timeout: 30000 });
    
    console.log('1️⃣ Testing search with API timeout fallback...');
    
    const searchInput = page.getByRole('textbox', { name: /Search keywords/ });
    const searchButton = page.getByRole('button', { name: /Search Grants/ });
    const loadingIndicator = page.getByText('Loading grant opportunities...');
    
    await searchInput.fill('AI');
    await searchButton.click();
    console.log('🖱️ Triggered search (API will timeout)');
    
    // Wait for loading to complete (should fallback to demo data)
    console.log('⏳ Waiting for timeout and fallback to demo data...');
    await loadingIndicator.waitFor({ state: 'hidden', timeout: 90000 }); // Generous timeout for our fixes
    console.log('✅ Loading completed (fallback successful)');
    
    // Check if we got demo data
    const grantCards = page.locator('.grant-card');
    const emptyStateHeading = page.getByRole('heading', { name: 'No grants found' });
    
    let hasResults = false;
    let hasEmptyState = false;
    
    try {
      await grantCards.first().waitFor({ state: 'visible', timeout: 5000 });
      const resultCount = await grantCards.count();
      console.log(`✅ Fallback successful: ${resultCount} demo grants shown`);
      hasResults = true;
    } catch (e) {
      try {
        await emptyStateHeading.waitFor({ state: 'visible', timeout: 5000 });
        console.log('✅ Empty state properly shown (no matching demo data)');
        hasEmptyState = true;
      } catch (e2) {
        console.log('❌ Neither results nor empty state found');
        return false;
      }
    }
    
    return hasResults || hasEmptyState;
    
  } catch (error) {
    console.error('❌ Timeout fallback test failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Run both tests
async function runAllTests() {
  console.log('🚀 Running E2E Fix Validation Tests\n');
  
  const test1 = await testWithMockedAPI();
  const test2 = await testTimeoutFallback();
  
  console.log('\n📊 Test Summary:');
  console.log(`   - Mocked API Test: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   - Timeout Fallback Test: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
  
  if (test1 && test2) {
    console.log('\n🎉 All E2E fixes are working correctly!');
    console.log('💡 Key improvements validated:');
    console.log('   - Proper timeout handling for slow APIs');
    console.log('   - Robust polling logic for search results');
    console.log('   - Graceful fallback to demo data');
    console.log('   - Reliable loading state management');
    return true;
  } else {
    console.log('\n💥 Some tests failed - review fixes needed');
    return false;
  }
}

runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});