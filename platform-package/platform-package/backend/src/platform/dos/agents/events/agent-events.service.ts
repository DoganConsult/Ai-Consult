import { publish, subscribe, registerEventType } from '../../events/event-bus';
import type { PlatformEvent } from '../../events/event-types';
import type { AgentEventType } from '../contracts/agent.types';

const AGENT_EVENT_TYPES: AgentEventType[] = [
  'agent.registered',
  'agent.enabled',
  'agent.disabled',
  'agent.task.created',
  'agent.run.started',
  'agent.tool.called',
  'agent.tool.completed',
  'agent.approval.requested',
  'agent.approval.granted',
  'agent.approval.denied',
  'agent.run.failed',
  'agent.run.escalated',
  'agent.run.completed',
  'agent.policy.blocked',
  'agent.replacement.status.changed',
];

export function registerAgentEventTypes(): void {
  for (const eventType of AGENT_EVENT_TYPES) {
    registerEventType({
      eventType,
      category: 'platform',
      ownerModule: 'dos.agents',
      description: `Agent event: ${eventType}`,
    });
  }
}

export async function publishAgentEvent(
  eventType: AgentEventType,
  tenantId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await publish(eventType, tenantId, payload);
}

export function subscribeToAgentEvent(
  eventType: AgentEventType,
  subscriberId: string,
  handler: (event: PlatformEvent) => Promise<void>,
): () => void {
  return subscribe({ eventType, subscriberId, handler });
}

export function subscribeToAllAgentEvents(
  subscriberId: string,
  handler: (event: PlatformEvent) => Promise<void>,
): (() => void)[] {
  return AGENT_EVENT_TYPES.map(eventType =>
    subscribe({ eventType, subscriberId: `${subscriberId}:${eventType}`, handler }),
  );
}

export const agentEventsService = {
  registerAgentEventTypes,
  publishAgentEvent,
  subscribeToAgentEvent,
  subscribeToAllAgentEvents,
};
