import { eventBus } from '../../../../modules/platform/services/event/event-bus.service';
import type { PlatformEvent } from '../../../../modules/platform/services/event/event-bus.service';
import { logger } from '../../observability/services/logger.service';
import { indexEntityForSearch } from './unified-search.service';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { safeQuery, tenantSchema } from '../../../../config/database';
import { getFirstRow } from '../../../../utils/db-utils';
import { EntityCreatedPayloadSchema } from '../../../../modules/platform/services/event/event-schema-validator.service';

let registered = false;

interface IndexableEntity {
  event: string;
  module: string;
  entityType: string;
  table: string;
  idCol: string;
  idField: string;
  titleCol: string;
  descCol?: string;
  route: string;
}

const INDEXABLE_ENTITIES: IndexableEntity[] = [
  { event: 'risk.created', module: 'risk', entityType: 'risk', table: 'risks', idCol: 'risk_id', idField: 'riskId', titleCol: 'title', descCol: 'description', route: '/risks' },
  { event: 'risk.updated', module: 'risk', entityType: 'risk', table: 'risks', idCol: 'risk_id', idField: 'riskId', titleCol: 'title', descCol: 'description', route: '/risks' },
  { event: 'compliance.created', module: 'compliance', entityType: 'control', table: 'ucf_controls', idCol: 'control_id', idField: 'controlId', titleCol: 'title', descCol: 'description', route: '/controls' },
  { event: 'compliance.updated', module: 'compliance', entityType: 'control', table: 'ucf_controls', idCol: 'control_id', idField: 'controlId', titleCol: 'title', descCol: 'description', route: '/controls' },
  { event: 'policy.created', module: 'policy', entityType: 'policy', table: 'policies', idCol: 'policy_id', idField: 'policyId', titleCol: 'title', descCol: 'description', route: '/policies' },
  { event: 'policy.updated', module: 'policy', entityType: 'policy', table: 'policies', idCol: 'policy_id', idField: 'policyId', titleCol: 'title', descCol: 'description', route: '/policies' },
  { event: 'incident.created', module: 'incident', entityType: 'incident', table: 'incidents', idCol: 'incident_id', idField: 'incidentId', titleCol: 'title', descCol: 'description', route: '/incidents' },
  { event: 'incident.updated', module: 'incident', entityType: 'incident', table: 'incidents', idCol: 'incident_id', idField: 'incidentId', titleCol: 'title', descCol: 'description', route: '/incidents' },
  { event: 'vendor.created', module: 'vendor', entityType: 'vendor', table: 'vendors', idCol: 'vendor_id', idField: 'vendorId', titleCol: 'name', descCol: 'description', route: '/vendors' },
  { event: 'vendor.updated', module: 'vendor', entityType: 'vendor', table: 'vendors', idCol: 'vendor_id', idField: 'vendorId', titleCol: 'name', descCol: 'description', route: '/vendors' },
  { event: 'audit.created', module: 'audit', entityType: 'audit', table: 'audit_engagements', idCol: 'engagement_id', idField: 'engagementId', titleCol: 'title', descCol: 'scope', route: '/audits' },
  { event: 'asset.created', module: 'asset', entityType: 'asset', table: 'assets', idCol: 'asset_id', idField: 'assetId', titleCol: 'name', descCol: 'description', route: '/assets' },
  { event: 'asset.updated', module: 'asset', entityType: 'asset', table: 'assets', idCol: 'asset_id', idField: 'assetId', titleCol: 'name', descCol: 'description', route: '/assets' },
  { event: 'issues.created', module: 'issues', entityType: 'issue', table: 'issues', idCol: 'issue_id', idField: 'issueId', titleCol: 'title', descCol: 'description', route: '/issues' },
  { event: 'issues.assigned', module: 'issues', entityType: 'issue', table: 'issues', idCol: 'issue_id', idField: 'issueId', titleCol: 'title', descCol: 'description', route: '/issues' },
];

async function indexEntity(tenantId: string, config: IndexableEntity, entityId: string): Promise<void> {
  try {
    const schema = tenantSchema(tenantId);
    const cols = [config.titleCol, config.descCol].filter(Boolean).join(', ');
    const res = await safeQuery(
      `SELECT ${cols} FROM "${schema}".${config.table} WHERE "${config.idCol}" = $1`,
      [entityId],
    );
    const row = getFirstRow(res);
    if (!row) return;

    const title = row[config.titleCol] || '';
    const description = row[config.descCol || ''] || '';
    const text = `${title} ${description}`.trim();
    if (!text) return;

    await indexEntityForSearch(entityId, config.entityType, text, {
      module: config.module,
      route: `${config.route}/${entityId}`,
      tenantId,
    });
  } catch (err: unknown) {
    logger.debug(`[SearchIndexing] Index failed for ${config.entityType}:${entityId} — ${toErrorMessage(err)}`);
  }
}

export function registerSearchIndexingSubscriber(): void {
  if (registered) return;
  registered = true;

  for (const config of INDEXABLE_ENTITIES) {
    eventBus.subscribe(config.event, `search-index:${config.event}`, async (event: PlatformEvent) => {
      const { tenantId, payload } = event;
      if (!tenantId) return;
      const parsed = EntityCreatedPayloadSchema.safeParse(payload);
      if (!parsed.success) return;
      const p = parsed.data;
      const entityId = (payload as Record<string, unknown>)?.[config.idField] as string || p.entityId || p.id;
      if (!entityId) return;
      await indexEntity(tenantId, config, entityId);
    });
  }

  logger.info(`[SearchIndexing] ${INDEXABLE_ENTITIES.length} entity indexing subscriptions registered`);
}
