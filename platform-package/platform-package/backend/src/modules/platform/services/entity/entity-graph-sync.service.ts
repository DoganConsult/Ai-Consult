// @ts-nocheck
import { eventBus } from '../event/event-bus.service';
import type { PlatformEvent } from '../event/event-bus.service';
import { logger } from '../../../../platform/dos/observability/services/logger.service';
import { ageConnected, createVertex, createEdge, cypherQuery } from '../../../../config/apache-age';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { EntityCreatedPayloadSchema } from '../event/event-schema-validator.service';

let registered = false;

const ENTITY_LABEL_MAP: Record<string, string> = {
  risk: 'Risk', compliance: 'Control', policy: 'Policy', evidence: 'Evidence',
  audit: 'Audit', incident: 'Incident', vendor: 'Vendor', bcp: 'BcpPlan',
  asset: 'Asset', exception: 'Exception', remediation: 'Remediation',
  action: 'Action', training: 'Training', governance: 'Governance',
  issues: 'Issue', qiyas: 'QiyasAssessment', 'ai-governance': 'AiSystem',
  foundation: 'OrgUnit', reporting: 'Report', integrations: 'Connector',
  records: 'Record', privacy: 'PrivacyRequest', portals: 'Portal',
};

async function syncVertex(moduleCode: string, entityId: string, tenantId: string, extra: Record<string, unknown> = {}): Promise<void> {
  if (!ageConnected()) return;
  const label = ENTITY_LABEL_MAP[moduleCode];
  if (!label) return;
  try {
    await createVertex(label, { id: entityId, module: moduleCode, tenant: tenantId, ...extra });
  } catch (err: unknown) {
    logger.debug(`[GraphSync] Vertex upsert for ${label}:${entityId} — ${toErrorMessage(err)}`);
  }
}

async function syncEdge(
  fromModule: string, fromId: string,
  toModule: string, toId: string,
  relationship: string, tenantId: string,
): Promise<void> {
  if (!ageConnected()) return;
  const fromLabel = ENTITY_LABEL_MAP[fromModule];
  const toLabel = ENTITY_LABEL_MAP[toModule];
  if (!fromLabel || !toLabel) return;
  try {
    await createEdge(fromLabel, 'id', fromId, toLabel, 'id', toId, relationship, { tenant: tenantId });
  } catch (err: unknown) {
    logger.debug(`[GraphSync] Edge creation ${fromLabel}->${toLabel} — ${toErrorMessage(err)}`);
  }
}

const CROSS_MODULE_EDGES: Array<{
  event: string;
  fromModule: string;
  fromIdField: string;
  toModule: string;
  toIdField: string;
  relationship: string;
}> = [
  { event: 'risk.treatment_updated', fromModule: 'risk', fromIdField: 'riskId', toModule: 'compliance', toIdField: 'controlId', relationship: 'MITIGATED_BY' },
  { event: 'incident.escalated', fromModule: 'incident', fromIdField: 'incidentId', toModule: 'governance', toIdField: 'entityId', relationship: 'ESCALATED_TO' },
  { event: 'audit.finding.issued', fromModule: 'audit', fromIdField: 'findingId', toModule: 'remediation', toIdField: 'entityId', relationship: 'REQUIRES_REMEDIATION' },
  { event: 'policy.published', fromModule: 'policy', fromIdField: 'policyId', toModule: 'compliance', toIdField: 'entityId', relationship: 'GOVERNS' },
  { event: 'vendor.dd_completed', fromModule: 'vendor', fromIdField: 'vendorId', toModule: 'risk', toIdField: 'entityId', relationship: 'INTRODUCES_RISK' },
  { event: 'asset.classified', fromModule: 'asset', fromIdField: 'assetId', toModule: 'risk', toIdField: 'entityId', relationship: 'EXPOSED_TO' },
  { event: 'evidence.collected', fromModule: 'evidence', fromIdField: 'evidenceId', toModule: 'compliance', toIdField: 'controlId', relationship: 'SUPPORTS' },
  { event: 'compliance.gap_detected', fromModule: 'compliance', fromIdField: 'entityId', toModule: 'remediation', toIdField: 'entityId', relationship: 'NEEDS_REMEDIATION' },
  { event: 'exception.expired', fromModule: 'exception', fromIdField: 'exceptionId', toModule: 'policy', toIdField: 'entityId', relationship: 'EXCEPTION_OF' },
  { event: 'training.completed', fromModule: 'training', fromIdField: 'campaignId', toModule: 'compliance', toIdField: 'entityId', relationship: 'SATISFIES' },
  { event: 'privacy.breach_detected', fromModule: 'privacy', fromIdField: 'entityId', toModule: 'incident', toIdField: 'entityId', relationship: 'TRIGGERS_INCIDENT' },
  { event: 'bcp.plan_activated', fromModule: 'bcp', fromIdField: 'planId', toModule: 'incident', toIdField: 'entityId', relationship: 'ACTIVATES_FOR' },
];

function sanitizeCypherParam(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function registerEntityGraphSync(): void {
  if (registered) return;
  registered = true;

  if (!ageConnected()) {
    logger.info('[GraphSync] Apache AGE not connected — graph sync disabled');
    return;
  }

  const createdEvents = [
    'risk.created', 'compliance.created', 'policy.created', 'evidence.collected',
    'audit.created', 'incident.created', 'vendor.created', 'bcp.created',
    'asset.created', 'exception.created', 'remediation.created', 'action.created',
    'training.campaign_launched', 'governance.created', 'issues.created',
    'records.created', 'privacy.dsr_received', 'portals.provisioned',
  ];

  for (const evt of createdEvents) {
    const mod = evt.split('.')[0];
    eventBus.subscribe(evt, `graph-sync:vertex:${evt}`, async (event: PlatformEvent) => {
      const { tenantId, payload } = event;
      if (!tenantId) return;
      const parsed = EntityCreatedPayloadSchema.safeParse(payload);
      if (!parsed.success) return;
      const p = parsed.data;
      const entityId = p.entityId || p.id || (payload as Record<string, unknown>)?.[`${mod}Id`] as string;
      if (entityId) await syncVertex(mod, entityId, tenantId, { status: p.status });
    });
  }

  for (const edge of CROSS_MODULE_EDGES) {
    eventBus.subscribe(edge.event, `graph-sync:edge:${edge.event}`, async (event: PlatformEvent) => {
      const { tenantId, payload } = event;
      if (!tenantId || !payload) return;
      const fromId = (payload as Record<string, unknown>)?.[edge.fromIdField] as string || event.entityId;
      const toId = (payload as Record<string, unknown>)?.[edge.toIdField] as string || event.entityId;
      if (fromId) {
        await syncVertex(edge.fromModule, fromId, tenantId);
        if (toId && toId !== fromId) {
          await syncVertex(edge.toModule, toId, tenantId);
          await syncEdge(edge.fromModule, fromId, edge.toModule, toId, edge.relationship, tenantId);
        }
      }
    });
  }

  logger.info(`[GraphSync] ${createdEvents.length} vertex + ${CROSS_MODULE_EDGES.length} edge subscriptions registered`);
}

export async function getGraphStats(tenantId: string): Promise<{ vertices: number; edges: number }> {
  if (!ageConnected()) return { vertices: 0, edges: 0 };
  try {
    const safeTenant = sanitizeCypherParam(tenantId);
    const verts = await cypherQuery(`MATCH (n) WHERE n.tenant = '${safeTenant}' RETURN count(n) as cnt`);
    const edges = await cypherQuery(`MATCH ()-[r]->() RETURN count(r) as cnt`);
    return {
      vertices: verts[0] ?? 0,
      edges: edges[0] ?? 0,
    };
  } catch {
    return { vertices: 0, edges: 0 };
  }
}
