// ============================================
// Shahin — Audit Working Papers Service
// Fieldwork document management
// Table: audit_working_papers
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from "../../../../../config/database";
import { getFirstRow } from '../../../../../utils/db-utils';

// ── List papers for an audit ────────────────────────────────────────

export async function listPapers(tenantId: string, auditId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audit_working_papers
     WHERE audit_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [auditId]
  );
  return result.rows;
}

// ── Create working paper ────────────────────────────────────────────

export async function createPaper(tenantId: string, data: {
  audit_id: string; title: string; description?: string;
  paper_type?: string; reference_code?: string; prepared_by?: string;
  file_path?: string; content?: string;
}) {
  const s = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".audit_working_papers
       (id, audit_id, title, description, paper_type, reference_code,
        prepared_by, file_path, content, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft')
     RETURNING *`,
    [id, data.audit_id, data.title, data.description || null,
     data.paper_type || null, data.reference_code || null,
     data.prepared_by || null, data.file_path || null, data.content || null]
  );
  return getFirstRow(result);
}

// ── Update working paper ────────────────────────────────────────────

export async function updatePaper(tenantId: string, id: string, data: Record<string, any>): Promise<any> {
  const s = tenantSchema(tenantId);
  const allowed = ['title', 'description', 'paper_type', 'reference_code',
    'file_path', 'content', 'prepared_by'];
  const cols = Object.keys(data).filter(k => allowed.includes(k));
  if (!cols.length) throw new Error("No valid fields to update");
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = cols.map(c => data[c]);
  const result = await safeQuery(
    `UPDATE "${s}".audit_working_papers
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [id, ...vals]
  );
  if (!getFirstRow(result)) throw new Error("Working paper not found");
  return getFirstRow(result);
}

// ── Submit paper for review ─────────────────────────────────────────

export async function submitForReview(tenantId: string, id: string, reviewerId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${s}".audit_working_papers
     SET status = 'in_review', reviewer_id = $2, submitted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [id, reviewerId]
  );
  if (!getFirstRow(result)) throw new Error("Working paper not found");
  return getFirstRow(result);
}

// ── Approve paper ───────────────────────────────────────────────────

export async function approvePaper(tenantId: string, id: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${s}".audit_working_papers
     SET status = 'approved', approved_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [id]
  );
  if (!getFirstRow(result)) throw new Error("Working paper not found");
  return getFirstRow(result);
}
