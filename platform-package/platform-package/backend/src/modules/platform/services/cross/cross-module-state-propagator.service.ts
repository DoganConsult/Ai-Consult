// @ts-nocheck
import { logger } from '../../../../platform/dos/observability/services/logger.service';
import { safeQuery, tenantSchema } from '../../../../config/database';
import { eventBus, type PlatformEvent } from '../event/event-bus.service';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { swallow, EC } from '../../../../utils/resilient-catch';

import { applyPatch, type Operation } from 'fast-json-patch';
import { SYSTEM_JOB_ACTOR } from '../../../../platform/dos/constants/system-actors';

export interface StateUpdate {
  tenantId: string;
  sourceModule: string;
  sourceEntityType: string;
  sourceEntityId: string;
  targetModule: string;
  targetEntityType: string;
  targetEntityId: string;
  updateType: 'status' | 'score' | 'link' | 'cascade';
  patch: Record<string, unknown>;
  reason: string;
}

export interface PropagationRule {
  sourceEvent: string;
  targetModule: string;
  targetTable: string;
  linkTable: string;
  linkSourceColumn: string;
  linkTargetColumn: string;
  updateFn: (tenantId: string, schema: string, sourceEntityId: string, targetEntityId: string, payload: Record<string, any>) => Promise<void>;
}

const propagationRules: PropagationRule[] = [];

export function registerPropagationRule(rule: PropagationRule): void {
  propagationRules.push(rule);
}

export async function propagateStateUpdate(update: StateUpdate): Promise<void> {
  const schema = tenantSchema(update.tenantId);

  try {
    const setClauses = Object.entries(update.patch)
      .map(([key], idx) => `"${key}" = $${idx + 1}`)
      .join(', ');
    const values = Object.values(update.patch);

    if (setClauses && values.length > 0) {
      const idCol = `${update.targetEntityType}_id`;
      await safeQuery(
        `UPDATE "${schema}".${update.targetEntityType}s
         SET ${setClauses}, updated_at = NOW()
         WHERE ${idCol} = $${values.length + 1}`,
        [...values, update.targetEntityId],
      );
    }

    await swallow(EC.EVENT_BUS, eventBus.publish({
      eventType: `${update.targetModule}.state_propagated` as any,
      tenantId: update.tenantId,
      sourceService: 'state-propagator',
      severity: 'info',
      entityType: update.targetEntityType,
      entityId: update.targetEntityId,
      payload: {
        sourceModule: update.sourceModule,
        sourceEntityType: update.sourceEntityType,
        sourceEntityId: update.sourceEntityId,
        updateType: update.updateType,
        patch: update.patch,
        reason: update.reason,
      },
    }));

    await swallow(EC.EVENT_BUS, recordAudit({
      tenantId: update.tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: update.targetModule,
      action: 'state_propagated',
      entityType: update.targetEntityType,
      entityId: update.targetEntityId,
      afterState: {
        sourceModule: update.sourceModule,
        sourceEntityId: update.sourceEntityId,
        updateType: update.updateType,
        reason: update.reason,
      },
    }));

    logger.info(`[StatePropagator] ${update.sourceModule}.${update.sourceEntityType}:${update.sourceEntityId} → ${update.targetModule}.${update.targetEntityType}:${update.targetEntityId} (${update.updateType})`);
  } catch (err) {
    logger.error(`[StatePropagator] propagation failed: ${(err as Error).message}`, {
      update,
    });
  }
}

export async function propagateRemediationCompletion(
  tenantId: string,
  remediationId: string,
  sourceEntityType: string,
  sourceEntityId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  const statusMap: Record<string, { table: string; idCol: string; closedStatus: string }> = {
    compliance_gap: { table: 'compliance_gaps', idCol: 'gap_id', closedStatus: 'remediated' },
    finding: { table: 'findings', idCol: 'finding_id', closedStatus: 'closed' },
    audit_finding: { table: 'audit_findings', idCol: 'finding_id', closedStatus: 'closed' },
    risk: { table: 'risks', idCol: 'risk_id', closedStatus: 'mitigated' },
    incident: { table: 'incidents', idCol: 'incident_id', closedStatus: 'resolved' },
    vendor: { table: 'vendor_issues', idCol: 'issue_id', closedStatus: 'resolved' },
  };

  const config = statusMap[sourceEntityType];
  if (!config) {
    logger.warn(`[StatePropagator] no closure config for source entity type: ${sourceEntityType}`);
    return;
  }

  try {
    await safeQuery(
      `UPDATE "${schema}".${config.table}
       SET status = $1, resolved_at = NOW(), resolved_by = 'system', updated_at = NOW()
       WHERE ${config.idCol} = $2 AND status NOT IN ($1, 'closed', 'resolved', 'remediated')`,
      [config.closedStatus, sourceEntityId],
    );

    await propagateStateUpdate({
      tenantId,
      sourceModule: 'remediation',
      sourceEntityType: 'remediation_plan',
      sourceEntityId: remediationId,
      targetModule: sourceEntityType.includes('compliance') ? 'compliance' : sourceEntityType.includes('audit') ? 'audit' : sourceEntityType.includes('risk') ? 'risk' : sourceEntityType.includes('vendor') ? 'vendor' : 'governance',
      targetEntityType: sourceEntityType,
      targetEntityId: sourceEntityId,
      updateType: 'status',
      patch: { status: config.closedStatus },
      reason: `Remediation plan ${remediationId} completed`,
    });

    logger.info(`[StatePropagator] remediation ${remediationId} closed source ${sourceEntityType}:${sourceEntityId} → ${config.closedStatus}`);
  } catch (err) {
    logger.error(`[StatePropagator] remediation closure failed: ${(err as Error).message}`);
  }
}

export async function propagateVendorRiskToRegister(
  tenantId: string,
  vendorId: string,
  riskRating: string,
  _riskScore: number,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    const linkedRisks = await safeQuery(
      `SELECT risk_id FROM "${schema}".risk_vendor_links WHERE vendor_id = $1`,
      [vendorId],
    );

    for (const row of linkedRisks.rows) {
      const riskId = row.risk_id as string;
      const adjustmentFactor = riskRating === 'critical' ? 1.5 : riskRating === 'high' ? 1.2 : riskRating === 'medium' ? 1.0 : 0.8;

      await safeQuery(
        `UPDATE "${schema}".risks
         SET vendor_risk_factor = $1, vendor_risk_rating = $2,
             residual_score = GREATEST(1, ROUND(risk_score * (1 - COALESCE(
               (SELECT AVG(c.effectiveness_score) FROM "${schema}".risk_control_mappings rcm
                JOIN "${schema}".controls c ON c.control_id = rcm.control_id
                WHERE rcm.risk_id = $3), 0) / 100) * $1::numeric)),
             last_assessed_at = NOW(), updated_at = NOW()
         WHERE risk_id = $3`,
        [adjustmentFactor, riskRating, riskId],
      );

      await propagateStateUpdate({
        tenantId,
        sourceModule: 'vendor',
        sourceEntityType: 'vendor',
        sourceEntityId: vendorId,
        targetModule: 'risk',
        targetEntityType: 'risk',
        targetEntityId: riskId,
        updateType: 'score',
        patch: { vendor_risk_factor: adjustmentFactor, vendor_risk_rating: riskRating },
        reason: `Vendor ${vendorId} risk rating changed to ${riskRating}`,
      });
    }
  } catch (err) {
    logger.error(`[StatePropagator] vendor→risk propagation failed: ${(err as Error).message}`);
  }
}

export async function propagateAuditFindingToRiskAndControl(
  tenantId: string,
  findingId: string,
  controlId: string | null,
  severity: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  if (controlId) {
    try {
      const severityToReduction: Record<string, number> = {
        critical: 30, high: 20, medium: 10, low: 5,
      };
      const reduction = severityToReduction[severity] ?? 10;

      await safeQuery(
        `UPDATE "${schema}".controls
         SET effectiveness_score = GREATEST(0, effectiveness_score - $1),
             has_open_findings = true, last_assessed_at = NOW(), updated_at = NOW()
         WHERE control_id = $2`,
        [reduction, controlId],
      );

      await propagateStateUpdate({
        tenantId, sourceModule: 'audit', sourceEntityType: 'audit_finding', sourceEntityId: findingId,
        targetModule: 'compliance', targetEntityType: 'control', targetEntityId: controlId,
        updateType: 'score',
        patch: { effectiveness_reduction: reduction, has_open_findings: true },
        reason: `Audit finding ${findingId} (${severity}) impacts control effectiveness`,
      });

      const linkedRisks = await safeQuery(
        `SELECT risk_id FROM "${schema}".risk_control_mappings WHERE control_id = $1`,
        [controlId],
      );

      for (const row of linkedRisks.rows) {
        await safeQuery(
          `UPDATE "${schema}".risks
           SET has_open_findings = true, updated_at = NOW()
           WHERE risk_id = $1`,
          [row.risk_id],
        );
      }
    } catch (err) {
      logger.error(`[StatePropagator] finding→control propagation failed: ${(err as Error).message}`);
    }
  }
}

export async function propagateCompliancePostureChange(
  tenantId: string,
  frameworkId: string,
  newPostureScore: number,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    const staleEvidence = await safeQuery(
      `SELECT e.evidence_id, e.control_id FROM "${schema}".evidence e
       JOIN "${schema}".compliance_controls cc ON cc.control_id = e.control_id
       WHERE cc.framework_id = $1 AND e.status = 'validated'
         AND (e.expiry_date IS NOT NULL AND e.expiry_date < NOW() + INTERVAL '30 days')`,
      [frameworkId],
    );

    for (const row of staleEvidence.rows) {
      await safeQuery(
        `UPDATE "${schema}".evidence SET status = 'refresh_required', updated_at = NOW()
         WHERE evidence_id = $1 AND status = 'validated'`,
        [row.evidence_id],
      );
    }

    if (staleEvidence.rows.length > 0) {
      await swallow(EC.EVENT_BUS, eventBus.publish({
        eventType: 'evidence.bulk_refresh_requested' as any,
        tenantId, sourceService: 'state-propagator', severity: 'warning',
        entityType: 'framework', entityId: frameworkId,
        payload: {
          frameworkId, evidenceCount: staleEvidence.rows.length,
          reason: 'compliance_posture_change',
        },
      }));
    }

    const linkedRisks = await safeQuery(
      `SELECT DISTINCT r.risk_id FROM "${schema}".risks r
       JOIN "${schema}".risk_compliance_links rcl ON rcl.risk_id = r.risk_id
       JOIN "${schema}".compliance_controls cc ON cc.control_id = rcl.control_id
       WHERE cc.framework_id = $1`,
      [frameworkId],
    );

    if (newPostureScore < 70) {
      for (const row of linkedRisks.rows) {
        await safeQuery(
          `UPDATE "${schema}".risks
           SET compliance_posture_factor = $1, updated_at = NOW()
           WHERE risk_id = $2`,
          [newPostureScore / 100, row.risk_id],
        );
      }
    }

    logger.info(`[StatePropagator] compliance posture change: framework=${frameworkId}, score=${newPostureScore}, stale_evidence=${staleEvidence.rows.length}, risks_updated=${linkedRisks.rows.length}`);
  } catch (err) {
    logger.error(`[StatePropagator] compliance posture propagation failed: ${(err as Error).message}`);
  }
}

export function registerStatePropagatorSubscribers(): void {
  eventBus.subscribe('remediation.plan_completed' as any, 'state-propagator:remediation-closure', async (event: PlatformEvent) => {
    const { tenantId, payload } = event;
    if (!tenantId) return;
    const remediationId = payload.entityId as string || event.entityId;
    const sourceEntityType = payload.sourceEntityType as string;
    const sourceEntityId = payload.sourceEntityId as string;
    if (remediationId && sourceEntityType && sourceEntityId) {
      await propagateRemediationCompletion(tenantId, remediationId, sourceEntityType, sourceEntityId);
    }
  });

  eventBus.subscribe('vendor.risk_changed' as any, 'state-propagator:vendor-risk', async (event: PlatformEvent) => {
    const { tenantId, payload } = event;
    if (!tenantId) return;
    const vendorId = payload.entityId as string || event.entityId;
    const riskRating = payload.riskRating as string || payload.newState as string;
    const riskScore = payload.riskScore as number ?? 0;
    if (vendorId && riskRating) {
      await propagateVendorRiskToRegister(tenantId, vendorId, riskRating, riskScore);
    }
  });

  eventBus.subscribe('audit.finding_created' as any, 'state-propagator:finding-impact', async (event: PlatformEvent) => {
    const { tenantId, payload } = event;
    if (!tenantId) return;
    const findingId = payload.entityId as string || event.entityId;
    const controlId = payload.controlId as string ?? null;
    const severity = payload.severity as string || 'medium';
    if (findingId) {
      await propagateAuditFindingToRiskAndControl(tenantId, findingId, controlId, severity);
    }
  });

  eventBus.subscribe('compliance.posture_changed' as any, 'state-propagator:posture-cascade', async (event: PlatformEvent) => {
    const { tenantId, payload } = event;
    if (!tenantId) return;
    const frameworkId = payload.frameworkId as string || payload.entityId as string || event.entityId;
    const postureScore = payload.postureScore as number ?? payload.closureRate as number ?? 0;
    if (frameworkId) {
      await propagateCompliancePostureChange(tenantId, frameworkId, postureScore);
    }
  });

  logger.info('[StatePropagator] cross-module state propagation subscribers registered');
}
