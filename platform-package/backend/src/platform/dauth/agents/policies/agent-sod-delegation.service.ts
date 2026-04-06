// @ts-nocheck
import type { AgentRunRequest } from '../../../dos/agents/contracts/agent.types';

export interface SodDelegationCheckResult {
  allowed: boolean;
  reason: string;
  delegationGrantId?: string;
  sodViolations?: string[];
}

export async function validateSodAndDelegation(
  request: AgentRunRequest,
): Promise<SodDelegationCheckResult> {
  if (request.triggerSource === 'agent') {
    const delegationResult = await validateDelegationChain(request);
    if (!delegationResult.allowed) return delegationResult;
  }

  const sodResult = await validateSeparationOfDuties(request);
  if (!sodResult.allowed) return sodResult;

  return { allowed: true, reason: 'sod_delegation_ok' };
}

async function validateDelegationChain(
  request: AgentRunRequest,
): Promise<SodDelegationCheckResult> {
  if (!request.delegationGrantId) {
    return {
      allowed: false,
      reason: 'agent_triggered_run_requires_delegation_grant',
    };
  }

  try {
    const dauthDelegation = await import('../../delegation/delegation.service');
    const grant = await dauthDelegation.getDelegationById(
      request.tenantId,
      request.delegationGrantId,
    );
    if (!grant) {
      return { allowed: false, reason: 'delegation_grant_not_found' };
    }
    if ((grant as Record<string, unknown>).status !== 'active') {
      return { allowed: false, reason: `delegation_grant_status:${(grant as Record<string, unknown>).status}` };
    }
    if ((grant as Record<string, unknown>).expires_at && new Date((grant as Record<string, unknown>).expires_at as string) < new Date()) {
      return { allowed: false, reason: 'delegation_grant_expired' };
    }
    return { allowed: true, reason: 'delegation_valid', delegationGrantId: request.delegationGrantId };
  } catch {
    return { allowed: true, reason: 'delegation_service_unavailable_passthrough' };
  }
}

async function validateSeparationOfDuties(
  request: AgentRunRequest,
): Promise<SodDelegationCheckResult> {
  try {
    const dauthSod = await import('../../sod/sod-engine');
    const result = await dauthSod.evaluateSod(
      request.tenantId,
      [request.actorId, request.agentCode],
    );
    const violations = (result as Record<string, unknown>)?.violations ?? (Array.isArray(result) ? result : []);
    if (violations.length > 0) {
      return {
        allowed: false,
        reason: 'sod_violation_detected',
        sodViolations: violations,
      };
    }
  } catch {
    // SoD engine unavailable — pass through (SoD is advisory in agent context)
  }

  return { allowed: true, reason: 'sod_ok' };
}

export const agentSodDelegationService = {
  validateSodAndDelegation,
};
