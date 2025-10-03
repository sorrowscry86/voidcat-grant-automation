#!/bin/bash
# Phase 2A Setup Script
# Configures Cloudflare secrets and KV namespaces for Production Reality Integration

set -e  # Exit on error

echo "🚀 Phase 2A Setup: Production Reality Integration"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0[32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler CLI is not installed"
    echo "Install it with: npm install -g wrangler"
    exit 1
fi

echo "${BLUE}Step 1: Creating KV Namespace for Federal Data Caching${NC}"
echo "-------------------------------------------------------"

# Create KV namespace for federal data caching
echo "Creating FEDERAL_CACHE KV namespace..."
KV_OUTPUT=$(wrangler kv:namespace create "FEDERAL_CACHE" 2>&1)
echo "$KV_OUTPUT"

# Extract the KV namespace ID from output
FEDERAL_CACHE_ID=$(echo "$KV_OUTPUT" | grep -oP 'id\s*=\s*"\K[^"]+' || echo "")

if [ -z "$FEDERAL_CACHE_ID" ]; then
    echo "${YELLOW}⚠️  Could not automatically extract KV namespace ID${NC}"
    echo "Please manually copy the ID from the output above"
    read -p "Enter FEDERAL_CACHE ID: " FEDERAL_CACHE_ID
fi

echo "${GREEN}✅ FEDERAL_CACHE created with ID: $FEDERAL_CACHE_ID${NC}"
echo ""

echo "${BLUE}Step 2: Setting AI API Keys${NC}"
echo "----------------------------"

# Anthropic API Key
echo "Setting Anthropic API key..."
read -p "Enter your Anthropic API key (sk-ant-...): " ANTHROPIC_KEY
if [ -n "$ANTHROPIC_KEY" ]; then
    echo "$ANTHROPIC_KEY" | wrangler secret put ANTHROPIC_API_KEY
    echo "${GREEN}✅ Anthropic API key configured${NC}"
else
    echo "${YELLOW}⚠️ Anthropic API key skipped${NC}"
fi
echo ""

# OpenAI API Key
echo "Setting OpenAI API key..."
read -p "Enter your OpenAI API key (sk-proj-...): " OPENAI_KEY
if [ -n "$OPENAI_KEY" ]; then
    echo "$OPENAI_KEY" | wrangler secret put OPENAI_API_KEY
    echo "${GREEN}✅ OpenAI API key configured${NC}"
else
    echo "${YELLOW}⚠️ OpenAI API key skipped${NC}"
fi
echo ""

echo "${BLUE}Step 3: Updating wrangler.toml${NC}"
echo "------------------------------"

# Path to wrangler.toml
WRANGLER_FILE="./api/wrangler.toml"

if [ ! -f "$WRANGLER_FILE" ]; then
    echo "${YELLOW}⚠️  wrangler.toml not found at $WRANGLER_FILE${NC}"
    echo "Please update manually with the KV namespace ID"
else
    # Check if FEDERAL_CACHE binding exists but is commented out
    if grep -q "# binding = \"FEDERAL_CACHE\"" "$WRANGLER_FILE"; then
        echo "Uncommenting and updating FEDERAL_CACHE binding..."
        
        # Uncomment and update the FEDERAL_CACHE section
        sed -i.backup "s/# \[\[kv_namespaces\]\]/\[\[kv_namespaces\]\]/g" "$WRANGLER_FILE"
        sed -i "s/# binding = \"FEDERAL_CACHE\"/binding = \"FEDERAL_CACHE\"/g" "$WRANGLER_FILE"
        sed -i "s/# id = \"REPLACE_WITH_ID_FROM_SETUP_SCRIPT\"/id = \"$FEDERAL_CACHE_ID\"/g" "$WRANGLER_FILE"
        
        echo "${GREEN}✅ wrangler.toml updated with FEDERAL_CACHE ID${NC}"
    else
        echo "${YELLOW}⚠️  FEDERAL_CACHE binding not found in wrangler.toml${NC}"
        echo "Please add the following manually:"
        echo ""
        echo "[[kv_namespaces]]"
        echo "binding = \"FEDERAL_CACHE\""
        echo "id = \"$FEDERAL_CACHE_ID\""
    fi
fi
echo ""

echo "${GREEN}================================${NC}"
echo "${GREEN}✅ Phase 2A Setup Complete!${NC}"
echo "${GREEN}================================${NC}"
echo ""
echo "📋 Summary:"
echo "  • FEDERAL_CACHE KV namespace: $FEDERAL_CACHE_ID"
echo "  • Anthropic API key: Configured"
echo "  • OpenAI API key: Configured"
echo ""
echo "🎯 Next Steps:"
echo "  1. Verify wrangler.toml has correct FEDERAL_CACHE ID"
echo "  2. Commit the updated configuration"
echo "  3. Deploy to staging: wrangler deploy --env staging"
echo "  4. Test with feature flags enabled"
echo "  5. Deploy to production when ready"
echo ""
echo "🔍 Feature Flags Status:"
echo "  • FEATURE_LIVE_DATA: disabled (enable in staging first)"
echo "  • FEATURE_REAL_AI: disabled (enable in staging first)"
echo ""
echo "📚 For more information, see:"
echo "  • Phase 2A Implementation Plan in Basic Memory"
echo "  • docs/deployment/DEPLOYMENT.md"
echo ""
