import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerAgent,
  registerAgentBatch,
  getAgentDefinition,
  getAllAgentDefinitions,
  getAgentsByType,
  getAgentsByOwner,
  getAgentsByMode,
  validateAgentDefinition,
  resetRegistry,
} from './agent-registry.service';
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
    allowedTools: ['tool-1'],
    allowedContexts: ['ctx-1'],
    allowedTaskTypes: ['task-1'],
    allowedTriggerSources: ['user', 'schedule'],
    writeBoundaries: ['risk'],
    completionSignals: ['risk.created'],
    requiredCapabilities: ['llm'],
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
      targetRoles: ['analyst'],
      allowedAutomationDepth: 'advisory',
      prohibitedZones: [],
      requiresGovernanceApproval: false,
      measurementCriteria: [],
      rollbackCriteria: [],
      supervisionRequired: true,
      accountabilityOwner: 'platform-team',
    },
    retryPolicy: { maxRetries: 3, retryDelayMs: 1000, retryableErrors: ['TIMEOUT'] },
    eventSubscriptions: ['risk.created'],
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

describe('agent-registry.service', () => {
  beforeEach(() => {
    resetRegistry();
  });

  describe('registerAgent / getAgentDefinition', () => {
    it('registers and retrieves an agent', () => {
      registerAgent(makeAgent({ agentCode: 'A01' }));
      const def = getAgentDefinition('A01');
      expect(def).toBeDefined();
      expect(def!.agentCode).toBe('A01');
      expect(def!.name).toBe('Test Agent');
    });

    it('throws on duplicate registration', () => {
      registerAgent(makeAgent({ agentCode: 'dup' }));
      expect(() => registerAgent(makeAgent({ agentCode: 'dup' }))).toThrow(/already registered/);
    });

    it('returns undefined for unknown agent', () => {
      expect(getAgentDefinition('unknown')).toBeUndefined();
    });

    it('freezes registered definition', () => {
      registerAgent(makeAgent({ agentCode: 'frozen' }));
      const def = getAgentDefinition('frozen')!;
      expect(() => { (def as any).name = 'modified'; }).toThrow();
    });
  });

  describe('registerAgentBatch', () => {
    it('registers multiple agents at once', () => {
      registerAgentBatch([
        makeAgent({ agentCode: 'B01' }),
        makeAgent({ agentCode: 'B02' }),
        makeAgent({ agentCode: 'B03' }),
      ]);
      expect(getAllAgentDefinitions()).toHaveLength(3);
    });
  });

  describe('getAllAgentDefinitions', () => {
    it('returns all registered agents', () => {
      registerAgentBatch([
        makeAgent({ agentCode: 'C01' }),
        makeAgent({ agentCode: 'C02' }),
      ]);
      const all = getAllAgentDefinitions();
      expect(all).toHaveLength(2);
      expect(all.map(a => a.agentCode).sort()).toEqual(['C01', 'C02']);
    });
  });

  describe('getAgentsByType', () => {
    it('filters by agentType', () => {
      registerAgentBatch([
        makeAgent({ agentCode: 'T01', agentType: 'platform' }),
        makeAgent({ agentCode: 'T02', agentType: 'module' }),
        makeAgent({ agentCode: 'T03', agentType: 'platform' }),
      ]);
      expect(getAgentsByType('platform')).toHaveLength(2);
      expect(getAgentsByType('module')).toHaveLength(1);
      expect(getAgentsByType('personal')).toHaveLength(0);
    });
  });

  describe('getAgentsByOwner', () => {
    it('filters by ownerLayer + ownerCode', () => {
      registerAgentBatch([
        makeAgent({ agentCode: 'O01', ownerLayer: 'product', ownerCode: 'shahin' }),
        makeAgent({ agentCode: 'O02', ownerLayer: 'platform', ownerCode: 'dos' }),
        makeAgent({ agentCode: 'O03', ownerLayer: 'product', ownerCode: 'shahin' }),
      ]);
      expect(getAgentsByOwner('product', 'shahin')).toHaveLength(2);
      expect(getAgentsByOwner('platform', 'dos')).toHaveLength(1);
    });
  });

  describe('getAgentsByMode', () => {
    it('filters by executionMode', () => {
      registerAgentBatch([
        makeAgent({ agentCode: 'M01', executionMode: 'advisory' }),
        makeAgent({ agentCode: 'M02', executionMode: 'co-pilot' }),
        makeAgent({ agentCode: 'M03', executionMode: 'advisory' }),
      ]);
      expect(getAgentsByMode('advisory')).toHaveLength(2);
      expect(getAgentsByMode('co-pilot')).toHaveLength(1);
    });
  });

  describe('validateAgentDefinition', () => {
    it('returns empty array for valid definition', () => {
      expect(validateAgentDefinition(makeAgent())).toEqual([]);
    });

    it('reports missing required fields', () => {
      const bad = { agentCode: '', name: '', version: '' } as any;
      const errors = validateAgentDefinition(bad);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('agentCode is required');
      expect(errors).toContain('name is required');
    });

    it('validates bounded-autonomous requires approval for writes', () => {
      const agent = makeAgent({
        agentCode: 'val-1',
        executionMode: 'bounded-autonomous',
        approvalPolicy: {
          requiresApprovalForWrite: false,
          highRiskThreshold: 0.8,
          autoApproveBelow: 0.3,
          humanReviewRequired: false,
          selfApprovalBlocked: true,
          blockedActionCategories: [],
          fallbackResponse: 'deny',
          safeRefusalBehavior: 'explain',
        },
      });
      const errors = validateAgentDefinition(agent);
      expect(errors).toContain('bounded-autonomous agents must require approval for writes');
    });
  });

  describe('resetRegistry', () => {
    it('clears all registrations', () => {
      registerAgent(makeAgent({ agentCode: 'R01' }));
      expect(getAllAgentDefinitions()).toHaveLength(1);
      resetRegistry();
      expect(getAllAgentDefinitions()).toHaveLength(0);
    });
  });
});
