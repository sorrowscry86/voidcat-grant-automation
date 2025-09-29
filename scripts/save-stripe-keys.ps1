# Simple script to save Stripe keys to GitHub
Write-Host "Saving Stripe Keys to GitHub Secrets" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

Write-Host "`nPlease enter your Stripe keys from the Stripe dashboard:" -ForegroundColor Yellow
Write-Host "Dashboard: https://dashboard.stripe.com/apikeys" -ForegroundColor Cyan

$stripeSecretKey = Read-Host "Enter STRIPE_SECRET_KEY (sk_live_... or sk_test_...)"
$stripePublishableKey = Read-Host "Enter STRIPE_PUBLISHABLE_KEY (pk_live_... or pk_test_...)"
$stripePriceId = Read-Host "Enter STRIPE_PRICE_ID (price_...)"
$stripeWebhookSecret = Read-Host "Enter STRIPE_WEBHOOK_SECRET (whsec_...)"

Write-Host "`nSaving to GitHub secrets..." -ForegroundColor Yellow

gh secret set STRIPE_SECRET_KEY --body $stripeSecretKey
gh secret set STRIPE_PUBLISHABLE_KEY --body $stripePublishableKey
gh secret set STRIPE_PRICE_ID --body $stripePriceId
gh secret set STRIPE_WEBHOOK_SECRET --body $stripeWebhookSecret

Write-Host "`nVerifying secrets..." -ForegroundColor Yellow
gh secret list

Write-Host "`nDone! Keys saved to GitHub secrets." -ForegroundColor Green
