// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../../config/database';
import { eventBus } from '../event/event-bus.service';
import type { PlatformEvent } from '../event/event-bus.service';
import { logger } from '../../../../platform/dos/observability/services/logger.service';
import {
  startChain,
  _advanceChain,
} from './cross-module-chain-handler.service';
import { SYSTEM_JOB_ACTOR } from '../../../../platform/dos/constants/system-actors';

const _registeredTriggers = new Set<string>();

export interface ChainDefinition {
  chain_code: string;
  name_en: string;
  steps: Array<{
    stepNo: number;
    moduleCode: string;
    eventTrigger: string;
    taskType: string;
    roleCode: string;
    slaHours: number;
  }>;
  is_active: boolean;
}

export async function loadChainDefinitions(tenantId: string): Promise<ChainDefinition[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT chain_code, name_en, steps, is_active
       FROM "${schema}".workflow_chain_definitions
       WHERE is_active = TRUE
       ORDER BY chain_code`,
    );
    return result.rows.map((r: any) => ({
      chain_code: r.chain_code,
      name_en: r.name_en,
      steps: typeof r.steps === 'string' ? JSON.parse(r.steps) : r.steps,
      is_active: r.is_active,
    }));
  } catch {
    return [];
  }
}

export async function registerDynamicChainSubscriptions(tenantId: string): Promise<number> {
  const definitions = await loadChainDefinitions(tenantId);
  let registered = 0;

  for (const def of definitions) {
    if (!def.steps?.length) continue;

    const triggerEvent = def.steps[0]?.eventTrigger;
    if (!triggerEvent) continue;

    const subKey = `dynamic-chain:${def.chain_code}:${triggerEvent}`;
    if (_registeredTriggers.has(subKey)) continue;

    _registeredTriggers.add(subKey);
    registered++;

    eventBus.subscribe(triggerEvent, subKey, async (event: PlatformEvent) => {
      const { tenantId: evtTenantId, payload, entityType, entityId } = event;
      if (!evtTenantId) return;

      const triggerEntityType = entityType || payload?.entityType || def.steps[0]?.moduleCode || 'unknown';
      const triggerEntityId = entityId || payload?.entityId || payload?.[`${triggerEntityType}Id`] || '';

      if (!triggerEntityId) return;

      try {
        await startChain(evtTenantId, {
          ...def,
          triggerEntityType,
          triggerEntityId,
          context: {
            triggerEntityId,
            severity: payload?.severity || 'medium',
            createdBy: payload?.userId || SYSTEM_JOB_ACTOR,
          },
        } as any);
      } catch (err) {
        logger.warn(`[DynamicChain] Failed to start chain ${def.chain_code} on ${triggerEvent}: ${(err as Error).message}`);
      }
    });
  }

  if (registered > 0) {
    logger.info(`[DynamicChain] Registered ${registered} dynamic chain subscriptions for tenant ${tenantId}`);
  }

  return registered;
}

export function getRegisteredTriggers(): string[] {
  return Array.from(_registeredTriggers);
}

export async function refreshDynamicChainSubscriptions(tenantId: string): Promise<number> {
  return registerDynamicChainSubscriptions(tenantId);
}
