# VoidCat Grant Automation Platform - API Documentation

**Version**: 2.0.0
**Base URL**: `https://grant-search-api.sorrowscry86.workers.dev`
**OpenAPI Spec**: See `openapi.yaml`

---

## 🚀 Quick Start

### View Interactive Documentation

**Option 1: Swagger UI (Local)**
```bash
cd api
# Serve the swagger-ui.html file
npx serve .
# Open http://localhost:3000/swagger-ui.html
```

**Option 2: Online Swagger Editor**
1. Go to https://editor.swagger.io/
2. Upload `api/openapi.yaml`
3. Explore endpoints and try requests

### Test the API

```bash
# Health check (no auth required)
curl https://grant-search-api.sorrowscry86.workers.dev/health

# Search grants (no auth required)
curl "https://grant-search-api.sorrowscry86.workers.dev/api/grants/search?query=AI+research&agency=NSF"

# Admin endpoint (requires Bearer token)
curl -X POST "https://grant-search-api.sorrowscry86.workers.dev/api/admin/grants/ingest" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 📚 API Overview

### Endpoints Summary

| Category | Endpoints | Authentication | Description |
|----------|-----------|----------------|-------------|
| **Health** | 2 | None | API health monitoring |
| **Grants** | 13 | None | Grant search & proposal generation |
| **Auth** | 8 | Mixed | User authentication & sessions |
| **Users** | 2 | Bearer JWT | User profile management |
| **Dashboard** | 8 | Admin Token | Analytics & metrics |
| **Admin** | 3+ | Admin Token | Database management |
| **Stripe** | 2 | None/Signature | Payment processing |
| **TOTAL** | **38+** | | |

---

## 🔐 Authentication

### 1. Public Endpoints (No Auth Required)
- `/health`, `/health/detailed`
- `/api/grants/search`
- `/api/grants/stats`
- `/api/grants/:id`
- `/api/grants/federal-agencies`
- `/api/auth/login`, `/api/auth/register`
- `/api/stripe/create-checkout`

### 2. Bearer Token (JWT)
**User Authentication** - Required for user-specific endpoints

```bash
# 1. Get token via login
curl -X POST "https://grant-search-api.sorrowscry86.workers.dev/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret"}'

# Response:
# {
#   "success": true,
#   "token": "eyJhbGc...",
#   "user": {...}
# }

# 2. Use token in requests
curl "https://grant-search-api.sorrowscry86.workers.dev/api/users/me" \
  -H "Authorization: Bearer eyJhbGc..."
```

**Endpoints requiring Bearer JWT**:
- `/api/users/me`
- `/api/auth/me`
- `/api/auth/logout`
- `/api/auth/set-password`

### 3. Admin Token
**Administrative Operations** - Requires `ADMIN_TOKEN` environment variable

```bash
# Set in Cloudflare Workers environment
ADMIN_TOKEN=your-secure-random-token-here

# Use in requests
curl -X POST "https://grant-search-api.sorrowscry86.workers.dev/api/admin/grants/init-schema" \
  -H "Authorization: Bearer your-secure-random-token-here"
```

**Endpoints requiring Admin Token**:
- `/api/admin/*` - All admin endpoints
- `/api/dashboard/*` - All dashboard endpoints

---

## 🎯 Key Endpoints

### Grant Search

**GET** `/api/grants/search`

Search grants from D1 database using FTS5 full-text search.

**Query Parameters**:
- `query` (string): Search keywords (max 500 chars)
- `agency` (string): Filter by agency (NSF, DOD, DOE, NASA, NIH, USDA)
- `limit` (integer): Results per page (1-100, default: 50)
- `offset` (integer): Pagination offset (default: 0)

**Example**:
```bash
curl "https://grant-search-api.sorrowscry86.workers.dev/api/grants/search?query=machine+learning&agency=NSF&limit=10"
```

**Response**:
```json
{
  "success": true,
  "count": 10,
  "grants": [
    {
      "id": "NSF-25-001",
      "title": "AI Research Initiative",
      "agency": "NSF",
      "amount": 500000,
      "deadline": "2025-12-31",
      "matching_score": 85.5
    }
  ],
  "data_source": "database",
  "execution_type": "database"
}
```

---

### AI Proposal Generation

**POST** `/api/grants/generate-ai-proposal`

Generate AI-powered grant proposal using Claude 3.5 Sonnet or GPT-4.

**⚠️ NO SIMULATIONS LAW**: Requires `FEATURE_REAL_AI=true` in production. Returns real AI output only.

**Request Body**:
```json
{
  "grant_id": "NSF-25-001",
  "grant_title": "AI Research Initiative",
  "grant_agency": "NSF",
  "grant_description": "Funding for AI research...",
  "grant_amount": 500000,
  "grant_deadline": "2025-12-31",
  "company_profile": {
    "name": "TechCorp Inc.",
    "organization_type": "for-profit",
    "focus_areas": ["AI", "machine learning"],
    "description": "We build AI solutions..."
  }
}
```

**Response** (Success):
```json
{
  "success": true,
  "proposal": {
    "metadata": {
      "grant_id": "NSF-25-001",
      "generated_at": "2025-11-17T12:00:00Z",
      "ai_enhanced": true,
      "total_ai_cost": 0.45
    },
    "sections": {
      "executive_summary": "...",
      "technical_approach": "...",
      "budget_justification": "..."
    }
  },
  "execution_type": "real",
  "ai_enhanced": true
}
```

**Response** (Error - Production):
```json
{
  "success": false,
  "error": "AI proposal generation failed",
  "code": "AI_EXECUTION_FAILED",
  "message": "An error occurred during proposal generation. Please contact support."
}
```

---

### User Registration

**POST** `/api/auth/register`

Create new user account.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "organization": "TechCorp Inc."
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "name": "John Doe",
    "subscription_tier": "free"
  },
  "token": "eyJhbGc...",
  "refresh_token": "rt_...",
  "expires_in": 3600
}
```

---

### Admin: Ingest Federal Grants

**POST** `/api/admin/grants/ingest`

Trigger data ingestion from federal APIs (Grants.gov, SBIR.gov, NSF.gov).

**Authentication**: Admin Token required

**Request** (Optional):
```json
{
  "sources": ["grants.gov", "sbir.gov", "nsf.gov"],
  "query": "technology",
  "forceRefresh": true
}
```

**Response**:
```json
{
  "success": true,
  "ingestion_summary": {
    "grants.gov": {
      "fetched": 150,
      "inserted": 145,
      "duplicates": 5
    },
    "sbir.gov": {
      "fetched": 80,
      "inserted": 78,
      "duplicates": 2
    },
    "nsf.gov": {
      "fetched": 120,
      "inserted": 115,
      "duplicates": 5
    },
    "total": 338
  },
  "timestamp": "2025-11-17T12:30:00Z"
}
```

---

## 🔄 Data Flow

### Grant Search Flow
```
User Request
    ↓
GET /api/grants/search?query=AI
    ↓
DatabaseGrantService
    ↓
D1 Database (FTS5 Search)
    ↓
Semantic Analysis + Scoring
    ↓
JSON Response (sorted by matching_score)
```

### AI Proposal Generation Flow
```
User Request
    ↓
POST /api/grants/generate-ai-proposal
    ↓
Check FEATURE_REAL_AI flag
    ↓
AIProposalService.generateProposalWithAI()
    ↓
Validate ANTHROPIC_API_KEY exists
    ↓
Call Claude 3.5 Sonnet API
    ↓
Parse & format response
    ↓
Track costs (input/output tokens)
    ↓
JSON Response (execution_type: "real")
```

### Federal Data Ingestion Flow
```
Admin Trigger
    ↓
POST /api/admin/grants/ingest
    ↓
GrantIngestionService
    ↓
Parallel API Calls:
  - grantsGovService.fetchOpportunities()
  - sbirService.fetchOpportunities()
  - nsfService.fetchOpportunities()
    ↓
Transform to unified schema
    ↓
Batch insert to D1 Database
    ↓
Return summary statistics
```

---

## 📊 Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-11-17T12:00:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid request parameters |
| `AUTH_REQUIRED` | 401 | Authentication required |
| `INVALID_CREDENTIALS` | 401 | Invalid token or password |
| `AUTH_NOT_CONFIGURED` | 500 | ADMIN_TOKEN not set |
| `NOT_FOUND` | 404 | Resource not found |
| `QUERY_TOO_LONG` | 400 | Search query exceeds 500 chars |
| `AI_EXECUTION_FAILED` | 500 | AI proposal generation failed |
| `STRIPE_CONFIG_ERROR` | 503 | Stripe not configured |
| `INGESTION_FAILED` | 500 | Data ingestion failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 🔧 Configuration

### Environment Variables

**Required (Production)**:
```bash
# API Configuration
VOIDCAT_DB=<D1_database_binding>
ADMIN_TOKEN=<strong-random-token>

# AI Features
FEATURE_REAL_AI=true
ANTHROPIC_API_KEY=<anthropic-api-key>

# Stripe (Payment Processing)
STRIPE_SECRET_KEY=<stripe-secret-key>
STRIPE_PUBLISHABLE_KEY=<stripe-publishable-key>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>
STRIPE_PRICE_ID=<stripe-price-id>
```

**Optional**:
```bash
# AI Pricing (override defaults)
CLAUDE_INPUT_USD_PER_MTOKEN=3.0
CLAUDE_OUTPUT_USD_PER_MTOKEN=15.0

# CORS Origins
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Environment
ENVIRONMENT=production
```

---

## 🧪 Testing

### Manual Testing with cURL

```bash
# 1. Health Check
curl https://grant-search-api.sorrowscry86.workers.dev/health

# 2. Search Grants
curl "https://grant-search-api.sorrowscry86.workers.dev/api/grants/search?query=climate+change&limit=5"

# 3. Get Grant Details
curl "https://grant-search-api.sorrowscry86.workers.dev/api/grants/GRANTS-2025-001"

# 4. Register User
curl -X POST "https://grant-search-api.sorrowscry86.workers.dev/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"TestPass123!",
    "name":"Test User"
  }'

# 5. Admin: Initialize Schema
curl -X POST "https://grant-search-api.sorrowscry86.workers.dev/api/admin/grants/init-schema" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 6. Admin: Ingest Grants
curl -X POST "https://grant-search-api.sorrowscry86.workers.dev/api/admin/grants/ingest" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sources":["grants.gov"]}'
```

### Automated Testing

```bash
# Run E2E tests with Playwright
npm test

# Run specific test suite
npx playwright test tests/api/grants.spec.js
```

---

## 📖 Additional Resources

- **OpenAPI Spec**: `api/openapi.yaml`
- **Swagger UI**: `api/swagger-ui.html`
- **Database Schema**: `api/src/db/grants-schema.js`
- **Deployment Guide**: `DEPLOYMENT_CHECKLIST.md`
- **Security**: `docs/security/SECURITY.md`

---

## 🆘 Support

### Common Issues

**Q: Admin endpoints return 401 Unauthorized**
A: Ensure `ADMIN_TOKEN` environment variable is set in Cloudflare Workers settings.

**Q: AI proposal generation fails with "API key not configured"**
A: Set `ANTHROPIC_API_KEY` environment variable and ensure `FEATURE_REAL_AI=true`.

**Q: Grant search returns 0 results**
A: Run data ingestion first: `POST /api/admin/grants/ingest`

**Q: Stripe checkout fails with 503**
A: Configure Stripe environment variables: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, etc.

### Getting Help

- **Documentation**: Check `API_DOCUMENTATION.md` (this file)
- **Issues**: https://github.com/sorrowscry86/voidcat-grant-automation/issues
- **Contact**: support@voidcat-rdc.com

---

**Last Updated**: November 17, 2025
**API Version**: 2.0.0
**OpenAPI Version**: 3.0.3
