/**
 * Gateway re-export — canonical location: llm/prompt-injection-guard.service.ts
 * This gateway entry point re-exports from the canonical implementation.
 */
export {
  detectInjection,
  logInjectionAttempt,
  guardInput,
  getInjectionStats,
} from '../llm/prompt-injection-guard.service';

export type { InjectionDetectionResult } from '../llm/prompt-injection-guard.service';
