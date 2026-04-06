/**
 * Command Palette Service - Barrel Re-export
 *
 * Provides command palette functionality including command registry,
 * fuzzy matching, frequency tracking, and favorites management.
 *
 * Requirements: 6.2 - Command palette shows available commands based on user permissions
 */

// Types and interfaces
export type { CommandCategory, Command, CommandHistory, MatchType, CommandSuggestion, UserFavorite } from './command-palette.types';

// Command registry
export { COMMAND_REGISTRY } from './command-registry';

// Helper functions
export { getCommandLabel, getCommandsByCategory, getCommandById } from './command-helpers';

// Permission-based filtering
export { filterCommandsByPermission, getCommandsForRole } from './command-permissions';

// Fuzzy matching
export { fuzzyMatchCommand, searchCommands, sortCommandsByRelevance } from './command-fuzzy-match';

// Frequency tracking
export { recordCommandUsageInMemory, getRecentFromHistory, getMostFrequent, sortWithFrequencyWeighting } from './command-frequency';

// Favorites management
export { isFavorite, toggleFavoriteInMemory, getFavoriteCommands } from './command-favorites';

// Database operations
export { recordCommandUsage, getRecentCommands, getCommandHistory, getUserFavorites, toggleFavorite } from './command-db';
