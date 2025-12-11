# 🔧 Symbiosis Agent - Drift Remediation Plan

**Generated**: December 11, 2025
**Project**: VoidCat Grant Automation
**Agent Version**: MVP Phase 1 (Static AST Analysis)
**Status**: 81 Violations Detected - 3 Critical Remediations Required

---

## Executive Summary

The Symbiosis Agent has successfully detected architectural drift between the OpenAPI specification (`api/openapi.yaml`) and the implementation (`api/src/routes/grants.js`). Of the 81 total violations detected:

- **37 PHANTOM_ROUTE errors**: Endpoints documented but not implemented (mostly advanced features for future phases)
- **44 INPUT_DRIFT warnings**: Parameters with spec/code misalignment

**Priority**: Address 3 critical drift issues immediately to restore architectural coherence.

---

## 🎯 CRITICAL DRIFT ISSUES (Must Fix)

### Issue 1: ⚠️ The "Ghost Parameter" Drift

**Location**: `GET /api/grants/search` (line 44 in grants.js)

**Problem**:
```javascript
const { query, agency, deadline, amount, program, opportunityType } = c.req.query();
// ... but then later in response ...
search_params: { query, agency, deadline, amount, program, opportunityType }
```

The endpoint extracts 6 query parameters but only uses `query` and `agency` in the actual database search (line 75):
```javascript
const results = await dbService.searchGrants(query, {
    agency: agency,  // ✓ used
    status: 'active',
    // deadline, amount, program, opportunityType are NEVER used
});
```

**Impact**:
- **Frontend Confusion**: Developers building clients from the OpenAPI spec will expect these filters to work
- **User Frustration**: Users attempting to filter by deadline/amount get no actual filtering
- **Contract Violation**: The API promises filtering that doesn't exist

**Root Cause**:
These parameters were planned for Phase 2 advanced filtering but the database layer (`DatabaseGrantService.searchGrants()`) doesn't support them yet.

**Solution**:

**Option A (Recommended - Honest Spec)**: Update OpenAPI spec to document only the parameters that actually work:
```yaml
parameters:
  - name: query
    in: query
    required: true
    schema:
      type: string
    description: Search term for grant matching
  - name: agency
    in: query
    required: false
    schema:
      type: string
    description: Filter by federal agency (e.g., 'NSF', 'NIH')
```

Remove `deadline`, `amount`, `program`, `opportunityType` from spec until they're actually implemented.

**Option B (Implement Filters)**: Implement the missing database filters in `DatabaseGrantService.searchGrants()` to support all 6 parameters.

**Recommendation**: Go with **Option A** for immediate coherence. The advanced filters can be documented in a separate spec (`openapi-v2.yaml`) as a "Phase 2 Feature" when implemented.

**Timeline**: 10 minutes (update spec only)

---

### Issue 2: ⛔ The "Works on Paper" Disconnect

**Location**: Two endpoints in `api/src/routes/grants.js`

#### Endpoint 2a: `POST /api/grants/analyze-match` (line 343)

**Problem**:
```javascript
// Code ALWAYS returns 501 Not Implemented
return c.json({
  success: false,
  error: 'Semantic analysis not available',
  code: 'FEATURE_REQUIRES_LIVE_DATA'
}, 501);  // 501 = Not Implemented
```

**Spec Says** (in openapi.yaml):
```yaml
POST /api/grants/analyze-match:
  responses:
    200:
      description: Matching analysis successful
```

The spec documents a `200 OK` response but the code **always returns 501**. This is a contract violation - any client generated from the spec will crash.

#### Endpoint 2b: `POST /api/grants/application-timeline` (line 374)

**Problem**: Same issue - code returns 501, spec says 200.

**Impact**:
- **API Contract Violation**: Clients generated from OpenAPI spec will crash immediately
- **Integration Failure**: Third-party integrations will fail
- **Misleading Documentation**: Developers trust the spec but code doesn't match

**Root Cause**:
These endpoints were designed as Phase 2 features but the spec was finalized before implementation. The endpoints exist in the code for "future implementation" but the spec incorrectly promises they work.

**Solution**:

**Option A (Recommended - Honest Spec)**: Update OpenAPI spec to mark these endpoints as deprecated or move them to a separate Phase 2 spec:

```yaml
POST /api/grants/analyze-match:
  deprecated: true
  x-voidcat-phase: "2"
  x-voidcat-status: "planned"
  responses:
    501:
      description: Feature not yet implemented. Planned for Phase 2.
```

**Option B (Quick Deprecation Endpoint)**: Return a consistent "Coming Soon" response:
```javascript
return c.json({
  success: false,
  error: 'Feature coming in Phase 2',
  code: 'NOT_YET_IMPLEMENTED',
  eta: 'Q1 2026'
}, 501);
```

**Recommendation**: Go with **Option A** - update the spec to accurately document the 501 status codes.

**Timeline**: 15 minutes (update spec to match code reality)

---

### Issue 3: 🎁 The "Hidden Bonus" Payload

**Location**: `GET /api/grants/federal-agencies` (line 311)

**Problem**:
```javascript
// Code returns extra fields NOT in spec
return c.json({
  success: true,
  agencies: [...],
  statistics: stats,           // ← NOT documented in spec
  scanning_schedule: schedule  // ← NOT documented in spec
});
```

**Spec Says**: Only documents `agencies` field

**Impact**:
- **Documentation Gap**: Developers only see `agencies` in docs, miss `statistics` and `scanning_schedule`
- **Bloated Responses**: Clients don't know to cache extra fields
- **Maintenance Burden**: Future developers don't know why these fields exist

**Root Cause**:
Good intentions - someone added useful data to the response without updating the spec.

**Solution**:

**Best Practice** (Clean & Documented): Update the spec to document all returned fields:

```yaml
responses:
  200:
    content:
      application/json:
        schema:
          properties:
            success:
              type: boolean
            total_agencies:
              type: number
            agencies:
              type: array
              items:
                $ref: '#/components/schemas/Agency'
            statistics:
              $ref: '#/components/schemas/AgencyStatistics'
            scanning_schedule:
              $ref: '#/components/schemas/ScanSchedule'
```

**Timeline**: 20 minutes (add schema definitions and update spec)

---

## 📋 REMEDIATION CHECKLIST

### Immediate Actions (Today)

- [ ] **Fix Issue 1** - Ghost Parameter Drift
  - [ ] Remove unused params from spec OR implement in code
  - [ ] Verify `/search` endpoint params match OpenAPI spec
  - [ ] Test with Symbiosis Agent
  - **Time**: 10 min

- [ ] **Fix Issue 2** - 501 Endpoint Contract
  - [ ] Update spec to document 501 responses
  - [ ] Mark endpoints as deprecated with Phase 2 notes
  - [ ] Verify with Symbiosis Agent
  - **Time**: 15 min

- [ ] **Fix Issue 3** - Hidden Payload
  - [ ] Document `statistics` field in spec
  - [ ] Document `scanning_schedule` field in spec
  - [ ] Add schema components for new fields
  - [ ] Verify with Symbiosis Agent
  - **Time**: 20 min

### Validation (After fixes)

- [ ] Run Symbiosis Agent: `node symbiosis-agent.js`
- [ ] Violations should drop from 81 to ~40 (only PHANTOM_ROUTE for future features)
- [ ] Zero ERROR violations (all should be INFO level)
- [ ] Commit with message: "fix(drift): Resolve architectural incoherence with Symbiosis Agent"

### Long-term (Phase 2)

- [ ] Implement advanced grant search filters (issue #1)
- [ ] Implement `/analyze-match` endpoint (issue #2a)
- [ ] Implement `/application-timeline` endpoint (issue #2b)
- [ ] Add `#/components/schemas` for all response models (issue #3)

---

## 🔄 Symbiosis Agent Integration

### CI/CD Pipeline

Add to `.github/workflows/test.yml`:

```yaml
- name: Check Architectural Coherence
  run: |
    npm install -D js-yaml
    node symbiosis-agent.js
    if [ $? -ne 0 ]; then
      echo "❌ Architectural drift detected!"
      echo "Run: node symbiosis-agent.js for details"
      exit 1
    fi
```

### Pre-Commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
node symbiosis-agent.js > /tmp/drift-report.txt
if [ $? -ne 0 ]; then
  echo "⚠️  Architectural drift detected:"
  cat /tmp/drift-report.txt
  exit 1
fi
```

---

## 📊 Post-Remediation Metrics

**Before**: 81 violations (37 ERRORS, 44 WARNINGS)
**After (target)**: ~40 violations (0 ERRORS, 40 WARNINGS/INFO for future endpoints)

**Success Criteria**:
- ✅ Zero ERROR level violations
- ✅ All PHANTOM_ROUTE violations are for Phase 2+ features
- ✅ No INPUT_DRIFT warnings for implemented endpoints
- ✅ Spec accurately reflects code behavior

---

## 🚀 Next Steps

1. **Apply Fixes** (30 minutes total)
2. **Run Agent Validation** (2 minutes)
3. **Commit & Push** (2 minutes)
4. **Update tobefixed.md** with Symbiosis Agent integration task
5. **Add CI/CD Integration** (Phase 3.5 task)

---

**Agent Created By**: Albedo, VoidCat RDC
**Report Generated**: 2025-12-11T07:22:05Z
**Next Review**: After Phase 2.4 (data ingestion) completion
