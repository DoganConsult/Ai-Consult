// @ts-nocheck
/**
 * Event Contract Sync Service
 * ─────────────────────────────
 * Syncs MODULE_EVENT_CONTRACTS (code-defined) to per-tenant event_type_registry (DB).
 * Enables runtime event validation and per-tenant custom event extensions.
 *
 * Enterprise features:
 *   - Startup sync: code → DB (idempotent, preserves custom events)
 *   - Runtime validation: emitEvent checks DB registry before publishing
 *   - Custom events: tenants can register custom events via API
 *   - Chain trigger discovery: DB-backed chain trigger lookup
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import { MODULE_EVENT_CONTRACTS, type ModuleEventContract } from '../../../../config/module-event-contracts';
import { CANONICAL_AGRC_MODULE_CODES, type CanonicalModuleCode } from '../../../../config/canonical-modules';
import { getDefaultProductKey } from '../../../../platform/deployment-profile';
import { logger } from '../../../../platform/dos/observability/services/logger.service';
import { toErrorMessage } from '../../../../utils/http-error.util';

// ── Sync contracts to DB ────────────────────────────────────────────────

export async function syncEventContractsToDb(tenantId: string): Promise<{ synced: number; skipped: number }> {
  const schema = tenantSchema(tenantId);
  let synced = 0;
  let skipped = 0;

  for (const code of CANONICAL_AGRC_MODULE_CODES) {
    const contract: ModuleEventContract = MODULE_EVENT_CONTRACTS[code];
    if (!contract || contract.events.length === 0) {
      skipped++;
      continue;
    }

    for (const event of contract.events) {
      try {
        await safeQuery(
          `INSERT INTO "${schema}".event_type_registry
           (tenant_id, namespace, event_name, is_chain_trigger, is_system, is_active, product_key)
           VALUES ($1, $2, $3, $4, TRUE, TRUE, $5)
           ON CONFLICT (tenant_id, namespace, event_name) DO UPDATE SET
             is_chain_trigger = EXCLUDED.is_chain_trigger,
             updated_at = NOW()`,
          [tenantId, code, event, contract.chainTriggerEvents.includes(event), getDefaultProductKey()],
        );
        synced++;
      } catch (err) {
        logger.warn(`[EventContractSync] Failed to sync ${event} for ${code}`, { error: toErrorMessage(err) });
      }
    }
  }

  logger.info(`[EventContractSync] Synced ${synced} events for tenant ${tenantId} (${skipped} empty modules)`);
  return { synced, skipped };
}

// ── Runtime event validation ────────────────────────────────────────────

const _eventCache = new Map<string, { valid: boolean; ts: number }>();
const CACHE_TTL_MS = 60_000;

export async function isValidEvent(tenantId: string, eventName: string): Promise<boolean> {
  const key = `${tenantId}:${eventName}`;
  const cached = _eventCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.valid;

  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT 1 FROM "${schema}".event_type_registry WHERE tenant_id = $1 AND event_name = $2 AND is_active = TRUE LIMIT 1`,
      [tenantId, eventName],
    );
    const valid = (result.rows?.length ?? 0) > 0;
    _eventCache.set(key, { valid, ts: Date.now() });
    return valid;
  } catch {
    // Fallback to code-defined contracts if DB unavailable
    const namespace = eventName.split('.')[0];
    const contract = MODULE_EVENT_CONTRACTS[namespace as CanonicalModuleCode];
    return contract?.events?.includes(eventName) ?? false;
  }
}

// ── Chain trigger discovery ─────────────────────────────────────────────

export async function getChainTriggerEvents(tenantId: string): Promise<Array<{ namespace: string; eventName: string }>> {
  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT namespace, event_name FROM "${schema}".event_type_registry WHERE tenant_id = $1 AND is_chain_trigger = TRUE AND is_active = TRUE`,
      [tenantId],
    );
    return result.rows.map((r: any) => ({ namespace: r.namespace, eventName: r.event_name }));
  } catch {
    // Fallback
    const triggers: Array<{ namespace: string; eventName: string }> = [];
    for (const code of CANONICAL_AGRC_MODULE_CODES) {
      for (const event of MODULE_EVENT_CONTRACTS[code].chainTriggerEvents) {
        triggers.push({ namespace: code, eventName: event });
      }
    }
    return triggers;
  }
}

// ── Custom event registration ───────────────────────────────────────────

export async function registerCustomEvent(
  tenantId: string,
  namespace: string,
  eventName: string,
  opts?: { descriptionEn?: string; descriptionAr?: string; isChainTrigger?: boolean },
): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `INSERT INTO "${schema}".event_type_registry
       (tenant_id, namespace, event_name, description_en, description_ar, is_chain_trigger, is_system, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, TRUE)
       ON CONFLICT (tenant_id, namespace, event_name) DO UPDATE SET
         description_en = COALESCE(EXCLUDED.description_en, event_type_registry.description_en),
         is_chain_trigger = EXCLUDED.is_chain_trigger,
         updated_at = NOW()
       RETURNING event_type_id`,
      [tenantId, namespace, eventName, opts?.descriptionEn, opts?.descriptionAr, opts?.isChainTrigger ?? false],
    );
    _eventCache.delete(`${tenantId}:${eventName}`);
    return result.rows[0]?.event_type_id ?? null;
  } catch (err) {
    logger.warn(`[EventContractSync] Failed to register custom event`, { error: toErrorMessage(err), tenantId, eventName });
    return null;
  }
}

export function invalidateEventCache(tenantId?: string): void {
  if (tenantId) {
    for (const key of _eventCache.keys()) {
      if (key.startsWith(`${tenantId}:`)) _eventCache.delete(key);
    }
  } else {
    _eventCache.clear();
  }
}
