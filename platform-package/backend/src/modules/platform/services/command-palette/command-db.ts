// @ts-nocheck
/**
 * Command Palette Database Operations
 *
 * Database persistence for command history and user favorites.
 *
 * Requirements: 6.8 - System remembers command usage frequency
 * Requirements: 6.3 - Users can pin favorite commands
 */

import { query as dbQuery } from '../../../../config/database/database';
import { getFirstRow } from '../../../../shared/data/db-utils';
import { CommandHistory, UserFavorite } from './command-palette.types';

/**
 * Record command usage in the database.
 * Uses UPSERT to increment usage count or create new entry.
 */
export async function recordCommandUsage(
  tenantId: string,
  userId: string,
  commandId: string
): Promise<void> {
  await dbQuery(
    `INSERT INTO "${tenantId}".command_history (user_id, command_id, usage_count, last_used_at)
     VALUES ($1, $2, 1, NOW())
     ON CONFLICT (user_id, command_id)
     DO UPDATE SET usage_count = command_history.usage_count + 1, last_used_at = NOW()`,
    [userId, commandId]
  );
}

/**
 * Get recent commands for a user from the database.
 */
export async function getRecentCommands(
  tenantId: string,
  userId: string,
  limit: number = 10
): Promise<CommandHistory[]> {
  const result = await dbQuery(
    `SELECT history_id as "historyId", user_id as "userId", command_id as "commandId",
            usage_count as "usageCount", last_used_at as "lastUsedAt"
     FROM "${tenantId}".command_history
     WHERE user_id = $1
     ORDER BY last_used_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

/**
 * Get command usage history for frequency weighting.
 */
export async function getCommandHistory(
  tenantId: string,
  userId: string
): Promise<CommandHistory[]> {
  const result = await dbQuery(
    `SELECT history_id as "historyId", user_id as "userId", command_id as "commandId",
            usage_count as "usageCount", last_used_at as "lastUsedAt"
     FROM "${tenantId}".command_history
     WHERE user_id = $1
     ORDER BY usage_count DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get user's favorite commands from the database.
 */
export async function getUserFavorites(
  tenantId: string,
  userId: string
): Promise<UserFavorite[]> {
  const result = await dbQuery(
    `SELECT favorite_id as "favoriteId", user_id as "userId", item_type as "itemType",
            item_id as "itemId", created_at as "createdAt"
     FROM "${tenantId}".user_favorites
     WHERE user_id = $1 AND item_type = 'command'
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Toggle a command favorite in the database.
 */
export async function toggleFavorite(
  tenantId: string,
  userId: string,
  commandId: string
): Promise<boolean> {
  const existing = await dbQuery(
    `SELECT favorite_id FROM "${tenantId}".user_favorites
     WHERE user_id = $1 AND item_type = 'command' AND item_id = $2`,
    [userId, commandId]
  );
  if (existing.rows.length > 0) {
    await dbQuery(
      `DELETE FROM "${tenantId}".user_favorites WHERE favorite_id = $1`,
      [getFirstRow(existing)?.favorite_id]
    );
    return false;
  }
  await dbQuery(
    `INSERT INTO "${tenantId}".user_favorites (user_id, item_type, item_id)
     VALUES ($1, 'command', $2)`,
    [userId, commandId]
  );
  return true;
}
