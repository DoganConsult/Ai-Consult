// @ts-nocheck
// ============================================
// Shahin — Audit Templates Service
// Reusable audit program templates
// Table: audit_templates
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from "../../../../../config/database";
import { getFirstRow } from '../../../../../utils/db-utils';

// ── List all templates ───────────────────────────────────────────────

export async function listTemplates(tenantId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audit_templates
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`
  );
  return result.rows;
}

// ── Create a template ────────────────────────────────────────────────

export async function createTemplate(tenantId: string, data: {
  template_name: string;
  audit_type?: string;
  description?: string;
  scope_template?: string;
  methodology?: string;
  checklist?: object;
  default_duration_days?: number;
  created_by?: string;
}) {
  const s = tenantSchema(tenantId);
  const templateId = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".audit_templates
       (template_id, template_name, audit_type, description, scope_template,
        methodology, checklist, default_duration_days, created_by, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW()) RETURNING *`,
    [templateId, data.template_name, data.audit_type || 'internal',
     data.description || null, data.scope_template || null,
     data.methodology || null, data.checklist ? JSON.stringify(data.checklist) : null,
     data.default_duration_days || null, data.created_by || null]
  );
  return getFirstRow(result);
}

// ── Update a template ────────────────────────────────────────────────

export async function updateTemplate(tenantId: string, id: string, data: Record<string, any>): Promise<any> {
  const s = tenantSchema(tenantId);
  const allowed = ['template_name', 'audit_type', 'description', 'scope_template',
    'methodology', 'checklist', 'default_duration_days'];
  const cols = Object.keys(data).filter(k => allowed.includes(k));
  if (!cols.length) throw new Error("No valid fields to update");

  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = cols.map(c => c === 'checklist' && typeof data[c] === 'object'
    ? JSON.stringify(data[c]) : data[c]);

  const result = await safeQuery(
    `UPDATE "${s}".audit_templates
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE template_id = $1 AND deleted_at IS NULL RETURNING *`,
    [id, ...vals]
  );
  if (!getFirstRow(result)) throw new Error("Template not found");
  return getFirstRow(result);
}

// ── Delete a template (soft delete) ──────────────────────────────────

export async function deleteTemplate(tenantId: string, id: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${s}".audit_templates
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE template_id = $1 AND deleted_at IS NULL RETURNING template_id`,
    [id]
  );
  return result.rows.length > 0;
}

// ── Get template by ID ──────────────────────────────────────────────

export async function getTemplateById(tenantId: string, id: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audit_templates
     WHERE template_id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return getFirstRow(result) || null;
}

// ── Apply template to an audit ───────────────────────────────────────

export async function applyTemplate(tenantId: string, templateId: string, auditId: string): Promise<any> {
  const s = tenantSchema(tenantId);

  const template = await safeQuery(
    `SELECT * FROM "${s}".audit_templates
     WHERE template_id = $1 AND deleted_at IS NULL`,
    [templateId]
  );
  if (!getFirstRow(template)) throw new Error("Template not found");

  const t = getFirstRow(template);

  // Calculate planned_end from default_duration_days if available
  const durationClause = t.default_duration_days
    ? `, planned_end = COALESCE(planned_end, planned_start + ($6 || ' days')::interval)`
    : '';
  const durationParams = t.default_duration_days ? [t.default_duration_days] : [];

  const result = await safeQuery(
    `UPDATE "${s}".audits
     SET audit_type = COALESCE($2, audit_type),
         scope = COALESCE($3, scope),
         methodology = COALESCE($4, methodology),
         description = COALESCE($5, description)
         ${durationClause},
         updated_at = NOW()
     WHERE audit_id = $1 AND deleted_at IS NULL RETURNING *`,
    [auditId, t.audit_type, t.scope_template, t.methodology, t.description, ...durationParams]
  );
  if (!getFirstRow(result)) throw new Error("Audit not found");
  return getFirstRow(result);
}
