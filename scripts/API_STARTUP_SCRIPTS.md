# API Startup Scripts - Usage Guide

This directory contains robust helper scripts for starting, stopping, and validating the VoidCat Grant Search API with proper timeout handling.

## Scripts Overview

### 1. `start-api-with-timeout.sh`
Starts the API server with automatic timeout handling and health checks.

**Usage:**
```bash
./scripts/start-api-with-timeout.sh [timeout_seconds] [port]
```

**Parameters:**
- `timeout_seconds` (optional): Maximum time to wait for API to be ready. Default: 30 seconds
- `port` (optional): Port to run the API on. Default: 8787

**Examples:**
```bash
# Start with default settings (30s timeout, port 8787)
./scripts/start-api-with-timeout.sh

# Start with 60s timeout
./scripts/start-api-with-timeout.sh 60

# Start with 60s timeout on port 3000
./scripts/start-api-with-timeout.sh 60 3000
```

**Features:**
- ✅ Automatically installs dependencies if missing
- ✅ Cleans up any existing API processes
- ✅ Waits for health endpoint to respond
- ✅ Shows progress with elapsed time
- ✅ Validates API is fully functional before returning
- ✅ Returns non-zero exit code if startup fails
- ✅ Provides helpful output with endpoints and PID

**Output:**
```
🚀 Starting VoidCat Grant Search API...
   Port: 8787
   Timeout: 30s
   API Directory: /path/to/api

📦 Installing API dependencies... (if needed)
🔄 Starting wrangler dev server...
   Process ID: 12345

⏳ Waiting for API to be ready (timeout: 30s)...
✅ API server is ready! (started in 12s)

🔍 Health check response:
{
  "status": "healthy",
  "service": "VoidCat Grant Search API",
  ...
}

📍 API Endpoints:
   Health: http://localhost:8787/health
   Search: http://localhost:8787/api/grants/search?query=AI
   Root:   http://localhost:8787/

🛑 To stop: kill 12345  OR  kill $(cat /tmp/wrangler.pid)
📋 Logs:    tail -f /tmp/wrangler-startup.log
```

### 2. `stop-api.sh`
Stops the running API server gracefully.

**Usage:**
```bash
./scripts/stop-api.sh
```

**Features:**
- ✅ Reads PID from `/tmp/wrangler.pid`
- ✅ Gracefully stops the process with SIGTERM
- ✅ Force kills if process doesn't stop within 2 seconds
- ✅ Falls back to finding any wrangler processes if PID file is missing
- ✅ Cleans up PID file

**Output:**
```
🛑 Stopping API server (PID: 12345)...
✅ API server stopped
```

### 3. `validate-api.sh`
Validates that the API is running and all endpoints are functional.

**Usage:**
```bash
./scripts/validate-api.sh [port]
```

**Parameters:**
- `port` (optional): Port the API is running on. Default: 8787

**Examples:**
```bash
# Validate API on default port 8787
./scripts/validate-api.sh

# Validate API on port 3000
./scripts/validate-api.sh 3000
```

**Features:**
- ✅ Tests 5 critical endpoints
- ✅ Validates response structure with jq
- ✅ Color-coded output (green for pass, red for fail)
- ✅ Summary of passed/failed tests
- ✅ Returns non-zero exit code if any test fails

**Tests Performed:**
1. Health Check: `GET /health`
2. Root Endpoint: `GET /`
3. Grants Search: `GET /api/grants/search?query=AI`
4. Grants Stats: `GET /api/grants/stats`
5. Grant Details: `GET /api/grants/SBIR-25-001`

**Output:**
```
🧪 Validating VoidCat Grant Search API...
   Base URL: http://localhost:8787

Testing Health Check... ✅ PASSED
Testing Root Endpoint... ✅ PASSED
Testing Grants Search... ✅ PASSED
Testing Grants Stats... ✅ PASSED
Testing Grant Details... ✅ PASSED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Results:
  Passed: 5
  Failed: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All API validations passed!
```

## Common Workflows

### Development Workflow
```bash
# 1. Start the API
./scripts/start-api-with-timeout.sh

# 2. Validate it's working
./scripts/validate-api.sh

# 3. Do your development work...

# 4. Stop the API when done
./scripts/stop-api.sh
```

### CI/CD Integration
```bash
# In your CI/CD pipeline
./scripts/start-api-with-timeout.sh 60 8787 || exit 1
./scripts/validate-api.sh 8787 || exit 1

# Run your tests...
npm test

# Clean up
./scripts/stop-api.sh
```

### Debugging Failed Startup
```bash
# If startup fails, check the logs
tail -f /tmp/wrangler-startup.log

# Check if port is already in use
lsof -i :8787

# Try with a longer timeout
./scripts/start-api-with-timeout.sh 120
```

## Troubleshooting

### "API server failed to start within timeout"
**Causes:**
- Dependencies not installed (script auto-installs)
- Port already in use
- Wrangler configuration issues
- Network/firewall blocking localhost

**Solutions:**
```bash
# Check if port is in use
lsof -i :8787

# Stop any existing processes
./scripts/stop-api.sh

# Install dependencies manually
cd api && npm install

# Try with longer timeout
./scripts/start-api-with-timeout.sh 120
```

### "API process died unexpectedly"
**Check logs:**
```bash
tail -50 /tmp/wrangler-startup.log
```

**Common causes:**
- Missing wrangler.toml configuration
- Invalid JavaScript syntax in API code
- Missing required Cloudflare bindings in local mode

### Validation Tests Failing
**Check API logs:**
```bash
tail -f /tmp/wrangler-startup.log
```

**Test individual endpoints:**
```bash
curl http://localhost:8787/health
curl http://localhost:8787/api/grants/search?query=AI
```

## Environment Variables

All scripts respect the following:
- `PORT`: Override default port (8787)
- `TIMEOUT`: Override default timeout (30s)

## Files Created

The scripts create the following temporary files:
- `/tmp/wrangler.pid` - PID of the running wrangler process
- `/tmp/wrangler-startup.log` - Startup and runtime logs

These files are automatically cleaned up by the stop script.

## Integration with Existing Scripts

These scripts complement the existing deployment and testing scripts:
- `deploy.sh` - Production deployment
- `validate-deployment.sh` - Production validation
- `setup-phase2a.sh` - Phase 2A configuration
- `comprehensive-live-testing.sh` - Full test suite

## Notes

- Scripts are designed to be **idempotent** - running them multiple times is safe
- All scripts return appropriate **exit codes** for CI/CD integration
- Scripts use **color output** for better readability (can be disabled with `NO_COLOR=1`)
- **Timeouts are configurable** to handle slow networks or systems
- Scripts **auto-install dependencies** to reduce manual steps

## Examples in Package.json

You can add these to your `package.json` scripts:

```json
{
  "scripts": {
    "api:start": "./scripts/start-api-with-timeout.sh",
    "api:stop": "./scripts/stop-api.sh",
    "api:validate": "./scripts/validate-api.sh",
    "api:restart": "./scripts/stop-api.sh && ./scripts/start-api-with-timeout.sh"
  }
}
```

Then use:
```bash
npm run api:start
npm run api:validate
npm run api:stop
```
