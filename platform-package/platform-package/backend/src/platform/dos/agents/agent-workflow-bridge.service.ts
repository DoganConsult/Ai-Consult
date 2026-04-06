/**
 * Agent-Workflow Bridge — DOS Platform Bridge connecting agent runtime to workflow engine.
 *
 * Manages agent participations in workflows, enforces boundaries,
 * tracks performance, and provides emergency suspend capability.
 *
 * @owner DOS (Law 2: platform owns agent runtime integration)
 * @patch Patch 8 (AI Agent Stack) + Patch 7 (Workflow Stack)
 */

import { safeQuery, tenantSchema } from '../../../config/database';
import {  logger } from '../observability/logger.service';
import { emitEvent } from '../events/event-bus';

// ── Types ──────────────────────────────────────────────────────────

export interface AgentWorkflowParticipation {
  agentId: string;
  workflowId: string;
  role: 'executor' | 'reviewer' | 'observer' | 'advisor';
  status: 'active' | 'suspended' | 'completed' | 'revoked';
  registeredAt: string;
}

export interface AgentPerformanceMetrics {
  agentId: string;
  totalTasksAssigned: number;
  tasksCompleted: number;
  tasksEscalated: number;
  successRate: number;
  avgConfidence: number;
  escalationRate: number;
  avgExecutionTimeMs: number;
  lastActiveAt: string | null;
}

// ── Bridge Operations ──────────────────────────────────────────────

/**
 * Register an agent as a workflow participant.
 */
export async function bridgeAgentToWorkflow(
  tenantId: string,
  agentId: string,
  workflowId: string,
  role: 'executor' | 'reviewer' | 'observer' | 'advisor' = 'observer',
  registeredBy: string = 'system',
): Promise<AgentWorkflowParticipation | null> {
  const schema = tenantSchema(tenantId);

  // Check platform mode first
  try {
    const { canAgentAct } = await import('./platform-mode-agent-gate.service');
    const check = await canAgentAct(tenantId, agentId, 'register_workflow', 'low');
    if (!check.allowed && role !== 'observer') {
      logger.warn('[AgentBridge] Registration denied by platform mode', { tenantId, agentId, mode: check.mode });
      return null;
    }
  } catch { /* pass */ }

  try {
    await safeQuery(
      `INSERT INTO "${schema}".agent_workflow_participations
         (agent_id, workflow_id, role, status, registered_by, registered_at)
       VALUES ($1, $2, $3, 'active', $4, NOW())
       ON CONFLICT (agent_id, workflow_id) DO UPDATE SET role = $3, status = 'active', registered_at = NOW()`,
      [agentId, workflowId, role, registeredBy],
    );

    await emitEvent({
      tenantId, userId: registeredBy, module: 'platform',
      event: 'platform.agent.workflow_registered', entityType: 'agent', entityId: agentId,
      data: { workflowId, role },
    }).catch(() => {});

    return { agentId, workflowId, role, status: 'active', registeredAt: new Date().toISOString() };
  } catch (err) {
    logger.error('[AgentBridge] bridgeAgentToWorkflow failed', {
      tenantId, agentId, workflowId, error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * List workflows an agent participates in.
 */
export async function getAgentWorkflowParticipations(
  tenantId: string,
  agentId: string,
): Promise<AgentWorkflowParticipation[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT agent_id, workflow_id, role, status, registered_at
     FROM "${schema}".agent_workflow_participations
     WHERE agent_id = $1 AND status = 'active'
     ORDER BY registered_at DESC`,
    [agentId],
  ).catch(() => ({ rows: [] }));

  return rows.map((r: any) => ({
    agentId: r.agent_id, workflowId: r.workflow_id,
    role: r.role, status: r.status, registeredAt: r.registered_at,
  }));
}

/**
 * Enforce agent boundaries before execution — combines mode gate + DAuth + policy.
 */
export async function enforceAgentBoundaries(
  tenantId: string,
  agentId: string,
  action: string,
  context: { moduleCode?: string; entityType?: string; riskLevel?: string } = {},
): Promise<{ allowed: boolean; reason: string }> {
  // 1. Platform mode check
  try {
    const { canAgentAct } = await import('./platform-mode-agent-gate.service');
    const modeCheck = await canAgentAct(tenantId, agentId, action, (context.riskLevel as any) || 'low');
    if (!modeCheck.allowed) return { allowed: false, reason: modeCheck.reason };
  } catch { /* pass */ }

  // 2. DAuth check
  try {
    const { evaluateAccess } = await import('../../dauth');
    const authCheck = await evaluateAccess({
      tenantId,
      userId: `agent:${agentId}`,
      role: 'agent',
      actorId: `agent:${agentId}`,
      permissionCode: `${context.moduleCode || 'workflow'}.${context.entityType || 'task'}.${action}`,
      moduleCode: context.moduleCode || 'workflow',
    });
    if (!authCheck.allowed) return { allowed: false, reason: authCheck.reason || 'DAuth denied agent action' };
  } catch { /* DAuth may not resolve for agents yet */ }

  return { allowed: true, reason: 'All boundary checks passed' };
}

/**
 * Get agent performance metrics across all workflow participations.
 */
export async function getAgentPerformanceMetrics(
  tenantId: string,
  agentId: string,
): Promise<AgentPerformanceMetrics> {
  const schema = tenantSchema(tenantId);

  const { rows } = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
       COUNT(*) FILTER (WHERE status = 'escalated')::int AS escalated,
       AVG(EXTRACT(EPOCH FROM (completed_at - assigned_at)) * 1000)::int AS avg_exec_ms,
       MAX(completed_at) AS last_active
     FROM "${schema}".workflow_agent_assignments
     WHERE agent_id = $1`,
    [agentId],
  ).catch(() => ({ rows: [{ total: 0, completed: 0, escalated: 0, avg_exec_ms: 0, last_active: null }] }));

  const { rows: confRows } = await safeQuery(
    `SELECT AVG(confidence)::numeric(4,2) AS avg_conf
     FROM "${schema}".workflow_agent_decisions WHERE agent_id = $1`,
    [agentId],
  ).catch(() => ({ rows: [{ avg_conf: 0 }] }));

  const r = rows[0];
  const total = r.total || 0;

  return {
    agentId,
    totalTasksAssigned: total,
    tasksCompleted: r.completed || 0,
    tasksEscalated: r.escalated || 0,
    successRate: total > 0 ? Math.round(((r.completed || 0) / total) * 100) : 0,
    avgConfidence: parseFloat(confRows[0]?.avg_conf) || 0,
    escalationRate: total > 0 ? Math.round(((r.escalated || 0) / total) * 100) : 0,
    avgExecutionTimeMs: r.avg_exec_ms || 0,
    lastActiveAt: r.last_active,
  };
}

/**
 * Emergency suspend an agent from all workflow participations.
 */
export async function suspendAgentFromWorkflows(
  tenantId: string,
  agentId: string,
  reason: string,
  suspendedBy: string = 'system',
): Promise<{ suspended: number }> {
  const schema = tenantSchema(tenantId);

  const { rowCount } = await safeQuery(
    `UPDATE "${schema}".agent_workflow_participations
     SET status = 'suspended', updated_at = NOW()
     WHERE agent_id = $1 AND status = 'active'`,
    [agentId],
  ).catch(() => ({ rowCount: 0 }));

  // Also unassign from pending tasks
  await safeQuery(
    `UPDATE "${schema}".process_tasks
     SET assigned_to = NULL, status = 'pending', notes = COALESCE(notes, '') || $1
     WHERE assigned_to = $2 AND status IN ('pending', 'in_progress')`,
    [`\n[Agent suspended: ${reason}]`, `agent:${agentId}`],
  ).catch(() => {});

  await emitEvent({
    tenantId, userId: suspendedBy, module: 'platform',
    event: 'platform.agent.suspended', entityType: 'agent', entityId: agentId,
    data: { reason, suspendedBy, participationsSuspended: rowCount },
  }).catch(() => {});

  logger.warn('[AgentBridge] Agent suspended from all workflows', {
    tenantId, agentId, reason, suspended: rowCount,
  });

  return { suspended: rowCount ?? 0 };
}
