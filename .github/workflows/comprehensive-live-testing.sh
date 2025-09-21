#!/bin/bash
set -e

echo "🚀 Starting Comprehensive Live Testing..."

# Install dependencies if needed
npm ci

# Run the existing Playwright tests
echo "🎭 Running Playwright E2E Tests..."
npx playwright test --project=chromium

# Check if we have live/integration tests
if [ -f "package.json" ]; then
    # Check for test scripts in package.json
    if npm run | grep -q "test:live"; then
        echo "🔥 Running Live Tests..."
        npm run test:live
    elif npm run | grep -q "test:integration"; then
        echo "🔗 Running Integration Tests..."
        npm run test:integration
    else
        echo "📋 Running Standard Test Suite..."
        npm test
    fi
fi

echo "✅ Comprehensive Testing Complete!"
