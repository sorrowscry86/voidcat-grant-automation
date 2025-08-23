#!/bin/bash

# VoidCat RDC Grant Automation - Complete Deployment Script
# Deploys both API and Frontend for immediate revenue generation

echo "🚀 VoidCat RDC Grant Automation - Complete Deployment Starting..."
echo "Target: $500 Month 1 Revenue"
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository. Please run this from the project root."
    exit 1
fi

# Check if we have uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️ Warning: You have uncommitted changes. Consider committing them first."
    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi

# Deploy API to Cloudflare Workers
echo "📡 Deploying API to Cloudflare Workers..."
cd api
npm install
echo "Installing API dependencies..."

echo "Deploying API to production..."
npx wrangler deploy --env production

if [ $? -eq 0 ]; then
    echo "✅ API deployed successfully!"
    echo "🌐 Live at: https://grant-search-api.sorrowscry86.workers.dev"
else
    echo "❌ API deployment failed"
    exit 1
fi

cd ..

# Deploy Frontend to GitHub Pages
echo ""
echo "🌐 Deploying Frontend to GitHub Pages..."

# Check if we're on main/master branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
    echo "⚠️ Warning: Not on main/master branch. Frontend deployment requires main/master branch."
    echo "Current branch: $CURRENT_BRANCH"
    read -p "Switch to main branch and continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout main 2>/dev/null || git checkout master 2>/dev/null
        if [ $? -ne 0 ]; then
            echo "❌ Failed to switch to main/master branch"
            exit 1
        fi
        echo "✅ Switched to main/master branch"
    else
        echo "Frontend deployment skipped. API only deployed."
    fi
fi

# Push changes to trigger GitHub Actions deployment
if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
    echo "Pushing changes to trigger frontend deployment..."
    git add .
    git commit -m "Deploy: API and frontend updates $(date '+%Y-%m-%d %H:%M:%S')" --allow-empty
    git push origin $(git branch --show-current)
    
    if [ $? -eq 0 ]; then
        echo "✅ Frontend deployment triggered via GitHub Actions"
        echo "🌐 Frontend will be live at: https://$(git config user.name).github.io/voidcat-grant-automation"
    else
        echo "❌ Failed to push changes for frontend deployment"
    fi
fi

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
echo "🎯 COMPLETE DEPLOYMENT FINISHED!"
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
echo "- Frontend: https://$(git config user.name).github.io/voidcat-grant-automation"
echo ""
echo "🚀 Ready for immediate user acquisition!"
echo ""
echo "📋 Next Steps:"
echo "1. Monitor GitHub Actions for frontend deployment completion"
echo "2. Test the complete user flow on the live platform"
echo "3. Begin user acquisition campaigns"
echo "4. Monitor analytics and conversion rates"