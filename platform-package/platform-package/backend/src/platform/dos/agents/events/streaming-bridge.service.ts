import { subscribe } from '../../events/event-bus';
import type { PlatformEvent } from '../../events/event-types';
import type { AgentEventType } from '../contracts/agent.types';

const STREAMABLE_EVENTS: AgentEventType[] = [
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
];

let _bridgeActive = false;
const _unsubscribers: Array<() => void> = [];

export function activateStreamingBridge(): void {
  if (_bridgeActive) return;

  for (const eventType of STREAMABLE_EVENTS) {
    const unsub = subscribe({
      eventType,
      subscriberId: `streaming-bridge:${eventType}`,
      handler: async (event: PlatformEvent) => {
        try {
          const { publishProgressEvent, publishCompleteEvent, publishErrorEvent } =
            await import('../../../../openclaw/ag-ui/ag-ui-streaming');

          const agentId = event.payload?.agentCode as string || '';
          const runId = event.payload?.runId as string || '';

          if (eventType === 'agent.run.completed') {
            publishCompleteEvent(agentId, runId, {
              success: true,
              summary: `Agent ${agentId} completed`,
            });
          } else if (eventType === 'agent.run.failed') {
            publishErrorEvent(agentId, runId, {
              message: (event.payload?.reason as string) || 'Agent run failed',
            });
          } else {
            publishProgressEvent(agentId, runId, {
              step: eventType,
              message: JSON.stringify(event.payload),
            });
          }
        } catch {
          // AG-UI streaming unavailable
        }
      },
    });
    _unsubscribers.push(unsub);
  }

  _bridgeActive = true;
}

export function deactivateStreamingBridge(): void {
  for (const unsub of _unsubscribers) unsub();
  _unsubscribers.length = 0;
  _bridgeActive = false;
}

export function isStreamingBridgeActive(): boolean {
  return _bridgeActive;
}

export const streamingBridgeService = {
  activateStreamingBridge,
  deactivateStreamingBridge,
  isStreamingBridgeActive,
};
