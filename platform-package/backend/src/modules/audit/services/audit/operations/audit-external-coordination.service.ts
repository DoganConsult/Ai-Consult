// ============================================
// Shahin — Audit External Coordination Service
// Managing external auditor engagements
// Table: external_audit_coordination
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from "../../../../../config/database";
import { getFirstRow } from '../../../../../utils/db-utils';

// ── List all coordinations ───────────────────────────────────────────

export async function listCoordinations(tenantId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".external_audit_coordination
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`
  );
  return result.rows;
}

// ── Create a new coordination record ─────────────────────────────────

export async function createCoordination(tenantId: string, data: {
  audit_id: string;
  firm_name: string;
  contact_name?: string;
  contact_email?: string;
  engagement_type?: string;
  scope_description?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  notes?: string;
}) {
  const s = tenantSchema(tenantId);
  const coordId = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".external_audit_coordination
       (coordination_id, audit_id, firm_name, contact_name, contact_email,
        engagement_type, scope_description, start_date, end_date, status, notes, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW()) RETURNING *`,
    [coordId, data.audit_id, data.firm_name, data.contact_name || null,
     data.contact_email || null, data.engagement_type || 'external',
     data.scope_description || null, data.start_date || null,
     data.end_date || null, data.status || 'planned', data.notes || null]
  );
  return getFirstRow(result);
}

// ── Update a coordination record ─────────────────────────────────────

export async function updateCoordination(tenantId: string, id: string, data: Record<string, any>): Promise<any> {
  const s = tenantSchema(tenantId);
  const allowed = ['firm_name', 'contact_name', 'contact_email', 'engagement_type',
    'scope_description', 'start_date', 'end_date', 'status', 'notes'];
  const cols = Object.keys(data).filter(k => allowed.includes(k));
  if (!cols.length) throw new Error("No valid fields to update");
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = cols.map(c => data[c]);
  const result = await safeQuery(
    `UPDATE "${s}".external_audit_coordination
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE coordination_id = $1 AND deleted_at IS NULL RETURNING *`,
    [id, ...vals]
  );
  if (!getFirstRow(result)) throw new Error("Coordination record not found");
  return getFirstRow(result);
}

// ── Get coordinations by audit ───────────────────────────────────────

export async function getByAudit(tenantId: string, auditId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".external_audit_coordination
     WHERE audit_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [auditId]
  );
  return result.rows;
}

// ── Delete a coordination record (soft delete) ───────────────────────

export async function deleteCoordination(tenantId: string, id: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${s}".external_audit_coordination
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE coordination_id = $1 AND deleted_at IS NULL RETURNING coordination_id`,
    [id]
  );
  return result.rows.length > 0;
}
