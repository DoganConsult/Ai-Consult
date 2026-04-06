// @ts-nocheck
// ============================================================================
// Shahin — Document Management Service
// Versioned document store with review workflows and retention tracking.
// ============================================================================

import { createHash } from "crypto";
import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from "../../../../config/database";
import { eventBus } from '../event/event-bus.service';
import { getFirstRow } from '../../../../utils/db-utils';

export interface DocumentRecord {
  doc_id: string;
  title: string;
  doc_type: string;
  version: number;
  status: string;
  owner_id: string | null;
  dept_id: string | null;
  classification: string;
  file_path: string | null;
  content_hash: string | null;
  review_date: string | null;
  created_at: string;
}

export async function listDocuments(
  tenantId: string,
  filters?: { status?: string; doc_type?: string; owner_id?: string; dept_id?: string; search?: string }
): Promise<DocumentRecord[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".documents WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.status) { sql += ` AND status = $${idx++}`; params.push(filters.status); }
  if (filters?.doc_type) { sql += ` AND doc_type = $${idx++}`; params.push(filters.doc_type); }
  if (filters?.owner_id) { sql += ` AND owner_id = $${idx++}`; params.push(filters.owner_id); }
  if (filters?.dept_id) { sql += ` AND dept_id = $${idx++}`; params.push(filters.dept_id); }
  if (filters?.search) { sql += ` AND title ILIKE $${idx++}`; params.push(`%${filters.search}%`); }

  sql += ` ORDER BY updated_at DESC LIMIT 500`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

export async function getDocumentById(tenantId: string, docId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  const [docRes, versionsRes, reviewsRes] = await Promise.all([
    safeQuery(`SELECT * FROM "${schema}".documents WHERE doc_id = $1 AND deleted_at IS NULL`, [docId]),
    safeQuery(`SELECT * FROM "${schema}".document_versions WHERE doc_id = $1 ORDER BY version_number DESC`, [docId]),
    safeQuery(`SELECT * FROM "${schema}".document_reviews WHERE doc_id = $1 ORDER BY created_at DESC`, [docId]),
  ]);

  if (docRes.rows.length === 0) return null;

  return {
    ...getFirstRow(docRes),
    versions: versionsRes.rows,
    reviews: reviewsRes.rows,
  };
}

export async function createDocument(
  tenantId: string,
  data: {
    title: string;
    doc_type?: string;
    owner_id?: string;
    dept_id?: string;
    classification?: string;
    file_path?: string;
    file_size_bytes?: number;
    content?: string;
    retention_until?: string;
    review_date?: string;
    tags?: string[];
    metadata?: Record<string, any>;
    created_by: string;
  }
): Promise<DocumentRecord> {
  const schema = tenantSchema(tenantId);
  const docId = uuid();
  const contentHash = data.content
    ? createHash("sha256").update(data.content).digest("hex")
    : null;

  const result = await safeQuery(
    `INSERT INTO "${schema}".documents
      (doc_id, tenant_id, title, doc_type, version, status, owner_id, dept_id,
       classification, file_path, file_size_bytes, content_hash,
       retention_until, review_date, tags, metadata, created_by)
     VALUES ($1, $2, $3, $4, 1, 'draft', $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15)
     RETURNING *`,
    [
      docId, tenantId, data.title, data.doc_type || "general",
      data.owner_id || null, data.dept_id || null,
      data.classification || "internal",
      data.file_path || null, data.file_size_bytes || null, contentHash,
      data.retention_until || null, data.review_date || null,
      JSON.stringify(data.tags || []), JSON.stringify(data.metadata || {}),
      data.created_by,
    ]
  );

  // Create initial version
  await safeQuery(
    `INSERT INTO "${schema}".document_versions
      (doc_id, version_number, change_summary, file_path, content_hash, created_by)
     VALUES ($1, 1, 'Initial version', $2, $3, $4)`,
    [docId, data.file_path || null, contentHash, data.created_by]
  );

  eventBus.publish({
    eventType: "document.created",
    tenantId,
    sourceService: "DocumentManagement",
    severity: "info",
    entityType: "document",
    entityId: docId,
    payload: { title: data.title, doc_type: data.doc_type },
  });

  return getFirstRow(result);
}

export async function updateDocument(
  tenantId: string,
  docId: string,
  data: {
    title?: string;
    status?: string;
    owner_id?: string;
    classification?: string;
    file_path?: string;
    file_size_bytes?: number;
    content?: string;
    review_date?: string;
    change_summary?: string;
    updated_by: string;
  }
): Promise<DocumentRecord | null> {
  const schema = tenantSchema(tenantId);

  // Get current version
  const current = await safeQuery(
    `SELECT version FROM "${schema}".documents WHERE doc_id = $1 AND deleted_at IS NULL`,
    [docId]
  );
  if (current.rows.length === 0) return null;

  const newVersion = (getFirstRow(current)?.version || 1) + 1;
  const contentHash = data.content
    ? createHash("sha256").update(data.content).digest("hex")
    : null;

  const result = await safeQuery(
    `UPDATE "${schema}".documents SET
       title = COALESCE($1, title),
       status = COALESCE($2, status),
       owner_id = COALESCE($3, owner_id),
       classification = COALESCE($4, classification),
       file_path = COALESCE($5, file_path),
       file_size_bytes = COALESCE($6, file_size_bytes),
       content_hash = COALESCE($7, content_hash),
       review_date = COALESCE($8, review_date),
       version = $9,
       updated_at = NOW()
     WHERE doc_id = $10 AND deleted_at IS NULL
     RETURNING *`,
    [
      data.title || null, data.status || null, data.owner_id || null,
      data.classification || null, data.file_path || null,
      data.file_size_bytes || null, contentHash, data.review_date || null,
      newVersion, docId,
    ]
  );
  if (result.rows.length === 0) return null;

  // Record version
  await safeQuery(
    `INSERT INTO "${schema}".document_versions
      (doc_id, version_number, change_summary, file_path, content_hash, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [docId, newVersion, data.change_summary || "Updated", data.file_path || null, contentHash, data.updated_by]
  );

  return getFirstRow(result);
}

export async function createDocumentReview(
  tenantId: string,
  docId: string,
  data: { reviewer_id: string; status: string; comments?: string }
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `INSERT INTO "${schema}".document_reviews
      (doc_id, reviewer_id, status, comments, reviewed_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING *`,
    [docId, data.reviewer_id, data.status, data.comments || null]
  );

  // Auto-update document status based on review
  if (data.status === "approved") {
    await safeQuery(
      `UPDATE "${schema}".documents SET status = 'published', updated_at = NOW() WHERE doc_id = $1`,
      [docId]
    );
  } else if (data.status === "rejected") {
    await safeQuery(
      `UPDATE "${schema}".documents SET status = 'draft', updated_at = NOW() WHERE doc_id = $1`,
      [docId]
    );
  }

  return getFirstRow(result);
}

export async function archiveDocument(tenantId: string, docId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".documents SET status = 'archived', deleted_at = NOW(), updated_at = NOW()
     WHERE doc_id = $1 AND deleted_at IS NULL RETURNING doc_id`,
    [docId]
  );
  return result.rows.length > 0;
}
