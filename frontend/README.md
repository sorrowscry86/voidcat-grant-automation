# VoidCat RDC Frontend

This directory contains the frontend files for the VoidCat RDC Federal Grant Automation Platform.

## Deployed Site

The frontend is automatically deployed to GitHub Pages at:
**https://sorrowscry86.github.io/voidcat-grant-automation/**

## Files

- `index.html` - Main application interface
- `privacy-policy.html` - Privacy policy page  
- `terms-of-service.html` - Terms of service page

## Features

- **Grant Search**: Discover relevant federal grants using AI-powered search
- **User Registration**: Create free accounts with API key generation
- **Proposal Generation**: AI-powered grant proposal drafting (Pro tier)
- **Subscription Management**: Free tier (1 grant/month) and Pro tier ($99/month unlimited)
- **Mobile-Responsive**: Works on desktop, tablet, and mobile devices

## Technology Stack

- **Frontend Framework**: Alpine.js for reactive components
- **Styling**: Tailwind CSS via CDN
- **Payments**: Stripe.js for subscription management
- **API Integration**: Cloudflare Workers backend at https://grant-search-api.sorrowscry86.workers.dev

## Local Development

To serve the frontend locally during development:

```bash
cd frontend
python3 -m http.server 8000
```

Then visit http://localhost:8000

## Deployment

The frontend is automatically deployed via GitHub Actions when changes are pushed to the main/master branch. The deployment workflow:

1. Validates all required files exist
2. Tests API connectivity
3. Prepares files for GitHub Pages
4. Creates `.nojekyll` file to bypass Jekyll
5. Deploys to GitHub Pages
6. Verifies deployment success

## API Configuration

The frontend is pre-configured to connect to the production API:
- API Base URL: `https://grant-search-api.sorrowscry86.workers.dev`
- All API calls use HTTPS and include proper error handling
- Demo data is used as fallback if the API is unavailable