// Validation utilities for VoidCat Grant Automation Platform

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate name format
 * @param {string} name - Name to validate
 * @returns {boolean} Is valid name
 */
export function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 100;
}

/**
 * Validate API key format
 * @param {string} apiKey - API key to validate
 * @returns {boolean} Is valid API key format
 */
export function isValidApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return false;
  // UUID v4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(apiKey);
}

/**
 * Validate grant ID format
 * @param {string} grantId - Grant ID to validate
 * @returns {boolean} Is valid grant ID
 */
export function isValidGrantId(grantId) {
  if (!grantId || typeof grantId !== 'string') return false;
  const trimmed = grantId.trim();
  return trimmed.length > 0 && trimmed.length <= 50;
}

/**
 * Validate date format (ISO 8601)
 * @param {string} dateString - Date string to validate
 * @returns {boolean} Is valid date
 */
export function isValidDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Validate search query
 * @param {string} query - Search query to validate
 * @returns {boolean} Is valid query
 */
export function isValidSearchQuery(query) {
  if (!query) return true; // Empty query is allowed
  if (typeof query !== 'string') return false;
  return query.length <= 200;
}

/**
 * Sanitize string input
 * @param {string} input - Input to sanitize
 * @param {number} maxLength - Maximum length (default: 1000)
 * @returns {string} Sanitized string
 */
export function sanitizeString(input, maxLength = 1000) {
  if (!input || typeof input !== 'string') return '';
  return input.trim().substring(0, maxLength);
}

/**
 * Validate registration data
 * @param {Object} data - Registration data
 * @returns {Object} Validation result
 */
export function validateRegistrationData(data) {
  const errors = [];
  
  if (!data.email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!isValidEmail(data.email)) {
    errors.push({ field: 'email', message: 'Please provide a valid email address' });
  }
  
  if (!data.name) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (!isValidName(data.name)) {
    errors.push({ field: 'name', message: 'Name must be between 2 and 100 characters' });
  }
  
  // Company is optional, but if provided, validate length
  if (data.company && data.company.trim().length > 200) {
    errors.push({ field: 'company', message: 'Company name must be 200 characters or less' });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate search parameters
 * @param {Object} params - Search parameters
 * @returns {Object} Validation result
 */
export function validateSearchParams(params) {
  const errors = [];
  
  if (params.query && !isValidSearchQuery(params.query)) {
    errors.push({ field: 'query', message: 'Search query is too long. Please use fewer than 200 characters.' });
  }
  
  if (params.deadline && !isValidDate(params.deadline)) {
    errors.push({ field: 'deadline', message: 'Invalid deadline format. Please use YYYY-MM-DD format.' });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  isValidEmail,
  isValidName,
  isValidApiKey,
  isValidGrantId,
  isValidDate,
  isValidSearchQuery,
  sanitizeString,
  validateRegistrationData,
  validateSearchParams
};