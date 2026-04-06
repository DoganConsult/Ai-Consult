// Activity Feed - Tenant Isolation Validation
// Validates: Requirement 2.7 - Activity feed is scoped to tenant (no cross-tenant data leakage)
// Property 7: Tenant Isolation

import { TenantValidationResult } from '../activity/activity-feed.types';

/**
 * Pure function: Validate tenant ID format
 * Validates: Requirement 2.7 - Activity feed is scoped to tenant
 * Property 7: Tenant Isolation
 *
 * Validates that a tenant ID:
 * 1. Is a non-empty string
 * 2. Contains only alphanumeric characters and hyphens (safe for SQL schema names)
 * 3. Does not exceed maximum length (16 characters per database schema)
 * 4. Does not start or end with a hyphen
 * 5. Does not contain SQL injection patterns
 *
 * This validation prevents SQL injection via tenant ID and ensures
 * tenant isolation by validating the tenant ID before it's used in queries.
 *
 * @param tenantId - The tenant ID to validate
 * @returns TenantValidationResult with valid flag and optional error message
 */
export function validateTenantAccess(tenantId: string | null | undefined): TenantValidationResult {
  // Check for null/undefined
  if (tenantId === null || tenantId === undefined) {
    return { valid: false, error: 'Tenant ID is required' };
  }

  // Check for non-string types
  if (typeof tenantId !== 'string') {
    return { valid: false, error: 'Tenant ID must be a string' };
  }

  // Check for empty string
  if (tenantId.trim().length === 0) {
    return { valid: false, error: 'Tenant ID cannot be empty' };
  }

  // Check maximum length (16 characters per database schema)
  if (tenantId.length > 16) {
    return { valid: false, error: 'Tenant ID exceeds maximum length of 16 characters' };
  }

  // Check for valid characters (alphanumeric and hyphens only)
  // This prevents SQL injection by ensuring only safe characters are used
  const validPattern = /^[a-zA-Z0-9-]+$/;
  if (!validPattern.test(tenantId)) {
    return { valid: false, error: 'Tenant ID contains invalid characters. Only alphanumeric characters and hyphens are allowed' };
  }

  // Check that it doesn't start or end with a hyphen
  if (tenantId.startsWith('-') || tenantId.endsWith('-')) {
    return { valid: false, error: 'Tenant ID cannot start or end with a hyphen' };
  }

  // Check for consecutive hyphens
  if (tenantId.includes('--')) {
    return { valid: false, error: 'Tenant ID cannot contain consecutive hyphens' };
  }

  // Check for SQL injection patterns (additional safety layer)
  const sqlInjectionPatterns = [
    /;/,           // Statement terminator
    /--/,          // SQL comment (already caught by consecutive hyphens)
    /\/\*/,        // Block comment start
    /\*\//,        // Block comment end
    /'/,           // Single quote
    /"/,           // Double quote
    /\\/,          // Backslash
    /\x00/,        // Null byte
  ];

  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(tenantId)) {
      return { valid: false, error: 'Tenant ID contains potentially unsafe characters' };
    }
  }

  return { valid: true };
}

/**
 * Pure function: Assert tenant ID is valid, throwing an error if not
 * Validates: Requirement 2.7 - Activity feed is scoped to tenant
 *
 * This is a convenience wrapper around validateTenantAccess that throws
 * an error if validation fails. Use this at the start of service functions
 * to ensure tenant isolation before executing any database operations.
 *
 * @param tenantId - The tenant ID to validate
 * @throws Error if tenant ID is invalid
 */
export function assertValidTenantId(tenantId: string | null | undefined): asserts tenantId is string {
  const result = validateTenantAccess(tenantId);
  if (!result.valid) {
    throw new Error(`Invalid tenant ID: ${result.error}`);
  }
}

/**
 * Pure function: Check if two tenant IDs are the same
 * Validates: Requirement 2.7 - No cross-tenant data leakage
 * Property 7: Tenant Isolation
 *
 * Compares two tenant IDs for equality after validation.
 * Returns false if either tenant ID is invalid.
 *
 * @param tenantId1 - First tenant ID
 * @param tenantId2 - Second tenant ID
 * @returns True if both tenant IDs are valid and equal
 */
export function isSameTenant(tenantId1: string | null | undefined, tenantId2: string | null | undefined): boolean {
  const result1 = validateTenantAccess(tenantId1);
  const result2 = validateTenantAccess(tenantId2);

  if (!result1.valid || !result2.valid) {
    return false;
  }

  // Case-insensitive comparison for consistency
  return tenantId1!.toLowerCase() === tenantId2!.toLowerCase();
}

/**
 * Pure function: Filter activities to only include those belonging to a specific tenant
 * Validates: Requirement 2.7 - Activity feed is scoped to tenant
 * Property 7: Tenant Isolation
 *
 * This is a pure function that filters an array of activities to only include
 * those that belong to the specified tenant. Used for additional validation
 * layer when activities might come from multiple sources.
 *
 * Note: In normal operation, activities are already scoped to tenant via
 * the tenantSchema() function in database queries. This function provides
 * an additional safety layer for edge cases.
 *
 * @param activities - Array of activities with tenantId property
 * @param tenantId - The tenant ID to filter by
 * @returns Filtered array containing only activities for the specified tenant
 */
export function filterActivitiesByTenant<T extends { tenantId?: string }>(
  activities: T[],
  tenantId: string
): T[] {
  const validation = validateTenantAccess(tenantId);
  if (!validation.valid) {
    return []; // Return empty array if tenant ID is invalid
  }

  return activities.filter(activity =>
    activity.tenantId !== undefined &&
    isSameTenant(activity.tenantId, tenantId)
  );
}
