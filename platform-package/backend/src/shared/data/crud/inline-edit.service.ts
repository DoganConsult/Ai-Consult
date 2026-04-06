// @ts-nocheck
// Shahin - Inline Edit Service (field-level validation & audit)
import { safeQuery, tenantSchema } from '../../../config/database';
import { z } from 'zod';
import { getFirstRow } from '../../../utils/db-utils';

export interface InlineEditRecord {
  edit_id: string;
  entity_type: string;
  entity_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  edited_by: string;
  validated: boolean;
  validation_errors: Array<{ field: string; message: string }>;
  created_at: string;
}

export interface FieldValidationRule {
  field: string;
  schema: z.ZodSchema;
}

export const FIELD_VALIDATORS: Record<string, Record<string, z.ZodSchema>> = {
  risk: {
    title: z.string().min(3).max(500),
    description: z.string().max(5000),
    likelihood: z.coerce.number().int().min(1).max(5),
    impact: z.coerce.number().int().min(1).max(5),
    status: z.enum(['open', 'mitigated', 'accepted', 'closed']),
    owner: z.string().min(1).max(200),
  },
  policy: {
    title: z.string().min(3).max(500),
    content: z.string().min(10).max(50000),
    status: z.enum(['draft', 'review', 'approved', 'published', 'retired']),
    version: z.coerce.number().int().min(1),
  },
  control: {
    title: z.string().min(3).max(500),
    description: z.string().max(5000),
    status: z.enum(['not_started', 'in_progress', 'implemented', 'effective', 'ineffective']),
  },
  incident: {
    title: z.string().min(3).max(500),
    description: z.string().max(5000),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    status: z.enum(['reported', 'investigating', 'resolved', 'closed']),
  },
};

export function validateField(entityType: string, fieldName: string, value: string): { valid: boolean; errors: Array<{ field: string; message: string }> } {
  const validators = FIELD_VALIDATORS[entityType];
  if (!validators || !validators[fieldName]) {
    return { valid: true, errors: [] };
  }
  const result = validators[fieldName].safeParse(value);
  if (result.success) return { valid: true, errors: [] };
  return {
    valid: false,
    errors: result.error.issues.map(issue => ({
      field: fieldName,
      message: issue.message,
    })),
  };
}

export function hasFieldValidator(entityType: string, fieldName: string): boolean {
  return !!(FIELD_VALIDATORS[entityType]?.[fieldName]);
}

export async function recordEdit(tenantId: string, data: {
  entity_type: string; entity_id: string; field_name: string;
  old_value: string | null; new_value: string | null;
  edited_by: string; validated: boolean;
  validation_errors?: Array<{ field: string; message: string }>;
}): Promise<InlineEditRecord> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `INSERT INTO "${schema}".inline_edit_history
     (entity_type, entity_id, field_name, old_value, new_value, edited_by, validated, validation_errors)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb) RETURNING *`,
    [data.entity_type, data.entity_id, data.field_name, data.old_value, data.new_value,
     data.edited_by, data.validated, JSON.stringify(data.validation_errors || [])]
  );
  return getFirstRow(res);
}

export async function getEditHistory(tenantId: string, entityType: string, entityId: string): Promise<InlineEditRecord[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".inline_edit_history
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY created_at DESC LIMIT 100`,
    [entityType, entityId]
  );
  return res.rows;
}

export async function getFieldHistory(tenantId: string, entityType: string, entityId: string, fieldName: string): Promise<InlineEditRecord[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".inline_edit_history
     WHERE entity_type = $1 AND entity_id = $2 AND field_name = $3
     ORDER BY created_at DESC LIMIT 50`,
    [entityType, entityId, fieldName]
  );
  return res.rows;
}
