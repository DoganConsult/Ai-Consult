import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { publish } from '../../events/event-bus';
import { v4 as uuid } from 'uuid';
import type { AgentApprovalRequest, ApprovalDecision, ToolRiskLevel } from '../contracts/agent.types';

const DEFAULT_EXPIRY_HOURS = 24;

export async function requestApproval(
  tenantId: string,
  params: {
    runId: string;
    agentCode: string;
    actionDescription: string;
    riskLevel: ToolRiskLevel;
    toolCode: string;
    requestedBy: string;
  },
): Promise<AgentApprovalRequest> {
  const approvalId = uuid();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000);
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `INSERT INTO "${schema}".dos_agent_approvals
       (approval_id, run_id, agent_code, tenant_id, action_description, risk_level,
        tool_code, requested_by, requested_at, decision, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10)`,
    [
      approvalId, params.runId, params.agentCode, tenantId,
      params.actionDescription, params.riskLevel, params.toolCode,
      params.requestedBy, now.toISOString(), expiresAt.toISOString(),
    ],
  );

  await publish('agent.approval.requested', tenantId, {
    approvalId, runId: params.runId, agentCode: params.agentCode,
    riskLevel: params.riskLevel, toolCode: params.toolCode,
  });

  return {
    approvalId,
    runId: params.runId,
    agentCode: params.agentCode,
    tenantId,
    actionDescription: params.actionDescription,
    riskLevel: params.riskLevel,
    toolCode: params.toolCode,
    requestedBy: params.requestedBy,
    requestedAt: now.toISOString(),
    decision: 'pending',
    expiresAt: expiresAt.toISOString(),
  };
}

export async function resolveApproval(
  tenantId: string,
  approvalId: string,
  decision: 'approved' | 'denied',
  decidedBy: string,
  reason?: string,
): Promise<AgentApprovalRequest | null> {
  const schema = tenantSchema(tenantId);
  const now = new Date().toISOString();

  const { rows } = await safeQuery(
    `UPDATE "${schema}".dos_agent_approvals
     SET decision = $2, decided_by = $3, decided_at = $4, reason = $5
     WHERE approval_id = $1 AND decision = 'pending'
     RETURNING *`,
    [approvalId, decision, decidedBy, now, reason || null],
  );

  if (!rows[0]) return null;

  const eventType = decision === 'approved' ? 'agent.approval.granted' : 'agent.approval.denied';
  await publish(eventType, tenantId, {
    approvalId, runId: rows[0].run_id, agentCode: rows[0].agent_code,
    decidedBy, decision, reason,
  });

  return mapApprovalRow(rows[0]);
}

export async function getApprovalById(tenantId: string, approvalId: string): Promise<AgentApprovalRequest | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".dos_agent_approvals WHERE approval_id = $1 LIMIT 1`,
    [approvalId],
  );
  return rows[0] ? mapApprovalRow(rows[0]) : null;
}

export async function getPendingApprovals(tenantId: string, limit = 50): Promise<AgentApprovalRequest[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".dos_agent_approvals
     WHERE decision = 'pending' AND expires_at > NOW()
     ORDER BY requested_at ASC LIMIT $1`,
    [limit],
  );
  return rows.map(mapApprovalRow);
}

export async function getApprovalsByRun(tenantId: string, runId: string): Promise<AgentApprovalRequest[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".dos_agent_approvals WHERE run_id = $1 ORDER BY requested_at ASC`,
    [runId],
  );
  return rows.map(mapApprovalRow);
}

export async function expireStaleApprovals(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".dos_agent_approvals SET decision = 'expired' WHERE decision = 'pending' AND expires_at <= NOW()`,
    [],
  );
  return result.rowCount ?? 0;
}

function mapApprovalRow(r: Record<string, unknown>): AgentApprovalRequest {
  return {
    approvalId: r.approval_id as string,
    runId: r.run_id as string,
    agentCode: r.agent_code as string,
    tenantId: r.tenant_id as string,
    actionDescription: r.action_description as string,
    riskLevel: r.risk_level as ToolRiskLevel,
    toolCode: r.tool_code as string,
    requestedBy: r.requested_by as string,
    requestedAt: (r.requested_at as Date)?.toISOString?.() || (r.requested_at as string),
    decision: r.decision as ApprovalDecision,
    decidedBy: (r.decided_by as string) || undefined,
    decidedAt: (r.decided_at as Date)?.toISOString?.() || (r.decided_at as string) || undefined,
    reason: (r.reason as string) || undefined,
    expiresAt: (r.expires_at as Date)?.toISOString?.() || (r.expires_at as string),
  };
}

export const agentApprovalService = {
  requestApproval,
  resolveApproval,
  getApprovalById,
  getPendingApprovals,
  getApprovalsByRun,
  expireStaleApprovals,
};
