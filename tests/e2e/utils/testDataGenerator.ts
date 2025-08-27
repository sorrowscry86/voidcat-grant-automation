/**
 * Test Data Generator Utilities
 * 
 * This module provides utilities for generating unique, reliable test data
 * that prevents issues from using time-based identifiers in parallel test execution.
 */

/**
 * Generates a unique email address for testing
 * Uses crypto.randomUUID() instead of Date.now() to prevent collisions
 * when tests run in quick succession or in parallel
 */
export function generateUniqueEmail(prefix: string = 'test'): string {
  return `${prefix}-${crypto.randomUUID()}@example.com`;
}

/**
 * Generates a unique username for testing
 */
export function generateUniqueUsername(prefix: string = 'user'): string {
  return `${prefix}-${crypto.randomUUID().substring(0, 8)}`;
}

/**
 * Generates a unique company name for testing
 */
export function generateUniqueCompanyName(prefix: string = 'Company'): string {
  return `${prefix} ${crypto.randomUUID().substring(0, 8)}`;
}

/**
 * Generates a unique API key for testing
 */
export function generateUniqueApiKey(): string {
  return `test-api-${crypto.randomUUID()}`;
}

/**
 * Generates test user data with unique identifiers
 */
export function generateTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    name: 'Test User',
    email: generateUniqueEmail(),
    company: generateUniqueCompanyName(),
    password: 'Test@1234!',
    ...overrides
  };
}

/**
 * Generates test company info for proposal generation
 */
export function generateTestCompanyInfo(overrides: Partial<CompanyInfo> = {}): CompanyInfo {
  return {
    name: generateUniqueCompanyName(),
    description: 'A test company for automated testing purposes',
    capabilities: ['AI Development', 'Software Engineering', 'Data Analysis'],
    ...overrides
  };
}

/**
 * Type definitions for test data
 */
export interface TestUser {
  name: string;
  email: string;
  company: string;
  password?: string;
}

export interface CompanyInfo {
  name: string;
  description: string;
  capabilities: string[];
}

/**
 * Generates a unique session ID for testing
 */
export function generateUniqueSessionId(): string {
  return `session-${crypto.randomUUID()}`;
}

/**
 * Generates a unique grant ID for testing
 */
export function generateUniqueGrantId(prefix: string = 'TEST'): string {
  return `${prefix}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
}

/**
 * Generates test grant data
 */
export function generateTestGrant(overrides: Partial<TestGrant> = {}): TestGrant {
  const grantId = generateUniqueGrantId();
  return {
    id: grantId,
    title: `Test Grant ${grantId}`,
    agency: 'Test Agency',
    program: 'Test Program',
    deadline: '2025-12-31',
    amount: '$500,000',
    description: 'A test grant for automated testing purposes',
    eligibility: 'Test organizations',
    matching_score: 0.85,
    data_source: 'mock',
    ...overrides
  };
}

export interface TestGrant {
  id: string;
  title: string;
  agency: string;
  program: string;
  deadline: string;
  amount: string;
  description: string;
  eligibility: string;
  matching_score: number;
  data_source: string;
}

/**
 * Utility to wait for a random short duration to avoid race conditions
 * Useful for tests that might conflict with rapid sequential execution
 */
export async function waitRandomDelay(minMs: number = 100, maxMs: number = 300): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Generates a batch of unique emails for bulk testing
 */
export function generateUniqueEmails(count: number, prefix: string = 'test'): string[] {
  return Array.from({ length: count }, () => generateUniqueEmail(prefix));
}

/**
 * Constants for test data validation
 */
export const TEST_DATA_CONSTANTS = {
  MIN_EMAIL_LENGTH: 5,
  MAX_EMAIL_LENGTH: 254,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  VALID_EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
} as const;

/**
 * Validates that generated test data meets requirements
 */
export function validateTestUser(user: TestUser): boolean {
  return (
    TEST_DATA_CONSTANTS.VALID_EMAIL_REGEX.test(user.email) &&
    user.name.length >= TEST_DATA_CONSTANTS.MIN_NAME_LENGTH &&
    user.name.length <= TEST_DATA_CONSTANTS.MAX_NAME_LENGTH &&
    user.company.length > 0
  );
}

/**
 * Generates unique test data that's guaranteed to be different each time
 * This prevents test failures due to overlapping test data when running
 * tests in quick succession or in parallel environments
 */
export class TestDataFactory {
  private static usedEmails = new Set<string>();
  private static usedUsernames = new Set<string>();
  
  static getUniqueEmail(prefix: string = 'test'): string {
    let email: string;
    do {
      email = generateUniqueEmail(prefix);
    } while (this.usedEmails.has(email));
    
    this.usedEmails.add(email);
    return email;
  }
  
  static getUniqueUsername(prefix: string = 'user'): string {
    let username: string;
    do {
      username = generateUniqueUsername(prefix);
    } while (this.usedUsernames.has(username));
    
    this.usedUsernames.add(username);
    return username;
  }
  
  static clearCache(): void {
    this.usedEmails.clear();
    this.usedUsernames.clear();
  }
}