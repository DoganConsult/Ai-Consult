/**
 * Command History Service
 *
 * Tracks command usage frequency for the command palette.
 * Provides both in-memory pure functions and database-backed persistence.
 *
 * Requirements: 6.8 - System remembers command usage frequency
 */

import { query as dbQuery } from '../../../../config/database';
import type { CommandHistory, CommandSuggestion, MatchType } from '../command-palette/command-palette.types';

// ============================================================================
// In-Memory Frequency Tracking (pure functions)
// ============================================================================

/**
 * Record a command usage, incrementing the usage count.
 * Pure function that returns the updated history entry.
 * @param history - Existing command history entries for the user
 * @param commandId - The command that was used
 * @returns Updated history array with incremented usage count
 */
export function recordCommandUsageInMemory(
  history: CommandHistory[],
  commandId: string
): CommandHistory[] {
  const existing = history.find(h => h.commandId === commandId);
  if (existing) {
    return history.map(h =>
      h.commandId === commandId
        ? { ...h, usageCount: h.usageCount + 1, lastUsedAt: new Date().toISOString() }
        : h
    );
  }
  return [
    ...history,
    {
      historyId: `hist-${Date.now()}`,
      userId: history.length > 0 ? history[0].userId : 'any',
      commandId,
      usageCount: 1,
      lastUsedAt: new Date().toISOString(),
    },
  ];
}

/**
 * Get recent commands sorted by last used time.
 * @param history - Command history entries
 * @param limit - Maximum number of results
 * @returns Recent commands sorted by lastUsedAt descending
 */
export function getRecentFromHistory(
  history: CommandHistory[],
  limit: number = 10
): CommandHistory[] {
  return [...history]
    .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime())
    .slice(0, Math.max(0, limit));
}

/**
 * Get most frequently used commands.
 * @param history - Command history entries
 * @param limit - Maximum number of results
 * @returns Commands sorted by usage count descending
 */
export function getMostFrequent(
  history: CommandHistory[],
  limit: number = 10
): CommandHistory[] {
  return [...history]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, Math.max(0, limit));
}

/**
 * Sort command suggestions with frequency weighting.
 * Combines fuzzy match score with usage frequency for final ranking.
 * Commands with higher frequency get a boost when relevance scores are close.
 *
 * @param suggestions - Array of command suggestions
 * @param history - User's command history
 * @param frequencyWeight - Weight for frequency bonus (0-1, default 0.3)
 * @returns Sorted suggestions with frequency-adjusted scores
 *
 * Requirements: 6.8 - System remembers command usage frequency
 * Validates: Property 21 - Command Frequency Prioritization
 */
export function sortWithFrequencyWeighting(
  suggestions: CommandSuggestion[],
  history: CommandHistory[],
  frequencyWeight: number = 0.3
): CommandSuggestion[] {
  const maxUsage = Math.max(1, ...history.map(h => h.usageCount));

  return [...suggestions]
    .map(s => {
      const histEntry = history.find(h => h.commandId === s.command.id);
      const frequencyBonus = histEntry
        ? (histEntry.usageCount / maxUsage) * frequencyWeight * 100
        : 0;
      return {
        ...s,
        score: s.score + frequencyBonus,
        reason: (histEntry && histEntry.usageCount > 0 ? 'frequent' : s.reason) as MatchType,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ============================================================================
// Database Operations
// ============================================================================

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
