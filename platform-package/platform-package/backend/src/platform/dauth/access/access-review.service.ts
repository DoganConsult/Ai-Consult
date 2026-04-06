// @ts-nocheck
/**
 * DAuth Access Reviews — manages access review campaigns and items.
 * Tables: access_review_campaigns, access_review_items
 */
import { safeQuery, tenantSchema } from '../../../config/database/database';
import type { GenericRow } from '../../../types/db-rows.types';
import { getFirstRow } from '../../../shared/data/db-utils';

// ── access_review_campaigns ──

export async function listCampaigns(tenantId: string, filters: { status?: string; page?: number; pageSize?: number } = {}): Promise<{ rows: GenericRow[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let idx = 1;
  if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
  const where = 'WHERE ' + conditions.join(' AND ');
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".access_review_campaigns ${where}`, params);
  const total = getFirstRow(countResult)?.total ?? 0;
  const dataResult = await safeQuery(
    `SELECT * FROM "${schema}".access_review_campaigns ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, pageSize, (page - 1) * pageSize],
  );
  return { rows: dataResult.rows, total };
}

export async function getCampaignById(tenantId: string, campaignId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".access_review_campaigns WHERE campaign_id = $1 AND deleted_at IS NULL`, [campaignId]);
  return getFirstRow(result);
}

export async function createCampaign(tenantId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".access_review_campaigns (title, description, scope, status, due_date, created_by)
     VALUES ($1, $2, $3, 'draft', $4, $5) RETURNING *`,
    [data.title, data.description, data.scope, data.due_date, data.created_by],
  );
  return getFirstRow(result);
}

export async function updateCampaignStatus(tenantId: string, campaignId: string, status: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".access_review_campaigns SET status = $2, updated_at = NOW()
     WHERE campaign_id = $1 AND deleted_at IS NULL RETURNING *`,
    [campaignId, status],
  );
  return getFirstRow(result);
}

// ── access_review_items ──

export async function listReviewItems(tenantId: string, campaignId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".access_review_items WHERE campaign_id = $1 ORDER BY created_at`, [campaignId]);
  return result.rows;
}

export async function createReviewItem(tenantId: string, campaignId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".access_review_items (campaign_id, user_id, role_id, access_profile_id, decision, reviewer_id)
     VALUES ($1, $2, $3, $4, 'pending', $5) RETURNING *`,
    [campaignId, data.user_id, data.role_id, data.access_profile_id, data.reviewer_id],
  );
  return getFirstRow(result);
}

export async function decideReviewItem(
  tenantId: string, itemId: string, decision: 'approved' | 'revoked' | 'modified', reviewerId: string, notes?: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".access_review_items SET decision = $2, reviewer_id = $3, notes = $4, decided_at = NOW(), updated_at = NOW()
     WHERE item_id = $1 RETURNING *`,
    [itemId, decision, reviewerId, notes],
  );
  return getFirstRow(result);
}
