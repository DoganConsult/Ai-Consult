// @ts-nocheck
// Shahin - Comment Service (threaded comments on any GRC entity)
import { safeQuery, tenantSchema } from '../../../config/database';
import { getFirstRow } from '../../../utils/db-utils';

export interface Comment {
  comment_id: string;
  entity_type: string;
  entity_id: string;
  author_id: string;
  content: string;
  parent_comment_id: string | null;
  mentions: string[];
  created_at: string;
  updated_at: string;
}

/** Extract @mentions from comment content */
export function extractMentions(content: string): string[] {
  const matches = content.match(/@(\w+)/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(1)))];
}

/** Create a comment on any entity */
export async function createComment(tenantId: string, data: {
  entity_type: string; entity_id: string; author_id: string;
  content: string; parent_comment_id?: string;
}): Promise<Comment> {
  const schema = tenantSchema(tenantId);
  const mentions = extractMentions(data.content);
  const res = await safeQuery(
    `INSERT INTO "${schema}".comments (entity_type, entity_id, author_id, content, parent_comment_id, mentions)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.entity_type, data.entity_id, data.author_id, data.content, data.parent_comment_id || null, mentions]
  );
  return getFirstRow(res);
}

/** Get comments for an entity (threaded) */
export async function getComments(tenantId: string, entityType: string, entityId: string): Promise<Comment[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".comments WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at ASC`,
    [entityType, entityId]
  );
  return res.rows;
}

/** Get all comments for an entity type (no specific entity) */
export async function getCommentsByType(tenantId: string, entityType: string): Promise<Comment[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".comments WHERE entity_type = $1 ORDER BY created_at DESC LIMIT 100`,
    [entityType]
  );
  return res.rows;
}

/** Update a comment */
export async function updateComment(tenantId: string, commentId: string, content: string): Promise<Comment | null> {
  const schema = tenantSchema(tenantId);
  const mentions = extractMentions(content);
  const res = await safeQuery(
    `UPDATE "${schema}".comments SET content = $1, mentions = $2, updated_at = NOW() WHERE comment_id = $3 RETURNING *`,
    [content, mentions, commentId]
  );
  return getFirstRow(res) || null;
}

/** Delete a comment */
export async function deleteComment(tenantId: string, commentId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(`DELETE FROM "${schema}".comments WHERE comment_id = $1`, [commentId]);
  return (res.rowCount ?? 0) > 0;
}
