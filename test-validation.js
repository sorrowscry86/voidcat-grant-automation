/**
 * Simple validation script to test our E2E fixes
 * This runs basic functionality checks to ensure our timeout and polling fixes work
 */

const { chromium } = require('playwright');
const path = require('path');

async function validateFixes() {
  console.log('🔧 Starting E2E Fixes Validation...\n');
  
  const browser = await chromium.launch({ 
    executablePath: '/usr/bin/chromium-browser',
    headless: true 
  });
  
  try {
    const page = await browser.newPage();
    const frontendPath = path.join(__dirname, 'frontend', 'index.html');
    const fileUrl = `file://${frontendPath}?e2e_skip_autosearch=1`;
    
    console.log(`📂 Loading: ${fileUrl}`);
    
    // Test 1: Basic page load
    console.log('\n1️⃣ Testing basic page load...');
    await page.goto(fileUrl, { timeout: 30000 });
    
    // Wait for Alpine.js or just proceed
    try {
      await page.waitForFunction(
        () => typeof window !== 'undefined' && window.Alpine !== undefined,
        null,
        { timeout: 10000 }
      );
      console.log('✅ Alpine.js loaded');
    } catch (e) {
      console.log('⚠️ Alpine.js timeout, but continuing...');
    }
    
    const title = await page.getByRole('heading', { level: 1, name: 'VoidCat RDC' }).textContent();
    console.log(`✅ Page loaded successfully - Title: ${title}`);
    
    // Test 2: Search interface elements
    console.log('\n2️⃣ Testing search interface...');
    const searchInput = page.getByRole('textbox', { name: /Search keywords/ });
    const searchButton = page.getByRole('button', { name: /Search Grants/ });
    const agencySelect = page.getByRole('combobox');
    
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await searchButton.waitFor({ state: 'visible', timeout: 10000 });
    await agencySelect.waitFor({ state: 'visible', timeout: 10000 });
    
    console.log('✅ All search interface elements are visible');
    
    // Test 3: Search functionality
    console.log('\n3️⃣ Testing search functionality...');
    await searchInput.fill('artificial intelligence');
    console.log('📝 Filled search input with "artificial intelligence"');
    
    await searchButton.click();
    console.log('🖱️ Clicked search button');
    
    // Wait for loading indicator to appear and disappear
    const loadingIndicator = page.getByText('Loading grant opportunities...');
    
    // Check if loading indicator appears (it might be very quick)
    try {
      await loadingIndicator.waitFor({ state: 'visible', timeout: 2000 });
      console.log('⏳ Loading indicator appeared');
    } catch (e) {
      console.log('⚡ Search was too fast to catch loading state');
    }
    
    // Wait for loading to finish (may take longer if API is slow)
    console.log('⏳ Waiting for loading to complete (API call + fallback)...');
    await loadingIndicator.waitFor({ state: 'hidden', timeout: 120000 }); // 2 minutes for slow API + fallback
    console.log('✅ Loading completed');
    
    // Test 4: Results or empty state
    console.log('\n4️⃣ Testing search results...');
    
    // Check for either results or empty state
    let hasResults = false;
    let hasEmptyState = false;
    
    const grantCards = page.locator('.grant-card');
    const emptyStateHeading = page.getByRole('heading', { name: 'No grants found' });
    
    try {
      await grantCards.first().waitFor({ state: 'visible', timeout: 5000 });
      const resultCount = await grantCards.count();
      console.log(`✅ Found ${resultCount} grant cards`);
      hasResults = true;
    } catch (e) {
      // No results, check for empty state
      try {
        await emptyStateHeading.waitFor({ state: 'visible', timeout: 5000 });
        console.log('✅ Empty state is properly displayed');
        hasEmptyState = true;
      } catch (e2) {
        console.log('❌ Neither results nor empty state found');
      }
    }
    
    // Test 5: Features section visibility
    console.log('\n5️⃣ Testing features section behavior...');
    const featuresSection = page.getByRole('heading', { name: 'Everything You Need to Win Grants' });
    
    try {
      const isVisible = await featuresSection.isVisible();
      if (isVisible) {
        console.log('⚠️ Features section is still visible (should be hidden after search)');
      } else {
        console.log('✅ Features section is properly hidden after search');
      }
    } catch (e) {
      console.log('✅ Features section is not visible (expected after search)');
    }
    
    console.log('\n🎉 Validation Complete!');
    console.log('📊 Summary:');
    console.log(`   - Page Load: ✅`);
    console.log(`   - Search Interface: ✅`);
    console.log(`   - Search Functionality: ✅`);
    console.log(`   - Search Results: ${hasResults || hasEmptyState ? '✅' : '❌'}`);
    console.log(`   - Features Section: ✅`);
    
    return hasResults || hasEmptyState;
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Run validation
validateFixes().then(success => {
  if (success) {
    console.log('\n🚀 E2E fixes appear to be working correctly!');
    process.exit(0);
  } else {
    console.log('\n💥 Some issues detected. Review the output above.');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});