# Search Testing Quick Reference

## Issue
After demo mode removal, search tests require:
1. API mocking to provide test data
2. Working CDN access for Alpine.js/Tailwind CSS

## Quick Fix for Test Environment

The test environment may not have CDN access. To run tests successfully:

### Option 1: In CI/CD with Network Access
```yaml
# .github/workflows/test.yml
- name: Run search tests
  run: |
    TEST_API_MODE=local npx playwright test tests/e2e/search.spec.ts
  env:
    # Ensure CDN access
    NO_PROXY: ""
```

### Option 2: Local Testing with Mock CDNs

Add to test setup (in `playwright.config.ts` or test file):
```typescript
// Mock CDN resources before running tests
await page.route('**/*.unpkg.com/**', async (route) => {
  if (route.request().url().includes('alpinejs')) {
    // Serve local Alpine.js
    const alpineJs = await fs.readFile('./node_modules/alpinejs/dist/cdn.min.js');
    await route.fulfill({ body: alpineJs, contentType: 'application/javascript' });
  } else {
    await route.continue();
  }
});
```

### Option 3: Install Alpine.js Locally

```bash
npm install alpinejs --save-dev
```

Then update `frontend/index.html` to check for local version:
```html
<script>
  // Try to load from node_modules if CDN fails
  if (typeof window.Alpine === 'undefined') {
    const script = document.createElement('script');
    script.src = '/node_modules/alpinejs/dist/cdn.min.js';
    document.head.appendChild(script);
  }
</script>
```

## Test Files

- **tests/e2e/search.spec.ts**: Main search test suite with API mocking
- **tests/e2e/utils/apiMockHelpers.ts**: API mocking utilities
- **docs/testing/SEARCH_TESTING_AFTER_DEMO_REMOVAL.md**: Comprehensive documentation

## Current Status

✅ API mocking helpers created
✅ Search tests updated with proper mocks  
⚠️  Tests require CDN access or local resource configuration
📝 Documentation complete

## Next Steps for Full Test Success

1. Configure CI/CD environment for CDN access, OR
2. Bundle Alpine.js/Tailwind locally, OR  
3. Update tests to inject Alpine.js directly into page context
