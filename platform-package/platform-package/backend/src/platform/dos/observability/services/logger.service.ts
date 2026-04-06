/**
 * Logger Service facade — re-exports from canonical DOS observability logger.
 *
 * The canonical logger lives at: platform/dos/observability/logger.service.ts
 * (DOS ownership per Patch 0 section 5.1)
 *
 * This shim re-exports for backward compatibility.
 * New code MUST import from the canonical location directly.
 *
 * @owner DOS
 */
export { logger, type LogLevel, type LogEntry } from '../logger.service';
