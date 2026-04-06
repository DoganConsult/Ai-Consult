/**
 * Contextual AI Service — Barrel Re-export
 *
 * Re-exports all public types and functions from the split sub-modules
 * to preserve the original import path for consumers.
 */

// Types and interfaces
export type {
  PageContext,
  AISuggestion,
  AISession,
  AIMessage,
  EntitySummary,
  ModuleIntro,
  ContentSuggestion,
  JourneyAwareSuggestion,
  WhatNextAction,
} from './contextual-ai.types';

// Pure functions (context building, suggestions, validation, session helpers)
export {
  buildContextFromRoute,
  getSuggestionsForContext,
  isValidSuggestion,
  mergeSessionContext,
  addMessageToSession,
} from './context-suggestions.service';

// Database operations (sessions, entity summaries, recommendations)
export {
  getOrCreateSession,
  updateSessionContext,
  generateEntitySummary,
  getRelatedRecommendations,
} from './context-db.service';

// Journey-aware extensions (module intros, content suggestions, what-next)
export {
  generateModuleIntro,
  checkFirstVisitAndGetIntro,
  getContentSuggestions,
  getJourneyAwareSuggestions,
} from './journey-ai.service';
