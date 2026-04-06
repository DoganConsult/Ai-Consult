/**
 * Command Favorites Service
 *
 * Manages user favorite commands for the command palette.
 * Provides both in-memory pure functions and database-backed persistence.
 *
 * Requirements: 6.3 - Users can pin favorite commands
 */

import { query as dbQuery } from '../../../../config/database';
import type { Command } from '../../../../platform/dos/shell/command/command-palette.service';

// ============================================================================
// Types
// ============================================================================

/** User favorite entry */
export interface UserFavorite {
  favoriteId: string;
  userId: string;
  itemType: 'command' | 'entity' | 'search';
  itemId: string;
  createdAt: string;
}

// ============================================================================
// In-Memory Favorites (pure functions)
// ============================================================================

/**
 * Check if a command is in the user's favorites.
 * @param favorites - User's favorite entries
 * @param commandId - Command ID to check
 * @returns True if the command is favorited
 */
export function isFavorite(favorites: UserFavorite[], commandId: string): boolean {
  return favorites.some(f => f.itemType === 'command' && f.itemId === commandId);
}

/**
 * Toggle a command's favorite status.
 * Returns the updated favorites array.
 * @param favorites - Current favorites
 * @param userId - User ID
 * @param commandId - Command to toggle
 * @returns Updated favorites array and whether it was added (true) or removed (false)
 */
export function toggleFavoriteInMemory(
  favorites: UserFavorite[],
  userId: string,
  commandId: string
): { favorites: UserFavorite[]; added: boolean } {
  const existing = favorites.find(f => f.itemType === 'command' && f.itemId === commandId);
  if (existing) {
    return {
      favorites: favorites.filter(f => f.favoriteId !== existing.favoriteId),
      added: false,
    };
  }
  return {
    favorites: [
      ...favorites,
      {
        favoriteId: `fav-${Date.now()}`,
        userId,
        itemType: 'command',
        itemId: commandId,
        createdAt: new Date().toISOString(),
      },
    ],
    added: true,
  };
}

/**
 * Get favorite commands for a user.
 * @param favorites - User's favorites
 * @param commands - All available commands
 * @returns Array of favorited commands
 */
export function getFavoriteCommands(
  favorites: UserFavorite[],
  commands: Command[]
): Command[] {
  const favCommandIds = new Set(
    favorites.filter(f => f.itemType === 'command').map(f => f.itemId)
  );
  return commands.filter(cmd => favCommandIds.has(cmd.id));
}

// ============================================================================
// Database Operations
// ============================================================================

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
      [existing.rows[0].favorite_id]
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
