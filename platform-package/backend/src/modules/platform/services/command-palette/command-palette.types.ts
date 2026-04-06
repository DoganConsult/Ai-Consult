/**
 * Command Palette Types
 *
 * Type definitions and interfaces for the command palette feature.
 *
 * Requirements: 6.2 - Command palette shows available commands based on user permissions
 */

/** Command categories for organizing commands in the palette */
export type CommandCategory = 'navigation' | 'action' | 'search' | 'settings' | 'workspace';

/** Command interface representing a single command in the palette */
export interface Command {
  id: string;
  label: string;
  labelAr: string;
  category: CommandCategory;
  action: string;
  url?: string;
  icon: string;
  requiredPermission?: string;
  shortcut?: string;
}

/** Command history entry tracking user command usage */
export interface CommandHistory {
  historyId: string;
  userId: string;
  commandId: string;
  usageCount: number;
  lastUsedAt: string;
}

/** Match type for command suggestions */
export type MatchType = 'exact' | 'fuzzy' | 'recent' | 'frequent';

/** Command suggestion with relevance scoring */
export interface CommandSuggestion {
  command: Command;
  score: number;
  reason: MatchType;
}

/** User favorite entry */
export interface UserFavorite {
  favoriteId: string;
  userId: string;
  itemType: 'command' | 'entity' | 'search';
  itemId: string;
  createdAt: string;
}
