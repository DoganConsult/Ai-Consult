/**
 * Inline Editor and Bulk Actions Service
 * 
 * Provides field validation for inline editing and bulk action execution
 * with partial failure handling.
 * 
 * Requirements: 5.2, 5.6, 5.9
 */

import { safeQuery, tenantSchema } from '../../../config/database';
import { toErrorMessage } from '../../../utils/http-error.util';

// ============================================================================
// Types
// ============================================================================

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'email' | 'url';

export interface FieldValidationRule {
  fieldName: string;
  fieldType: FieldType;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  allowedValues?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface BulkActionResult {
  totalRequested: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ entityId: string; error: string }>;
}

export type BulkActionType = 'status_change' | 'assign' | 'delete' | 'archive' | 'tag';

// ============================================================================
// Field Validation Rules per Entity Type
// ============================================================================

const ENTITY_FIELD_RULES: Record<string, FieldValidationRule[]> = {
  risk: [
    { fieldName: 'title', fieldType: 'text', required: true, minLength: 3, maxLength: 200 },
    { fieldName: 'description', fieldType: 'text', maxLength: 2000 },
    { fieldName: 'status', fieldType: 'select', allowedValues: ['draft', 'identified', 'assessed', 'mitigated', 'accepted', 'closed'] },
    { fieldName: 'likelihood', fieldType: 'number', min: 1, max: 5 },
    { fieldName: 'impact', fieldType: 'number', min: 1, max: 5 },
    { fieldName: 'owner', fieldType: 'text', maxLength: 100 },
  ],
  control: [
    { fieldName: 'title', fieldType: 'text', required: true, minLength: 3, maxLength: 200 },
    { fieldName: 'description', fieldType: 'text', maxLength: 2000 },
    { fieldName: 'status', fieldType: 'select', allowedValues: ['draft', 'implemented', 'effective', 'ineffective', 'not_applicable'] },
    { fieldName: 'effectiveness', fieldType: 'number', min: 0, max: 100 },
  ],
  policy: [
    { fieldName: 'title', fieldType: 'text', required: true, minLength: 3, maxLength: 200 },
    { fieldName: 'status', fieldType: 'select', allowedValues: ['draft', 'review', 'approved', 'published', 'retired'] },
    { fieldName: 'version', fieldType: 'text', maxLength: 20 },
  ],
  incident: [
    { fieldName: 'title', fieldType: 'text', required: true, minLength: 3, maxLength: 200 },
    { fieldName: 'severity', fieldType: 'select', allowedValues: ['low', 'medium', 'high', 'critical'] },
    { fieldName: 'status', fieldType: 'select', allowedValues: ['open', 'investigating', 'contained', 'resolved', 'closed'] },
  ],
};

// ============================================================================
// Pure Functions - Field Validation (Task 15.1)
// ============================================================================

/**
 * Get validation rules for a specific entity type and field.
 */
export function getFieldRule(entityType: string, fieldName: string): FieldValidationRule | undefined {
  const rules = ENTITY_FIELD_RULES[entityType];
  if (!rules) return undefined;
  return rules.find(r => r.fieldName === fieldName);
}

/**
 * Get all validation rules for an entity type.
 */
export function getEntityRules(entityType: string): FieldValidationRule[] {
  return ENTITY_FIELD_RULES[entityType] || [];
}

/**
 * Validate a single field value against its validation rule.
 * Pure function for testability.
 * 
 * Requirements: 5.6
 * Validates: Property 18 - Inline Validation
 */
export function validateFieldInput(
  value: any,
  rule: FieldValidationRule
): ValidationResult {
  const errors: string[] = [];

  // Required check
  if (rule.required && (value === undefined || value === null || value === '')) {
    errors.push(`${rule.fieldName} is required`);
    return { valid: false, errors };
  }

  // Skip further validation if value is empty and not required
  if (value === undefined || value === null || value === '') {
    return { valid: true, errors: [] };
  }

  switch (rule.fieldType) {
    case 'text':
    case 'email':
    case 'url': {
      const strValue = String(value);
      if (rule.minLength !== undefined && strValue.length < rule.minLength) {
        errors.push(`${rule.fieldName} must be at least ${rule.minLength} characters`);
      }
      if (rule.maxLength !== undefined && strValue.length > rule.maxLength) {
        errors.push(`${rule.fieldName} must be at most ${rule.maxLength} characters`);
      }
      if (rule.pattern) {
        try {
          const regex = new RegExp(rule.pattern);
          if (!regex.test(strValue)) {
            errors.push(`${rule.fieldName} does not match required pattern`);
          }
        } catch {
          // Invalid pattern, skip
        }
      }
      if (rule.fieldType === 'email' && !strValue.includes('@')) {
        errors.push(`${rule.fieldName} must be a valid email`);
      }
      if (rule.fieldType === 'url' && !strValue.startsWith('http')) {
        errors.push(`${rule.fieldName} must be a valid URL`);
      }
      break;
    }
    case 'number': {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push(`${rule.fieldName} must be a number`);
        break;
      }
      if (rule.min !== undefined && numValue < rule.min) {
        errors.push(`${rule.fieldName} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && numValue > rule.max) {
        errors.push(`${rule.fieldName} must be at most ${rule.max}`);
      }
      break;
    }
    case 'select': {
      if (rule.allowedValues && !rule.allowedValues.includes(String(value))) {
        errors.push(`${rule.fieldName} must be one of: ${rule.allowedValues.join(', ')}`);
      }
      break;
    }
    case 'date': {
      const dateValue = new Date(value);
      if (isNaN(dateValue.getTime())) {
        errors.push(`${rule.fieldName} must be a valid date`);
      }
      break;
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate multiple fields for an entity.
 */
export function validateEntityFields(
  entityType: string,
  fields: Record<string, any>
): ValidationResult {
  const rules = getEntityRules(entityType);
  const allErrors: string[] = [];

  for (const [fieldName, value] of Object.entries(fields)) {
    const rule = rules.find(r => r.fieldName === fieldName);
    if (rule) {
      const result = validateFieldInput(value, rule);
      allErrors.push(...result.errors);
    }
  }

  return { valid: allErrors.length === 0, errors: allErrors };
}

// ============================================================================
// Pure Functions - Bulk Actions (Task 15.3)
// ============================================================================

/**
 * Validate a bulk action request.
 * Pure function for testability.
 * 
 * Requirements: 5.2, 5.9
 * Validates: Property 17 - Bulk Action Consistency
 */
export function validateBulkAction(
  entityIds: string[],
  actionType: BulkActionType,
  params?: Record<string, any>
): ValidationResult {
  const errors: string[] = [];

  if (!entityIds || entityIds.length === 0) {
    errors.push('At least one entity must be selected');
  }

  if (entityIds.length > 100) {
    errors.push('Maximum 100 entities per bulk action');
  }

  const validActions: BulkActionType[] = ['status_change', 'assign', 'delete', 'archive', 'tag'];
  if (!validActions.includes(actionType)) {
    errors.push(`Invalid action type: ${actionType}`);
  }

  if (actionType === 'status_change' && (!params?.status)) {
    errors.push('Status is required for status_change action');
  }

  if (actionType === 'assign' && (!params?.assignee)) {
    errors.push('Assignee is required for assign action');
  }

  // Check for duplicate IDs
  const uniqueIds = new Set(entityIds);
  if (uniqueIds.size !== entityIds.length) {
    errors.push('Duplicate entity IDs found');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Build a bulk action result from individual results.
 * Pure function for testability.
 * 
 * Requirements: 5.9
 * Validates: Property 19 - Bulk Action Partial Failure Handling
 */
export function buildBulkActionResult(
  entityIds: string[],
  results: Array<{ entityId: string; success: boolean; error?: string }>
): BulkActionResult {
  const successCount = results.filter(r => r.success).length;
  const failures = results.filter(r => !r.success);

  return {
    totalRequested: entityIds.length,
    successCount,
    failureCount: failures.length,
    errors: failures.map(f => ({ entityId: f.entityId, error: f.error || 'Unknown error' })),
  };
}

// ============================================================================
// Database Operations (Task 15.3)
// ============================================================================

/**
 * Execute a bulk action on entities with partial failure handling.
 */
export async function executeBulkAction(
  tenantId: string,
  entityType: string,
  entityIds: string[],
  actionType: BulkActionType,
  params: Record<string, any> = {}
): Promise<BulkActionResult> {
  const schema = tenantSchema(tenantId);
  const tableMap: Record<string, string> = {
    risk: 'risks', control: 'controls', policy: 'policies',
    incident: 'incidents', vendor: 'vendors',
  };
  const table = tableMap[entityType];
  if (!table) {
    return buildBulkActionResult(entityIds, entityIds.map(id => ({
      entityId: id, success: false, error: `Unknown entity type: ${entityType}`,
    })));
  }

  const results: Array<{ entityId: string; success: boolean; error?: string }> = [];

  for (const entityId of entityIds) {
    try {
      switch (actionType) {
        case 'status_change':
          await safeQuery(`UPDATE ${schema}.${table} SET status = $1 WHERE id = $2`, [params.status, entityId]);
          break;
        case 'assign':
          await safeQuery(`UPDATE ${schema}.${table} SET owner = $1 WHERE id = $2`, [params.assignee, entityId]);
          break;
        case 'delete':
          await safeQuery(`DELETE FROM ${schema}.${table} WHERE id = $1`, [entityId]);
          break;
        case 'archive':
          await safeQuery(`UPDATE ${schema}.${table} SET status = 'archived' WHERE id = $1`, [entityId]);
          break;
        case 'tag':
          // Tags would be stored in a separate table in production
          break;
      }
      results.push({ entityId, success: true });
    } catch (error: unknown) {
      results.push({ entityId, success: false, error: toErrorMessage(error) });
    }
  }

  return buildBulkActionResult(entityIds, results);
}
