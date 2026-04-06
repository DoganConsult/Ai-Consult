// @ts-nocheck
// ============================================
// Shahin — Cross-Module Chain Handler
// EVENT-DRIVEN chain orchestrator. Subscribes to domain events
// (risk.treatment_updated, incident.escalated, etc.) and
// process_task.completed to advance chains step-by-step.
//
// Architecture (Chain Execution Truth):
//   CANONICAL SPLIT — no duplication, shared DB tables:
//   ┌──────────────────────────────────────────────────────────────┐
//   │ workflow-chain-executor.service.ts (REST / manual API)      │
//   │   → startChain(), advanceChain(), getChainDefinitions()     │
//   │   → Used by workflow-chain.routes.ts for admin/REST calls   │
//   │   → Returns structured results, validates definitions       │
//   ├──────────────────────────────────────────────────────────────┤
//   │ cross-module-chain-handler.service.ts (THIS FILE)           │
//   │   → Event-driven runtime (auto-trigger via EventBus)        │
//   │   → startChain(), advanceChain() for event-driven flows     │
//   │   → Creates process_tasks for step execution                │
//   │   → SoD enforcement, condition evaluation, auto-advance     │
//   ├──────────────────────────────────────────────────────────────┤
//   │ SHARED DB tables:                                           │
//   │   workflow_chain_definitions                                │
//   │   workflow_chain_instances                                  │
//   │   workflow_chain_step_log                                   │
//   └──────────────────────────────────────────────────────────────┘
// ============================================

import { safeQuery, tenantSchema } from '../../../../config/database';
import { eventBus } from '../event/event-bus.service';
import type { PlatformEvent } from '../event/event-bus.service';
import { logger } from '../../../../platform/dos/observability/services/logger.service';
import { getFirstRow } from '../../../../utils/db-utils';
import {
  startChain as coreStartChain,
  advanceChainStep as coreAdvanceChain,
} from '../../../workflow/services/chains/chain-core';

// Types re-exported from chain-core.ts — no local type definitions.

// ── Chain Instance Lifecycle (delegates to chain-core) ───────────────────────

export async function startChain(
  tenantId: string,
  chainCode: string,
  triggerEntityType: string,
  triggerEntityId: string,
  context: Record<string, any> = {},
  createdBy?: string,
): Promise<string | null> {
  const result = await coreStartChain(
    tenantId, chainCode, triggerEntityType, triggerEntityId, context, createdBy,
  );
  return result?.instanceId ?? null;
}

export async function advanceChain(
  tenantId: string,
  instanceId: string,
  completedTaskId: string,
): Promise<void> {
  await coreAdvanceChain(tenantId, instanceId, completedTaskId);
}

// ── Register Event Subscribers ───────────────────────────────────────────────

let registered = false;

function chainSub(eventType: string, subKey: string, chainCode: string, entityType: string, entityIdField: string, opts?: { severityGate?: string[]; extraCtx?: (p: Record<string, any>) => Record<string, any> }): void {
  eventBus.subscribe(eventType, subKey, async (event: PlatformEvent) => {
    const { tenantId, payload } = event;
    const eid = payload?.[entityIdField] || payload?.entityId;
    if (!tenantId || !eid) return;
    if (opts?.severityGate && !opts.severityGate.includes(payload?.severity)) return;
    try {
      const ctx: Record<string, any> = { triggerEntityId: eid, createdBy: payload.userId, severity: payload.severity || 'medium' };
      if (opts?.extraCtx) Object.assign(ctx, opts.extraCtx(payload));
      await startChain(tenantId, chainCode, entityType, eid, ctx, payload.userId);
    } catch (err) { logger.warn(`[Chain] ${chainCode} start failed: ${(err as Error).message}`); }
  });
}

export function registerCrossModuleChainHandlers(): void {
  if (registered) return;
  registered = true;

  chainSub('risk.treatment_updated', 'chain-risk-to-compliance', 'risk_to_compliance_score', 'risk', 'riskId', { extraCtx: (p) => ({ riskEntityId: p.riskId }) });
  chainSub('incident.escalated', 'chain-incident-to-remediation', 'incident_to_remediation', 'incident', 'incidentId', { severityGate: ['high', 'critical'], extraCtx: (p) => ({ incidentEntityId: p.incidentId }) });
  chainSub('audit.finding.issued', 'chain-audit-to-control', 'audit_to_control_update', 'audit', 'findingId', { extraCtx: (p) => ({ auditEntityId: p.engagementId || p.findingId }) });
  chainSub('policy.published', 'chain-policy-to-compliance', 'policy_to_compliance_impact', 'policy', 'policyId', { extraCtx: (p) => ({ policyEntityId: p.policyId }) });
  chainSub('vendor.dd_completed', 'chain-vendor-to-bcp', 'vendor_to_bcp_impact', 'vendor', 'vendorId', { severityGate: ['high', 'critical'], extraCtx: (p) => ({ vendorEntityId: p.vendorId, severity: p.riskRating, vendor_criticality: p.criticality || 'normal' }) });
  chainSub('training.completed', 'chain-training-to-compliance', 'training_to_compliance', 'training', 'campaignId', { extraCtx: (p) => ({ trainingEntityId: p.campaignId }) });
  chainSub('asset.classified', 'chain-asset-to-risk', 'asset_to_risk', 'asset', 'assetId', { extraCtx: (p) => ({ assetEntityId: p.assetId, severity: p.classification === 'confidential' ? 'high' : 'medium' }) });
  chainSub('exception.expired', 'chain-exception-to-policy', 'exception_to_policy', 'exception', 'exceptionId', { extraCtx: (p) => ({ exceptionEntityId: p.exceptionId }) });
  chainSub('compliance.gap_detected', 'chain-compliance-gap-to-remediation', 'compliance_gap_to_remediation', 'compliance', 'entityId');
  chainSub('compliance.posture_changed', 'chain-compliance-posture-to-reporting', 'compliance_posture_to_reporting', 'compliance', 'frameworkCode', { extraCtx: (p) => ({ newPosture: p.newPosture }) });
  chainSub('governance.charter_expired', 'chain-governance-charter-to-review', 'governance_charter_to_review', 'governance', 'entityId');
  chainSub('governance.mandate_updated', 'chain-governance-mandate-to-compliance', 'governance_mandate_to_compliance', 'governance', 'entityId');
  chainSub('bcp.plan_activated', 'chain-bcp-activation-to-incident', 'bcp_activation_to_incident', 'bcp', 'planId', { extraCtx: () => ({ severity: 'critical' }) });
  chainSub('bcp.crisis_readiness_low', 'chain-bcp-crisis-to-escalation', 'bcp_crisis_to_escalation', 'bcp', 'planId', { extraCtx: () => ({ severity: 'high' }) });
  chainSub('foundation.scope_changed', 'chain-foundation-scope-to-compliance', 'foundation_scope_to_compliance', 'foundation', 'entityId');
  chainSub('integrations.sync_failed', 'chain-integration-failure-to-review', 'integration_failure_to_review', 'integrations', 'connectorId', { extraCtx: () => ({ severity: 'high' }) });
  chainSub('issues.created', 'chain-issue-to-remediation', 'issue_to_remediation', 'issues', 'issueId');
  chainSub('issues.escalated', 'chain-issue-escalation-to-governance', 'issue_escalation_to_governance', 'issues', 'issueId', { extraCtx: () => ({ severity: 'high' }) });
  chainSub('inbox.priority_escalated', 'chain-inbox-escalation-to-workflow', 'inbox_escalation_to_workflow', 'inbox', 'messageId');
  chainSub('portals.access_denied', 'chain-portal-access-denied-to-review', 'portal_access_denied_to_review', 'portals', 'portalId');
  chainSub('portals.suspended', 'chain-portal-suspended-to-vendor', 'portal_suspended_to_vendor', 'portals', 'portalId');
  chainSub('records.disposal_requested', 'chain-records-disposal-to-governance', 'records_disposal_to_governance', 'records', 'recordId');
  chainSub('privacy.breach_detected', 'chain-privacy-breach-to-notification', 'privacy_breach_to_notification', 'privacy', 'entityId', { extraCtx: () => ({ severity: 'critical' }) });
  chainSub('privacy.dsr_received', 'chain-privacy-dsr-to-compliance', 'privacy_dsr_to_compliance', 'privacy', 'requestId');

  // Generic: process_task.completed → advance any active chain
  eventBus.subscribe('process_task.completed', 'chain-task-advance', async (event: PlatformEvent) => {
    const { tenantId, payload } = event;
    if (!tenantId || !payload?.taskId) return;

    try {
      const schema = tenantSchema(tenantId);
      const logResult = await safeQuery(
        `SELECT wcsl.instance_id FROM "${schema}".workflow_chain_step_log wcsl
         JOIN "${schema}".workflow_chain_instances wci ON wci.instance_id = wcsl.instance_id
         WHERE wcsl.task_id = $1 AND wcsl.status = 'in_progress' AND wci.status = 'active'
         LIMIT 1`,
        [payload.taskId],
      );

      if (logResult.rows.length > 0) {
        await advanceChain(tenantId, getFirstRow(logResult)?.instance_id, payload.taskId);
      }
    } catch (err) { logger.warn(`[Chain] chain advance failed: ${(err as Error).message}`); }
  });
}

// ── Query Helpers (delegated to chain-core.ts) ──────────────────────────────

export { getChainInstances, getChainStepLog } from '../../../workflow/services/chains/chain-core';
