#!/usr/bin/env node

/**
 * Validate API Keys and Secrets
 * Tests that required secrets are set and valid without exposing their values
 * 
 * Usage:
 *   node scripts/validate-secrets.js
 *   node scripts/validate-secrets.js --stripe-only
 *   node scripts/validate-secrets.js --cloudflare-only
 */

const https = require('https');
const http = require('http');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log('='.repeat(60), 'cyan');
  log(title, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Make HTTPS request
 */
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const client = options.hostname === 'localhost' ? http : https;
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

/**
 * Validate Stripe Secret Key
 */
async function validateStripeSecretKey(key) {
  if (!key || key.trim() === '') {
    return { valid: false, error: 'Secret key is empty' };
  }
  
  // Check format
  if (!key.startsWith('sk_')) {
    return { valid: false, error: 'Invalid format - must start with sk_' };
  }
  
  // Check if it's test or live
  const isLive = key.startsWith('sk_live_');
  const isTest = key.startsWith('sk_test_');
  
  if (!isLive && !isTest) {
    return { valid: false, error: 'Invalid format - must be sk_live_ or sk_test_' };
  }
  
  // Test API call to validate
  try {
    const response = await makeRequest({
      hostname: 'api.stripe.com',
      path: '/v1/balance',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (response.status === 200) {
      return { 
        valid: true, 
        mode: isLive ? 'live' : 'test',
        balance: response.data
      };
    } else if (response.status === 401) {
      return { valid: false, error: 'Authentication failed - invalid key' };
    } else {
      return { valid: false, error: `API returned status ${response.status}` };
    }
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Validate Stripe Publishable Key
 */
function validateStripePublishableKey(key) {
  if (!key || key.trim() === '') {
    return { valid: false, error: 'Publishable key is empty' };
  }
  
  // Check format
  if (!key.startsWith('pk_')) {
    return { valid: false, error: 'Invalid format - must start with pk_' };
  }
  
  // Check if it's test or live
  const isLive = key.startsWith('pk_live_');
  const isTest = key.startsWith('pk_test_');
  
  if (!isLive && !isTest) {
    return { valid: false, error: 'Invalid format - must be pk_live_ or pk_test_' };
  }
  
  // Publishable keys are client-side, can't really validate without making a checkout
  return { 
    valid: true, 
    mode: isLive ? 'live' : 'test',
    note: 'Format valid (full validation requires checkout test)'
  };
}

/**
 * Validate Stripe Price ID
 */
async function validateStripePriceId(priceId, secretKey) {
  if (!priceId || priceId.trim() === '') {
    return { valid: false, error: 'Price ID is empty' };
  }
  
  // Check format
  if (!priceId.startsWith('price_')) {
    return { valid: false, error: 'Invalid format - must start with price_' };
  }
  
  if (!secretKey) {
    return { valid: true, note: 'Format valid (API validation skipped - no secret key)' };
  }
  
  // Test API call to validate price exists
  try {
    const response = await makeRequest({
      hostname: 'api.stripe.com',
      path: `/v1/prices/${priceId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (response.status === 200) {
      const price = response.data;
      return { 
        valid: true,
        amount: price.unit_amount,
        currency: price.currency,
        recurring: price.recurring,
        product: price.product
      };
    } else if (response.status === 404) {
      return { valid: false, error: 'Price ID not found in Stripe account' };
    } else {
      return { valid: false, error: `API returned status ${response.status}` };
    }
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Validate Stripe Webhook Secret
 */
function validateStripeWebhookSecret(secret) {
  if (!secret || secret.trim() === '') {
    return { valid: false, error: 'Webhook secret is empty' };
  }
  
  // Check format
  if (!secret.startsWith('whsec_')) {
    return { valid: false, error: 'Invalid format - must start with whsec_' };
  }
  
  // Webhook secrets can't be validated without an actual webhook event
  return { 
    valid: true, 
    note: 'Format valid (full validation requires webhook event)'
  };
}

/**
 * Validate Cloudflare API Token
 */
async function validateCloudflareToken(token, accountId = null) {
  if (!token || token.trim() === '') {
    return { valid: false, error: 'API token is empty' };
  }
  
  // Test API call to verify token
  try {
    const response = await makeRequest({
      hostname: 'api.cloudflare.com',
      path: '/client/v4/user/tokens/verify',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data.success) {
      return { 
        valid: true,
        status: response.data.result.status,
        expiresOn: response.data.result.expires_on
      };
    } else {
      return { valid: false, error: 'Token verification failed' };
    }
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Validate Cloudflare Account ID
 */
async function validateCloudflareAccountId(accountId, token) {
  if (!accountId || accountId.trim() === '') {
    return { valid: false, error: 'Account ID is empty' };
  }
  
  if (!token) {
    return { valid: true, note: 'Format valid (API validation skipped - no token)' };
  }
  
  // Test API call to verify account access
  try {
    const response = await makeRequest({
      hostname: 'api.cloudflare.com',
      path: `/client/v4/accounts/${accountId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data.success) {
      return { 
        valid: true,
        name: response.data.result.name,
        type: response.data.result.type
      };
    } else if (response.status === 403) {
      return { valid: false, error: 'Token does not have access to this account' };
    } else if (response.status === 404) {
      return { valid: false, error: 'Account ID not found' };
    } else {
      return { valid: false, error: `API returned status ${response.status}` };
    }
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Main validation function
 */
async function validateSecrets() {
  const args = process.argv.slice(2);
  const stripeOnly = args.includes('--stripe-only');
  const cloudflareOnly = args.includes('--cloudflare-only');
  
  log('\n🔐 VoidCat Grant Automation - Secret Validation Tool', 'bright');
  log('This tool validates API keys without exposing their values\n', 'cyan');
  
  let allValid = true;
  
  // Stripe Validation
  if (!cloudflareOnly) {
    logSection('Stripe API Keys');
    
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    const stripePriceId = process.env.STRIPE_PRICE_ID;
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    // Validate Secret Key
    logInfo('Validating Stripe Secret Key...');
    const secretResult = await validateStripeSecretKey(stripeSecretKey);
    if (secretResult.valid) {
      logSuccess(`Secret Key is valid (${secretResult.mode} mode)`);
      if (secretResult.balance) {
        logInfo(`  Account Balance: ${secretResult.balance.available[0]?.amount || 0} ${secretResult.balance.available[0]?.currency || 'USD'}`);
      }
    } else {
      logError(`Secret Key is invalid: ${secretResult.error}`);
      allValid = false;
    }
    
    // Validate Publishable Key
    logInfo('Validating Stripe Publishable Key...');
    const pubResult = validateStripePublishableKey(stripePublishableKey);
    if (pubResult.valid) {
      logSuccess(`Publishable Key is valid (${pubResult.mode} mode)`);
      if (pubResult.note) logInfo(`  ${pubResult.note}`);
    } else {
      logError(`Publishable Key is invalid: ${pubResult.error}`);
      allValid = false;
    }
    
    // Check key mode consistency
    if (secretResult.valid && pubResult.valid) {
      if (secretResult.mode !== pubResult.mode) {
        logWarning('Secret Key and Publishable Key are in different modes!');
        logWarning(`  Secret Key: ${secretResult.mode} mode`);
        logWarning(`  Publishable Key: ${pubResult.mode} mode`);
        allValid = false;
      } else {
        logSuccess(`Both keys are in ${secretResult.mode} mode ✓`);
      }
    }
    
    // Validate Price ID
    logInfo('Validating Stripe Price ID...');
    const priceResult = await validateStripePriceId(stripePriceId, stripeSecretKey);
    if (priceResult.valid) {
      logSuccess('Price ID is valid');
      if (priceResult.amount) {
        const amount = (priceResult.amount / 100).toFixed(2);
        logInfo(`  Price: ${amount} ${priceResult.currency?.toUpperCase()}`);
        if (priceResult.recurring) {
          logInfo(`  Recurring: ${priceResult.recurring.interval_count} ${priceResult.recurring.interval}(s)`);
        }
      }
      if (priceResult.note) logInfo(`  ${priceResult.note}`);
    } else {
      logError(`Price ID is invalid: ${priceResult.error}`);
      allValid = false;
    }
    
    // Validate Webhook Secret
    logInfo('Validating Stripe Webhook Secret...');
    const webhookResult = validateStripeWebhookSecret(stripeWebhookSecret);
    if (webhookResult.valid) {
      logSuccess('Webhook Secret is valid');
      if (webhookResult.note) logInfo(`  ${webhookResult.note}`);
    } else {
      logError(`Webhook Secret is invalid: ${webhookResult.error}`);
      allValid = false;
    }
  }
  
  // Cloudflare Validation
  if (!stripeOnly) {
    logSection('Cloudflare Configuration');
    
    const cloudflareToken = process.env.CLOUDFLARE_API_TOKEN;
    const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    
    // Validate API Token
    logInfo('Validating Cloudflare API Token...');
    const tokenResult = await validateCloudflareToken(cloudflareToken);
    if (tokenResult.valid) {
      logSuccess(`API Token is valid (${tokenResult.status})`);
      if (tokenResult.expiresOn) {
        logInfo(`  Expires: ${tokenResult.expiresOn}`);
      }
    } else {
      logError(`API Token is invalid: ${tokenResult.error}`);
      allValid = false;
    }
    
    // Validate Account ID
    logInfo('Validating Cloudflare Account ID...');
    const accountResult = await validateCloudflareAccountId(cloudflareAccountId, cloudflareToken);
    if (accountResult.valid) {
      logSuccess('Account ID is valid');
      if (accountResult.name) {
        logInfo(`  Account: ${accountResult.name} (${accountResult.type})`);
      }
      if (accountResult.note) logInfo(`  ${accountResult.note}`);
    } else {
      logError(`Account ID is invalid: ${accountResult.error}`);
      allValid = false;
    }
  }
  
  // Summary
  logSection('Validation Summary');
  if (allValid) {
    logSuccess('All secrets are valid! ✨');
    log('\n🚀 Your configuration is ready for production deployment!\n', 'green');
    process.exit(0);
  } else {
    logError('Some secrets are invalid or missing');
    log('\n❌ Please fix the issues above before deploying to production\n', 'red');
    process.exit(1);
  }
}

// Run validation
validateSecrets().catch(error => {
  logError(`Validation failed: ${error.message}`);
  process.exit(1);
});
