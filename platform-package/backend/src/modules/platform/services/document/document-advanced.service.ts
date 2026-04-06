// ============================================
// Shahin GRC — Document Advanced Service
// Document version control, retention policies,
// approval workflows, access control, and
// full-text search
// Requirements: 12.1–12.5
// ============================================

import { emptyResult, safeQuery, tenantSchema } from "../../../../config/database";
import type { GenericRow } from '../../../../types/db-rows.types';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';

// =============================================
// 12.1 Document Version Control
// =============================================

/**
 * Creates a new version for a document. The version number is
 * auto-incremented based on the highest existing version.
 */
export async function createDocumentVersion(
  tenantId: string,
  documentId: string,
  data: { content: string; change_summary: string; created_by: string }
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  // Determine next version number
  const current = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ max_ver: 0 }]), safeQuery(
    `SELECT COALESCE(MAX(version_number), 0)::int AS max_ver
     FROM "${schema}".document_versions
     WHERE document_id = $1::uuid`,
    [documentId]
  ), { tenantId: tenantId, operation: 'query document_versions' });

  const newVersion = (current.rows[0]?.max_ver || 0) + 1;

  const result = await safeQuery(
    `INSERT INTO "${schema}".document_versions
       (document_id, version_number, content, change_summary, created_by, status)
     VALUES ($1::uuid, $2, $3, $4, $5, 'draft')
     RETURNING *`,
    [documentId, newVersion, data.content, data.change_summary, data.created_by]
  );
  return result.rows[0];
}

/**
 * Retrieves all versions of a document, newest first.
 */
export async function getDocumentVersions(
  tenantId: string,
  documentId: string
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".document_versions
     WHERE document_id = $1::uuid
     ORDER BY version_number DESC`,
    [documentId]
  ), { tenantId: tenantId, operation: 'query document_versions' });
  return result.rows;
}

/**
 * Rolls back a document to a previous version by creating a new version
 * with the content of the specified version number.
 */
export async function rollbackToVersion(
  tenantId: string,
  documentId: string,
  versionNumber: number
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  const version = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT content FROM "${schema}".document_versions
     WHERE document_id = $1::uuid AND version_number = $2`,
    [documentId, versionNumber]
  ), { tenantId: tenantId, operation: 'query document_versions' });

  if (!version.rows[0]) return null;

  return createDocumentVersion(tenantId, documentId, {
    content: version.rows[0].content,
    change_summary: `Rollback to version ${versionNumber}`,
    created_by: "system",
  });
}

/**
 * Checks out a document so that only the requesting user can edit it.
 * Fails silently if the document is already checked out by someone else.
 */
export async function checkOutDocument(
  tenantId: string,
  documentId: string,
  userId: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `UPDATE "${schema}".documents
     SET checked_out_by = $2, checked_out_at = now(), updated_at = now()
     WHERE document_id = $1::uuid AND checked_out_by IS NULL
     RETURNING *`,
    [documentId, userId]
  ), { tenantId: tenantId, operation: 'update documents' });
  return result.rows[0] ?? null;
}

/**
 * Checks in a document, releasing the checkout lock. Only the user
 * who checked it out can check it back in.
 */
export async function checkInDocument(
  tenantId: string,
  documentId: string,
  userId: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `UPDATE "${schema}".documents
     SET checked_out_by = NULL, checked_out_at = NULL, updated_at = now()
     WHERE document_id = $1::uuid AND checked_out_by = $2
     RETURNING *`,
    [documentId, userId]
  ), { tenantId: tenantId, operation: 'update documents' });
  return result.rows[0] ?? null;
}

// =============================================
// 12.2 Document Retention Policy
// =============================================

/**
 * Creates a retention policy for a specific document type.
 */
export async function createRetentionPolicy(
  tenantId: string,
  data: { document_type: string; retention_days: number; action_on_expiry?: string }
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".document_retention_policies
       (document_type, retention_days, action_on_expiry, active)
     VALUES ($1, $2, $3, true)
     RETURNING *`,
    [data.document_type, data.retention_days, data.action_on_expiry || "archive"]
  );
  return result.rows[0];
}

/**
 * Lists all active retention policies ordered by document type.
 */
export async function getRetentionPolicies(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".document_retention_policies
     WHERE active = true
     ORDER BY document_type`
  ), { tenantId: tenantId, operation: 'query document_retention_policies' });
  return result.rows;
}

/**
 * Returns documents that have exceeded their retention period and
 * have not yet been archived.
 */
export async function getDocumentsDueForRetention(
  tenantId: string
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT d.*, rp.retention_days, rp.action_on_expiry,
       d.created_at + (rp.retention_days || ' days')::interval AS retention_due_date
     FROM "${schema}".documents d
     JOIN "${schema}".document_retention_policies rp
       ON rp.document_type = d.document_type
     WHERE rp.active = true
       AND d.created_at + (rp.retention_days || ' days')::interval <= now()
       AND d.archived_at IS NULL`
  ), { tenantId: tenantId, operation: 'query documents' });
  return result.rows;
}

// =============================================
// 12.3 Document Approval Workflow
// =============================================

/**
 * Submits a document for approval with a list of approver user IDs.
 * Each approver starts with a null decision.
 */
export async function submitDocumentForApproval(
  tenantId: string,
  documentId: string,
  approvers: string[],
  submittedBy: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const approversList = approvers.map((a) => ({
    user_id: a,
    decision: null,
  }));

  const result = await safeQuery(
    `INSERT INTO "${schema}".document_approvals
       (document_id, approvers, submitted_by, status)
     VALUES ($1::uuid, $2::jsonb, $3, 'pending')
     RETURNING *`,
    [documentId, JSON.stringify(approversList), submittedBy]
  );
  return result.rows[0];
}

/**
 * Records an individual approver's decision (approved or rejected).
 * When all approvers have decided, the overall status is finalised:
 * - If any approver rejected, the approval is rejected.
 * - If all approvers approved, the document is published.
 */
export async function approveDocument(
  tenantId: string,
  approvalId: string,
  userId: string,
  decision: "approved" | "rejected",
  notes?: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  // Update the specific approver's decision within the JSONB array
  await safeQuery(
    `UPDATE "${schema}".document_approvals
     SET approvers = (
       SELECT jsonb_agg(
         CASE WHEN elem->>'user_id' = $2
         THEN elem || jsonb_build_object(
           'decision', $3,
           'notes', $4,
           'decided_at', now()::text
         )
         ELSE elem END
       ) FROM jsonb_array_elements(approvers) elem
     ), updated_at = now()
     WHERE approval_id = $1::uuid`,
    [approvalId, userId, decision, notes || ""]
  );

  // Fetch the updated approval record
  const result = await safeQuery(
    `SELECT * FROM "${schema}".document_approvals WHERE approval_id = $1::uuid`,
    [approvalId]
  );
  const approval = result.rows[0];
  if (!approval) return null;

  // Check if all approvers have made a decision
  const allDecided = (approval.approvers || []).every(
    (a: GenericRow) => a.decision !== null
  );
  const anyRejected = (approval.approvers || []).some(
    (a: GenericRow) => a.decision === "rejected"
  );

  if (allDecided) {
    const finalStatus = anyRejected ? "rejected" : "approved";
    await safeQuery(
      `UPDATE "${schema}".document_approvals
       SET status = $1, completed_at = now()
       WHERE approval_id = $2::uuid`,
      [finalStatus, approvalId]
    );

    // If fully approved, publish the document
    if (finalStatus === "approved") {
      await safeQuery(
        `UPDATE "${schema}".documents
         SET status = 'published', published_at = now()
         WHERE document_id = $1::uuid`,
        [approval.document_id]
      );
    }
    approval.status = finalStatus;
  }

  return approval;
}

/**
 * Lists approval records, optionally filtered by document ID.
 */
export async function getDocumentApprovals(
  tenantId: string,
  documentId?: string
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".document_approvals`;
  const params: unknown[] = [];

  if (documentId) {
    sql += ` WHERE document_id = $1::uuid`;
    params.push(documentId);
  }
  sql += ` ORDER BY created_at DESC`;

  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(sql, params), { tenantId: tenantId, operation: 'query document_approvals' });
  return result.rows;
}

// =============================================
// 12.4 Document Access Control
// =============================================

/**
 * Replaces all access rules for a document with the provided set.
 * Each rule specifies a principal (user, role, or team) and a
 * permission level (none, view, comment, edit, admin).
 */
export async function setDocumentAccess(
  tenantId: string,
  documentId: string,
  accessRules: Array<{
    principal_type: string;
    principal_id: string;
    permission_level: string;
  }>
): Promise<{ document_id: string; rules_set: number }> {
  const schema = tenantSchema(tenantId);

  // Remove existing rules
  await safeQuery(
    `DELETE FROM "${schema}".document_access_rules WHERE document_id = $1::uuid`,
    [documentId]
  );

  // Insert new rules
  for (const rule of accessRules) {
    await safeQuery(
      `INSERT INTO "${schema}".document_access_rules
         (document_id, principal_type, principal_id, permission_level)
       VALUES ($1::uuid, $2, $3, $4)`,
      [documentId, rule.principal_type, rule.principal_id, rule.permission_level]
    );
  }

  return { document_id: documentId, rules_set: accessRules.length };
}

/**
 * Retrieves all access rules for a document.
 */
export async function getDocumentAccess(
  tenantId: string,
  documentId: string
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".document_access_rules
     WHERE document_id = $1::uuid`,
    [documentId]
  ), { tenantId: tenantId, operation: 'query document_access_rules' });
  return result.rows;
}

/**
 * Checks whether a user has at least the required permission level
 * on a document. Evaluates both direct user grants and role-based
 * grants via team_members.
 */
export async function checkDocumentAccess(
  tenantId: string,
  documentId: string,
  userId: string,
  requiredLevel: string
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const levelHierarchy = ["none", "view", "comment", "edit", "admin"];

  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT permission_level FROM "${schema}".document_access_rules
     WHERE document_id = $1::uuid AND (
       (principal_type = 'user' AND principal_id = $2) OR
       (principal_type = 'role' AND principal_id IN (
         SELECT role FROM "${schema}".team_members WHERE user_id = $2
       ))
     )
     ORDER BY array_position(
       ARRAY['none','view','comment','edit','admin'], permission_level
     ) DESC
     LIMIT 1`,
    [documentId, userId]
  ), { tenantId: tenantId, operation: 'query document_access_rules' });

  const userLevel = result.rows[0]?.permission_level || "none";
  return (
    levelHierarchy.indexOf(userLevel) >= levelHierarchy.indexOf(requiredLevel)
  );
}

// =============================================
// 12.5 Full-Text Search (PostgreSQL tsvector)
// =============================================

/**
 * Searches documents using PostgreSQL full-text search. Results are
 * ranked by relevance using ts_rank.
 */
export async function searchDocuments(
  tenantId: string,
  searchQuery: string,
  limit?: number
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT document_id, title, document_type, status,
       ts_rank(
         to_tsvector('english', COALESCE(title,'') || ' ' || COALESCE(content,'')),
         plainto_tsquery('english', $1)
       ) AS rank
     FROM "${schema}".documents
     WHERE to_tsvector('english', COALESCE(title,'') || ' ' || COALESCE(content,''))
       @@ plainto_tsquery('english', $1)
     ORDER BY rank DESC
     LIMIT $2`,
    [searchQuery, limit || 20]
  ), { tenantId: tenantId, operation: 'query documents' });
  return result.rows;
}
