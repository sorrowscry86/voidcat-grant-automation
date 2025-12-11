// Source Status Service - in-memory tracking of external data source fetches
// Stores only real fetch metadata captured at runtime (NO SIMULATIONS)

const sourceStatus = {
  'grants.gov': { last_success: null, last_failure: null, last_duration_ms: null, last_result_count: 0, success_count: 0, failure_count: 0 },
  'sbir.gov': { last_success: null, last_failure: null, last_duration_ms: null, last_result_count: 0, success_count: 0, failure_count: 0 },
  'nsf.gov': { last_success: null, last_failure: null, last_duration_ms: null, last_result_count: 0, success_count: 0, failure_count: 0 }
};

export function recordSourceFetch(source, success, durationMs, resultCount, errorMessage = null) {
  if (!sourceStatus[source]) return;
  const entry = sourceStatus[source];
  if (success) {
    entry.last_success = new Date().toISOString();
    entry.success_count += 1;
    entry.last_result_count = resultCount;
  } else {
    entry.last_failure = new Date().toISOString();
    entry.failure_count += 1;
  }
  entry.last_duration_ms = durationMs;
  if (errorMessage) entry.last_error = errorMessage;
}

export function getSourceStatuses() {
  const now = new Date().toISOString();
  const result = {};
  for (const [source, data] of Object.entries(sourceStatus)) {
    result[source] = {
      ...data,
      healthy: !!data.last_success && (!data.last_failure || data.last_success > data.last_failure),
      timestamp: now
    };
  }
  return result;
}

export default { recordSourceFetch, getSourceStatuses };