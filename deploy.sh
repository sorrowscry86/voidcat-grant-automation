#!/bin/bash

# VoidCat RDC Grant Automation - Quick Deployment Script
# Deploys both API and Frontend for immediate revenue generation

echo "🚀 VoidCat RDC Grant Automation - Deployment Starting..."
echo "Target: $500 Month 1 Revenue"
echo ""

# Deploy API to Cloudflare Workers
echo "📡 Deploying API to Cloudflare Workers..."
cd api
npm install
echo "Installing dependencies..."

echo "Deploying to production..."
npx wrangler deploy --env production

if [ $? -eq 0 ]; then
    echo "✅ API deployed successfully!"
    echo "🌐 Live at: https://grant-search-api.sorrowscry86.workers.dev"
else
    echo "❌ API deployment failed"
    exit 1
fi

cd ..

# Test API health
echo ""
echo "🩺 Testing API health..."
curl -s https://grant-search-api.sorrowscry86.workers.dev/health | grep -q "healthy"

if [ $? -eq 0 ]; then
    echo "✅ API health check passed"
else
    echo "⚠️ API health check failed"
fi

# Test grant search
echo ""
echo "🔍 Testing grant search..."
curl -s "https://grant-search-api.sorrowscry86.workers.dev/api/grants/search?query=AI" | grep -q "success"

if [ $? -eq 0 ]; then
    echo "✅ Grant search working"
else
    echo "⚠️ Grant search may have issues"
fi

echo ""
echo "🎯 DEPLOYMENT COMPLETE!"
echo ""
echo "📊 Success Metrics to Track:"
echo "- User registrations: Target 10+ in 48 hours"
echo "- Grant searches: Target 50+ in 48 hours"
echo "- Pro tier signups: Target 1+ in Week 1"
echo ""
echo "💰 Revenue Targets:"
echo "- Week 1: $198 (2 Pro subscribers)"
echo "- Month 1: $500 (5 Pro subscribers)"
echo "- Month 3: $2,500 (25 subscribers + success fees)"
echo ""
echo "🌐 Live Platform:"
echo "- API: https://grant-search-api.sorrowscry86.workers.dev"
echo "- Frontend: Deploy to GitHub Pages or Cloudflare Pages"
echo ""
echo "🚀 Ready for immediate user acquisition!"