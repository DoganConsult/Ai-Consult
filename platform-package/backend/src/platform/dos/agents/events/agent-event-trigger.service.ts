import { subscribe } from '../../events/event-bus';
import type { PlatformEvent as CanonicalPlatformEvent } from '../../events/event-types';
import { executeAgentRun } from '../runtime/agent-runtime.service';
import { getAllAgentDefinitions, isAgentActive } from '../registry/agent-registry.service';
import { v4 as uuid } from 'uuid';
import type { AgentRunRequest } from '../contracts/agent.types';

const PLATFORM_TRIGGER_EVENTS = [
  'workflow.transition',
  'risk.created',
  'risk.updated',
  'incident.created',
  'incident.severity.changed',
  'compliance.gap.detected',
  'control.effectiveness.failed',
  'policy.review.due',
  'evidence.expired',
  'vendor.risk.changed',
  'audit.finding.created',
  'agent.task.created',
];

const _unsubscribers: (() => void)[] = [];

export function activateAgentEventTriggers(): void {
  for (const eventType of PLATFORM_TRIGGER_EVENTS) {
    const unsub = subscribe({
      eventType,
      subscriberId: `dos.agent-trigger:${eventType}`,
      handler: async (event: CanonicalPlatformEvent) => {
        await dispatchToSubscribedAgents(event);
      },
    });
    _unsubscribers.push(unsub);
  }
}

export function deactivateAgentEventTriggers(): void {
  for (const unsub of _unsubscribers) unsub();
  _unsubscribers.length = 0;
}

async function dispatchToSubscribedAgents(event: CanonicalPlatformEvent): Promise<void> {
  const tenantId = event.tenantId;
  if (!tenantId) return;

  const allDefs = getAllAgentDefinitions();
  const matchingAgents = allDefs.filter(def => {
    if (!def.allowedTriggerSources.includes('event')) return false;
    return def.eventSubscriptions.some(sub =>
      sub === event.eventType || sub === '*' || event.eventType.startsWith(sub.replace('.*', '')),
    );
  });

  for (const def of matchingAgents) {
    try {
      const active = await isAgentActive(tenantId, def.agentCode);
      if (!active) continue;

      const payload = (event.payload ?? {}) as Record<string, unknown>;
      const runRequest: AgentRunRequest = {
        agentCode: def.agentCode,
        tenantId,
        actorId: (payload.actorId as string) || event.userId || 'system:event-trigger',
        triggerSource: 'event',
        input: {
          eventType: event.eventType,
          entityType: event.entityType,
          entityId: event.entityId,
          ...payload,
        },
        correlationId: event.eventId || uuid(),
      };

      executeAgentRun(runRequest).catch(() => {});
    } catch {
      // agent dispatch failure — non-blocking
    }
  }
}

export const agentEventTriggerService = {
  activateAgentEventTriggers,
  deactivateAgentEventTriggers,
};
