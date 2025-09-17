# Comprehensive Live Payment System Testing

This directory contains a complete testing infrastructure for validating the VoidCat Grant Automation payment system under production conditions. The testing suite implements the requirements for thorough live payment system validation.

## 🎯 Testing Objectives

As specified in the requirements, this testing suite:

1. **Runs the full E2E test suite multiple times** (at least 5 consecutive times) for reliability testing
2. **Directly tests the live /api/stripe/create-checkout endpoint** in loops (5x) with validation
3. **Validates the /api/stripe/webhook endpoint** with test events
4. **Checks database state** after each round of tests
5. **Provides automated, repeatable testing** with clear error reporting
6. **Tests under various network conditions** (optional)

## 📁 Testing Components

### Core Testing Scripts

1. **`comprehensive-live-testing.sh`** - Master orchestrator script
   - Runs all testing phases in sequence
   - Implements the complete testing requirements
   - Generates comprehensive reports
   - **Usage**: `./comprehensive-live-testing.sh`

2. **`run-live-payment-tests.sh`** - Focused payment system testing
   - E2E test suite execution (5 rounds)
   - API endpoint validation
   - Stripe webhook testing
   - Database state validation
   - **Usage**: `./run-live-payment-tests.sh`

3. **`test-api-endpoints.js`** - Direct API endpoint testing
   - Tests `/api/stripe/create-checkout` 5 times
   - Validates response times and success rates
   - Tests webhook endpoint availability
   - **Usage**: `node test-api-endpoints.js`

4. **`live-payment-testing.js`** - Comprehensive Node.js test runner
   - Advanced testing with performance metrics
   - Multiple test scenarios and stress testing
   - **Usage**: `node live-payment-testing.js`

### Specialized Test Files

5. **`tests/e2e/paymentStressTesting.spec.ts`** - Playwright stress tests
   - Multiple consecutive checkout attempts
   - Session state validation
   - Rapid request handling
   - Network timeout recovery
   - Payment form data integrity
   - **Usage**: `npm run test:payment-stress`

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
npm install
cd api && npm install && cd ..

# Install Playwright browsers (takes 5-10 minutes)
npm run test:install
```

### Run Complete Testing Suite

```bash
# Run the full comprehensive testing (recommended)
./comprehensive-live-testing.sh

# Or run individual test components
./run-live-payment-tests.sh          # Payment-focused testing
node test-api-endpoints.js           # Direct API testing
npm run test:payment-stress          # Stress testing only
```

### Available npm Scripts

```bash
npm run test                    # Standard Playwright tests
npm run test:payment-stress     # Payment stress tests only
npm run test:api-endpoints      # Direct API endpoint tests
npm run test:live-payment       # Live payment system tests
npm run test:comprehensive      # Full comprehensive testing
```

## 📊 Testing Phases

### Phase 1: E2E Test Suite (5 Rounds)
- Runs complete Playwright test suite 5 consecutive times
- Tests user registration, search, proposal generation
- Validates Pro subscription and Stripe integration
- Checks free tier restrictions and upgrade flow
- Collects artifacts (screenshots, logs) for each run

### Phase 2: Direct API Testing (5 Iterations)
- Tests `/api/stripe/create-checkout` with 5 different test users
- Validates Stripe Checkout URL generation
- Measures response times and consistency
- Verifies proper error handling

### Phase 3: Webhook Validation
- Tests `/api/stripe/webhook` endpoint
- Sends mock webhook events
- Validates proper processing and acknowledgment
- Checks error handling for unsigned requests

### Phase 4: Database State Validation
- Tests database connectivity through API endpoints
- Validates user registration functionality
- Checks for data integrity after test rounds

### Phase 5: Stress Testing
- Multiple consecutive checkout attempts
- Session state persistence testing
- Rapid request handling validation
- Network timeout recovery testing

## 📈 Success Criteria

The testing suite validates against these production-readiness criteria:

- **Minimum Test Runs**: ≥15 total test executions
- **Success Rate**: >95% of all tests must pass
- **Response Time**: API responses <500ms average
- **Payment Processing**: >99% success rate for checkout creation
- **Error Handling**: Graceful failure recovery
- **Database Integrity**: No orphaned or duplicate records

## 📋 Test Reports

### Report Locations
- **Main Results**: `./test-results/comprehensive-live-testing/`
- **E2E Artifacts**: `./test-results/artifacts/`
- **API Results**: `./test-results/api-endpoint-testing/`
- **Logs**: `./test-results/logs/`

### Report Types
- **JSON Reports**: Detailed machine-readable results
- **Summary Reports**: Human-readable test summaries  
- **Performance Metrics**: Response times, success rates
- **Error Analysis**: Detailed failure information
- **Compliance Assessment**: Requirements met/not met

## 🔧 Configuration

### Environment Variables
The tests can be configured via environment variables:

```bash
export TEST_API_MODE=live              # Use live API (default)
export TEST_ROUNDS=5                   # Number of test rounds
export API_BASE_URL=https://grant-search-api.sorrowscry86.workers.dev
```

### Customization
- Modify `CONFIG` objects in test scripts for different parameters
- Adjust timeout values in `tests/e2e/utils/testUtils.ts`
- Update test user data in `tests/e2e/utils/testDataGenerator.js`

## 🚨 Troubleshooting

### Common Issues

1. **Browser Installation Fails**
   ```bash
   # Install specific browser
   npx playwright install chromium
   ```

2. **API Endpoint Unreachable**
   - Check network connectivity
   - Verify API deployment status
   - Check firewall settings

3. **Tests Timeout**
   - Increase timeout values in scripts
   - Check system performance
   - Verify API response times

4. **Permission Denied**
   ```bash
   chmod +x *.sh
   ```

### Debug Mode
```bash
# Run with debug output
DEBUG=1 ./comprehensive-live-testing.sh

# Run single test with debug
npm run test:debug paymentStressTesting.spec.ts
```

## 📞 Manual Testing Commands

For manual validation, use these commands:

```bash
# Test API health
curl https://grant-search-api.sorrowscry86.workers.dev/health

# Test checkout creation (loop)
for i in {1..5}; do
  curl -X POST https://grant-search-api.sorrowscry86.workers.dev/api/stripe/create-checkout \
    -H "Content-Type: application/json" \
    -d '{"email":"testuser'$i'@example.com","plan":"pro"}'
  sleep 2
done

# Test webhook endpoint
curl -X POST https://grant-search-api.sorrowscry86.workers.dev/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"test.event","data":{"object":{}}}'
```

## 🏆 Production Readiness

When all tests pass with >95% success rate across ≥15 test runs, the system is considered production-ready for:

- ✅ Live user registrations
- ✅ Pro subscription checkouts
- ✅ Stripe payment processing
- ✅ Webhook event handling
- ✅ Database operations
- ✅ Error recovery scenarios

## 📝 Notes

- Tests are designed to run in sandboxed environments
- Network access required for live API testing
- Browser installation can take 5-10 minutes initially
- Full test suite execution takes 30-60 minutes
- Results are saved for later analysis
- Failed tests include detailed error information for debugging

---

**Last Updated**: 2024-01-09  
**Version**: 1.0.0  
**Compatibility**: Node.js ≥18.0.0, Playwright ≥1.54.2