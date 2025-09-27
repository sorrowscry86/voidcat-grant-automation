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

/**
 * Create a consistent API response (Tier 4 enhancement)
 * @param {Object} c - Hono context
 * @param {boolean} success - Success status
 * @param {string} message - Response message
 * @param {number} status - HTTP status code
 * @param {string} code - Error/success code
 * @param {Object} data - Response data
 * @returns {Response} JSON response
 */
export function createResponse(c, success, message, status = 200, code = null, data = {}) {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString(),
    ...data
  };
  
  if (code) {
    response.code = code;
  }
  
  return c.json(response, status);
}

/**
 * Validate input fields (Tier 4 enhancement)
 * @param {Object} input - Input data to validate
 * @param {Object} rules - Validation rules
 * @returns {Object} Validation result
 */
export function validateInput(input, rules) {
  const errors = [];
  
  for (const [field, rule] of Object.entries(rules)) {
    const value = input[field];
    
    // Required field check
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    
    // Skip other validations if field is empty and not required
    if (!value && !rule.required) {
      continue;
    }
    
    // Type validation
    if (rule.type) {
      switch (rule.type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push(`${field} must be a valid email address`);
          }
          break;
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`${field} must be a string`);
          }
          break;
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push(`${field} must be a valid number`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`${field} must be true or false`);
          }
          break;
      }
    }
    
    // Length validation
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters long`);
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${field} must be no more than ${rule.maxLength} characters long`);
      }
    }
    
    // Range validation for numbers
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${field} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${field} must be no more than ${rule.max}`);
      }
    }
    
    // Custom validation function
    if (rule.validate && typeof rule.validate === 'function') {
      const customResult = rule.validate(value);
      if (customResult !== true) {
        errors.push(customResult || `${field} failed custom validation`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    error: errors.length > 0 ? errors[0] : null // Return first error for convenience
  };
}

export default {
  success,
  error,
  validationError,
  rateLimitError,
  serviceUnavailable,
  createResponse,
  validateInput
};