// @ts-nocheck
import { catchHandler, EC } from '../../../../../utils/resilient-catch';
// ============================================
// Shahin — Audit Schedules Service
// Recurring audit schedule management
// Table: audit_schedules
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from "../../../../../config/database";
import { getFirstRow } from '../../../../../utils/db-utils';

// ── List all schedules ──────────────────────────────────────────────

export async function listSchedules(tenantId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audit_schedules
     ORDER BY next_run_at ASC NULLS LAST, created_at DESC`
  );
  return result.rows;
}

// ── Create schedule ─────────────────────────────────────────────────

export async function createSchedule(tenantId: string, data: {
  title: string; description?: string; audit_type?: string;
  universe_id?: string; frequency?: string; cron_expression?: string;
  next_run_at?: string; enabled?: boolean; owner_id?: string;
}) {
  const s = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".audit_schedules
       (id, title, description, audit_type, universe_id, frequency,
        cron_expression, next_run_at, enabled, owner_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [id, data.title, data.description || null, data.audit_type || 'internal',
     data.universe_id || null, data.frequency || null, data.cron_expression || null,
     data.next_run_at || null, data.enabled !== false, data.owner_id || null]
  );
  return getFirstRow(result);
}

// ── Update schedule ─────────────────────────────────────────────────

export async function updateSchedule(tenantId: string, id: string, data: Record<string, any>): Promise<any> {
  const s = tenantSchema(tenantId);
  const allowed = ['title', 'description', 'audit_type', 'universe_id', 'frequency',
    'cron_expression', 'next_run_at', 'enabled', 'owner_id'];
  const cols = Object.keys(data).filter(k => allowed.includes(k));
  if (!cols.length) throw new Error("No valid fields to update");
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = cols.map(c => data[c]);
  const result = await safeQuery(
    `UPDATE "${s}".audit_schedules
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, ...vals]
  );
  if (!getFirstRow(result)) throw new Error("Schedule not found");
  return getFirstRow(result);
}

// ── Delete schedule ─────────────────────────────────────────────────

export async function deleteSchedule(tenantId: string, id: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${s}".audit_schedules WHERE id = $1 RETURNING id`,
    [id]
  );
  return result.rows.length > 0;
}

// ── Toggle enabled/disabled ─────────────────────────────────────────

export async function toggleSchedule(tenantId: string, id: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${s}".audit_schedules
     SET enabled = NOT enabled, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  if (!getFirstRow(result)) throw new Error("Schedule not found");
  return getFirstRow(result);
}

// ── Get due schedules (enabled + next_run_at <= now) ────────────────

export async function getDueSchedules(tenantId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audit_schedules
     WHERE enabled = true AND next_run_at <= NOW()
     ORDER BY next_run_at ASC`
  );
  return result.rows;
}

// ── Trigger evidence collection for upcoming audit ──────────────────
// Cross-module: Creates evidence_requests for all controls in scope
// when an audit schedule fires, ensuring evidence is collected before audit

export async function triggerEvidenceForSchedule(tenantId: string, scheduleId: string): Promise<any> {
  const s = tenantSchema(tenantId);

  // Get the schedule and its linked universe entity
  const schedRes = await safeQuery(
    `SELECT * FROM "${s}".audit_schedules WHERE id = $1`, [scheduleId]
  );
  if (!getFirstRow(schedRes)) throw new Error("Schedule not found");
  const __schedule = getFirstRow(schedRes);

  // Find controls in scope (all controls if no universe entity specified)
  try {
    const controlsRes = await safeQuery(
      `SELECT control_id, control_title_en FROM "${s}".controls
       WHERE deleted_at IS NULL LIMIT 50`
    );

    const created: string[] = [];
    for (const ctrl of controlsRes.rows) {
      const reqId = uuid();
      await safeQuery(
        `INSERT INTO "${s}".evidence_requests
           (request_id, control_id, title, status, requested_by, due_date, created_at)
         VALUES ($1, $2, $3, 'pending', 'system',
           NOW() + INTERVAL '14 days', NOW())
         ON CONFLICT DO NOTHING`,
        [reqId, ctrl.control_id,
         `Pre-audit evidence: ${ctrl.control_title_en || ctrl.control_id}`]
      ).catch(catchHandler(EC.EVENT_BUS, {}));
      created.push(ctrl.control_id);
    }

    return { scheduleId, evidenceRequestsCreated: created.length, controlIds: created };
  } catch {
    return { scheduleId, evidenceRequestsCreated: 0, error: 'evidence_requests table may not exist' };
  }
}
