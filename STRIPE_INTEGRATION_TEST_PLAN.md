# Stripe Integration Test Plan

## Manual Testing Steps

### Prerequisites
- Cloudflare environment variables set:
  - `STRIPE_SECRET_KEY` - Stripe secret key
  - `STRIPE_PUBLIC_KEY` or `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
  - `STRIPE_PRICE_ID` - Price ID for the Pro subscription
  - `STRIPE_WEBHOOK_SECRET` - Webhook endpoint secret

### API Testing

1. **Test Public Config Endpoint**
   ```bash
   curl https://grant-search-api.sorrowscry86.workers.dev/api/public/stripe-config
   ```
   Expected response:
   ```json
   {
     "publishable_key": "pk_test_...",
     "price_id": "price_..."
   }
   ```

2. **Test Checkout Session Creation**
   ```bash
   curl -X POST https://grant-search-api.sorrowscry86.workers.dev/api/stripe/create-checkout \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <api_key>" \
     -d '{"email": "test@example.com"}'
   ```
   Expected response:
   ```json
   {
     "sessionId": "cs_test_..."
   }
   ```

### Frontend Testing

1. **User Registration Flow**
   - Navigate to the application
   - Click "Get Started" 
   - Register a new user
   - Verify user is logged in

2. **Upgrade Flow**
   - Click "Upgrade to Pro" button
   - Verify Stripe config is fetched dynamically
   - Verify checkout session is created
   - Verify redirect to Stripe Checkout

3. **Error Handling**
   - Test with missing API key
   - Test with invalid Stripe configuration
   - Test with failed checkout session creation

### Database Testing

The webhook handler expects these columns in the `users` table:
- `subscription_tier` (updated to 'pro')
- `stripe_customer_id` (from session.customer)
- `stripe_subscription_id` (from session.subscription)
- `email` (used for lookup)

### Test Cases Covered by stripe.spec.ts

1. **Successful checkout session creation**
   - Mocks all required APIs
   - Verifies Stripe.js is called with correct session ID

2. **Stripe config fetch failure**
   - Tests error handling when config endpoint fails
   - Verifies appropriate error message

3. **Checkout session creation failure**
   - Tests error handling when checkout API fails
   - Verifies appropriate error message

4. **Authentication requirement**
   - Tests that unauthenticated users cannot proceed
   - Verifies login prompt

5. **Simulated successful payment**
   - Tests the complete flow including mock payment success
   - Validates subscription tier upgrade simulation

6. **Configuration error handling**
   - Tests handling of missing publishable key
   - Verifies appropriate error message

## Implementation Status

✅ **Backend Implementation Complete:**
- `/api/stripe/create-checkout` endpoint implemented
- `/api/stripe/webhook` endpoint implemented  
- `/api/public/stripe-config` endpoint added
- Database update logic for subscription upgrade
- Proper error handling and validation

✅ **Frontend Implementation Complete:**
- Dynamic Stripe publishable key fetching
- Updated `createCheckoutSession()` function
- Proper error handling for all failure scenarios
- Authentication checks

✅ **Testing Implementation Complete:**
- Comprehensive E2E test suite in `stripe.spec.ts`
- 6 test scenarios covering all major paths
- Proper mocking of all external dependencies
- Error case coverage

## Security Considerations

✅ **Implemented:**
- Webhook signature verification using `STRIPE_WEBHOOK_SECRET`
- Server-side price configuration (no client-side price manipulation)
- Proper CORS configuration restricting origins
- API key authentication for checkout session creation
- Environment variable based configuration (no secrets in code)

✅ **Architecture follows best practices:**
- Separation of concerns (config endpoint vs checkout endpoint)
- Dynamic configuration loading
- Proper error propagation
- Database transaction safety