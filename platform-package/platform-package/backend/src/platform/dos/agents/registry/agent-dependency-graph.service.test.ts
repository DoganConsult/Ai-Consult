import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../observability/logger.service', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn((id: string) => `tenant_${id}`),
}));

vi.mock('../../events/event-bus', () => ({
  publish: vi.fn(),
}));

import {
  registerAgent,
  resetRegistry,
} from './agent-registry.service';
import {
  buildDependencyGraph,
  getAgentPredecessors,
  getAgentSuccessors,
  canExecuteAgent,
} from './agent-dependency-graph.service';
import type { AgentDefinition } from '../contracts/agent.types';

function makeAgent(overrides: Partial<AgentDefinition> = {}): AgentDefinition {
  return {
    agentCode: 'test-agent',
    name: 'Test Agent',
    version: '1.0.0',
    agentType: 'module',
    ownerLayer: 'product',
    ownerCode: 'shahin',
    executionMode: 'advisory',
    defaultState: 'registered',
    allowedTools: [],
    allowedContexts: [],
    allowedTaskTypes: [],
    allowedTriggerSources: ['user'],
    writeBoundaries: [],
    completionSignals: [],
    requiredCapabilities: [],
    instructionSource: 'static',
    escalationRules: [],
    approvalPolicy: {
      requiresApprovalForWrite: true,
      highRiskThreshold: 0.8,
      autoApproveBelow: 0.3,
      humanReviewRequired: false,
      selfApprovalBlocked: true,
      blockedActionCategories: [],
      fallbackResponse: 'deny',
      safeRefusalBehavior: 'explain',
    },
    replacementPolicy: {
      posture: 'assisted-execution',
      targetRoles: [],
      allowedAutomationDepth: 'advisory',
      prohibitedZones: [],
      requiresGovernanceApproval: false,
      measurementCriteria: [],
      rollbackCriteria: [],
      supervisionRequired: true,
      accountabilityOwner: 'platform-team',
    },
    retryPolicy: { maxRetries: 3, retryDelayMs: 1000, retryableErrors: ['TIMEOUT'] },
    eventSubscriptions: [],
    healthPolicy: {
      maxConsecutiveFailures: 5,
      healthCheckIntervalSeconds: 60,
      circuitBreakerThreshold: 3,
      cooldownSeconds: 120,
      autoDisableOnFailure: true,
    },
    observabilityProfile: {
      logRunDetails: true,
      logToolCalls: true,
      logDecisions: true,
      logApprovals: true,
      trackCost: true,
      trackTokenUsage: true,
      trackLatency: true,
    },
    uiExposurePolicy: 'visible',
    ...overrides,
  };
}

describe('agent-dependency-graph.service', () => {
  beforeEach(() => {
    resetRegistry();
  });

  describe('buildDependencyGraph — linear chain', () => {
    beforeEach(() => {
      registerAgent(makeAgent({
        agentCode: 'A01', name: 'Onboarding',
        dependencies: { predecessors: [], successors: ['A02'] },
      }));
      registerAgent(makeAgent({
        agentCode: 'A02', name: 'Workflow',
        dependencies: { predecessors: ['A01'], successors: ['A03'] },
      }));
      registerAgent(makeAgent({
        agentCode: 'A03', name: 'AI',
        dependencies: { predecessors: ['A02'], successors: [] },
      }));
    });

    it('produces correct number of nodes', () => {
      const graph = buildDependencyGraph();
      expect(graph.nodes).toHaveLength(3);
    });

    it('produces correct edges', () => {
      const graph = buildDependencyGraph();
      expect(graph.edges).toEqual([
        { from: 'A01', to: 'A02' },
        { from: 'A02', to: 'A03' },
      ]);
    });

    it('calculates correct depths for linear chain', () => {
      const graph = buildDependencyGraph();
      const depthMap = Object.fromEntries(graph.nodes.map(n => [n.agentCode, n.depth]));
      expect(depthMap['A01']).toBe(0);
      expect(depthMap['A02']).toBe(1);
      expect(depthMap['A03']).toBe(2);
    });

    it('produces 3 execution waves for 3-step chain', () => {
      const graph = buildDependencyGraph();
      expect(graph.executionWaves).toHaveLength(3);
      expect(graph.executionWaves[0]).toEqual(['A01']);
      expect(graph.executionWaves[1]).toEqual(['A02']);
      expect(graph.executionWaves[2]).toEqual(['A03']);
    });
  });

  describe('buildDependencyGraph — parallel roots', () => {
    beforeEach(() => {
      registerAgent(makeAgent({
        agentCode: 'P1', name: 'Root 1',
        dependencies: { predecessors: [], successors: ['C1'] },
      }));
      registerAgent(makeAgent({
        agentCode: 'P2', name: 'Root 2',
        dependencies: { predecessors: [], successors: ['C1'] },
      }));
      registerAgent(makeAgent({
        agentCode: 'C1', name: 'Convergence',
        dependencies: { predecessors: ['P1', 'P2'], successors: [] },
      }));
    });

    it('places parallel roots in the same wave', () => {
      const graph = buildDependencyGraph();
      expect(graph.executionWaves).toHaveLength(2);
      expect(graph.executionWaves[0].sort()).toEqual(['P1', 'P2']);
      expect(graph.executionWaves[1]).toEqual(['C1']);
    });

    it('convergence node has depth 1', () => {
      const graph = buildDependencyGraph();
      const c1 = graph.nodes.find(n => n.agentCode === 'C1');
      expect(c1?.depth).toBe(1);
    });
  });

  describe('buildDependencyGraph — no dependencies', () => {
    beforeEach(() => {
      registerAgent(makeAgent({ agentCode: 'S1', name: 'Solo 1' }));
      registerAgent(makeAgent({ agentCode: 'S2', name: 'Solo 2' }));
    });

    it('all agents in wave 0 when no dependencies', () => {
      const graph = buildDependencyGraph();
      expect(graph.executionWaves).toHaveLength(1);
      expect(graph.executionWaves[0].sort()).toEqual(['S1', 'S2']);
    });

    it('produces no edges', () => {
      const graph = buildDependencyGraph();
      expect(graph.edges).toHaveLength(0);
    });
  });

  describe('buildDependencyGraph — empty registry', () => {
    it('returns empty graph when no agents registered', () => {
      const graph = buildDependencyGraph();
      expect(graph.nodes).toHaveLength(0);
      expect(graph.edges).toHaveLength(0);
      expect(graph.executionWaves).toHaveLength(1);
      expect(graph.executionWaves[0]).toHaveLength(0);
    });
  });

  describe('getAgentPredecessors', () => {
    it('returns predecessors from agent definition', () => {
      registerAgent(makeAgent({
        agentCode: 'X1',
        dependencies: { predecessors: ['P1', 'P2'], successors: [] },
      }));
      expect(getAgentPredecessors('X1')).toEqual(['P1', 'P2']);
    });

    it('returns empty array for unregistered agent', () => {
      expect(getAgentPredecessors('nonexistent')).toEqual([]);
    });

    it('returns empty array for agent without dependencies field', () => {
      registerAgent(makeAgent({ agentCode: 'NoDep' }));
      expect(getAgentPredecessors('NoDep')).toEqual([]);
    });
  });

  describe('getAgentSuccessors', () => {
    it('returns successors from agent definition', () => {
      registerAgent(makeAgent({
        agentCode: 'Y1',
        dependencies: { predecessors: [], successors: ['S1', 'S2'] },
      }));
      expect(getAgentSuccessors('Y1')).toEqual(['S1', 'S2']);
    });

    it('returns empty array for unregistered agent', () => {
      expect(getAgentSuccessors('nonexistent')).toEqual([]);
    });
  });

  describe('canExecuteAgent', () => {
    beforeEach(() => {
      registerAgent(makeAgent({
        agentCode: 'W1',
        dependencies: { predecessors: [], successors: ['W2'] },
      }));
      registerAgent(makeAgent({
        agentCode: 'W2',
        dependencies: { predecessors: ['W1'], successors: ['W3'] },
      }));
      registerAgent(makeAgent({
        agentCode: 'W3',
        dependencies: { predecessors: ['W1', 'W2'], successors: [] },
      }));
    });

    it('allows root agent with no predecessors', () => {
      expect(canExecuteAgent('W1', new Set())).toBe(true);
    });

    it('allows agent when all predecessors are completed', () => {
      expect(canExecuteAgent('W2', new Set(['W1']))).toBe(true);
    });

    it('blocks agent when predecessors are incomplete', () => {
      expect(canExecuteAgent('W2', new Set())).toBe(false);
    });

    it('blocks agent when only some predecessors are completed', () => {
      expect(canExecuteAgent('W3', new Set(['W1']))).toBe(false);
    });

    it('allows agent when all multi-predecessors are completed', () => {
      expect(canExecuteAgent('W3', new Set(['W1', 'W2']))).toBe(true);
    });

    it('allows unknown agent (no predecessors)', () => {
      expect(canExecuteAgent('unknown', new Set())).toBe(true);
    });
  });

  describe('buildDependencyGraph — diamond pattern', () => {
    beforeEach(() => {
      registerAgent(makeAgent({
        agentCode: 'D1',
        dependencies: { predecessors: [], successors: ['D2', 'D3'] },
      }));
      registerAgent(makeAgent({
        agentCode: 'D2',
        dependencies: { predecessors: ['D1'], successors: ['D4'] },
      }));
      registerAgent(makeAgent({
        agentCode: 'D3',
        dependencies: { predecessors: ['D1'], successors: ['D4'] },
      }));
      registerAgent(makeAgent({
        agentCode: 'D4',
        dependencies: { predecessors: ['D2', 'D3'], successors: [] },
      }));
    });

    it('produces correct execution waves for diamond', () => {
      const graph = buildDependencyGraph();
      expect(graph.executionWaves).toHaveLength(3);
      expect(graph.executionWaves[0]).toEqual(['D1']);
      expect(graph.executionWaves[1].sort()).toEqual(['D2', 'D3']);
      expect(graph.executionWaves[2]).toEqual(['D4']);
    });

    it('D4 has depth 2 (max of D2=1, D3=1 + 1)', () => {
      const graph = buildDependencyGraph();
      const d4 = graph.nodes.find(n => n.agentCode === 'D4');
      expect(d4?.depth).toBe(2);
    });

    it('produces 4 edges for diamond', () => {
      const graph = buildDependencyGraph();
      expect(graph.edges).toHaveLength(4);
    });
  });
});
