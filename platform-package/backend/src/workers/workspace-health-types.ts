// ============================================
// Shahin GRC — Workspace Health Workers: Types
// Shared type definitions for all health workers.
// ============================================

/** Configuration for a single background worker */
export interface WorkerConfig {
  /** Unique worker name used in logs and execution table */
  name: string;
  /** Human-readable description */
  description: string;
  /** Interval in milliseconds between runs */
  intervalMs: number;
  /** Whether the worker is enabled */
  enabled: boolean;
  /** The handler function — receives a list of active tenants (id + schema) */
  handler: (tenants: TenantInfo[]) => Promise<WorkerRunSummary>;
}

export interface TenantInfo {
  tenantId: string;
  schema: string;
  /** From control plane `public.tenants.product_key` — never trust job/message payloads for this. */
  productKey: string;
}

export interface WorkerRunSummary {
  itemsProcessed: number;
  itemsFixed: number;
  errors: Array<{ tenantId?: string; message: string }>;
  metadata?: Record<string, any>;
}

export interface WorkerStatus {
  name: string;
  description: string;
  intervalMs: number;
  enabled: boolean;
  running: boolean;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastDurationMs: number | null;
  nextRunAt: string | null;
}
