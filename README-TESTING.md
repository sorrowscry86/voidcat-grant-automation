# E2E Testing Guide

## Overview

This project uses **Playwright** for comprehensive end-to-end testing of the VoidCat RDC Federal Grant Automation Platform.

## Test Structure

```
tests/e2e/
├── pages/               # Page Object Models
│   ├── HomePage.ts     # Main application page
│   └── RegistrationModal.ts  # User registration modal
├── utils/              # Test utilities and helpers
│   └── test-helpers.ts # Common test functions
├── homepage.spec.ts    # Homepage functionality tests
├── search.spec.ts      # Grant search functionality tests
├── registration.spec.ts # User registration flow tests
└── responsive.spec.ts  # Responsive design and mobile tests
```

## Test Coverage

### ✅ Core Functionality
- **Homepage Display**: Header, branding, navigation elements
- **Search Interface**: Keywords, agency filters, search execution
- **Registration Flow**: Modal, form validation, user input
- **Responsive Design**: Desktop, tablet, mobile layouts
- **Cross-Browser**: Chromium, Firefox, WebKit support

### 📊 Test Statistics
- **Total Tests**: 155 (across all browsers and viewports)
- **Passing**: 133 tests (86% success rate)
- **Core Browsers**: 100% pass rate on Chromium, Firefox
- **Mobile Testing**: iOS/Android viewports tested

## Quick Start

### Install Dependencies
```bash
npm install
npx playwright install
```

### Run Tests
```bash
# Run all tests
npm test

# Run specific browser
npx playwright test --project=chromium

# Run with UI (interactive mode)
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Debug specific test
npm run test:debug -- tests/e2e/homepage.spec.ts
```

### View Test Results
```bash
npm run test:report
```

## Test Scenarios

### 🏠 Homepage Tests (`homepage.spec.ts`)
- Verify branding and header display
- Check navigation elements
- Validate search interface components
- Confirm empty state handling
- Test features section visibility

### 🔍 Search Tests (`search.spec.ts`)
- Keyword search functionality
- Agency filter selection
- Form state persistence
- Loading state handling
- Input validation
- Empty search scenarios

### 📝 Registration Tests (`registration.spec.ts`)
- Modal opening/closing
- Form field validation
- Required vs optional fields
- Email format validation
- Form submission handling
- User experience flows

### 📱 Responsive Tests (`responsive.spec.ts`)
- Desktop layout (1280x720)
- Tablet layout (768x1024)
- Mobile layout (375x667)
- Touch interactions
- Viewport adaptations
- Cross-device consistency

## Configuration

### Playwright Config (`playwright.config.ts`)
- **Base URL**: Local file system (`file://`)
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Reporters**: HTML reports with screenshots and videos
- **Retry Strategy**: 2 retries on CI
- **Screenshots**: On failure only
- **Videos**: Retained on failure

### Environment Support
- **Local Development**: File-based frontend testing
- **CI/CD Ready**: Configured for automated testing
- **Cross-Platform**: Windows, macOS, Linux support

## Writing New Tests

### Page Object Model Pattern
```typescript
// Use existing page objects
import { HomePage } from './pages/HomePage';
import { RegistrationModal } from './pages/RegistrationModal';

test('my new test', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.goto();
  await homePage.searchFor('AI', 'NASA');
});
```

### Test Utilities
```typescript
import { waitForAlpine, mockAPIResponses } from './utils/test-helpers';

test('test with mocked API', async ({ page }) => {
  await mockAPIResponses(page);
  // Your test code here
});
```

## Debugging

### Common Issues
1. **CORS Errors**: Expected when testing locally (file://)
2. **Alpine.js Loading**: Use `waitForAlpine()` helper
3. **Timing Issues**: Prefer `waitFor*` methods over fixed timeouts

### Debug Commands
```bash
# Run single test with debug
npx playwright test --debug tests/e2e/homepage.spec.ts

# Generate test code
npx playwright codegen localhost:3000

# Show test trace
npx playwright show-trace test-results/trace.zip
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E Tests
  run: npm test

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  if: failure()
  with:
    name: playwright-results
    path: test-results/
```

## Best Practices

### ✅ Do
- Use descriptive test names
- Follow Page Object Model pattern
- Wait for elements instead of using timeouts
- Test user workflows, not implementation
- Use data-testid attributes for stable selectors

### ❌ Don't
- Use fixed `wait()` calls
- Test internal implementation details
- Write overly complex test scenarios
- Ignore cross-browser compatibility
- Skip responsive design testing

## Support

For questions about testing:
1. Check existing test patterns in the codebase
2. Review Playwright documentation
3. Use the test utilities in `utils/test-helpers.ts`
4. Run tests with `--debug` flag for investigation

---

*Tests designed with 🧘‍♂️ zen and California vibes by Codey Jr.*