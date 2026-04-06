// @ts-nocheck
// ============================================
// Shahin — Audit Universe Service
// CRUD for auditable entities registry
// Table: audit_universe
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from "../../../../../config/database";
import { getFirstRow } from '../../../../../utils/db-utils';
import { swallowEmpty, EC } from '../../../../../utils/resilient-catch';

// ── List all auditable entities ─────────────────────────────────────

export async function listUniverse(tenantId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audit_universe
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`
  );
  return result.rows;
}

// ── Get single entity by ID ─────────────────────────────────────────

export async function getUniverseEntityById(tenantId: string, id: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audit_universe
     WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return getFirstRow(result) || null;
}

// ── Create auditable entity ─────────────────────────────────────────

export async function createUniverseEntity(tenantId: string, data: {
  name: string; entity_type?: string; description?: string;
  owner_id?: string; risk_rating?: string; last_audited_at?: string;
  audit_frequency_months?: number; department?: string; priority?: string;
}) {
  const s = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".audit_universe
       (id, name, entity_type, description, owner_id, risk_rating,
        last_audited_at, audit_frequency_months, department, priority)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [id, data.name, data.entity_type || null, data.description || null,
     data.owner_id || null, data.risk_rating || null,
     data.last_audited_at || null, data.audit_frequency_months || null,
     data.department || null, data.priority || null]
  );
  return getFirstRow(result);
}

// ── Update auditable entity ─────────────────────────────────────────

export async function updateUniverseEntity(tenantId: string, id: string, data: Record<string, any>): Promise<any> {
  const s = tenantSchema(tenantId);
  const allowed = ['name', 'entity_type', 'description', 'owner_id', 'risk_rating',
    'last_audited_at', 'audit_frequency_months', 'department', 'priority'];
  const cols = Object.keys(data).filter(k => allowed.includes(k));
  if (!cols.length) throw new Error("No valid fields to update");
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = cols.map(c => data[c]);
  const result = await safeQuery(
    `UPDATE "${s}".audit_universe
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [id, ...vals]
  );
  if (!getFirstRow(result)) throw new Error("Universe entity not found");
  return getFirstRow(result);
}

// ── List with foundation org context ─────────────────────────────────

export async function listUniverseWithFoundation(tenantId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT u.*,
         bu.name AS business_unit_name,
         dept.name AS department_name,
         loc.name AS location_name
       FROM "${s}".audit_universe u
       LEFT JOIN "${s}".business_units bu ON bu.id::text = u.business_unit_id AND bu.deleted_at IS NULL
       LEFT JOIN "${s}".departments dept ON dept.id::text = u.department_id AND dept.deleted_at IS NULL
       LEFT JOIN "${s}".locations loc ON loc.id::text = u.location_id AND loc.deleted_at IS NULL
       WHERE u.deleted_at IS NULL
       ORDER BY u.created_at DESC`
    );
    return result.rows;
  } catch {
    // Fallback if linking columns don't exist yet
    return listUniverse(tenantId);
  }
}

// ── Get foundation org structure for linking ────────────────────────

export async function getFoundationEntities(tenantId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const safeList = (q: string) => safeQuery(q).then(r => r.rows).catch(() => [] as any[]);
  const [businessUnits, departments, locations] = await Promise.all([
    safeList(`SELECT id, name FROM "${s}".business_units WHERE deleted_at IS NULL ORDER BY name`),
    safeList(`SELECT id, name FROM "${s}".departments WHERE deleted_at IS NULL ORDER BY name`),
    safeList(`SELECT id, name FROM "${s}".locations WHERE deleted_at IS NULL ORDER BY name`),
  ]);
  return { businessUnits, departments, locations };
}

// ── Link universe entity to foundation org ──────────────────────────

export async function linkUniverseToFoundation(tenantId: string, id: string, data: {
  business_unit_id?: string; department_id?: string; location_id?: string;
}) {
  const s = tenantSchema(tenantId);
  const sets: string[] = [];
  const vals: any[] = [id];
  let idx = 2;
  if (data.business_unit_id !== undefined) { sets.push(`business_unit_id = $${idx++}`); vals.push(data.business_unit_id || null); }
  if (data.department_id !== undefined) { sets.push(`department_id = $${idx++}`); vals.push(data.department_id || null); }
  if (data.location_id !== undefined) { sets.push(`location_id = $${idx++}`); vals.push(data.location_id || null); }
  if (!sets.length) throw new Error("No foundation link fields provided");
  const result = await safeQuery(
    `UPDATE "${s}".audit_universe
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    vals
  );
  if (!getFirstRow(result)) throw new Error("Universe entity not found");
  return getFirstRow(result);
}

// ── Soft-delete auditable entity ────────────────────────────────────

export async function deleteUniverseEntity(tenantId: string, id: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${s}".audit_universe
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [id]
  );
  return result.rows.length > 0;
}
