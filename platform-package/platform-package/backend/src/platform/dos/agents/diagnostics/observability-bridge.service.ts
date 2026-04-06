import { publish } from '../../events/event-bus';
import type { AgentRunResult } from '../contracts/agent.types';

export interface ObservabilityEvent {
  source: 'dos' | 'langgraph' | 'temporal' | 'mcp';
  eventType: string;
  agentCode: string;
  tenantId: string;
  runId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export async function bridgeTraceCallback(
  tenantId: string,
  agentCode: string,
  runId: string,
  traceData: Record<string, unknown>,
): Promise<void> {
  try {
    const { recordRunMetrics } = await import('./agent-diagnostics.service');
    const syntheticResult: AgentRunResult = {
      runId,
      agentCode,
      status: (traceData.status as AgentRunResult['status']) || 'completed',
      output: {},
      toolCalls: [],
      durationMs: (traceData.durationMs as number) || 0,
      tokensUsed: (traceData.tokensUsed as number) || 0,
      costUsd: (traceData.costUsd as number) || 0,
      approvalsRequired: false,
      escalated: false,
      correlationId: (traceData.correlationId as string) || runId,
    };
    await recordRunMetrics(tenantId, syntheticResult);
  } catch {
    // diagnostics unavailable
  }
}

export async function bridgeLangGraphObservability(
  tenantId: string,
  agentCode: string,
  runId: string,
  graphOutput: Record<string, unknown>,
): Promise<void> {
  const event: ObservabilityEvent = {
    source: 'langgraph',
    eventType: 'graph.run.completed',
    agentCode,
    tenantId,
    runId,
    data: {
      toolCallCount: graphOutput.toolCallCount,
      discoveries: graphOutput.discoveries,
      executedActions: graphOutput.executedActions,
      error: graphOutput.error,
    },
    timestamp: new Date().toISOString(),
  };
  await publishObservabilityEvent(event);
}

export async function bridgeTemporalObservability(
  tenantId: string,
  agentCode: string,
  workflowId: string,
  outcome: Record<string, unknown>,
): Promise<void> {
  const event: ObservabilityEvent = {
    source: 'temporal',
    eventType: 'workflow.agent.completed',
    agentCode,
    tenantId,
    runId: workflowId,
    data: outcome,
    timestamp: new Date().toISOString(),
  };
  await publishObservabilityEvent(event);
}

export async function bridgeAnomalyDetection(
  tenantId: string,
  agentCode: string,
  anomalyData: Record<string, unknown>,
): Promise<void> {
  const event: ObservabilityEvent = {
    source: 'langgraph',
    eventType: 'agent.anomaly.detected',
    agentCode,
    tenantId,
    runId: (anomalyData.runId as string) || '',
    data: anomalyData,
    timestamp: new Date().toISOString(),
  };
  await publishObservabilityEvent(event);
}

export async function bridgeDeadLetterEvent(
  tenantId: string,
  agentCode: string,
  dlqData: Record<string, unknown>,
): Promise<void> {
  const event: ObservabilityEvent = {
    source: 'langgraph',
    eventType: 'agent.dlq.entry',
    agentCode,
    tenantId,
    runId: (dlqData.runId as string) || '',
    data: dlqData,
    timestamp: new Date().toISOString(),
  };
  await publishObservabilityEvent(event);
}

async function publishObservabilityEvent(event: ObservabilityEvent): Promise<void> {
  await publish('agent.observability.event' as any, event.tenantId, {
    source: event.source,
    eventType: event.eventType,
    agentCode: event.agentCode,
    runId: event.runId,
    data: event.data,
    timestamp: event.timestamp,
  });
}

export const observabilityBridgeService = {
  bridgeTraceCallback,
  bridgeLangGraphObservability,
  bridgeTemporalObservability,
  bridgeAnomalyDetection,
  bridgeDeadLetterEvent,
};
