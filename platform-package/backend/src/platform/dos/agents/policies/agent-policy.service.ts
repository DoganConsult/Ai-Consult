import { getAgentDefinition } from '../registry/agent-registry.service';
import type { AgentDefinition, AgentRunRequest, AgentExecutionMode, ReplacementPosture } from '../contracts/agent.types';

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason: string;
  warnings: string[];
}

export async function evaluateAgentPolicy(
  tenantId: string,
  agentCode: string,
  request: AgentRunRequest,
): Promise<PolicyEvaluationResult> {
  const def = getAgentDefinition(agentCode);
  if (!def) {
    return { allowed: false, reason: 'agent_not_registered', warnings: [] };
  }

  const warnings: string[] = [];

  if (def.executionMode === 'delegated-executor' && !request.delegationGrantId) {
    return { allowed: false, reason: 'delegated_executor_requires_delegation_grant_id', warnings };
  }

  const triggerResult = evaluateTriggerSourcePolicy(def, request);
  if (!triggerResult.allowed) return { ...triggerResult, warnings };

  const taskTypeResult = evaluateTaskTypePolicy(def, request);
  if (!taskTypeResult.allowed) return { ...taskTypeResult, warnings };

  const writeBoundaryResult = evaluateWriteBoundaryPolicy(def, request);
  if (!writeBoundaryResult.allowed) return { ...writeBoundaryResult, warnings };

  const modeResult = evaluateExecutionModePolicy(def.executionMode, request);
  if (!modeResult.allowed) return { ...modeResult, warnings };

  const replacementResult = evaluateReplacementPolicy(def.replacementPolicy.posture, request);
  if (!replacementResult.allowed) return { ...replacementResult, warnings };
  warnings.push(...replacementResult.warnings);

  if (def.approvalPolicy.selfApprovalBlocked && request.actorId === request.agentCode) {
    return { allowed: false, reason: 'self_approval_blocked', warnings };
  }

  if (def.approvalPolicy.blockedActionCategories.length > 0) {
    const action = (request.input?.action as string) || '';
    for (const blocked of def.approvalPolicy.blockedActionCategories) {
      if (action.includes(blocked)) {
        return { allowed: false, reason: `action_category_blocked:${blocked}`, warnings };
      }
    }
  }

  if (request.delegationGrantId) {
    try {
      const dauthDelegation = await import('../../../dauth/delegation/acting-on-behalf-of.service');
      const ctx = await dauthDelegation.resolveActingContext(tenantId, request.agentCode, request.delegationGrantId);
      if (!ctx) {
        return { allowed: false, reason: 'delegation_grant_invalid_or_expired', warnings };
      }
    } catch {
      return { allowed: false, reason: 'delegation_validation_unavailable_deny_by_default', warnings };
    }
  }

  const sodResult = await evaluateSodPolicy(tenantId, request);
  if (!sodResult.allowed) return { ...sodResult, warnings };

  const lcResult = await evaluateLifecyclePolicy(tenantId, request);
  if (!lcResult.allowed) return { ...lcResult, warnings };

  const mcResult = evaluateMakerCheckerPolicy(def, request);
  if (!mcResult.allowed) return { ...mcResult, warnings };

  return { allowed: true, reason: 'policy_passed', warnings };
}

async function evaluateSodPolicy(
  tenantId: string,
  request: AgentRunRequest,
): Promise<PolicyEvaluationResult> {
  const rolesCsv = request.input?.roles;
  if (!rolesCsv || !Array.isArray(rolesCsv) || rolesCsv.length < 2) {
    return { allowed: true, reason: 'sod_not_applicable', warnings: [] };
  }
  try {
    const { evaluateSod } = await import('../../../dauth/sod/sod-engine');
    const result = await evaluateSod(tenantId, rolesCsv as string[], {
      moduleCode: (request.input?.moduleCode as string) || undefined,
    });
    if (!result.passed && result.outcome === 'block') {
      return { allowed: false, reason: `sod_violation:${result.violations.map(v => `${v.roleA}<>${v.roleB}`).join(',')}`, warnings: [] };
    }
  } catch {
    return { allowed: false, reason: 'sod_check_unavailable_deny_by_default', warnings: [] };
  }
  return { allowed: true, reason: 'sod_ok', warnings: [] };
}

async function evaluateLifecyclePolicy(
  tenantId: string,
  request: AgentRunRequest,
): Promise<PolicyEvaluationResult> {
  const fromState = request.input?.fromState as string | undefined;
  const toState = request.input?.toState as string | undefined;
  if (!fromState || !toState) {
    return { allowed: true, reason: 'lifecycle_not_applicable', warnings: [] };
  }
  try {
    const { evaluateLifecycleTransition } = await import('../../../dauth/lifecycle-auth/lifecycle-auth.service');
    const result = await evaluateLifecycleTransition(tenantId, request.actorId, {
      moduleCode: (request.input?.moduleCode as string) || '',
      entityType: (request.input?.entityType as string) || '',
      entityId: (request.input?.entityId as string) || '',
      fromState,
      toState,
      permissionCode: (request.input?.permissionCode as string) || '',
      userRoles: (request.input?.roles as string[]) || [],
    });
    if (!result.allowed) {
      return { allowed: false, reason: `lifecycle_auth_denied:${result.reason}`, warnings: [] };
    }
  } catch {
    return { allowed: false, reason: 'lifecycle_auth_unavailable_deny_by_default', warnings: [] };
  }
  return { allowed: true, reason: 'lifecycle_ok', warnings: [] };
}

function evaluateMakerCheckerPolicy(
  def: AgentDefinition,
  request: AgentRunRequest,
): PolicyEvaluationResult {
  const lastActorId = request.input?.lastActorId as string | undefined;
  if (lastActorId && lastActorId === request.actorId && def.approvalPolicy.selfApprovalBlocked) {
    return { allowed: false, reason: 'maker_checker_violation:same_actor_as_previous_step', warnings: [] };
  }
  return { allowed: true, reason: 'maker_checker_ok', warnings: [] };
}

function evaluateTriggerSourcePolicy(
  def: AgentDefinition,
  request: AgentRunRequest,
): PolicyEvaluationResult {
  if (def.allowedTriggerSources.length === 0) {
    return { allowed: true, reason: 'trigger_source_unrestricted', warnings: [] };
  }
  if (!def.allowedTriggerSources.includes(request.triggerSource)) {
    return { allowed: false, reason: `trigger_source_not_allowed:${request.triggerSource}`, warnings: [] };
  }
  return { allowed: true, reason: 'trigger_source_ok', warnings: [] };
}

function evaluateTaskTypePolicy(
  def: AgentDefinition,
  request: AgentRunRequest,
): PolicyEvaluationResult {
  const taskType = request.input?.taskType as string | undefined;
  if (!taskType || def.allowedTaskTypes.length === 0) {
    return { allowed: true, reason: 'task_type_unrestricted', warnings: [] };
  }
  if (!def.allowedTaskTypes.includes(taskType)) {
    return { allowed: false, reason: `task_type_not_allowed:${taskType}`, warnings: [] };
  }
  return { allowed: true, reason: 'task_type_ok', warnings: [] };
}

function evaluateWriteBoundaryPolicy(
  def: AgentDefinition,
  request: AgentRunRequest,
): PolicyEvaluationResult {
  if (def.writeBoundaries.length === 0) {
    return { allowed: true, reason: 'write_boundary_unrestricted', warnings: [] };
  }
  const target = request.input?.writeTarget as string | undefined;
  if (!target) {
    return { allowed: true, reason: 'write_boundary_no_target', warnings: [] };
  }
  const allowed = def.writeBoundaries.some(b => target.startsWith(b) || b === '*');
  if (!allowed) {
    return { allowed: false, reason: `write_boundary_violation:${target}`, warnings: [] };
  }
  return { allowed: true, reason: 'write_boundary_ok', warnings: [] };
}

function evaluateExecutionModePolicy(
  mode: AgentExecutionMode,
  request: AgentRunRequest,
): PolicyEvaluationResult {
  const writeActions = ['create', 'update', 'delete', 'approve', 'execute'];
  const action = (request.input?.action as string) || '';
  const isWrite = writeActions.some(w => action.toLowerCase().includes(w));

  if (mode === 'observe-only' && isWrite) {
    return { allowed: false, reason: 'observe_only_agent_cannot_write', warnings: [] };
  }
  if (mode === 'advisory' && isWrite) {
    return { allowed: false, reason: 'advisory_agent_cannot_write', warnings: [] };
  }

  return { allowed: true, reason: 'mode_ok', warnings: [] };
}

function evaluateReplacementPolicy(
  posture: ReplacementPosture,
  _request: AgentRunRequest,
): PolicyEvaluationResult {
  if (posture === 'replacement-prohibited') {
    return { allowed: true, reason: 'replacement_prohibited_acknowledged', warnings: ['replacement_prohibited_zone'] };
  }
  return { allowed: true, reason: 'replacement_posture_ok', warnings: [] };
}

export const agentPolicyService = {
  evaluateAgentPolicy,
};
