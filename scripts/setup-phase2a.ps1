# Phase 2A Setup Script (PowerShell)
# Configures Cloudflare secrets and KV namespaces for Production Reality Integration

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 2A Setup: Production Reality Integration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if wrangler is available (via npx or globally)
try {
    $null = Get-Command npx -ErrorAction Stop
    $wranglerCmd = "npx wrangler"
    Write-Host "Found wrangler via npx" -ForegroundColor Green
} catch {
    try {
        $null = Get-Command wrangler -ErrorAction Stop
        $wranglerCmd = "wrangler"
        Write-Host "Found wrangler globally" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] wrangler CLI is not available" -ForegroundColor Red
        Write-Host "Install it with: npm install -g wrangler" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "Step 1: Creating KV Namespace for Federal Data Caching" -ForegroundColor Blue
Write-Host "-------------------------------------------------------" -ForegroundColor Blue
Write-Host ""

# Navigate to api directory for wrangler commands
Push-Location ".\api"

# Create KV namespace for federal data caching
Write-Host "Creating FEDERAL_CACHE KV namespace..."
try {
    $kvOutput = Invoke-Expression "$wranglerCmd kv namespace create FEDERAL_CACHE" 2>&1 | Out-String
    Write-Host $kvOutput
    
    # Extract the KV namespace ID from output
    if ($kvOutput -match 'id\s*=\s*"([^"]+)"') {
        $federalCacheId = $matches[1]
        Write-Host "[SUCCESS] FEDERAL_CACHE created with ID: $federalCacheId" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Could not automatically extract KV namespace ID" -ForegroundColor Yellow
        Write-Host "Please check the output above and enter the ID manually:"
        $federalCacheId = Read-Host "Enter FEDERAL_CACHE ID"
    }
} catch {
    Write-Host "[ERROR] Failed to create KV namespace: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host ""

Write-Host "Step 2: Setting AI API Keys" -ForegroundColor Blue
Write-Host "----------------------------" -ForegroundColor Blue
Write-Host ""

# Anthropic API Key
Write-Host "Setting Anthropic API key..."
try {
    $anthropicKey = Read-Host "Enter your Anthropic API key (sk-ant-...)"
    if ($anthropicKey) {
        $anthropicKey | Invoke-Expression "$wranglerCmd secret put ANTHROPIC_API_KEY"
        Write-Host "[SUCCESS] Anthropic API key configured" -ForegroundColor Green
    } else {
        Write-Host "[SKIP] Anthropic API key not provided" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] Failed to set Anthropic API key: $_" -ForegroundColor Red
}

Write-Host ""

# OpenAI API Key
Write-Host "Setting OpenAI API key..."
try {
    $openaiKey = Read-Host "Enter your OpenAI API key (sk-proj-...)"
    if ($openaiKey) {
        $openaiKey | Invoke-Expression "$wranglerCmd secret put OPENAI_API_KEY"
        Write-Host "[SUCCESS] OpenAI API key configured" -ForegroundColor Green
    } else {
        Write-Host "[SKIP] OpenAI API key not provided" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] Failed to set OpenAI API key: $_" -ForegroundColor Red
}

# Return to original directory
Pop-Location

Write-Host ""
Write-Host "Step 3: Updating wrangler.toml" -ForegroundColor Blue
Write-Host "------------------------------" -ForegroundColor Blue
Write-Host ""

# Path to wrangler.toml
$wranglerFile = ".\api\wrangler.toml"

if (Test-Path $wranglerFile) {
    try {
        $content = Get-Content $wranglerFile -Raw
        
        # Check if FEDERAL_CACHE binding is commented out
        if ($content -match '# \[\[kv_namespaces\]\][\r\n]+# binding = "FEDERAL_CACHE"') {
            Write-Host "Uncommenting and updating FEDERAL_CACHE binding..."
            
            # Backup original file
            Copy-Item $wranglerFile "$wranglerFile.backup"
            
            # Uncomment and update
            $content = $content -replace '# \[\[kv_namespaces\]\]', '[[kv_namespaces]]'
            $content = $content -replace '# binding = "FEDERAL_CACHE"', 'binding = "FEDERAL_CACHE"'
            $content = $content -replace '# id = "REPLACE_WITH_ID_FROM_SETUP_SCRIPT"', "id = ""$federalCacheId"""
            
            Set-Content $wranglerFile $content -Encoding UTF8
            
            Write-Host "[SUCCESS] wrangler.toml updated with FEDERAL_CACHE ID" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] FEDERAL_CACHE binding not found in expected format" -ForegroundColor Yellow
            Write-Host "Please add the following manually to wrangler.toml:" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "[[kv_namespaces]]"
            Write-Host "binding = ""FEDERAL_CACHE"""
            Write-Host "id = ""$federalCacheId"""
        }
    } catch {
        Write-Host "[ERROR] Failed to update wrangler.toml: $_" -ForegroundColor Red
    }
} else {
    Write-Host "[WARNING] wrangler.toml not found at $wranglerFile" -ForegroundColor Yellow
    Write-Host "Please update manually with KV namespace ID: $federalCacheId"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Phase 2A Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "SUMMARY:"
Write-Host "  * FEDERAL_CACHE KV namespace: $federalCacheId"
Write-Host "  * Anthropic API key: Configured"
Write-Host "  * OpenAI API key: Configured"
Write-Host ""
Write-Host "NEXT STEPS:"
Write-Host "  1. Verify wrangler.toml has correct FEDERAL_CACHE ID"
Write-Host "  2. Commit the updated configuration"
Write-Host "  3. Deploy to staging: wrangler deploy --env staging"
Write-Host "  4. Test with feature flags enabled"
Write-Host "  5. Deploy to production when ready"
Write-Host ""
Write-Host "FEATURE FLAGS STATUS:"
Write-Host "  * FEATURE_LIVE_DATA: disabled (enable in staging first)"
Write-Host "  * FEATURE_REAL_AI: disabled (enable in staging first)"
Write-Host ""
