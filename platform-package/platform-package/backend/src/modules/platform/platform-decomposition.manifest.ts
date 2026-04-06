export type DecompositionTarget =
  | 'foundation'
  | 'admin'
  | 'workflow'
  | 'notification'
  | 'reporting'
  | 'analytics'
  | 'ai'
  | 'integrations'
  | 'team'
  | 'compliance'
  | 'risk'
  | 'policy'
  | 'evidence'
  | 'audit'
  | 'incident'
  | 'governance'
  | 'vendor'
  | 'bcp'
  | 'asset'
  | 'qiyas'
  | 'ai-governance'
  | 'training'
  | 'privacy'
  | 'inbox'
  | 'portals'
  | 'records'
  | 'issues'
  | 'remediation'
  | 'action'
  | 'exception'
  | 'platform_retain';

export type DecompositionPhase = 'phase_1' | 'phase_2' | 'phase_3' | 'deferred';

export interface RouteDecompositionEntry {
  routeFile: string;
  targetModule: DecompositionTarget;
  phase: DecompositionPhase;
  endpointCount: number;
  notes: string;
}

export const PLATFORM_DECOMPOSITION_MANIFEST: RouteDecompositionEntry[] = [
  { routeFile: 'auth.routes.ts', targetModule: 'foundation', phase: 'phase_1', endpointCount: 8, notes: 'Authentication endpoints → foundation' },
  { routeFile: 'me.routes.ts', targetModule: 'foundation', phase: 'phase_1', endpointCount: 5, notes: 'Current user profile → foundation' },
  // DELETED: { routeFile: 'profiles.routes.ts', ... } — empty stub removed (Law 7)
  { routeFile: 'invitation.routes.ts', targetModule: 'foundation', phase: 'phase_1', endpointCount: 4, notes: 'User invitations → foundation' },
  { routeFile: 'email-verification.routes.ts', targetModule: 'foundation', phase: 'phase_1', endpointCount: 3, notes: 'Email verification → foundation' },
  { routeFile: 'org-hierarchy.routes.ts', targetModule: 'foundation', phase: 'phase_1', endpointCount: 8, notes: 'Organization hierarchy → foundation' },
  { routeFile: 'reference-data.routes.ts', targetModule: 'foundation', phase: 'phase_1', endpointCount: 12, notes: 'Reference data management → foundation' },
  // DELETED: { routeFile: 'dynamic-rbac.routes.ts', ... } — empty stub removed (Law 7)
  { routeFile: 'rbac-v2-engine.routes.ts', targetModule: 'foundation', phase: 'phase_1', endpointCount: 8, notes: 'RBAC v2 → foundation' },
  // DELETED: role-detail, role-matrix, role-profile — empty stubs removed (Law 7)
  { routeFile: 'role-audit.routes.ts', targetModule: 'foundation', phase: 'phase_1', endpointCount: 3, notes: 'Role audit → foundation' },
  { routeFile: 'permission-derivation.routes.ts', targetModule: 'foundation', phase: 'phase_1', endpointCount: 4, notes: 'Permission derivation → foundation' },
  { routeFile: 'authz-explain.routes.ts', targetModule: 'foundation', phase: 'phase_1', endpointCount: 3, notes: 'Authorization explanation → foundation' },
  { routeFile: 'user-assignment.routes.ts', targetModule: 'foundation', phase: 'phase_1', endpointCount: 5, notes: 'User assignment → foundation' },
  { routeFile: 'provisioning.routes.ts', targetModule: 'foundation', phase: 'phase_1', endpointCount: 6, notes: 'Provisioning → foundation' },

  { routeFile: 'tenant-config.routes.ts', targetModule: 'admin', phase: 'phase_1', endpointCount: 8, notes: 'Tenant configuration → admin' },
  { routeFile: 'tenant-email-config.routes.ts', targetModule: 'admin', phase: 'phase_1', endpointCount: 4, notes: 'Tenant email config → admin' },
  { routeFile: 'tenant-home.routes.ts', targetModule: 'admin', phase: 'phase_1', endpointCount: 3, notes: 'Tenant home → admin' },
  { routeFile: 'tenant-backfill.routes.ts', targetModule: 'admin', phase: 'phase_1', endpointCount: 2, notes: 'Tenant backfill → admin' },
  { routeFile: 'module-activation.routes.ts', targetModule: 'admin', phase: 'phase_1', endpointCount: 5, notes: 'Module activation → admin' },
  // DELETED: { routeFile: 'module-lifecycle.routes.ts', ... } — empty stub removed (Law 7)
  { routeFile: 'module-status.routes.ts', targetModule: 'admin', phase: 'phase_1', endpointCount: 4, notes: 'Module status → admin' },
  { routeFile: 'module-manifest.routes.ts', targetModule: 'admin', phase: 'phase_1', endpointCount: 3, notes: 'Module manifest → admin' },
  { routeFile: 'module-metrics.routes.ts', targetModule: 'admin', phase: 'phase_1', endpointCount: 4, notes: 'Module metrics → admin' },
  { routeFile: 'module-health.routes.ts', targetModule: 'admin', phase: 'phase_1', endpointCount: 3, notes: 'Module health → admin' },
  { routeFile: 'module-onboarding.routes.ts', targetModule: 'admin', phase: 'phase_1', endpointCount: 5, notes: 'Module onboarding → admin' },
  { routeFile: 'module-kickstart.routes.ts', targetModule: 'admin', phase: 'phase_1', endpointCount: 3, notes: 'Module kickstart → admin' },
  { routeFile: 'module-workflow-registry.routes.ts', targetModule: 'admin', phase: 'phase_1', endpointCount: 4, notes: 'Module workflow registry → admin' },
  { routeFile: 'modules.routes.ts', targetModule: 'admin', phase: 'phase_1', endpointCount: 5, notes: 'Module CRUD → admin' },
  { routeFile: 'modules-report.routes.ts', targetModule: 'admin', phase: 'phase_1', endpointCount: 2, notes: 'Module reports → admin' },
  { routeFile: 'feature-tables.routes.ts', targetModule: 'admin', phase: 'phase_1', endpointCount: 4, notes: 'Feature tables → admin' },
  { routeFile: 'subscription-lifecycle.routes.ts', targetModule: 'admin', phase: 'phase_2', endpointCount: 5, notes: 'Subscription lifecycle → admin' },
  { routeFile: 'trial-extension.routes.ts', targetModule: 'admin', phase: 'phase_2', endpointCount: 3, notes: 'Trial extension → admin' },
  { routeFile: 'payment.routes.ts', targetModule: 'admin', phase: 'phase_2', endpointCount: 5, notes: 'Payment → admin' },
  { routeFile: 'lead-capture.routes.ts', targetModule: 'admin', phase: 'phase_2', endpointCount: 3, notes: 'Lead capture → admin' },
  { routeFile: 'quote.routes.ts', targetModule: 'admin', phase: 'phase_2', endpointCount: 4, notes: 'Quote → admin' },

  { routeFile: 'work-items.routes.ts', targetModule: 'workflow', phase: 'phase_1', endpointCount: 8, notes: 'Work items → workflow' },
  { routeFile: 'processes.routes.ts', targetModule: 'workflow', phase: 'phase_1', endpointCount: 6, notes: 'Processes → workflow' },
  { routeFile: 'human-approval-queue.routes.ts', targetModule: 'workflow', phase: 'phase_1', endpointCount: 5, notes: 'Human approval queue → workflow' },
  { routeFile: 'handoff-queue.routes.ts', targetModule: 'workflow', phase: 'phase_1', endpointCount: 4, notes: 'Handoff queue → workflow' },
  { routeFile: 'auto-task.routes.ts', targetModule: 'workflow', phase: 'phase_1', endpointCount: 4, notes: 'Auto task → workflow' },
  { routeFile: 'automation.routes.ts', targetModule: 'workflow', phase: 'phase_1', endpointCount: 6, notes: 'Automation → workflow' },
  { routeFile: 'automation-rules-admin.routes.ts', targetModule: 'workflow', phase: 'phase_1', endpointCount: 5, notes: 'Automation rules → workflow' },
  { routeFile: 'cadence.routes.ts', targetModule: 'workflow', phase: 'phase_2', endpointCount: 5, notes: 'Cadence → workflow' },
  { routeFile: 'review-cycle.routes.ts', targetModule: 'workflow', phase: 'phase_2', endpointCount: 5, notes: 'Review cycle → workflow' },
  { routeFile: 'sla-performance.routes.ts', targetModule: 'workflow', phase: 'phase_2', endpointCount: 4, notes: 'SLA performance → workflow' },
  { routeFile: 'dead-letter-queue.routes.ts', targetModule: 'workflow', phase: 'phase_2', endpointCount: 3, notes: 'Dead letter queue → workflow' },
  { routeFile: 'event-dlq.routes.ts', targetModule: 'workflow', phase: 'phase_2', endpointCount: 3, notes: 'Event DLQ → workflow' },
  { routeFile: 'next-actions.routes.ts', targetModule: 'workflow', phase: 'phase_2', endpointCount: 3, notes: 'Next actions → workflow' },

  { routeFile: 'messaging.routes.ts', targetModule: 'notification', phase: 'phase_2', endpointCount: 5, notes: 'Messaging → notification' },
  { routeFile: 'email-inbox.routes.ts', targetModule: 'inbox', phase: 'phase_2', endpointCount: 5, notes: 'Email inbox → inbox module' },

  { routeFile: 'dashboard.routes.ts', targetModule: 'reporting', phase: 'phase_1', endpointCount: 8, notes: 'Dashboard → reporting' },
  { routeFile: 'widgets.routes.ts', targetModule: 'reporting', phase: 'phase_1', endpointCount: 6, notes: 'Widgets → reporting' },
  { routeFile: 'platform-stats.routes.ts', targetModule: 'reporting', phase: 'phase_1', endpointCount: 4, notes: 'Platform stats → reporting' },
  { routeFile: 'public-stats.routes.ts', targetModule: 'reporting', phase: 'phase_2', endpointCount: 3, notes: 'Public stats → reporting' },

  { routeFile: 'benchmark-aggregator.routes.ts', targetModule: 'analytics', phase: 'phase_2', endpointCount: 5, notes: 'Benchmark aggregator → analytics' },
  { routeFile: 'grc-query-engine.routes.ts', targetModule: 'analytics', phase: 'phase_2', endpointCount: 6, notes: 'GRC query engine → analytics' },
  { routeFile: 'program-health.routes.ts', targetModule: 'analytics', phase: 'phase_2', endpointCount: 4, notes: 'Program health → analytics' },
  { routeFile: 'predictive-grc.routes.ts', targetModule: 'analytics', phase: 'phase_3', endpointCount: 5, notes: 'Predictive GRC → analytics' },

  { routeFile: 'copilot.routes.ts', targetModule: 'ai', phase: 'phase_1', endpointCount: 6, notes: 'Copilot → ai' },
  { routeFile: 'contextual-ai.routes.ts', targetModule: 'ai', phase: 'phase_1', endpointCount: 5, notes: 'Contextual AI → ai' },
  { routeFile: 'personal-agent.routes.ts', targetModule: 'ai', phase: 'phase_1', endpointCount: 4, notes: 'Personal agent → ai' },
  { routeFile: 'agent-metrics.routes.ts', targetModule: 'ai', phase: 'phase_1', endpointCount: 4, notes: 'Agent metrics → ai' },
  { routeFile: 'inference.routes.ts', targetModule: 'ai', phase: 'phase_1', endpointCount: 3, notes: 'Inference → ai' },
  { routeFile: 'autonomy.routes.ts', targetModule: 'ai', phase: 'phase_1', endpointCount: 5, notes: 'Autonomy → ai' },
  { routeFile: 'mcp.routes.ts', targetModule: 'ai', phase: 'phase_2', endpointCount: 4, notes: 'MCP → ai' },

  { routeFile: 'connector-registry.routes.ts', targetModule: 'integrations', phase: 'phase_2', endpointCount: 6, notes: 'Connector registry → integrations' },
  { routeFile: 'connector-lifecycle.routes.ts', targetModule: 'integrations', phase: 'phase_2', endpointCount: 5, notes: 'Connector lifecycle → integrations' },
  { routeFile: 'connector-oauth.routes.ts', targetModule: 'integrations', phase: 'phase_2', endpointCount: 4, notes: 'Connector OAuth → integrations' },
  { routeFile: 'webhook.routes.ts', targetModule: 'integrations', phase: 'phase_2', endpointCount: 4, notes: 'Webhooks → integrations' },
  { routeFile: 'pipeline-webhook.routes.ts', targetModule: 'integrations', phase: 'phase_2', endpointCount: 3, notes: 'Pipeline webhooks → integrations' },

  { routeFile: 'assessment.routes.ts', targetModule: 'compliance', phase: 'phase_2', endpointCount: 10, notes: 'Assessment → compliance' },
  { routeFile: 'assessment-template.routes.ts', targetModule: 'compliance', phase: 'phase_2', endpointCount: 6, notes: 'Assessment templates → compliance' },
  { routeFile: 'assessment-platform-integration-advanced.routes.ts', targetModule: 'compliance', phase: 'phase_3', endpointCount: 8, notes: 'Assessment advanced → compliance' },
  { routeFile: 'continuous-attestation.routes.ts', targetModule: 'compliance', phase: 'phase_2', endpointCount: 5, notes: 'Continuous attestation → compliance' },
  { routeFile: 'framework-harmonization.routes.ts', targetModule: 'compliance', phase: 'phase_3', endpointCount: 6, notes: 'Framework harmonization → compliance' },
  { routeFile: 'rcsa.routes.ts', targetModule: 'compliance', phase: 'phase_3', endpointCount: 5, notes: 'RCSA → compliance' },
  { routeFile: 'regulation-compiler.routes.ts', targetModule: 'compliance', phase: 'phase_3', endpointCount: 4, notes: 'Regulation compiler → compliance' },
  { routeFile: 'mapping.routes.ts', targetModule: 'compliance', phase: 'phase_2', endpointCount: 6, notes: 'Mapping → compliance' },

  { routeFile: 'fair-financial-quantification.routes.ts', targetModule: 'risk', phase: 'phase_3', endpointCount: 5, notes: 'FAIR quantification → risk' },
  { routeFile: 'insider-threat.routes.ts', targetModule: 'risk', phase: 'phase_3', endpointCount: 4, notes: 'Insider threat → risk' },
  { routeFile: 'quantum-readiness.routes.ts', targetModule: 'risk', phase: 'phase_3', endpointCount: 4, notes: 'Quantum readiness → risk' },
  { routeFile: 'dora-resilience.routes.ts', targetModule: 'risk', phase: 'phase_3', endpointCount: 5, notes: 'DORA resilience → risk' },

  { routeFile: 'issues-controls-advanced.routes.ts', targetModule: 'issues', phase: 'phase_2', endpointCount: 8, notes: 'Issues & controls → issues' },

  { routeFile: 'maturity.routes.ts', targetModule: 'qiyas', phase: 'phase_2', endpointCount: 6, notes: 'Maturity → qiyas' },
  { routeFile: 'maturity-ext.routes.ts', targetModule: 'qiyas', phase: 'phase_2', endpointCount: 4, notes: 'Maturity extensions → qiyas' },
  { routeFile: 'roadmap.routes.ts', targetModule: 'qiyas', phase: 'phase_2', endpointCount: 5, notes: 'Roadmap → qiyas' },
  { routeFile: 'roadmap-builder.routes.ts', targetModule: 'qiyas', phase: 'phase_2', endpointCount: 4, notes: 'Roadmap builder → qiyas' },

  { routeFile: 'privacy.routes.ts', targetModule: 'privacy', phase: 'phase_2', endpointCount: 8, notes: 'Privacy → privacy module' },
  { routeFile: 'privacy-gdpr.routes.ts', targetModule: 'privacy', phase: 'phase_2', endpointCount: 6, notes: 'Privacy GDPR → privacy module' },
  { routeFile: 'privacy-budget.routes.ts', targetModule: 'privacy', phase: 'phase_2', endpointCount: 4, notes: 'Privacy budget → privacy module' },
  { routeFile: 'pdpl-consent.routes.ts', targetModule: 'privacy', phase: 'phase_2', endpointCount: 5, notes: 'PDPL consent → privacy module' },
  // DELETED: { routeFile: 'consent-lifecycle.routes.ts', ... } — empty stub removed (Law 7)
  { routeFile: 'dpia.routes.ts', targetModule: 'privacy', phase: 'phase_2', endpointCount: 4, notes: 'DPIA → privacy module' },

  { routeFile: 'regulator-portal.routes.ts', targetModule: 'portals', phase: 'phase_3', endpointCount: 6, notes: 'Regulator portal → portals' },
  { routeFile: 'consultant-center.routes.ts', targetModule: 'portals', phase: 'phase_3', endpointCount: 5, notes: 'Consultant center → portals' },
  { routeFile: 'public-explorer.routes.ts', targetModule: 'portals', phase: 'phase_3', endpointCount: 4, notes: 'Public explorer → portals' },
  { routeFile: 'public-content.routes.ts', targetModule: 'portals', phase: 'phase_3', endpointCount: 3, notes: 'Public content → portals' },

  { routeFile: 'document-management.routes.ts', targetModule: 'records', phase: 'phase_2', endpointCount: 8, notes: 'Document management → records' },
  { routeFile: 'document-parser.routes.ts', targetModule: 'records', phase: 'phase_2', endpointCount: 4, notes: 'Document parser → records' },
  { routeFile: 'workpaper-generator.routes.ts', targetModule: 'audit', phase: 'phase_2', endpointCount: 4, notes: 'Workpaper generator → audit' },

  { routeFile: 'knowledge.routes.ts', targetModule: 'ai', phase: 'phase_2', endpointCount: 6, notes: 'Knowledge → ai' },
  { routeFile: 'knowledge-hub.routes.ts', targetModule: 'ai', phase: 'phase_2', endpointCount: 5, notes: 'Knowledge hub → ai' },
  { routeFile: 'knowledge-graph.routes.ts', targetModule: 'ai', phase: 'phase_2', endpointCount: 4, notes: 'Knowledge graph → ai' },
  { routeFile: 'local-knowledge-hub.routes.ts', targetModule: 'ai', phase: 'phase_2', endpointCount: 5, notes: 'Local knowledge hub → ai' },
  { routeFile: 'ontology.routes.ts', targetModule: 'ai', phase: 'phase_3', endpointCount: 4, notes: 'Ontology → ai' },

  { routeFile: 'ksa-hub.routes.ts', targetModule: 'compliance', phase: 'phase_2', endpointCount: 5, notes: 'KSA hub → compliance' },
  { routeFile: 'sop-library.routes.ts', targetModule: 'policy', phase: 'phase_2', endpointCount: 5, notes: 'SOP library → policy' },
  { routeFile: 'playbook.routes.ts', targetModule: 'incident', phase: 'phase_2', endpointCount: 5, notes: 'Playbook → incident' },

  { routeFile: 'content.routes.ts', targetModule: 'admin', phase: 'phase_2', endpointCount: 5, notes: 'Content → admin' },
  { routeFile: 'content-pack.routes.ts', targetModule: 'admin', phase: 'phase_2', endpointCount: 4, notes: 'Content packs → admin' },
  { routeFile: 'platform-content-packs.routes.ts', targetModule: 'admin', phase: 'phase_2', endpointCount: 4, notes: 'Platform content packs → admin' },
  { routeFile: 'platform-content-providers.routes.ts', targetModule: 'admin', phase: 'phase_2', endpointCount: 3, notes: 'Content providers → admin' },
  { routeFile: 'pack-management.routes.ts', targetModule: 'admin', phase: 'phase_2', endpointCount: 4, notes: 'Pack management → admin' },

  { routeFile: 'global-search.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 3, notes: 'Cross-cutting search — remains in platform' },
  { routeFile: 'search.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 4, notes: 'Search — remains in platform' },
  { routeFile: 'health.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 3, notes: 'Health check — remains in platform' },
  { routeFile: 'service-health.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 2, notes: 'Service health — remains in platform' },
  { routeFile: 'monitoring.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 4, notes: 'Monitoring — remains in platform' },
  { routeFile: 'trace-correlation.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 3, notes: 'Trace correlation — remains in platform' },
  { routeFile: 'ui-config.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 4, notes: 'UI config — remains in platform' },
  { routeFile: 'ui.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 3, notes: 'UI routes — remains in platform' },
  { routeFile: 'inline-edit.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 3, notes: 'Inline edit — remains in platform' },
  { routeFile: 'command-palette.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 3, notes: 'Command palette — remains in platform' },
  { routeFile: 'comment.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 5, notes: 'Comments — cross-cutting, remains in platform' },
  { routeFile: 'common-objects.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 6, notes: 'Common objects — cross-cutting' },
  { routeFile: 'entity-link.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 4, notes: 'Entity linking — cross-cutting' },
  { routeFile: 'auto-crud.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 5, notes: 'Auto CRUD — infrastructure' },
  { routeFile: 'bulk-action.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 3, notes: 'Bulk action — cross-cutting' },
  { routeFile: 'bulk-import.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 3, notes: 'Bulk import — cross-cutting' },
  { routeFile: 'jobs.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 4, notes: 'Job queue — infrastructure' },
  { routeFile: 'mobile.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 3, notes: 'Mobile — cross-cutting' },
  { routeFile: 'products.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 4, notes: 'Products — meta' },
  { routeFile: 'registry.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 3, notes: 'Registry — meta' },
  { routeFile: 'blueprint.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 4, notes: 'Blueprint — meta' },
  { routeFile: 'bootstrap.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 3, notes: 'Bootstrap — meta' },
  { routeFile: 'bootstrap-manifest.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 2, notes: 'Bootstrap manifest — meta' },
  { routeFile: 'contract-tests.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 2, notes: 'Contract tests — dev' },
  { routeFile: 'fitch.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 3, notes: 'Fitch — specialized' },
  { routeFile: 'guidance.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 3, notes: 'Guidance — cross-cutting' },
  { routeFile: 'journey.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 4, notes: 'Journey — cross-cutting' },
  { routeFile: 'openclaw.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 3, notes: 'OpenClaw — specialized' },
  { routeFile: 'quick-grc-accelerator.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 4, notes: 'Quick GRC accelerator — meta' },

  { routeFile: 'activity-feed.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 5, notes: 'Activity feed — cross-cutting' },
  { routeFile: 'activity-stream.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 4, notes: 'Activity stream — cross-cutting' },
  { routeFile: 'agrc-os.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 8, notes: 'AGRC OS core — remains in platform' },
  { routeFile: 'workspace.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 5, notes: 'Workspace — cross-cutting' },
  { routeFile: 'workspace-home.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 3, notes: 'Workspace home — cross-cutting' },
  { routeFile: 'workspace-audit.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 3, notes: 'Workspace audit — cross-cutting' },
  { routeFile: 'workspace-lifecycle.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 4, notes: 'Workspace lifecycle — cross-cutting' },
  { routeFile: 'workspace-ignite.routes.ts', targetModule: 'platform_retain', phase: 'deferred', endpointCount: 3, notes: 'Workspace ignite — cross-cutting' },
];

export function getDecompositionByPhase(phase: DecompositionPhase): RouteDecompositionEntry[] {
  return PLATFORM_DECOMPOSITION_MANIFEST.filter(e => e.phase === phase);
}

export function getDecompositionByTarget(target: DecompositionTarget): RouteDecompositionEntry[] {
  return PLATFORM_DECOMPOSITION_MANIFEST.filter(e => e.targetModule === target);
}

export function getDecompositionSummary() {
  const byPhase: Record<string, number> = {};
  const byTarget: Record<string, number> = {};
  let totalEndpoints = 0;

  for (const entry of PLATFORM_DECOMPOSITION_MANIFEST) {
    byPhase[entry.phase] = (byPhase[entry.phase] ?? 0) + entry.endpointCount;
    byTarget[entry.targetModule] = (byTarget[entry.targetModule] ?? 0) + entry.endpointCount;
    totalEndpoints += entry.endpointCount;
  }

  return {
    totalRouteFiles: PLATFORM_DECOMPOSITION_MANIFEST.length,
    totalEndpoints,
    byPhase,
    byTarget,
  };
}
