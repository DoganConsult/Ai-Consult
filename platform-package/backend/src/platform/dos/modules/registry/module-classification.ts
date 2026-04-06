/**
 * DOS Module Classification — DB-driven module classification with in-memory cache.
 *
 * Law 3: Data-driven security. Module classifications are seeded in
 * module_classification table (migration 926) and cached in-memory with TTL.
 *
 * Hardcoded fallback sets are retained ONLY for bootstrap scenarios where
 * the tenant schema may not yet exist (provisioning, first migration).
 * Once the tenant is provisioned, all reads come from the database.
 */
import { safeQuery, tenantSchema } from '../../../../config/database/database';

// ── Fallback sets (used only during bootstrap before DB is available) ──

// Fallback contains ONLY platform-infrastructure modules (no product-specific codes).
// Product-specific always-on modules are loaded from the DB at runtime.
const ALWAYS_ON_FALLBACK = new Set([
  // Platform core
  'admin', 'workflow', 'notification', 'platform', 'workspace', 'foundation',
  'onboarding', 'profile', 'users', 'dauth',
  // Platform UI shell
  'inbox', 'navigation', 'dashboard', 'widgets', 'portals', 'shell',
  // Platform infrastructure
  'bootstrap', 'provisioning', 'tenant', 'telemetry', 'event',
  'delegation', 'access', 'security', 'gate',
  // Platform data
  'report', 'reports', 'analytics', 'records', 'document',
]);

const GRC_CORE_FALLBACK = new Set([
  'foundation', 'governance', 'risk', 'compliance', 'audit',
  'controls', 'control',
  'evidence', 'policy', 'incident', 'vendor',
  'bcp', 'privacy', 'training',
  'integrations', 'integration',
  'reporting',
  'framework', 'assessment',
  'asset', 'position', 'team',
  'dora', 'qiyas', 'issues',
  'governance-ai', 'governance_ai',
  'governance-os', 'governance_os',
  'ksa-regulatory', 'ksa_regulatory',
  'local-knowledge', 'local_knowledge',
  'proactive-leadership', 'proactive_leadership',
  'attestation', 'ccm', 'maturity',
]);

// ── Cache ──

interface ClassificationCache {
  alwaysOn: Set<string>;
  grcCore: Set<string>;
  ts: number;
}

const CACHE_TTL = 120_000; // 2 minutes
const cache = new Map<string, ClassificationCache>();

/**
 * Load module classification from DB for a specific tenant.
 * Falls back to hardcoded sets if the table doesn't exist yet (bootstrap).
 */
async function loadClassification(tenantId: string): Promise<ClassificationCache> {
  const cached = cache.get(tenantId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached;

  try {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT module_code, is_always_on, is_grc_core
       FROM "${schema}".module_classification`,
    );

    const alwaysOn = new Set<string>();
    const grcCore = new Set<string>();

    for (const row of rows) {
      if (row.is_always_on) alwaysOn.add(row.module_code);
      if (row.is_grc_core) grcCore.add(row.module_code);
    }

    const entry: ClassificationCache = { alwaysOn, grcCore, ts: Date.now() };
    cache.set(tenantId, entry);
    return entry;
  } catch {
    // Table may not exist during bootstrap �� fall back to hardcoded sets
    return { alwaysOn: ALWAYS_ON_FALLBACK, grcCore: GRC_CORE_FALLBACK, ts: 0 };
  }
}

/**
 * Check if a module is always-on for a tenant (DB-driven with fallback).
 */
export async function isAlwaysOnModule(tenantId: string, moduleCode: string): Promise<boolean> {
  const { alwaysOn } = await loadClassification(tenantId);
  return alwaysOn.has(moduleCode);
}

/**
 * Check if a module is a GRC core module for a tenant (DB-driven with fallback).
 */
export async function isGrcCoreModule(tenantId: string, moduleCode: string): Promise<boolean> {
  const { grcCore } = await loadClassification(tenantId);
  return grcCore.has(moduleCode);
}

/**
 * Get the full set of always-on modules for a tenant.
 */
export async function getAlwaysOnModules(tenantId: string): Promise<Set<string>> {
  const { alwaysOn } = await loadClassification(tenantId);
  return alwaysOn;
}

/**
 * Get the full set of GRC core modules for a tenant.
 */
export async function getGrcCoreModules(tenantId: string): Promise<Set<string>> {
  const { grcCore } = await loadClassification(tenantId);
  return grcCore;
}

/** Invalidate classification cache for a tenant (call after admin changes). */
export function invalidateClassificationCache(tenantId?: string): void {
  if (tenantId) cache.delete(tenantId);
  else cache.clear();
}

// ── Synchronous fallback exports (for bootstrap/migration scenarios only) ──

/** @deprecated Use isAlwaysOnModule() for DB-driven checks. Retained for bootstrap compatibility. */
export const ALWAYS_ON_MODULES = ALWAYS_ON_FALLBACK;

/** @deprecated Use isGrcCoreModule() for DB-driven checks. Retained for bootstrap compatibility. */
export const GRC_CORE_MODULES = GRC_CORE_FALLBACK;
