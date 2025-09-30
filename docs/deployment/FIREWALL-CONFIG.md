# 🔒 Firewall Configuration for Stripe Integration

## Required URLs for Allowlist

Configure your environment to allow access to the following URLs for proper Stripe integration and system functionality:

### Essential URLs
```
# Package management and dependencies
esm.ubuntu.com

# VoidCat API endpoints
grant-search-api.sorrowscry86.workers.dev

# Cloudflare Workers infrastructure
sparrow.cloudflare.com
workers.cloudflare.com

# Stripe API endpoints (for payment processing)
api.stripe.com
checkout.stripe.com
js.stripe.com
```

## Configuration Methods

### Option 1: GitHub Actions Setup
Configure Actions setup steps to set up the environment before the firewall is enabled:

```yaml
# In .github/workflows/deploy-worker.yml
steps:
  - name: Configure Network Access
    run: |
      # Add URLs to allowlist before firewall activation
      echo "esm.ubuntu.com" >> /etc/hosts.allow
      echo "grant-search-api.sorrowscry86.workers.dev" >> /etc/hosts.allow
      echo "sparrow.cloudflare.com" >> /etc/hosts.allow
      echo "workers.cloudflare.com" >> /etc/hosts.allow
      echo "api.stripe.com" >> /etc/hosts.allow
      echo "checkout.stripe.com" >> /etc/hosts.allow
      echo "js.stripe.com" >> /etc/hosts.allow
```

### Option 2: Repository Copilot Settings
Add the URLs to the custom allowlist in the repository's Copilot coding agent settings:

1. Navigate to Repository → Settings → Copilot
2. Add to Custom Allowlist:
   - `esm.ubuntu.com`
   - `grant-search-api.sorrowscry86.workers.dev`
   - `sparrow.cloudflare.com`
   - `workers.cloudflare.com`
   - `api.stripe.com`
   - `checkout.stripe.com`
   - `js.stripe.com`

### Option 3: Docker/Container Configuration
For containerized environments:

```dockerfile
# In Dockerfile or docker-compose.yml
RUN echo "esm.ubuntu.com" >> /etc/hosts
RUN echo "grant-search-api.sorrowscry86.workers.dev" >> /etc/hosts
RUN echo "sparrow.cloudflare.com" >> /etc/hosts
RUN echo "workers.cloudflare.com" >> /etc/hosts
RUN echo "api.stripe.com" >> /etc/hosts
RUN echo "checkout.stripe.com" >> /etc/hosts
RUN echo "js.stripe.com" >> /etc/hosts
```

## Network Security Notes

- These URLs are essential for Stripe payment processing and system functionality
- Blocking these URLs will result in payment failures and API errors
- Configure allowlist before enabling firewall restrictions
- Monitor access logs to ensure proper connectivity

## Testing Connectivity

Verify access to required URLs:

```bash
# Test essential endpoints
curl -I https://api.stripe.com/v1/
curl -I https://grant-search-api.sorrowscry86.workers.dev/health
curl -I https://workers.cloudflare.com/
```

Expected responses: HTTP 200 or 401 (authentication required) - indicates connectivity is working.