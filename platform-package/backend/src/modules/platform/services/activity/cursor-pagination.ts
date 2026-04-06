/**
 * Cursor-Based Pagination for Activity Feeds
 *
 * Efficient keyset pagination using composite (created_at, id) cursors.
 * Avoids OFFSET-based pagination performance issues on large datasets.
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

// ─── Cursor Encoding/Decoding ────────────────────────────────

/**
 * Encode a cursor from an activity's id and createdAt timestamp.
 * Uses base64 encoding of a JSON payload.
 */
export function encodeCursor(data: { id: string; createdAt: string }): string {
  return Buffer.from(JSON.stringify({ id: data.id, ts: data.createdAt })).toString('base64url');
}

/**
 * Decode a cursor string back to id and createdAt.
 * Returns null if the cursor is malformed or invalid.
 */
export function decodeCursor(cursor: string): { id: string; createdAt: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
    if (decoded && typeof decoded.id === 'string' && typeof decoded.ts === 'string') {
      return { id: decoded.id, createdAt: decoded.ts };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Paginated Queries ───────────────────────────────────────

/**
 * Paginate the full activity feed for a tenant using cursor-based pagination.
 * Direction 'older' fetches entries older than cursor; 'newer' fetches entries newer.
 */
export async function paginateActivitiesWithCursor(
  tenantId: string,
  opts: {
    cursor?: string;
    limit?: number;
    direction?: 'newer' | 'older';
  }
): Promise<{ items: any[]; nextCursor: string | null; hasMore: boolean }> {
  const schema = tenantSchema(tenantId);
  const limit = Math.min(opts.limit ?? 50, 200);
  const direction = opts.direction ?? 'older';
  const fetchLimit = limit + 1; // fetch one extra to determine hasMore

  let cursorData: { id: string; createdAt: string } | null = null;
  if (opts.cursor) {
    cursorData = decodeCursor(opts.cursor);
  }

  try {
    let result;

    if (cursorData) {
      const operator = direction === 'older' ? '<' : '>';
      const order = direction === 'older' ? 'DESC' : 'ASC';

      result = await safeQuery(
        `SELECT id, user_id, module, action, entity_type, entity_id, metadata,
                is_read, archived, snoozed_until, created_at
         FROM "${schema}".activity_feed
         WHERE (created_at, id) ${operator} ($1, $2)
         ORDER BY created_at ${order}, id ${order}
         LIMIT $3`,
        [cursorData.createdAt, cursorData.id, fetchLimit]
      );
    } else {
      const order = direction === 'older' ? 'DESC' : 'ASC';
      result = await safeQuery(
        `SELECT id, user_id, module, action, entity_type, entity_id, metadata,
                is_read, archived, snoozed_until, created_at
         FROM "${schema}".activity_feed
         ORDER BY created_at ${order}, id ${order}
         LIMIT $1`,
        [fetchLimit]
      );
    }

    const rows = result.rows;
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = encodeCursor({
        id: lastItem.id,
        createdAt: lastItem.created_at instanceof Date
          ? lastItem.created_at.toISOString()
          : String(lastItem.created_at),
      });
    }

    return { items, nextCursor, hasMore };
  } catch (err) {
    logger.error(`[CursorPagination] Failed to paginate activities for tenant=${tenantId}: ${(err as Error).message}`);
    return { items: [], nextCursor: null, hasMore: false };
  }
}

/**
 * Paginate the activity feed for a specific user using cursor-based pagination.
 * Excludes archived and currently snoozed entries from the feed.
 */
export async function getActivityFeedPaginated(
  tenantId: string,
  userId: string,
  opts: { cursor?: string; limit?: number }
): Promise<{ items: any[]; nextCursor: string | null; hasMore: boolean }> {
  const schema = tenantSchema(tenantId);
  const limit = Math.min(opts.limit ?? 50, 200);
  const fetchLimit = limit + 1;

  let cursorData: { id: string; createdAt: string } | null = null;
  if (opts.cursor) {
    cursorData = decodeCursor(opts.cursor);
  }

  try {
    let result;

    if (cursorData) {
      result = await safeQuery(
        `SELECT id, user_id, module, action, entity_type, entity_id, metadata,
                is_read, archived, snoozed_until, created_at
         FROM "${schema}".activity_feed
         WHERE user_id = $1
           AND archived = false
           AND (snoozed_until IS NULL OR snoozed_until <= NOW())
           AND (created_at, id) < ($2, $3)
         ORDER BY created_at DESC, id DESC
         LIMIT $4`,
        [userId, cursorData.createdAt, cursorData.id, fetchLimit]
      );
    } else {
      result = await safeQuery(
        `SELECT id, user_id, module, action, entity_type, entity_id, metadata,
                is_read, archived, snoozed_until, created_at
         FROM "${schema}".activity_feed
         WHERE user_id = $1
           AND archived = false
           AND (snoozed_until IS NULL OR snoozed_until <= NOW())
         ORDER BY created_at DESC, id DESC
         LIMIT $2`,
        [userId, fetchLimit]
      );
    }

    const rows = result.rows;
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = encodeCursor({
        id: lastItem.id,
        createdAt: lastItem.created_at instanceof Date
          ? lastItem.created_at.toISOString()
          : String(lastItem.created_at),
      });
    }

    return { items, nextCursor, hasMore };
  } catch (err) {
    logger.error(`[CursorPagination] Failed to paginate user feed for user=${userId}: ${(err as Error).message}`);
    return { items: [], nextCursor: null, hasMore: false };
  }
}
