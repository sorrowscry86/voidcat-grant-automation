#!/bin/bash
# Validate API endpoints and functionality
# Usage: ./scripts/validate-api.sh [port]

set -e

PORT=${1:-8787}
BASE_URL="http://localhost:$PORT"

echo "🧪 Validating VoidCat Grant Search API..."
echo "   Base URL: $BASE_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Helper function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_field="$3"
    
    echo -n "Testing $name... "
    
    RESPONSE=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null)
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        if echo "$BODY" | jq -e "$expected_field" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ PASSED${NC}"
            PASSED=$((PASSED + 1))
            return 0
        else
            echo -e "${RED}❌ FAILED${NC} (missing expected field: $expected_field)"
            echo "   Response: $(echo "$BODY" | head -c 100)..."
            FAILED=$((FAILED + 1))
            return 1
        fi
    else
        echo -e "${RED}❌ FAILED${NC} (HTTP $HTTP_CODE)"
        echo "   Response: $(echo "$BODY" | head -c 100)..."
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Test 1: Health endpoint
test_endpoint "Health Check" "$BASE_URL/health" ".status"

# Test 2: Root endpoint
test_endpoint "Root Endpoint" "$BASE_URL/" ".service"

# Test 3: Grants search
test_endpoint "Grants Search" "$BASE_URL/api/grants/search?query=AI" ".success"

# Test 4: Grants stats
test_endpoint "Grants Stats" "$BASE_URL/api/grants/stats" ".statistics.total_grants"

# Test 5: Specific grant details
test_endpoint "Grant Details" "$BASE_URL/api/grants/SBIR-25-001" ".success"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results:"
echo -e "  ${GREEN}Passed: $PASSED${NC}"
echo -e "  ${RED}Failed: $FAILED${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All API validations passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some API validations failed${NC}"
    exit 1
fi
