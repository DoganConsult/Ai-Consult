import { executeAgentRun } from '../runtime/agent-runtime.service';
import { getAgentDefinition, getAllAgentDefinitions } from '../registry/agent-registry.service';
import { publish } from '../../events/event-bus';
import { v4 as uuid } from 'uuid';
import type { AgentRunRequest, AgentRunResult } from '../contracts/agent.types';

export interface OrchestrationPlan {
  planId: string;
  tenantId: string;
  waves: OrchestrationWave[];
  strategy: 'sequential' | 'parallel' | 'wave';
  createdBy: string;
}

export interface OrchestrationWave {
  waveIndex: number;
  agentCodes: string[];
}

export interface OrchestrationResult {
  planId: string;
  tenantId: string;
  waveResults: WaveResult[];
  totalDurationMs: number;
  successCount: number;
  failureCount: number;
}

export interface WaveResult {
  waveIndex: number;
  agentResults: AgentRunResult[];
  durationMs: number;
}

export function buildOrchestrationPlan(
  tenantId: string,
  agentCodes: string[],
  strategy: 'sequential' | 'parallel' | 'wave',
  createdBy: string,
): OrchestrationPlan {
  const planId = uuid();

  if (strategy === 'parallel') {
    return {
      planId, tenantId, strategy, createdBy,
      waves: [{ waveIndex: 0, agentCodes }],
    };
  }

  if (strategy === 'sequential') {
    return {
      planId, tenantId, strategy, createdBy,
      waves: agentCodes.map((code, i) => ({ waveIndex: i, agentCodes: [code] })),
    };
  }

  const waves = computeWaves(agentCodes);
  return { planId, tenantId, strategy, createdBy, waves };
}

function computeWaves(agentCodes: string[]): OrchestrationWave[] {
  const platform: string[] = [];
  const product: string[] = [];
  const module: string[] = [];

  for (const code of agentCodes) {
    const def = getAgentDefinition(code);
    if (!def) { module.push(code); continue; }
    if (def.agentType === 'platform' || def.agentType === 'orchestration') platform.push(code);
    else if (def.agentType === 'product') product.push(code);
    else module.push(code);
  }

  const waves: OrchestrationWave[] = [];
  let idx = 0;
  if (platform.length > 0) waves.push({ waveIndex: idx++, agentCodes: platform });
  if (product.length > 0) waves.push({ waveIndex: idx++, agentCodes: product });
  if (module.length > 0) waves.push({ waveIndex: idx++, agentCodes: module });
  return waves;
}

export async function executeOrchestration(
  plan: OrchestrationPlan,
  input: Record<string, unknown> = {},
): Promise<OrchestrationResult> {
  const startTime = Date.now();
  const waveResults: WaveResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  await publish('agent.orchestration.started', plan.tenantId, {
    planId: plan.planId, strategy: plan.strategy, waveCount: plan.waves.length,
  });

  for (const wave of plan.waves) {
    const waveStart = Date.now();

    const runPromises = wave.agentCodes.map(agentCode => {
      const correlationId = uuid();
      const request: AgentRunRequest = {
        agentCode,
        tenantId: plan.tenantId,
        actorId: plan.createdBy,
        triggerSource: 'system',
        input: { ...input, orchestrationPlanId: plan.planId, waveIndex: wave.waveIndex },
        correlationId,
      };
      return executeAgentRun(request);
    });

    const results = await Promise.allSettled(runPromises);
    const agentResults: AgentRunResult[] = [];

    for (const r of results) {
      if (r.status === 'fulfilled') {
        agentResults.push(r.value);
        if (r.value.status === 'completed') successCount++;
        else failureCount++;
      } else {
        failureCount++;
      }
    }

    waveResults.push({
      waveIndex: wave.waveIndex,
      agentResults,
      durationMs: Date.now() - waveStart,
    });
  }

  const totalDurationMs = Date.now() - startTime;

  await publish('agent.orchestration.completed', plan.tenantId, {
    planId: plan.planId, totalDurationMs, successCount, failureCount,
  });

  return { planId: plan.planId, tenantId: plan.tenantId, waveResults, totalDurationMs, successCount, failureCount };
}

export async function runFullCycleOrchestration(
  tenantId: string,
  actorId: string,
  agentCodes?: string[],
  input: Record<string, unknown> = {},
): Promise<OrchestrationResult> {
  const codes = agentCodes || getAllAgentDefinitions().map(d => d.agentCode);
  const plan = buildOrchestrationPlan(tenantId, codes, 'wave', actorId);
  return executeOrchestration(plan, input);
}

export const agentOrchestratorService = {
  buildOrchestrationPlan,
  executeOrchestration,
  runFullCycleOrchestration,
};
