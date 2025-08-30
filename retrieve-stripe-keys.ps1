# Stripe Keys Retrieval and GitHub Setup Script
# This script helps you retrieve Stripe keys from Cloudflare and save them to GitHub

Write-Host "Stripe Keys Retrieval and GitHub Setup" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

Write-Host "`nStep 1: Cloudflare Dashboard Access" -ForegroundColor Yellow
Write-Host "Please follow these steps to get your Stripe keys:" -ForegroundColor White
Write-Host "1. Go to: https://dash.cloudflare.com" -ForegroundColor Cyan
Write-Host "2. Navigate to: Workers & Pages" -ForegroundColor Cyan
Write-Host "3. Select your worker: grant-search-api" -ForegroundColor Cyan
Write-Host "4. Go to: Settings -> Variables" -ForegroundColor Cyan
Write-Host "5. Copy the values for these secrets:" -ForegroundColor Cyan
Write-Host "   - STRIPE_SECRET_KEY" -ForegroundColor White
Write-Host "   - STRIPE_PUBLISHABLE_KEY" -ForegroundColor White
Write-Host "   - STRIPE_PRICE_ID" -ForegroundColor White
Write-Host "   - STRIPE_WEBHOOK_SECRET" -ForegroundColor White

Write-Host "`nIMPORTANT: Keep these keys secure and never share them!" -ForegroundColor Red

Write-Host "`nStep 2: Enter Your Stripe Keys" -ForegroundColor Yellow
Write-Host "Please enter each key when prompted:" -ForegroundColor White

# Prompt for each key
$stripeSecretKey = Read-Host "Enter STRIPE_SECRET_KEY (starts with sk_live_ or sk_test_)"
$stripePublishableKey = Read-Host "Enter STRIPE_PUBLISHABLE_KEY (starts with pk_live_ or pk_test_)"
$stripePriceId = Read-Host "Enter STRIPE_PRICE_ID (starts with price_)"
$stripeWebhookSecret = Read-Host "Enter STRIPE_WEBHOOK_SECRET (starts with whsec_)"

Write-Host "`nStep 3: Saving Keys to GitHub Secrets" -ForegroundColor Yellow

# Save each key to GitHub
try {
    Write-Host "Setting STRIPE_SECRET_KEY..." -ForegroundColor Cyan
    gh secret set STRIPE_SECRET_KEY --body $stripeSecretKey
    
    Write-Host "Setting STRIPE_PUBLISHABLE_KEY..." -ForegroundColor Cyan
    gh secret set STRIPE_PUBLISHABLE_KEY --body $stripePublishableKey
    
    Write-Host "Setting STRIPE_PRICE_ID..." -ForegroundColor Cyan
    gh secret set STRIPE_PRICE_ID --body $stripePriceId
    
    Write-Host "Setting STRIPE_WEBHOOK_SECRET..." -ForegroundColor Cyan
    gh secret set STRIPE_WEBHOOK_SECRET --body $stripeWebhookSecret
    
    Write-Host "`nSuccess! All Stripe keys have been saved to GitHub secrets." -ForegroundColor Green
    
    Write-Host "`nStep 4: Verification" -ForegroundColor Yellow
    Write-Host "Listing GitHub secrets to verify..." -ForegroundColor White
    gh secret list
    
} catch {
    Write-Host "`nError occurred while saving secrets to GitHub:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`nSetup Complete!" -ForegroundColor Green
Write-Host "Your Stripe keys are now securely stored in GitHub secrets and can be used in your CI/CD pipeline." -ForegroundColor White
