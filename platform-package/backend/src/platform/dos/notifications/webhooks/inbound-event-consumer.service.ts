import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../observability/services/logger.service';
import { eventBus } from '../../../../modules/platform/services/event/event-bus.service';

const LOG_TAG = '[InboundEvt]';

export interface InboundEventHandler {
  moduleCode: string;
  eventName: string;
  sourceModule: string;
  handlerAction: string;
  isActive: boolean;
}

const HANDLER_REGISTRY: Record<string, (schema: string, payload: any) => Promise<void>> = {
  'create_risk_from_gap': async (schema, payload) => {
    await safeQuery(
      `INSERT INTO "${schema}".risks (title, description, risk_source, source_entity_type, source_entity_id, status, created_by)
       VALUES ($1, $2, 'compliance', 'compliance_gap', $3, 'identified', $4)
       ON CONFLICT DO NOTHING`,
      [`Risk from compliance gap: ${payload.entityId}`, payload.data?.description || 'Auto-created from compliance gap', payload.entityId, payload.userId]
    );
  },

  'create_risk_from_finding': async (schema, payload) => {
    await safeQuery(
      `INSERT INTO "${schema}".risks (title, description, risk_source, source_entity_type, source_entity_id, status, created_by)
       VALUES ($1, $2, 'audit', 'audit_finding', $3, 'identified', $4)
       ON CONFLICT DO NOTHING`,
      [`Risk from audit finding: ${payload.entityId}`, payload.data?.description || 'Auto-created from audit finding', payload.entityId, payload.userId]
    );
  },

  'elevate_risk_score': async (schema, payload) => {
    await safeQuery(
      `UPDATE "${schema}".risks SET risk_score = LEAST(COALESCE(risk_score, 0) + 5, 25), updated_at = NOW()
       WHERE source_entity_id = $1 AND risk_source = 'incident'`,
      [payload.entityId]
    );
  },

  'update_control_mapping': async (schema, payload) => {
    await safeQuery(
      `UPDATE "${schema}".controls SET last_policy_update = NOW(), updated_at = NOW()
       WHERE linked_policy_id = $1`,
      [payload.entityId]
    );
  },

  'update_compliance_posture': async (schema, payload) => {
    await safeQuery(
      `UPDATE "${schema}".controls SET last_evidence_review = NOW(), updated_at = NOW()
       WHERE evidence_id = $1`,
      [payload.entityId]
    );
  },

  'trigger_evidence_review': async (schema, payload) => {
    await safeQuery(
      `INSERT INTO "${schema}".action_items (title, source_module, source_entity_type, source_entity_id, status, created_by)
       VALUES ($1, 'evidence', 'compliance_assessment', $2, 'open', $3)
       ON CONFLICT DO NOTHING`,
      [`Evidence review for assessment: ${payload.entityId}`, payload.entityId, payload.userId]
    );
  },

  'update_audit_scope': async (schema, payload) => {
    await safeQuery(
      `INSERT INTO "${schema}".action_items (title, source_module, source_entity_type, source_entity_id, status, created_by)
       VALUES ($1, 'audit', 'risk_treatment', $2, 'open', $3)
       ON CONFLICT DO NOTHING`,
      [`Audit scope update — risk treatment changed: ${payload.entityId}`, payload.entityId, payload.userId]
    );
  },

  'update_incident_impact': async (schema, payload) => {
    await safeQuery(
      `INSERT INTO "${schema}".action_items (title, source_module, source_entity_type, source_entity_id, status, created_by)
       VALUES ($1, 'incident', 'asset', $2, 'open', $3)
       ON CONFLICT DO NOTHING`,
      [`Update incident impact — asset classified: ${payload.entityId}`, payload.entityId, payload.userId]
    );
  },

  'flag_vendor_risk': async (schema, payload) => {
    await safeQuery(
      `UPDATE "${schema}".vendors SET reassessment_needed = TRUE, updated_at = NOW()
       WHERE vendor_id = $1`,
      [payload.entityId]
    );
  },

  'create_remediation_task': async (schema, payload) => {
    await safeQuery(
      `INSERT INTO "${schema}".remediation_tasks (title, source_module, source_entity_id, status, priority, created_by)
       VALUES ($1, $2, $3, 'open', 'high', $4)
       ON CONFLICT DO NOTHING`,
      [`Remediation for: ${payload.entityId}`, payload.data?.sourceModule || 'compliance', payload.entityId, payload.userId]
    );
  },

  'create_action_item': async (schema, payload) => {
    await safeQuery(
      `INSERT INTO "${schema}".action_items (title, source_module, source_entity_type, source_entity_id, status, created_by)
       VALUES ($1, 'remediation', 'remediation_task', $2, 'open', $3)
       ON CONFLICT DO NOTHING`,
      [`Action for remediation: ${payload.entityId}`, payload.entityId, payload.userId]
    );
  },

  'assess_breach_notification': async (schema, payload) => {
    await safeQuery(
      `INSERT INTO "${schema}".incidents (title, incident_type, source_module, source_entity_id, status, severity, created_by)
       VALUES ($1, 'data_breach', 'privacy', $2, 'reported', 'critical', $3)
       ON CONFLICT DO NOTHING`,
      [`Privacy breach — notification assessment required: ${payload.entityId}`, payload.entityId, payload.userId]
    );
  },

  'expire_related_exceptions': async (schema, payload) => {
    await safeQuery(
      `UPDATE "${schema}".exceptions SET status = 'expired', updated_at = NOW()
       WHERE linked_policy_id = $1 AND status = 'active'`,
      [payload.entityId]
    );
  },

  'trigger_report_refresh': async (schema, payload) => {
    await safeQuery(
      `INSERT INTO "${schema}".action_items (title, source_module, source_entity_type, source_entity_id, status, priority, created_by)
       VALUES ($1, 'reporting', 'compliance_posture', $2, 'open', 'medium', $3)
       ON CONFLICT DO NOTHING`,
      [`Report refresh needed — compliance posture changed: ${payload.entityId}`, payload.entityId, payload.userId]
    );
  },

  'reconfigure_integration_scope': async (schema, payload) => {
    await safeQuery(
      `INSERT INTO "${schema}".action_items (title, source_module, source_entity_type, source_entity_id, status, created_by)
       VALUES ($1, 'integrations', 'foundation_scope', $2, 'open', $3)
       ON CONFLICT DO NOTHING`,
      [`Integration scope reconfiguration needed: ${payload.entityId}`, payload.entityId, payload.userId]
    );
  },

  'suggest_training_campaign': async (schema, payload) => {
    await safeQuery(
      `INSERT INTO "${schema}".action_items (title, source_module, source_entity_type, source_entity_id, status, priority, created_by)
       VALUES ($1, 'training', 'compliance_gap', $2, 'open', 'medium', $3)
       ON CONFLICT DO NOTHING`,
      [`Training campaign suggested for compliance gap: ${payload.entityId}`, payload.entityId, payload.userId]
    );
  },

  'activate_continuity_plan': async (schema, payload) => {
    await safeQuery(
      `INSERT INTO "${schema}".action_items (title, source_module, source_entity_type, source_entity_id, status, priority, created_by)
       VALUES ($1, 'bcp', 'bcp_plan', $2, 'open', 'critical', $3)
       ON CONFLICT DO NOTHING`,
      [`BCP plan activated — immediate response required: ${payload.entityId}`, payload.entityId, payload.userId]
    );
  },

  'update_governance_register': async (schema, payload) => {
    await safeQuery(
      `INSERT INTO "${schema}".action_items (title, source_module, source_entity_type, source_entity_id, status, created_by)
       VALUES ($1, 'governance', 'policy', $2, 'open', $3)
       ON CONFLICT DO NOTHING`,
      [`Governance register update — policy published: ${payload.entityId}`, payload.entityId, payload.userId]
    );
  },

  'update_ai_risk_model': async (schema, payload) => {
    await safeQuery(
      `INSERT INTO "${schema}".action_items (title, source_module, source_entity_type, source_entity_id, status, created_by)
       VALUES ($1, 'ai-governance', 'risk', $2, 'open', $3)
       ON CONFLICT DO NOTHING`,
      [`AI risk model update — risk auto-scored: ${payload.entityId}`, payload.entityId, payload.userId]
    );
  },

  'create_risk_from_incident': async (schema, payload) => {
    await safeQuery(
      `INSERT INTO "${schema}".risks (title, description, risk_source, source_entity_type, source_entity_id, status, created_by)
       VALUES ($1, $2, 'incident', 'incident', $3, 'identified', $4)
       ON CONFLICT DO NOTHING`,
      [`Risk from incident: ${payload.entityId}`, payload.data?.description || 'Auto-created from escalated incident', payload.entityId, payload.userId]
    );
  },

  'sync_evidence_from_collection': async (schema, payload) => {
    await safeQuery(
      `UPDATE "${schema}".evidence_items SET last_collection_sync = NOW(), updated_at = NOW()
       WHERE evidence_id = $1`,
      [payload.entityId]
    );
  },

  'flag_stale_record': async (schema, payload) => {
    const table = payload.data?.entityTable || 'action_items';
    try {
      await safeQuery(
        `UPDATE "${schema}"."${table}" SET is_stale = TRUE, updated_at = NOW() WHERE id = $1`,
        [payload.entityId]
      );
    } catch {
      logger.debug(`${LOG_TAG} flag_stale_record: table ${table} may not have is_stale column`);
    }
  },
};

export async function loadInboundHandlers(tenantId: string): Promise<InboundEventHandler[]> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(
      `SELECT module_code, event_name, source_module, handler_action, is_active
       FROM "${schema}".module_inbound_events WHERE is_active = TRUE`
    );
    return rows.map((r: any) => ({
      moduleCode: r.module_code,
      eventName: r.event_name,
      sourceModule: r.source_module,
      handlerAction: r.handler_action,
      isActive: r.is_active,
    }));
  } catch {
    return [];
  }
}

export async function processInboundEvent(tenantId: string, eventName: string, payload: any): Promise<{ handled: number; errors: number }> {
  const schema = tenantSchema(tenantId);
  let handled = 0;
  let errors = 0;

  try {
    const { rows } = await safeQuery(
      `SELECT handler_action, module_code FROM "${schema}".module_inbound_events
       WHERE event_name = $1 AND is_active = TRUE`,
      [eventName]
    );

    for (const row of rows) {
      const handler = HANDLER_REGISTRY[row.handler_action];
      if (handler) {
        try {
          await handler(schema, { ...payload, targetModule: row.module_code });
          handled++;
          logger.info(`${LOG_TAG} Processed ${eventName} → ${row.handler_action} for ${row.module_code}`);
        } catch (err) {
          errors++;
          logger.error(`${LOG_TAG} Handler ${row.handler_action} failed for ${eventName}:`, (err as Error).message);
        }
      } else {
        logger.warn(`${LOG_TAG} No handler registered for action: ${row.handler_action}`);
      }
    }
  } catch (err) {
    logger.error(`${LOG_TAG} Failed to process inbound event ${eventName}:`, (err as Error).message);
  }

  return { handled, errors };
}

export function wireInboundEventListeners(tenantId: string): void {
  const chainEvents = [
    'compliance.gap_detected', 'compliance.posture_changed', 'compliance.assessment_completed',
    'audit.finding.issued',
    'incident.escalated', 'incident.reported',
    'policy.published', 'policy.expired',
    'evidence.approved', 'evidence.collected',
    'risk.treatment_updated', 'risk.exceeded_appetite', 'risk.auto_scored', 'risk.treatment_completed',
    'asset.classified',
    'remediation.created',
    'foundation.scope_changed',
    'vendor.dd_completed',
    'bcp.plan_activated', 'bcp.crisis_readiness_low',
    'governance.charter_expired', 'governance.mandate_updated',
    'training.completed',
    'privacy.breach_detected',
    'exception.expired',
  ];

  for (const evt of chainEvents) {
    eventBus.subscribe(evt, `inbound-consumer:${evt}`, async (payload: any) => {
      if (payload?.tenantId === tenantId) {
        await processInboundEvent(tenantId, evt, payload);
      }
    });
  }

  logger.info(`${LOG_TAG} Wired ${chainEvents.length} inbound event listeners for tenant ${tenantId}`);
}
