# VoidCat Grant Automation Platform – Enhancement Plan

> Source Basis: "VoidCat Platform: Prioritized Improvement Plan" (attached) transformed into an actionable engineering battle plan with acceptance criteria, sequencing logic, risk notes, and success metrics.

## Guiding Principles

- Fix production truth first (real data & trust) before adding features.
- Ship smallest safe vertical slices; validate after each Tier 1/Tier 2 deployment.
- Keep frontend static & simple; push logic to API Worker; preserve fast iteration.
- Add observability + guardrails alongside feature/security work.
- Avoid premature refactors while critical functionality is broken.

---
## Tier 1 – Critical Production Fixes (Blockers)

### 1. Live Data Not Displaying

**Problem:** API always falls back to mock data due to incorrect structure expectation.

**Action:** Patch `fetchLiveGrantData` logic in `api/src/index.js` (or future `services/grants.js`) to accept either raw array or nested container. Provide defensive parsing + telemetry (console.log once).

```js
const liveData = await response.json();
const opportunities = Array.isArray(liveData)
  ? liveData
  : liveData.opportunities || liveData.data || [];
```

Transform & return. Maintain existing fallback if empty.

**Acceptance Criteria:**

- Live query to real endpoint yields >= N ( > mock length ) dynamic results.
- Fallback only triggered when fetch/network/parse fails (logged once per request id).
- Frontend displays live titles differing from mock set.

**Success Metric:** 0% unintended mock usage (sample 50 requests) after deploy.

**Risks:** Unexpected future schema variants → mitigate with lenient parsing & length check.

### 2. Transactional Email Enablement (Registration)

**Problem:** No outbound emails → users lack delivered API key / onboarding trust.

**Action:** Integrate MailChannels (native for Workers) or SendGrid via REST. Abstract in `emailService.sendRegistration({email, apiKey})` using `c.executionCtx.waitUntil()`.

**Acceptance Criteria:**

- Registration response time unaffected (< 500ms P50 local).
- Email received (manual test) containing API key & brief onboarding instructions.
- On failure: registration still succeeds; email task logs structured warning.

**Success Metric:** 95%+ delivery success (measure via provider logs) over first 100 signups.

**Risks:** Provider quota; ensure feature flag + retry/backoff.

---
## Tier 2 – High-Impact Security & UX

### 1. Rate Limiting (Proposal Generation Endpoint)

**Problem:** Unbounded expensive operations → cost & abuse vector.

**Action:** Implement per-user (API key hash) sliding window or fixed window counter in Cloudflare KV. Key pattern: `rl:{apiKey}:{yyyymmddhhmm}` for minute buckets. Limit initial: 12/min (configurable). Return 429 JSON with retry-after.

**Acceptance Criteria:**

- Surpasses allowed threshold → deterministically returns 429.
- Under threshold unaffected (latency impact < 10ms overhead).
- Log structured event on throttle (key, count, windowStart, ipHash).

**Success Metric:** 100% enforcement accuracy in load test; no cross-user bleed.

**Risks:** Clock skew minimal; ensure atomic increment (KV eventual consistency) — fallback to durable object in future if abuse persists.

### 2. Proposal Generation & Auth UX Polish

**Action Bundle:**

1. Replace `alert()` with modal component (Alpine.js) rendering structured sections and copy buttons.
2. Add "Download as Markdown" button (client-side blob export).
3. Add dedicated login/unlock modal replacing `window.prompt`; store email in `localStorage` with explicit user consent.
4. Respect accessibility: focus trap + ESC close.

**Acceptance Criteria:**

- Proposal modal open/close without layout shift; copy buttons work (navigator.clipboard).
- Markdown export downloads with meaningful filename `proposal-<grantId>-<date>.md`.
- Login modal appears only if session/email not yet set; re-auth path available.

**Success Metric:** Task completion time (user copy & save) reduced by >50% vs legacy flow (qualitative initial test). 0 console errors.

**Risks:** Clipboard API permissions; provide fallback selection highlight.

---
## Tier 3 – Foundational & Scalability

### 1. Modularize Backend

**Action:** Introduce structure (phased). Phase A occurs after Tier 1 deploy is stable.

```text
api/src/
  routes/
    grants.js
    users.js
    proposals.js
    health.js
  services/
    grantFetcher.js
    proposalGenerator.js
    emailService.js
    rateLimiter.js
  db/
    usersRepository.js
  util/
    logger.js
    response.js
  index.js (composition root)
```

**Acceptance Criteria:**

- All existing endpoints continue functioning (snapshot contract tests pass).
- No circular deps; each file < 300 lines.
- Clear separation: routes = HTTP wiring; services = logic; db = persistence.

**Success Metric:** Mean time to locate code for endpoint (< 10s subjective). Lines in `index.js` reduced by >70%.

**Risks:** Merge conflicts; mitigate by doing after quiet period + feature freeze.

### 2. Traditional Password Login (Future Iteration)

**Action:**

- Schema: add `hashed_password` column.
- Endpoint: `POST /api/users/login` returns signed JWT (HMAC secret in Worker secret). Keep API key issuance separate.
- Hash: bcrypt via edge-compatible lib or Argon2 wasm (benchmark size).

**Acceptance Criteria:**

- Register path optionally accepts password (feature flag). Login returns 200 with token; invalid creds → 401.
- JWT validated on protected endpoints when `Authorization: Bearer` header present; fallback to apiKey header preserved.

**Success Metric:** >80% new interactive users choose password auth after rollout (track adoption metric).

**Risks:** Token revocation complexity; postpone refresh tokens until needed.

### 3. Improved Mock Data System

**Action:**

- Move static list to `api/src/data/mock-grants.json`.
- Add update script `scripts/update-mock-grants.js` fetching snapshot & transforming.
- (Later) GitHub Action (cron weekly) runs script & commits changes.

**Acceptance Criteria:**

- Fallback uses JSON file; editing file updates served data without code change.
- Script run produces valid JSON < 1MB; includes timestamp metadata.

**Success Metric:** Mock dataset size within 80–120% of average real live result count.

**Risks:** External API instability; implement retry/backoff in script.

---
---
## Tier 4 – Long-Term & Minor

### 1. Externalize Configuration

**Action:** Replace in-file constants with `c.env.*` reads. Provide defaults in dev. Document required keys in `ENVIRONMENT-VARIABLES.md`.

**Acceptance Criteria:**

- All environment-dependent behavior configurable without code edits.
- Missing required var → logged error + safe fallback.

**Success Metric:** Zero config diffs needed for environment-specific deploys.

### 2. Edge & Error Test Coverage

**Action:** Expand Playwright & add light API contract tests.

- Cases: empty results, rate-limit 429 handling, network failure banner, malformed auth token, proposal generation error state.

**Acceptance Criteria:**

- New tests isolated (tags) and runnable subset: `npx playwright test --grep @edge`.
- Failure surfaces meaningful error UI messages (no raw stack traces).

**Success Metric:** Edge-case test count +15 without >5% runtime increase.

---
 
## Cross-Cutting Additions

- Structured Logging: Introduce `logger.js` with context fields (requestId, userId/apiKeyHash).
- Request Correlation: Generate UUID per request; attach to all log lines.
- Basic Metrics (Phase 0): Count proposal generations + rate-limit hits (console/log aggregator baseline).
- Security Headers: Ensure CORS & add `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` minimal set.

---
 
## Sequenced Checklist (Execution Order)

1. [x] Patch live data parsing (Tier 1.1) — implemented

    - [ ] Verify live data results exceed mock baseline

2. [ ] Add lightweight telemetry for mock fallback detection

    - Partial: schema and length logs added; fallback flag present

3. [ ] Implement + test email sending (Tier 1.2)

    - [x] Backend email service created and integrated (`waitUntil`)
    - [ ] Verify delivery via provider logs and manual inbox test

4. [ ] Deploy Tier 1; smoke test health/search/register
5. [ ] Implement KV rate limiter + tests (Tier 2.1)
6. [ ] UX overhaul: proposal modal + login modal (Tier 2.2)
7. [ ] Deploy Tier 2; run full E2E
8. [ ] Introduce logging & request IDs (Cross-cut) (can parallel step 6)
9. [ ] Modularize backend (Tier 3.1 Phase A)
10. [ ] Externalize configuration (Tier 4.1 – earlier if minimal friction)
11. [ ] Mock data system revamp (Tier 3.3)
12. [ ] Add edge/error test suite (@edge tag) (Tier 4.2)
13. [ ] Password auth groundwork (schema + hashing) (Tier 3.2)
14. [ ] JWT auth endpoints & dual-mode security layer
15. [ ] Metrics counters & (optional) dashboard stub

---
 
## Acceptance Review Framework

For each shipped batch:

- Functional Verification: Manual curl + targeted Playwright subset
- Regression Guard: Full Playwright run after Tier 2 & Tier 3 major refactor
- Metrics Snapshot: Record baseline counts (proposal requests, rate-limit hits)
- Rollback Plan: Keep previous Worker version for instant revert (Wrangler supports quick rollback)

---
 
## Risk Register (Top Five)

| Risk | Impact | Mitigation |
|------|--------|------------|
| Live API schema future change | Data blanking | Lenient parser + alert if < threshold count |
| Email provider outage | Onboarding trust loss | Queue + retry; log; offer resend endpoint later |
| Rate limit false positives (KV latency) | User frustration | Conservative threshold + future durable object upgrade |
| Refactor introduces regressions | Broken prod | Contract tests + phased file moves |
| Password auth increases attack surface | Security breach | Strong hashing, lockouts later, keep API key path separate |

---
 
## Metrics & Observability (Initial)

- grant_search_live_ratio = live_results / total_requests
- proposal_requests_per_user_minute (sampled)
- rate_limit_block_count
- email_send_success_rate
- mock_fallback_incidents
- avg_proposal_generation_latency_ms

(Collected initially via structured logs; formal metrics pipeline later.)

---
 
## Documentation Updates Required

- `README.md`: Note live data fix + email requirement.
- `ENVIRONMENT-VARIABLES.md`: Add mail provider + rate limit vars.
- `SECURITY.md`: Add rate limiting + password auth roadmap.
- `PRODUCTION_READINESS.md`: Update with metrics & logging approach.

---
 
## Fast Reference – New/Planned Env Vars

| Variable | Purpose | Example |
|----------|---------|---------|
| `MAIL_FROM` | Sender identity | `noreply@voidcat.org` |
| `MAIL_PROVIDER` | Switch implementation | `mailchannels` |
| `RATE_LIMIT_PER_MIN` | Configurable cap | `12` |
| `JWT_SECRET` | Signing login tokens | (secret) |
| `USE_LIVE_DATA` | Override for fallback testing | `true` |

---
 
## Decomposition Strategy Notes

Only begin modularization once Tier 1 & 2 stable. Use thin wrapper exports to avoid massive diff. Maintain route registration order. Introduce unit-test harness incrementally.

---
 
## Go / No-Go Criteria for Major Steps

- Proceed to Tier 2 only after live data ratio >90% & emails confirmed.
- Proceed to modularization only after rate limiting + UX deploy with <2 critical bugs reported in 72h.

---
 
## Next Immediate Actions (Sprint 0)

1. Implement live data parser patch.
2. Verify in local dev with real endpoint sample.
3. Begin email service abstraction file (stub).

---
Prepared for VoidCat RDC – Engineered for resilient, incremental evolution.
