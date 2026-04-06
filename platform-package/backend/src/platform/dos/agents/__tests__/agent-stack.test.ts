import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerAgent,
  getAgentDefinition,
  getAllAgentDefinitions,
  getAgentsByType,
  getAgentsByOwner,
  getAgentsByMode,
  validateAgentDefinition,
  resetRegistry,
} from '../registry/agent-registry.service';
import {
  registerTool,
  getToolDefinition,
  getAllToolDefinitions,
  getToolsForAgent,
  isToolAllowedForAgent,
  validateToolDefinition,
  resetToolRegistry,
} from '../tools/agent-tool-registry.service';
import { evaluateAgentPolicy } from '../policies/agent-policy.service';
import type { PolicyEvaluationResult } from '../policies/agent-policy.service';
import { validateAgentOutput } from '../validation/agent-output-validator.service';
import { recordRunOutcome, resetHealthCounters } from '../health/agent-health.service';
import type {
  AgentDefinition,
  AgentToolDefinition,
  AgentRunRequest,
} from '../contracts/agent.types';

function buildAgentDef(overrides: Partial<AgentDefinition> = {}): AgentDefinition {
  return {
    agentCode: 'test-agent',
    name: 'Test Agent',
    version: '1.0.0',
    agentType: 'module',
    ownerLayer: 'module',
    ownerCode: 'test-module',
    executionMode: 'advisory',
    defaultState: 'active',
    allowedTools: ['tool-a'],
    allowedContexts: ['*'],
    allowedTaskTypes: ['review', 'audit'],
    allowedTriggerSources: ['user', 'event', 'schedule'],
    writeBoundaries: [],
    completionSignals: [],
    requiredCapabilities: [],
    instructionSource: 'static',
    escalationRules: [],
    approvalPolicy: {
      requiresApprovalForWrite: true,
      highRiskThreshold: 2,
      autoApproveBelow: 1,
      humanReviewRequired: false,
      selfApprovalBlocked: true,
      blockedActionCategories: [],
      fallbackResponse: 'deny',
      safeRefusalBehavior: 'return_empty',
    },
    replacementPolicy: {
      posture: 'preplacement',
      targetRoles: [],
      allowedAutomationDepth: 'advisory',
      prohibitedZones: [],
      requiresGovernanceApproval: false,
      measurementCriteria: [],
      rollbackCriteria: [],
      supervisionRequired: false,
      accountabilityOwner: 'admin',
    },
    retryPolicy: {
      maxRetries: 0,
      retryDelayMs: 100,
      retryableErrors: [],
    },
    eventSubscriptions: [],
    healthPolicy: {
      maxConsecutiveFailures: 3,
      healthCheckIntervalSeconds: 60,
      circuitBreakerThreshold: 5,
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

function buildToolDef(overrides: Partial<AgentToolDefinition> = {}): AgentToolDefinition {
  return {
    toolCode: 'tool-a',
    name: 'Tool A',
    owner: 'test-module',
    allowedAgentTypes: ['module', 'product', 'platform'],
    inputSchema: {},
    outputSchema: {},
    riskLevel: 'safe',
    readWrite: 'read',
    requiresApproval: false,
    dauthControlRequired: false,
    auditRequired: false,
    ...overrides,
  };
}

function buildRunRequest(overrides: Partial<AgentRunRequest> = {}): AgentRunRequest {
  return {
    agentCode: 'test-agent',
    tenantId: 'tenant-1',
    actorId: 'user-1',
    triggerSource: 'user',
    input: {},
    correlationId: 'corr-1',
    ...overrides,
  };
}

describe('DOS Agent Stack — Patch 8 Compliance Tests', () => {
  beforeEach(() => {
    resetRegistry();
    resetToolRegistry();
    resetHealthCounters();
  });

  describe('§8.1 Registry', () => {
    it('registers an agent and retrieves it by code', () => {
      const def = buildAgentDef();
      registerAgent(def);
      expect(getAgentDefinition('test-agent')).toBeDefined();
      expect(getAgentDefinition('test-agent')!.agentCode).toBe('test-agent');
    });

    it('rejects duplicate agent registration', () => {
      registerAgent(buildAgentDef());
      expect(() => registerAgent(buildAgentDef())).toThrow(/already registered/);
    });

    it('returns all agents', () => {
      registerAgent(buildAgentDef({ agentCode: 'a1', name: 'A1' }));
      registerAgent(buildAgentDef({ agentCode: 'a2', name: 'A2' }));
      expect(getAllAgentDefinitions()).toHaveLength(2);
    });

    it('filters agents by type', () => {
      registerAgent(buildAgentDef({ agentCode: 'a1', agentType: 'platform' }));
      registerAgent(buildAgentDef({ agentCode: 'a2', agentType: 'module' }));
      expect(getAgentsByType('platform')).toHaveLength(1);
      expect(getAgentsByType('module')).toHaveLength(1);
    });

    it('filters agents by owner', () => {
      registerAgent(buildAgentDef({ agentCode: 'a1', ownerLayer: 'product', ownerCode: 'shahin-ai' }));
      registerAgent(buildAgentDef({ agentCode: 'a2', ownerLayer: 'module', ownerCode: 'risk' }));
      expect(getAgentsByOwner('product', 'shahin-ai')).toHaveLength(1);
    });

    it('filters agents by mode', () => {
      registerAgent(buildAgentDef({ agentCode: 'a1', executionMode: 'observe-only' }));
      registerAgent(buildAgentDef({ agentCode: 'a2', executionMode: 'advisory' }));
      expect(getAgentsByMode('observe-only')).toHaveLength(1);
    });

    it('validates agent definition — catches missing fields', () => {
      const errors = validateAgentDefinition({ agentCode: '' } as AgentDefinition);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('agentCode is required');
    });

    it('validates bounded-autonomous must require approval for writes', () => {
      const def = buildAgentDef({ executionMode: 'bounded-autonomous' });
      def.approvalPolicy.requiresApprovalForWrite = false;
      const errors = validateAgentDefinition(def);
      expect(errors).toContain('bounded-autonomous agents must require approval for writes');
    });

    it('freezes registered definitions', () => {
      registerAgent(buildAgentDef());
      const def = getAgentDefinition('test-agent')!;
      expect(() => { (def as any).agentCode = 'hacked'; }).toThrow();
    });
  });

  describe('§8.1 Tool Registry', () => {
    it('registers a tool and retrieves it', () => {
      registerTool(buildToolDef());
      expect(getToolDefinition('tool-a')).toBeDefined();
    });

    it('rejects duplicate tool registration', () => {
      registerTool(buildToolDef());
      expect(() => registerTool(buildToolDef())).toThrow(/already registered/);
    });

    it('returns all tool definitions', () => {
      registerTool(buildToolDef({ toolCode: 't1' }));
      registerTool(buildToolDef({ toolCode: 't2' }));
      expect(getAllToolDefinitions()).toHaveLength(2);
    });

    it('returns tools for an agent based on allowedTools', () => {
      registerAgent(buildAgentDef({ allowedTools: ['tool-a'] }));
      registerTool(buildToolDef({ toolCode: 'tool-a' }));
      registerTool(buildToolDef({ toolCode: 'tool-b' }));
      expect(getToolsForAgent('test-agent')).toHaveLength(1);
      expect(getToolsForAgent('test-agent')[0].toolCode).toBe('tool-a');
    });

    it('checks if tool is allowed for agent', () => {
      registerAgent(buildAgentDef({ allowedTools: ['tool-a'] }));
      registerTool(buildToolDef());
      expect(isToolAllowedForAgent('test-agent', 'tool-a')).toBe(true);
      expect(isToolAllowedForAgent('test-agent', 'tool-b')).toBe(false);
    });

    it('validates tool definition — catches missing fields', () => {
      const errors = validateToolDefinition({ toolCode: '' } as AgentToolDefinition);
      expect(errors).toContain('toolCode is required');
    });

    it('validates write tools with risk > safe must require approval', () => {
      const errors = validateToolDefinition(buildToolDef({
        readWrite: 'write',
        riskLevel: 'high',
        requiresApproval: false,
      }));
      expect(errors).toContain('write tools with risk above safe must require approval');
    });
  });

  describe('§8.2 Policy — Execution Mode', () => {
    it('blocks write actions for observe-only agents', async () => {
      registerAgent(buildAgentDef({ executionMode: 'observe-only' }));
      const result = await evaluateAgentPolicy('t1', 'test-agent', buildRunRequest({ input: { action: 'create_record' } }));
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('observe_only');
    });

    it('blocks write actions for advisory agents', async () => {
      registerAgent(buildAgentDef({ executionMode: 'advisory' }));
      const result = await evaluateAgentPolicy('t1', 'test-agent', buildRunRequest({ input: { action: 'delete_item' } }));
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('advisory');
    });

    it('allows read actions for observe-only agents', async () => {
      registerAgent(buildAgentDef({ executionMode: 'observe-only' }));
      const result = await evaluateAgentPolicy('t1', 'test-agent', buildRunRequest({ input: { action: 'view_dashboard' } }));
      expect(result.allowed).toBe(true);
    });
  });

  describe('§8.2 Policy — Trigger Source', () => {
    it('blocks disallowed trigger sources', async () => {
      registerAgent(buildAgentDef({ allowedTriggerSources: ['user'] }));
      const result = await evaluateAgentPolicy('t1', 'test-agent', buildRunRequest({ triggerSource: 'agent' }));
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('trigger_source_not_allowed');
    });

    it('allows permitted trigger sources', async () => {
      registerAgent(buildAgentDef({ allowedTriggerSources: ['user', 'event'] }));
      const result = await evaluateAgentPolicy('t1', 'test-agent', buildRunRequest({ triggerSource: 'event' }));
      expect(result.allowed).toBe(true);
    });
  });

  describe('§8.2 Policy — Task Type', () => {
    it('blocks disallowed task types', async () => {
      registerAgent(buildAgentDef({ allowedTaskTypes: ['review'] }));
      const result = await evaluateAgentPolicy('t1', 'test-agent', buildRunRequest({ input: { taskType: 'deploy' } }));
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('task_type_not_allowed');
    });

    it('allows permitted task types', async () => {
      registerAgent(buildAgentDef({ allowedTaskTypes: ['review', 'audit'] }));
      const result = await evaluateAgentPolicy('t1', 'test-agent', buildRunRequest({ input: { taskType: 'audit' } }));
      expect(result.allowed).toBe(true);
    });
  });

  describe('§8.2 Policy — Write Boundaries', () => {
    it('blocks writes outside boundary', async () => {
      registerAgent(buildAgentDef({ writeBoundaries: ['risk.'] }));
      const result = await evaluateAgentPolicy('t1', 'test-agent', buildRunRequest({ input: { writeTarget: 'finance.ledger' } }));
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('write_boundary_violation');
    });

    it('allows writes within boundary', async () => {
      registerAgent(buildAgentDef({ writeBoundaries: ['risk.'] }));
      const result = await evaluateAgentPolicy('t1', 'test-agent', buildRunRequest({ input: { writeTarget: 'risk.assessment' } }));
      expect(result.allowed).toBe(true);
    });
  });

  describe('§8.2 Policy — Replacement', () => {
    it('acknowledges replacement-prohibited with warning', async () => {
      registerAgent(buildAgentDef({
        replacementPolicy: {
          ...buildAgentDef().replacementPolicy,
          posture: 'replacement-prohibited',
        },
      }));
      const result = await evaluateAgentPolicy('t1', 'test-agent', buildRunRequest());
      expect(result.allowed).toBe(true);
      expect(result.warnings).toContain('replacement_prohibited_zone');
    });
  });

  describe('§8.2 Policy — Delegated Executor', () => {
    it('requires delegationGrantId for delegated-executor mode', async () => {
      registerAgent(buildAgentDef({ executionMode: 'delegated-executor' }));
      const result = await evaluateAgentPolicy('t1', 'test-agent', buildRunRequest());
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('delegated_executor_requires_delegation_grant_id');
    });
  });

  describe('§8.2 Policy — Self-Approval', () => {
    it('blocks self-approval when policy requires it', async () => {
      registerAgent(buildAgentDef());
      const result = await evaluateAgentPolicy('t1', 'test-agent', buildRunRequest({ actorId: 'test-agent' }));
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('self_approval_blocked');
    });
  });

  describe('§8.2 Policy — Blocked Action Categories', () => {
    it('blocks actions in blocked categories', async () => {
      registerAgent(buildAgentDef({
        approvalPolicy: {
          ...buildAgentDef().approvalPolicy,
          blockedActionCategories: ['financial'],
        },
      }));
      const result = await evaluateAgentPolicy('t1', 'test-agent', buildRunRequest({ input: { action: 'financial_transfer' } }));
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('action_category_blocked:financial');
    });
  });

  describe('§8.2 Policy — Maker-Checker', () => {
    it('blocks same actor as previous step when selfApprovalBlocked', async () => {
      registerAgent(buildAgentDef());
      const result = await evaluateAgentPolicy('t1', 'test-agent', buildRunRequest({
        actorId: 'user-1',
        input: { lastActorId: 'user-1' },
      }));
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('maker_checker_violation');
    });
  });

  describe('§8.3 Output Validation', () => {
    it('rejects null output', async () => {
      registerAgent(buildAgentDef());
      const result = await validateAgentOutput('test-agent', null as any);
      expect(result.valid).toBe(false);
    });

    it('rejects non-object output', async () => {
      registerAgent(buildAgentDef());
      const result = await validateAgentOutput('test-agent', [] as any);
      expect(result.valid).toBe(false);
    });

    it('rejects mutations from observe-only agent', async () => {
      registerAgent(buildAgentDef({ executionMode: 'observe-only' }));
      const result = await validateAgentOutput('test-agent', { mutations: [{ field: 'x' }] });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('observe-only');
    });

    it('rejects direct actions from advisory agent', async () => {
      registerAgent(buildAgentDef({ executionMode: 'advisory' }));
      const result = await validateAgentOutput('test-agent', { directActions: [{ action: 'do' }] });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('advisory');
    });

    it('warns on sensitiveData field', async () => {
      registerAgent(buildAgentDef());
      const result = await validateAgentOutput('test-agent', { sensitiveData: true });
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('output contains sensitiveData field — ensure audit compliance');
    });

    it('accepts valid output', async () => {
      registerAgent(buildAgentDef());
      const result = await validateAgentOutput('test-agent', { summary: 'ok' });
      expect(result.valid).toBe(true);
    });
  });

  describe('§8.4 Health and Circuit Breaker', () => {
    it('tracks consecutive failures', () => {
      recordRunOutcome('t1', 'a1', false);
      recordRunOutcome('t1', 'a1', false);
      recordRunOutcome('t1', 'a1', true);
    });

    it('resets failure count on success', () => {
      recordRunOutcome('t1', 'a1', false);
      recordRunOutcome('t1', 'a1', false);
      recordRunOutcome('t1', 'a1', true);
    });
  });

  describe('§8.4 Agent Definition Completeness', () => {
    it('has all required Patch 8 §2.5 fields', () => {
      const def = buildAgentDef();
      expect(def.agentCode).toBeDefined();
      expect(def.name).toBeDefined();
      expect(def.version).toBeDefined();
      expect(def.agentType).toBeDefined();
      expect(def.ownerLayer).toBeDefined();
      expect(def.ownerCode).toBeDefined();
      expect(def.executionMode).toBeDefined();
      expect(def.defaultState).toBeDefined();
      expect(def.allowedTools).toBeDefined();
      expect(def.allowedContexts).toBeDefined();
      expect(def.allowedTaskTypes).toBeDefined();
      expect(def.allowedTriggerSources).toBeDefined();
      expect(def.writeBoundaries).toBeDefined();
      expect(def.completionSignals).toBeDefined();
      expect(def.requiredCapabilities).toBeDefined();
      expect(def.instructionSource).toBeDefined();
      expect(def.escalationRules).toBeDefined();
      expect(def.approvalPolicy).toBeDefined();
      expect(def.replacementPolicy).toBeDefined();
      expect(def.retryPolicy).toBeDefined();
      expect(def.eventSubscriptions).toBeDefined();
      expect(def.healthPolicy).toBeDefined();
      expect(def.observabilityProfile).toBeDefined();
      expect(def.uiExposurePolicy).toBeDefined();
    });

    it('has all required approval policy fields', () => {
      const p = buildAgentDef().approvalPolicy;
      expect(p.requiresApprovalForWrite).toBeDefined();
      expect(p.highRiskThreshold).toBeDefined();
      expect(p.autoApproveBelow).toBeDefined();
      expect(p.humanReviewRequired).toBeDefined();
      expect(p.selfApprovalBlocked).toBeDefined();
      expect(p.blockedActionCategories).toBeDefined();
      expect(p.fallbackResponse).toBeDefined();
      expect(p.safeRefusalBehavior).toBeDefined();
    });

    it('has all required replacement policy fields', () => {
      const p = buildAgentDef().replacementPolicy;
      expect(p.posture).toBeDefined();
      expect(p.targetRoles).toBeDefined();
      expect(p.allowedAutomationDepth).toBeDefined();
      expect(p.prohibitedZones).toBeDefined();
      expect(p.requiresGovernanceApproval).toBeDefined();
      expect(p.measurementCriteria).toBeDefined();
      expect(p.rollbackCriteria).toBeDefined();
      expect(p.supervisionRequired).toBeDefined();
      expect(p.accountabilityOwner).toBeDefined();
    });

    it('has all required health policy fields', () => {
      const p = buildAgentDef().healthPolicy;
      expect(p.maxConsecutiveFailures).toBeDefined();
      expect(p.healthCheckIntervalSeconds).toBeDefined();
      expect(p.circuitBreakerThreshold).toBeDefined();
      expect(p.cooldownSeconds).toBeDefined();
      expect(p.autoDisableOnFailure).toBeDefined();
    });
  });

  describe('§8.4 Execution Mode Coverage', () => {
    const modes = ['observe-only', 'advisory', 'drafting', 'co-pilot', 'delegated-executor', 'bounded-autonomous'] as const;

    for (const mode of modes) {
      it(`accepts execution mode: ${mode}`, () => {
        const def = buildAgentDef({ agentCode: `agent-${mode}`, executionMode: mode });
        registerAgent(def);
        expect(getAgentDefinition(`agent-${mode}`)!.executionMode).toBe(mode);
      });
    }
  });

  describe('§8.4 Replacement Posture Coverage', () => {
    const postures = ['preplacement', 'assisted-execution', 'delegated-execution', 'replacement-candidate', 'replacement-prohibited'] as const;

    for (const posture of postures) {
      it(`accepts replacement posture: ${posture}`, () => {
        const def = buildAgentDef({
          agentCode: `agent-${posture}`,
          replacementPolicy: { ...buildAgentDef().replacementPolicy, posture },
        });
        registerAgent(def);
        expect(getAgentDefinition(`agent-${posture}`)!.replacementPolicy.posture).toBe(posture);
      });
    }
  });

  describe('§8.4 Tool Risk Classification', () => {
    const levels = ['safe', 'moderate', 'high', 'critical'] as const;

    for (const level of levels) {
      it(`accepts tool risk level: ${level}`, () => {
        registerTool(buildToolDef({ toolCode: `tool-${level}`, riskLevel: level }));
        expect(getToolDefinition(`tool-${level}`)!.riskLevel).toBe(level);
      });
    }
  });
});
