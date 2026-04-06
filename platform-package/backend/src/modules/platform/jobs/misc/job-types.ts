/**
 * Shared type for domain-specific job definitions.
 * Each domain file exports an async factory that returns an array of these.
 */
export interface JobDefinition {
  /** Unique job name (used as registry key and distributed lock key) */
  name: string;
  /** Cron expression (node-cron / Temporal compatible) */
  cron: string;
  /** Async handler executed on each tick */
  handler: () => Promise<void>;
  /** Optional description */
  description?: string;
}
