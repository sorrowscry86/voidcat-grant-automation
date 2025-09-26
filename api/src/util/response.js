// Response utilities for consistent API responses

/**
 * Create a success response
 * @param {Object} data - Response data
 * @param {number} status - HTTP status code (default: 200)
 * @returns {Response} JSON response
 */
export function success(data, status = 200) {
  return new Response(JSON.stringify({
    success: true,
    ...data,
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Create an error response
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {number} status - HTTP status code (default: 400)
 * @param {Object} additional - Additional error data
 * @returns {Response} JSON response
 */
export function error(message, code, status = 400, additional = {}) {
  return new Response(JSON.stringify({
    success: false,
    error: message,
    code,
    ...additional,
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Create a validation error response
 * @param {string} field - Field that failed validation
 * @param {string} message - Validation error message
 * @returns {Response} JSON response
 */
export function validationError(field, message) {
  return error(`Validation failed: ${message}`, 'VALIDATION_ERROR', 400, {
    field,
    validation_message: message
  });
}

/**
 * Create a rate limit error response
 * @param {Object} rateLimitInfo - Rate limit information
 * @returns {Response} JSON response
 */
export function rateLimitError(rateLimitInfo) {
  const response = error(
    'Rate limit exceeded. Please try again later.',
    'RATE_LIMIT_EXCEEDED',
    429,
    { rate_limit: rateLimitInfo }
  );
  
  // Add rate limit headers
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
  headers.set('X-RateLimit-Remaining', '0');
  headers.set('X-RateLimit-Reset', Math.floor(rateLimitInfo.resetTime.getTime() / 1000).toString());
  if (rateLimitInfo.retryAfter) {
    headers.set('Retry-After', rateLimitInfo.retryAfter.toString());
  }
  
  return new Response(response.body, {
    status: response.status,
    headers
  });
}

/**
 * Create a service unavailable response
 * @param {string} service - Service name
 * @param {string} message - Additional message
 * @returns {Response} JSON response
 */
export function serviceUnavailable(service, message = null) {
  return error(
    `${service} service is temporarily unavailable. Please try again in a few minutes.`,
    'SERVICE_UNAVAILABLE',
    503,
    message ? { additional_info: message } : {}
  );
}

export default {
  success,
  error,
  validationError,
  rateLimitError,
  serviceUnavailable
};