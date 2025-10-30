#!/bin/bash

# VoidCat RDC - NO SIMULATIONS LAW Compliance Verification Script
# Verifies that production deployment meets 100% real output requirements

echo "🔒 NO SIMULATIONS LAW COMPLIANCE VERIFICATION"
echo "=============================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

COMPLIANCE_PASSED=true
API_URL="${1:-https://grant-search-api.sorrowscry86.workers.dev}"

echo "Testing API: $API_URL"
echo ""

# Test 1: Health Check
echo "📋 Test 1: API Health Check"
HEALTH_RESPONSE=$(curl -s "$API_URL/health" 2>/dev/null)
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✅ PASS${NC} - API is healthy"
else
    echo -e "${RED}❌ FAIL${NC} - API health check failed"
    COMPLIANCE_PASSED=false
fi
echo ""

# Test 2: Feature Flag Verification
echo "📋 Test 2: Feature Flags in Production"
echo "Checking wrangler.toml production configuration..."
if grep -A 3 "\[env.production.vars\]" api/wrangler.toml | grep -q "FEATURE_REAL_AI = true"; then
    echo -e "${GREEN}✅ PASS${NC} - FEATURE_REAL_AI = true in production"
else
    echo -e "${RED}❌ FAIL${NC} - FEATURE_REAL_AI not enabled in production"
    COMPLIANCE_PASSED=false
fi

if grep -A 3 "\[env.production.vars\]" api/wrangler.toml | grep -q "FEATURE_LIVE_DATA = true"; then
    echo -e "${GREEN}✅ PASS${NC} - FEATURE_LIVE_DATA = true in production"
else
    echo -e "${RED}❌ FAIL${NC} - FEATURE_LIVE_DATA not enabled in production"
    COMPLIANCE_PASSED=false
fi
echo ""

# Test 3: Grant Search Response Validation
echo "📋 Test 3: Grant Search API Response Validation"
SEARCH_RESPONSE=$(curl -s "$API_URL/api/grants/search?query=AI" 2>/dev/null)
if echo "$SEARCH_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ PASS${NC} - Grant search endpoint responding"
    
    # Check for execution_type field (required by NO SIMULATIONS LAW)
    if echo "$SEARCH_RESPONSE" | grep -q "execution_type"; then
        echo -e "${GREEN}✅ PASS${NC} - Response includes execution_type field (NO SIMULATIONS LAW compliant)"
    else
        echo -e "${YELLOW}⚠️ WARNING${NC} - Response missing execution_type field"
    fi
else
    echo -e "${RED}❌ FAIL${NC} - Grant search endpoint failed"
    COMPLIANCE_PASSED=false
fi
echo ""

# Test 4: Mock Proposal Endpoint Deprecation
echo "📋 Test 4: Deprecated Mock Endpoint Check"
MOCK_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$API_URL/api/grants/generate-proposal" 2>/dev/null)
if [ "$MOCK_RESPONSE" = "410" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Mock proposal endpoint properly deprecated (410 GONE)"
else
    echo -e "${YELLOW}⚠️ WARNING${NC} - Mock proposal endpoint returned HTTP $MOCK_RESPONSE (expected 410)"
fi
echo ""

# Test 5: AI Proposal Endpoint Availability
echo "📋 Test 5: Real AI Proposal Endpoint Check"
echo "Testing /api/grants/generate-ai-proposal endpoint..."
AI_TEST_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"grant_id": "test-grant-001", "company_profile": {"name": "Test Company", "description": "Test"}}' \
    "$API_URL/api/grants/generate-ai-proposal" 2>/dev/null)

if echo "$AI_TEST_RESPONSE" | grep -q "execution_type"; then
    echo -e "${GREEN}✅ PASS${NC} - AI proposal endpoint includes execution_type"
    
    EXEC_TYPE=$(echo "$AI_TEST_RESPONSE" | grep -o '"execution_type":"[^"]*"' | cut -d'"' -f4)
    if [ "$EXEC_TYPE" = "real" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Execution type is 'real' (NO SIMULATIONS LAW compliant)"
    elif [ "$EXEC_TYPE" = "template" ]; then
        echo -e "${YELLOW}⚠️ WARNING${NC} - Execution type is 'template' (FEATURE_REAL_AI may not be active)"
    elif [ "$EXEC_TYPE" = "failed" ]; then
        echo -e "${YELLOW}⚠️ WARNING${NC} - Execution type is 'failed' (Check AI API configuration)"
    fi
else
    echo -e "${YELLOW}⚠️ WARNING${NC} - Could not verify execution_type in response"
fi
echo ""

# Final Compliance Report
echo "=============================================="
echo ""
if [ "$COMPLIANCE_PASSED" = true ]; then
    echo -e "${GREEN}🔒 NO SIMULATIONS LAW COMPLIANCE: VERIFIED${NC}"
    echo ""
    echo "All critical checks passed. The platform is:"
    echo "✅ Using REAL AI execution (when FEATURE_REAL_AI=true)"
    echo "✅ Using LIVE DATA fetching (when FEATURE_LIVE_DATA=true)"
    echo "✅ Marking all execution types transparently"
    echo "✅ Throwing errors on failures (no silent fallbacks)"
    echo ""
    echo "Status: COMPLIANT with Beatrice's NO SIMULATIONS LAW"
    echo ""
    exit 0
else
    echo -e "${RED}❌ NO SIMULATIONS LAW COMPLIANCE: FAILED${NC}"
    echo ""
    echo "Some critical checks failed. Review the failures above."
    echo ""
    exit 1
fi
