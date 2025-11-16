# Testing Search After Demo Mode Removal

## Summary

After the removal of demo mode (PR #48), the search functionality relies entirely on live API data or properly mocked API responses. This document explains the testing approach and known issues.

## Changes Made

### 1. API Mocking Infrastructure

Created `tests/e2e/utils/apiMockHelpers.ts` with comprehensive API mocking functions:

- **mockGrantSearchAPI**: Mocks the `/api/grants/search` endpoint with realistic test data
- **mockGrantDetailsAPI**: Mocks individual grant details endpoints  
- **mockGrantSearchAPIEmpty**: Mocks empty search results for testing empty states
- **mockGrantSearchAPIFailure**: Mocks API failures for error handling tests

### 2. Updated Search Tests

Updated `tests/e2e/search.spec.ts` to:
- Use API mocking before each test
- Test successful search with results
- Test empty state when no results found
- Test error handling when API fails
- Test search parameter persistence

### 3. Mock Data

The mock data includes 3 realistic grants:
1. **AI Research Grant** - National Science Foundation ($500,000)
2. **Defense Technology Innovation** - Department of Defense ($250,000)
3. **Clean Energy Research** - Department of Energy ($1,000,000)

## Known Issues

### CDN Resource Loading

**Problem**: The frontend depends on CDN resources (Alpine.js, Tailwind CSS, Stripe.js) that may fail to load in isolated test environments due to:
- Network restrictions
- SSL certificate validation failures  
- Firewall rules

**Impact**: When Alpine.js fails to load, the frontend JavaScript framework doesn't initialize, preventing interactive features like search from working.

**Symptoms**:
```
Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID
Failed to load resource: net::ERR_NAME_NOT_RESOLVED
```

### Solutions

#### Option 1: Run Tests with Proper Network Access (Recommended for CI/CD)

Ensure the test environment can access:
- `https://unpkg.com` (Alpine.js)
- `https://cdn.tailwindcss.com` (Tailwind CSS)
- `https://js.stripe.com` (Stripe.js)

#### Option 2: Local Resource Caching (Future Enhancement)

Download and serve CDN resources locally:
```bash
# Download resources
mkdir -p frontend/vendor
curl -o frontend/vendor/alpine.min.js https://unpkg.com/alpinejs@3.14.1/dist/cdn.min.js
curl -o frontend/vendor/tailwind.min.js https://cdn.tailwindcss.com/

# Update index.html to use local resources in test mode
```

#### Option 3: Mock CDN Resources in Tests

Use Playwright's route interception to provide minimal mocks:
```typescript
await page.route('https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js', async (route) => {
  // Serve local Alpine.js file or mock
  await route.fulfill({ ... });
});
```

## Running Tests

### Prerequisites

1. Install dependencies:
```bash
npm install
cd api && npm install && cd ..
```

2. Install Playwright browsers:
```bash
npx playwright install chromium
```

3. Start local servers (if testing locally):
```bash
# Terminal 1: Start API
cd api && npx wrangler dev --local --port 8787

# Terminal 2: Start frontend  
cd frontend && python3 -m http.server 3000
```

### Run Search Tests

With local API mode:
```bash
TEST_API_MODE=local npx playwright test tests/e2e/search.spec.ts --project=chromium
```

With file:// mode (requires CDN access):
```bash
npx playwright test tests/e2e/search.spec.ts --project=chromium
```

### Expected Results

When properly configured, tests should:
- ✅ Load the page successfully
- ✅ Initialize Alpine.js framework
- ✅ Execute search with mocked API responses
- ✅ Display 3 grant cards matching the mock data
- ✅ Handle empty results gracefully
- ✅ Show error messages when API fails

## Test Coverage

The updated search tests verify:

1. **Basic Search**: Keywords-only search returns results
2. **Filtered Search**: Agency filter correctly limits results
3. **Agency Selection**: All agency options work correctly  
4. **Loading States**: Search button shows "Searching..." during requests
5. **Input Validation**: Various search terms are accepted
6. **Empty Search**: Searching without keywords works
7. **Result Display**: Grant cards show correct data
8. **Empty State**: "No grants found" message appears when appropriate
9. **Error Handling**: API failures show user-friendly error messages
10. **Parameter Persistence**: Search values are maintained after search

## Troubleshooting

### Tests Hang or Timeout

**Cause**: Alpine.js not loading, page waiting for framework initialization

**Solution**: 
1. Check network access to CDN resources
2. Verify frontend server is running on correct port
3. Check browser console for JavaScript errors
4. Ensure API mocking is set up before page navigation

### "No grants found" Despite Mock Data

**Cause**: API mock not intercepting requests

**Solution**:
1. Verify mock is set up before `page.goto()`
2. Check route pattern matches actual API URL
3. Add logging to mock functions to verify they're called
4. Ensure `await` is used when setting up mocks

### API Requests Not Being Made

**Cause**: Alpine.js not initialized, click handlers not attached

**Solution**:
1. Wait for Alpine.js to load: `await page.waitForFunction(() => window.Alpine !== undefined)`
2. Ensure page has finished loading: `await page.waitForLoadState('networkidle')`
3. Add delays after page load: `await page.waitForTimeout(2000)`

## Future Improvements

1. **Local CDN Resources**: Bundle Alpine.js and other dependencies with the project
2. **Service Worker**: Use service worker to cache external resources  
3. **Test Environment Detection**: Auto-detect test environment and use local resources
4. **Snapshot Testing**: Add visual regression tests for search results
5. **Performance Testing**: Measure search response times
6. **Accessibility Testing**: Verify search is keyboard accessible

## Related Files

- `tests/e2e/search.spec.ts` - Main search test suite
- `tests/e2e/utils/apiMockHelpers.ts` - API mocking utilities
- `tests/e2e/pages/HomePage.ts` - Page object for homepage
- `playwright.config.ts` - Playwright configuration
- `frontend/index.html` - Frontend application

## References

- [Playwright Route Mocking](https://playwright.dev/docs/network)
- [Alpine.js Documentation](https://alpinejs.dev/)
- [NO SIMULATIONS LAW Compliance](../../NO_SIMULATIONS_LAW_COMPLIANCE_REPORT.md)
