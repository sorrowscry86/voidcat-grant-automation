/**
 * Debug script to understand what's happening with the frontend
 */

const { chromium } = require('playwright');
const path = require('path');

async function debugFrontend() {
  console.log('🔍 Debugging Frontend Behavior...\n');
  
  const browser = await chromium.launch({ 
    executablePath: '/usr/bin/chromium-browser',
    headless: true, // Must be headless in this environment
    slowMo: 0 // No need to slow down
  });
  
  try {
    const page = await browser.newPage();
    
    // Log console messages
    page.on('console', msg => {
      console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
    });
    
    // Log errors
    page.on('pageerror', error => {
      console.log(`[BROWSER ERROR] ${error.message}`);
    });
    
    const frontendPath = path.join(__dirname, 'frontend', 'index.html');
    const fileUrl = `file://${frontendPath}?e2e_skip_autosearch=1`;
    
    console.log(`📂 Loading: ${fileUrl}`);
    await page.goto(fileUrl, { timeout: 30000 });
    
    // Wait a moment for page to settle
    await page.waitForTimeout(3000);
    
    console.log('\n🔧 Checking Alpine.js state...');
    const alpineExists = await page.evaluate(() => {
      return typeof window.Alpine !== 'undefined';
    });
    console.log(`Alpine.js loaded: ${alpineExists}`);
    
    if (alpineExists) {
      const appData = await page.evaluate(() => {
        const appElement = document.querySelector('[x-data="grantApp()"]');
        if (appElement && appElement._x_dataStack) {
          const data = appElement._x_dataStack[0];
          return {
            loading: data.loading,
            grants: data.grants ? data.grants.length : 0,
            searchPerformed: data.searchPerformed,
            apiBase: data.apiBase
          };
        }
        return null;
      });
      console.log('App state:', appData);
    }
    
    console.log('\n📝 Testing search button click...');
    const searchInput = page.getByRole('textbox', { name: /Search keywords/ });
    const searchButton = page.getByRole('button', { name: /Search Grants/ });
    
    await searchInput.fill('test query');
    console.log('Filled search input');
    
    await searchButton.click();
    console.log('Clicked search button');
    
    // Wait and check state again
    await page.waitForTimeout(5000);
    
    if (alpineExists) {
      const appDataAfter = await page.evaluate(() => {
        const appElement = document.querySelector('[x-data="grantApp()"]');
        if (appElement && appElement._x_dataStack) {
          const data = appElement._x_dataStack[0];
          return {
            loading: data.loading,
            grants: data.grants ? data.grants.length : 0,
            searchPerformed: data.searchPerformed,
            searchQuery: data.searchQuery
          };
        }
        return null;
      });
      console.log('App state after search:', appDataAfter);
    }
    
    // Check if loading indicator is visible
    const loadingVisible = await page.getByText('Loading grant opportunities...').isVisible();
    console.log(`Loading indicator visible: ${loadingVisible}`);
    
    // Wait a bit longer to see if anything changes
    console.log('\n⏳ Waiting 30 seconds to observe behavior...');
    await page.waitForTimeout(30000);
    
    // Final state check
    if (alpineExists) {
      const finalState = await page.evaluate(() => {
        const appElement = document.querySelector('[x-data="grantApp()"]');
        if (appElement && appElement._x_dataStack) {
          const data = appElement._x_dataStack[0];
          return {
            loading: data.loading,
            grants: data.grants ? data.grants.length : 0,
            searchPerformed: data.searchPerformed,
            usingDemoData: data.usingDemoData
          };
        }
        return null;
      });
      console.log('Final app state:', finalState);
    }
    
    const finalLoadingVisible = await page.getByText('Loading grant opportunities...').isVisible();
    console.log(`Final loading indicator visible: ${finalLoadingVisible}`);
    
    console.log('\n✅ Debug session complete');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugFrontend().catch(console.error);