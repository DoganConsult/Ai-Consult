/**
 * Command Search Service
 *
 * Fuzzy matching and search functionality for the command palette.
 * Supports case-insensitive subsequence matching with scoring based on
 * exact matches, prefix matches, word boundary matches, and consecutive characters.
 *
 * Requirements: 6.7 - Command palette supports fuzzy matching for quick access
 */

import type { Command, CommandSuggestion } from '../command-palette/command-palette.types';

// ============================================================================
// Fuzzy Matching Functions
// ============================================================================

/**
 * Check if a character is alphanumeric.
 * @param char - Character to check
 * @returns True if alphanumeric
 */
function isAlphanumeric(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 48 && code <= 57) ||  // 0-9
    (code >= 65 && code <= 90) ||  // A-Z
    (code >= 97 && code <= 122)    // a-z
  );
}

/**
 * Calculate fuzzy match score between a query and a label.
 * Supports case-insensitive subsequence matching with scoring based on:
 * - Exact matches (highest score)
 * - Prefix matches (query at start of label)
 * - Word boundary matches (query matches start of words)
 * - Consecutive character matches
 *
 * @param query - The search query
 * @param label - The command label to match against
 * @returns Score from 0-100 based on match quality, 0 if no match
 *
 * Requirements: 6.7 - Command palette supports fuzzy matching for quick access
 * Validates: Property 20 - Command Fuzzy Matching
 */
export function fuzzyMatchCommand(query: string, label: string): number {
  // Handle empty or whitespace-only queries
  if (!query || query.trim().length === 0) {
    return 0;
  }

  // Handle empty labels
  if (!label || label.length === 0) {
    return 0;
  }

  const normalizedQuery = query.toLowerCase().trim();
  const normalizedLabel = label.toLowerCase();

  // Exact match - highest score
  if (normalizedLabel === normalizedQuery) {
    return 100;
  }

  // Prefix match - very high score
  if (normalizedLabel.startsWith(normalizedQuery)) {
    // Score based on how much of the label is covered
    const coverage = normalizedQuery.length / normalizedLabel.length;
    return Math.round(90 + (coverage * 10));
  }

  // Check if query is a subsequence of label
  let queryIndex = 0;
  let labelIndex = 0;
  let consecutiveMatches = 0;
  let maxConsecutive = 0;
  let wordBoundaryMatches = 0;
  let totalMatches = 0;
  const matchPositions: number[] = [];

  while (queryIndex < normalizedQuery.length && labelIndex < normalizedLabel.length) {
    if (normalizedQuery[queryIndex] === normalizedLabel[labelIndex]) {
      matchPositions.push(labelIndex);
      totalMatches++;
      consecutiveMatches++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);

      // Check if this is a word boundary match
      if (labelIndex === 0 || !isAlphanumeric(normalizedLabel[labelIndex - 1])) {
        wordBoundaryMatches++;
      }

      queryIndex++;
    } else {
      consecutiveMatches = 0;
    }
    labelIndex++;
  }

  // If not all query characters were found, no match
  if (queryIndex < normalizedQuery.length) {
    return 0;
  }

  // Calculate score based on multiple factors
  let score = 0;

  // Base score for being a subsequence match (40 points max)
  const coverageRatio = normalizedQuery.length / normalizedLabel.length;
  score += Math.round(coverageRatio * 40);

  // Bonus for consecutive matches (25 points max)
  const consecutiveRatio = maxConsecutive / normalizedQuery.length;
  score += Math.round(consecutiveRatio * 25);

  // Bonus for word boundary matches (25 points max)
  const wordBoundaryRatio = wordBoundaryMatches / normalizedQuery.length;
  score += Math.round(wordBoundaryRatio * 25);

  // Bonus for matches at the start of the label (10 points max)
  if (matchPositions.length > 0 && matchPositions[0] === 0) {
    score += 10;
  }

  // Ensure score is within bounds
  return Math.min(Math.max(score, 1), 99);
}

/**
 * Search commands using fuzzy matching and return sorted suggestions.
 * Filters out commands with scores below the threshold.
 *
 * @param query - The search query
 * @param commands - Array of commands to search
 * @param language - Language for matching ('en' or 'ar')
 * @param threshold - Minimum score to include in results (default: 10)
 * @returns Array of CommandSuggestion sorted by score descending
 *
 * Requirements: 6.7 - Command palette supports fuzzy matching for quick access
 */
export function searchCommands(
  query: string,
  commands: Command[],
  language: 'en' | 'ar' = 'en',
  threshold: number = 10
): CommandSuggestion[] {
  // Handle empty query
  if (!query || query.trim().length === 0) {
    return [];
  }

  const suggestions: CommandSuggestion[] = [];

  for (const command of commands) {
    // Get the label based on language
    const label = language === 'ar' ? command.labelAr : command.label;

    // Calculate score for primary label
    let score = fuzzyMatchCommand(query, label);

    // Also check the other language label and take the higher score
    const altLabel = language === 'ar' ? command.label : command.labelAr;
    const altScore = fuzzyMatchCommand(query, altLabel);
    score = Math.max(score, altScore);

    // Also check command ID for technical users
    const idScore = fuzzyMatchCommand(query, command.id.replace(/-/g, ' '));
    score = Math.max(score, idScore);

    // Include if score meets threshold
    if (score >= threshold) {
      suggestions.push({
        command,
        score,
        reason: score === 100 ? 'exact' : 'fuzzy',
      });
    }
  }

  // Sort by score descending
  return sortCommandsByRelevance(suggestions);
}

/**
 * Sort command suggestions by relevance score in descending order.
 * When scores are equal, maintains original order (stable sort).
 *
 * @param suggestions - Array of command suggestions to sort
 * @returns Sorted array of suggestions
 *
 * Requirements: 6.8 - System remembers command usage frequency
 */
export function sortCommandsByRelevance(suggestions: CommandSuggestion[]): CommandSuggestion[] {
  return [...suggestions].sort((a, b) => b.score - a.score);
}
