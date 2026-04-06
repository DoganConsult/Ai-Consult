/**
 * Command Palette Favorites Management
 *
 * Pure functions for managing user favorite commands in memory.
 *
 * Requirements: 6.3 - Users can pin favorite commands
 */

import { Command, UserFavorite } from './command-palette.types';

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
