/**
 * MODULE_EVENT_CONTRACTS — Authoritative event names per module.
 *
 * Rule R1: This constant is the SINGLE SOURCE OF TRUTH for event names.
 *   MWR event_types column is seeded FROM this constant.
 *   Domain code must emit exactly the events declared here.
 *
 * Rule R2: Platform modules have empty event arrays — by design.
 * Rule R3: ai-governance events use underscore (ai_governance.*).
 *
 * CONFIG BOUNDARY: owner = product (AGRC/Shahin-AI).
 */

import { CanonicalModuleCode } from './canonical-modules';

export interface ModuleEventContract {
  /** All events this module emits (full list). */
  events: string[];
  /** Subset of events that can trigger cross-module chains. */
  chainTriggerEvents: string[];
}

export const MODULE_EVENT_CONTRACTS: Record<CanonicalModuleCode, ModuleEventContract> = {
  // ── Full Workflow (13 modules) ─────────────────────────────────────
  // Synced with actual emitEvent / eventBus.publish calls in each module's routes + services.
  risk: {
    events: [
      'risk.created', 'risk.updated', 'risk.deleted', 'risk.status_changed',
      'risk.score_changed', 'risk.exceeded_appetite', 'risk.treatment_updated',
      'risk.auto_scored',
    ],
    chainTriggerEvents: ['risk.treatment_updated'],
  },
  compliance: {
    events: [
      'compliance.created', 'compliance.updated', 'compliance.status_changed',
      'compliance.assessment_completed', 'compliance.posture_changed',
      'compliance.drift_detected', 'compliance.gap_detected',
    ],
    chainTriggerEvents: ['compliance.gap_detected', 'compliance.posture_changed'],
  },
  policy: {
    events: [
      'policy.created', 'policy.updated', 'policy.deleted', 'policy.status_changed',
      'policy.published', 'policy.review_due', 'policy.expired',
      'policy.attestation_requested', 'policy.attested', 'policy.impact_simulated',
    ],
    chainTriggerEvents: ['policy.published'],
  },
  evidence: {
    events: [
      'evidence.collected', 'evidence.submitted', 'evidence.approved',
      'evidence.rejected', 'evidence.status_changed', 'evidence.version_created',
      'evidence.request_submitted',
    ],
    chainTriggerEvents: [],
  },
  audit: {
    events: [
      'audit.created', 'audit.completed', 'audit.status_changed',
      'audit.finding_created', 'audit.finding.issued', 'audit.workpaper_generated', 'audit_prep.generated',
    ],
    chainTriggerEvents: ['audit.finding.issued'],
  },
  incident: {
    events: [
      'incident.created', 'incident.updated', 'incident.status_changed',
      'incident.escalated', 'incident.resolved',
      'incident.root_cause_identified', 'incident.severity_updated',
    ],
    chainTriggerEvents: ['incident.escalated'],
  },
  exception: {
    events: [
      'exception.created', 'exception.approved', 'exception.rejected',
      'exception.expired', 'exception.status_changed',
    ],
    chainTriggerEvents: ['exception.expired'],
  },
  governance: {
    events: [
      'governance.created', 'governance.updated', 'governance.status_changed',
      'governance.raci_assigned', 'governance.raci_removed', 'governance.owner_assigned',
      'governance.obligation_acknowledged', 'governance.action_created',
      'governance.charter_expired', 'governance.mandate_updated',
    ],
    chainTriggerEvents: ['governance.charter_expired', 'governance.mandate_updated'],
  },
  vendor: {
    events: [
      'vendor.created', 'vendor.updated', 'vendor.status_changed',
      'vendor.onboarding_requested', 'vendor.dd_completed',
      'vendor.risk_changed', 'vendor.posture_recalculated',
      'vendor.compliance_check_completed', 'vendor.questionnaire_distributed',
    ],
    chainTriggerEvents: ['vendor.dd_completed', 'vendor.questionnaire_distributed'],
  },
  bcp: {
    events: [
      'bcp.created', 'bcp.updated', 'bcp.status_changed',
      'bcp.exercise_scheduled', 'bcp.exercise_completed',
      'bcp.plan_activated', 'bcp.plan_deactivated',
      'bcp.crisis_readiness_low', 'bcp.health_check_completed',
      'bcp.recovery_step_completed',
    ],
    chainTriggerEvents: ['bcp.plan_activated', 'bcp.crisis_readiness_low', 'bcp.exercise_completed', 'bcp.recovery_step_completed'],
  },
  asset: {
    events: [
      'asset.created', 'asset.updated', 'asset.deleted', 'asset.status_changed',
      'asset.classified', 'asset.decommissioned', 'asset.inventory_updated',
    ],
    chainTriggerEvents: ['asset.classified'],
  },
  remediation: {
    events: [
      'remediation.created', 'remediation.completed', 'remediation.status_changed',
      'remediation.task_created', 'remediation.overdue',
      'finding.remediated',
    ],
    chainTriggerEvents: [],
  },
  action: {
    events: [
      'action.created', 'action.updated', 'action.deleted', 'action.status_changed',
      'action.completed', 'action.dispatched', 'action.overdue',
    ],
    chainTriggerEvents: [],
  },

  // ── Domain Workflow (3 modules) ────────────────────────────────────
  training: {
    events: [
      'training.content_published', 'training.campaign_launched',
      'training.assignment_completed', 'training.certification_issued',
      'training.phishing_launched', 'training.completed', 'training.status_changed',
    ],
    chainTriggerEvents: ['training.completed', 'training.certification_issued'],
  },
  'ai-governance': {
    events: [
      'ai_governance.system_registered', 'ai_governance.risk_assessed',
      'ai_governance.status_changed',
      'red_team.created', 'digital_twin.created', 'digital_twin.updated',
      'prompt.version_changed', 'ai_incident.reported',
    ],
    chainTriggerEvents: [],
  },
  qiyas: {
    events: [
      'qiyas.assessment_started', 'qiyas.assessment_completed',
      'qiyas.accelerator_activated', 'qiyas.starter_kit_deployed',
      'qiyas.status_changed',
    ],
    chainTriggerEvents: [],
  },

  // ── Platform-Hybrid (foundation/reporting publish GRC events) ─────
  foundation: {
    events: [
      'foundation.org_created', 'foundation.org_updated',
      'foundation.dept_created', 'foundation.dept_updated',
      'foundation.role_assigned', 'foundation.role_revoked',
      'foundation.scope_changed',
    ],
    chainTriggerEvents: ['foundation.scope_changed'],
  },
  reporting: {
    events: [
      'reporting.report_generated', 'reporting.report_published',
      'reporting.schedule_created', 'reporting.schedule_triggered',
      'reporting.board_pack_generated',
    ],
    chainTriggerEvents: [],
  },
  integrations: {
    events: [
      'integrations.configured', 'integrations.activated',
      'integrations.deactivated', 'integrations.sync_completed',
      'integrations.sync_failed',
    ],
    chainTriggerEvents: ['integrations.sync_failed'],
  },
  // ── Platform-Only (remaining) ───────────────────────────────────────
  ai: {
    events: [
      'ai.agent.started', 'ai.agent.completed', 'ai.agent.failed',
      'ai.proposal.created', 'ai.proposal.approved', 'ai.proposal.rejected',
      'ai.delegation.granted', 'ai.delegation.revoked', 'ai.delegation.action_executed',
      'ai.copilot.action', 'ai.copilot.suggestion',
      'ai.circuit_breaker.opened', 'ai.circuit_breaker.closed',
      'ai.drift.detected', 'ai.cost.threshold_exceeded',
      'ai.kill_switch.activated', 'ai.autonomy.level_changed',
    ],
    chainTriggerEvents: ['ai.agent.completed', 'ai.proposal.created', 'ai.drift.detected'],
  },
  admin:        { events: [], chainTriggerEvents: [] },
  workflow:     { events: [], chainTriggerEvents: [] },
  notification: { events: [], chainTriggerEvents: [] },
  analytics:    { events: [], chainTriggerEvents: [] },
  team:         { events: [], chainTriggerEvents: [] },

  // ── Extended Modules ───────────────────────────────────────────────
  issues: {
    events: [
      'issues.created', 'issues.assigned', 'issues.escalated',
      'issues.resolved', 'issues.closed', 'issues.reopened',
      'issues.overdue', 'issues.linked',
    ],
    chainTriggerEvents: ['issues.created', 'issues.escalated'],
  },
  inbox: {
    events: [
      'inbox.message_created', 'inbox.message_read', 'inbox.message_actioned',
      'inbox.message_archived', 'inbox.message_deleted',
      'inbox.bulk_read', 'inbox.bulk_archived',
      'inbox.broadcast_sent', 'inbox.digest_generated',
      'inbox.routing_rule_created', 'inbox.routing_rule_updated',
      'inbox.priority_escalated', 'inbox.status_changed',
    ],
    chainTriggerEvents: ['inbox.priority_escalated'],
  },
  portals: {
    events: [
      'portals.provisioned', 'portals.activated', 'portals.deactivated', 'portals.suspended',
      'portals.user_registered', 'portals.session_started', 'portals.session_ended',
      'portals.content_published', 'portals.invitation_sent',
      'portals.access_granted', 'portals.access_revoked', 'portals.access_denied',
      'portals.token_issued', 'portals.token_revoked',
      'portals.page_published', 'portals.status_changed',
    ],
    chainTriggerEvents: ['portals.access_denied', 'portals.suspended'],
  },
  records: {
    events: [
      'records.created', 'records.classified', 'records.retention_set',
      'records.disposal_requested', 'records.disposal_approved',
      'records.hold_placed', 'records.hold_released',
    ],
    chainTriggerEvents: ['records.disposal_requested'],
  },
  privacy: {
    events: [
      'privacy.dsr_received', 'privacy.dsr_completed', 'privacy.dsr_overdue',
      'privacy.consent_given', 'privacy.consent_withdrawn',
      'privacy.impact_assessment_completed', 'privacy.breach_detected',
      'privacy.breach_notified', 'privacy.cross_border_flagged',
    ],
    chainTriggerEvents: ['privacy.breach_detected', 'privacy.dsr_received'],
  },
  controls: {
    events: [
      'controls.created', 'controls.updated', 'controls.deleted', 'controls.status_changed',
      'controls.test_completed', 'controls.test_failed', 'controls.certified',
      'controls.certification_expired', 'controls.deficiency_identified',
      'controls.deficiency_remediated', 'controls.effectiveness_changed',
      'controls.mapping_updated',
    ],
    chainTriggerEvents: ['controls.deficiency_identified', 'controls.certification_expired'],
  },
  onboarding: { events: [], chainTriggerEvents: [] },
  dora: {
    events: [
      'dora.ict_asset_created', 'dora.resilience_test_created', 'dora.resilience_test_completed',
      'dora.resilience_test_failed', 'dora.major_incident_reported', 'dora.threat_detected',
      'dora.status_changed',
    ],
    chainTriggerEvents: ['dora.resilience_test_failed', 'dora.major_incident_reported'],
  },
  journey: {
    events: [
      'journey.roadmap_created', 'journey.phase_completed', 'journey.maturity_changed',
      'journey.milestone_achieved', 'journey.status_changed',
    ],
    chainTriggerEvents: ['journey.maturity_changed'],
  },
  'ksa-regulatory': {
    events: ['ksa-regulatory.update_detected', 'ksa-regulatory.mapping_changed'],
    chainTriggerEvents: ['ksa-regulatory.update_detected'],
  },
  'local-knowledge': {
    events: ['local-knowledge.entry_created', 'local-knowledge.entry_updated'],
    chainTriggerEvents: [],
  },
  packs: {
    events: ['packs.installed', 'packs.uninstalled', 'packs.updated'],
    chainTriggerEvents: [],
  },
  'proactive-leadership': {
    events: ['proactive-leadership.initiative_created', 'proactive-leadership.status_changed'],
    chainTriggerEvents: [],
  },
  'agrc-engine': {
    events: ['agrc-engine.cycle_started', 'agrc-engine.cycle_completed', 'agrc-engine.action_executed'],
    chainTriggerEvents: ['agrc-engine.cycle_completed'],
  },
  dashboard:    { events: ['dashboard.widget_updated', 'dashboard.layout_saved'], chainTriggerEvents: [] },
  'governance-ai': { events: ['governance-ai.signal_detected', 'governance-ai.recommendation_generated'], chainTriggerEvents: [] },
  'governance-os': { events: ['governance-os.cadence_evaluated', 'governance-os.maturity_scored'], chainTriggerEvents: [] },
  provisioning: { events: ['provisioning.job_started', 'provisioning.job_completed', 'provisioning.job_failed'], chainTriggerEvents: [] },
  navigation:   { events: ['navigation.config_updated', 'navigation.item_reordered'], chainTriggerEvents: [] },
  bootstrap:    { events: ['bootstrap.session_started', 'bootstrap.session_completed', 'bootstrap.first_run_completed'], chainTriggerEvents: [] },
  widgets:      { events: ['widgets.registered', 'widgets.updated'], chainTriggerEvents: [] },
  'quality-gate': { events: ['quality-gate.run.started', 'quality-gate.run.completed', 'quality-gate.run.failed', 'quality-gate.run.overridden', 'quality-gate.stage.passed', 'quality-gate.stage.failed', 'quality-gate.drift.detected', 'quality-gate.ai.injection_blocked', 'quality-gate.ai.tenant_leak', 'quality-gate.threshold.updated'], chainTriggerEvents: ['quality-gate.run.failed', 'quality-gate.drift.detected'] },
};

/** Get all chain trigger events across all modules (for handler registration). */
export function getAllChainTriggerEvents(): Array<{ moduleCode: CanonicalModuleCode; event: string }> {
  const results: Array<{ moduleCode: CanonicalModuleCode; event: string }> = [];
  for (const [code, contract] of Object.entries(MODULE_EVENT_CONTRACTS)) {
    for (const event of contract.chainTriggerEvents) {
      results.push({ moduleCode: code as CanonicalModuleCode, event });
    }
  }
  return results;
}
