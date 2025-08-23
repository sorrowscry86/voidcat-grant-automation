#!/bin/bash

# VoidCat RDC Deployment Validation Script
# Validates that both API and frontend are properly deployed and functional

echo "🔍 VoidCat RDC Deployment Validation"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Configuration
API_URL="https://grant-search-api.sorrowscry86.workers.dev"

# Get GitHub username for frontend URL
GITHUB_USERNAME=$(git config user.name 2>/dev/null || echo "unknown")
FRONTEND_URL="https://${GITHUB_USERNAME}.github.io/voidcat-grant-automation"

echo "📡 API Validation"
echo "-----------------"

# Test API health endpoint
echo -n "Health Check: "
if curl -s "$API_URL/health" | grep -q "healthy"; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "   API health endpoint not responding correctly"
fi

# Test API grant search endpoint
echo -n "Grant Search: "
if curl -s "$API_URL/api/grants/search?query=AI" | grep -q "success"; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING${NC}"
    echo "   Grant search may be using demo data"
fi

# Test API response time
echo -n "Response Time: "
RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null "$API_URL/health")
if (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
    echo -e "${GREEN}✅ ${RESPONSE_TIME}s${NC}"
else
    echo -e "${YELLOW}⚠️  ${RESPONSE_TIME}s (slow)${NC}"
fi

echo ""
echo "🌐 Frontend Validation"
echo "---------------------"

# Check if we're in a git repository
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo -n "Git Repository: "
    echo -e "${GREEN}✅ Valid${NC}"
    
    # Check current branch
    CURRENT_BRANCH=$(git branch --show-current)
    echo -n "Current Branch: "
    if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
        echo -e "${GREEN}✅ $CURRENT_BRANCH${NC}"
    else
        echo -e "${YELLOW}⚠️  $CURRENT_BRANCH (should be main/master)${NC}"
    fi
    
    # Check for uncommitted changes
    echo -n "Uncommitted Changes: "
    if git diff-index --quiet HEAD --; then
        echo -e "${GREEN}✅ None${NC}"
    else
        echo -e "${YELLOW}⚠️  Found (consider committing)${NC}"
    fi
else
    echo -e "${RED}❌ Not in git repository${NC}"
fi

# Test frontend accessibility
echo -n "Frontend URL: "
if curl -s -I "$FRONTEND_URL" | grep -q "200 OK"; then
    echo -e "${GREEN}✅ Accessible${NC}"
    echo "   URL: $FRONTEND_URL"
else
    echo -e "${YELLOW}⚠️  May not be deployed yet${NC}"
    echo "   Expected URL: $FRONTEND_URL"
fi

echo ""
echo "📊 Deployment Summary"
echo "--------------------"

# Overall status
API_HEALTH=$(curl -s "$API_URL/health" | grep -q "healthy" && echo "OK" || echo "FAIL")
FRONTEND_ACCESS=$(curl -s -I "$FRONTEND_URL" | grep -q "200 OK" && echo "OK" || echo "UNKNOWN")

echo "API Status: $API_HEALTH"
echo "Frontend Status: $FRONTEND_ACCESS"
echo ""

if [[ "$API_HEALTH" == "OK" ]]; then
    echo -e "${GREEN}🎯 API is ready for production use${NC}"
else
    echo -e "${RED}❌ API needs attention${NC}"
fi

if [[ "$FRONTEND_ACCESS" == "OK" ]]; then
    echo -e "${GREEN}🎯 Frontend is accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend may still be deploying${NC}"
    echo "   Check GitHub Actions: https://github.com/$GITHUB_USERNAME/voidcat-grant-automation/actions"
fi

echo ""
echo "🚀 Next Steps:"
echo "1. Test user registration flow"
echo "2. Test grant search functionality"
echo "3. Verify payment integration"
echo "4. Monitor user analytics"
echo ""
echo "💰 Revenue Targets:"
echo "- Week 1: $198 (2 Pro subscribers)"
echo "- Month 1: $500 (5 Pro subscribers)"
echo "- Month 3: $2,500 (25 subscribers + success fees)"
