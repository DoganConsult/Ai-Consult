// @ts-nocheck
import { logger } from '../../../../platform/dos/observability/services/logger.service';
import { safeQuery, tenantSchema } from '../../../../config/database';
import { getFirstRow } from '../../../../utils/db-utils';
import { eventBus, type PlatformEvent } from '../event/event-bus.service';
import { createProcessTask } from '../../../../platform/dos/workflows';
import { swallow, EC } from '../../../../utils/resilient-catch';
import * as prom from 'prom-client';

const handshakeSuccessCounter = new prom.Counter({
  name: 'dos_cross_module_handshake_success_total',
  help: 'Successful cross-module handshakes',
  labelNames: ['source_module', 'target_module'],
});

const handshakeFailureCounter = new prom.Counter({
  name: 'dos_cross_module_handshake_failure_total',
  help: 'Failed cross-module handshakes',
  labelNames: ['source_module', 'target_module'],
});

export async function propagateAuditFindingClosure(
  tenantId: string,
  findingId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    const finding = getFirstRow(await safeQuery(
      `SELECT f.finding_id, f.control_id, f.severity, f.status
       FROM "${schema}".audit_findings f WHERE f.finding_id = $1`,
      [findingId],
    ));
    if (!finding || finding.status !== 'closed') return;

    if (finding.control_id) {
      const openFindings = await safeQuery(
        `SELECT COUNT(*)::int AS open_count FROM "${schema}".audit_findings
         WHERE control_id = $1 AND status NOT IN ('closed','resolved') AND finding_id != $2`,
        [finding.control_id, findingId],
      );
      const openCount = getFirstRow(openFindings)?.open_count ?? 0;

      if (openCount === 0) {
        await safeQuery(
          `UPDATE "${schema}".controls SET has_open_findings = false, updated_at = NOW() WHERE control_id = $1`,
          [finding.control_id],
        );
        handshakeSuccessCounter.inc({ source_module: 'audit', target_module: 'compliance' });
      }
    }

    const linkedRisks = await safeQuery(
      `SELECT risk_id FROM "${schema}".risk_compliance_links
       WHERE gap_id = $1 AND source_module = 'audit'`,
      [findingId],
    );

    for (const row of linkedRisks.rows) {
      const otherOpenFindings = await safeQuery(
        `SELECT COUNT(*)::int AS cnt FROM "${schema}".audit_findings
         WHERE finding_id IN (SELECT gap_id FROM "${schema}".risk_compliance_links WHERE risk_id = $1 AND source_module = 'audit')
           AND status NOT IN ('closed','resolved')`,
        [row.risk_id],
      );
      if ((getFirstRow(otherOpenFindings)?.cnt ?? 0) === 0) {
        await safeQuery(
          `UPDATE "${schema}".risks SET has_open_findings = false, updated_at = NOW() WHERE risk_id = $1`,
          [row.risk_id],
        );
      }
    }
  } catch (err) {
    handshakeFailureCounter.inc({ source_module: 'audit', target_module: 'risk' });
    logger.error(`[CrossHandshake] audit finding closure failed: ${(err as Error).message}`);
  }
}

export async function propagateComplianceFrameworkUpdate(
  tenantId: string,
  frameworkId: string,
  changeType: 'controls_added' | 'controls_removed' | 'requirements_changed' | 'version_updated',
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    const linkedPolicies = await safeQuery(
      `SELECT DISTINCT p.policy_id, p.title FROM "${schema}".policies p
       WHERE p.framework_ids @> ARRAY[$1]::text[] OR p.linked_framework_id = $1
       LIMIT 50`,
      [frameworkId],
    );

    for (const policy of linkedPolicies.rows) {
      await createProcessTask(tenantId, {
        title: `Policy review: Framework ${changeType}`,
        description: `Compliance framework has been updated (${changeType}). Review policy "${policy.title}" for alignment.`,
        taskType: 'policy_creation',
        priority: changeType === 'controls_removed' ? 'high' : 'medium',
        entityType: 'policy',
        entityId: policy.policy_id as string,
        triggerSource: 'compliance.framework_updated',
      });
    }

    const assessments = await safeQuery(
      `SELECT assessment_id FROM "${schema}".assessments
       WHERE framework_id = $1 AND status NOT IN ('completed','closed') AND deleted_at IS NULL`,
      [frameworkId],
    );

    for (const assessment of assessments.rows) {
      await safeQuery(
        `UPDATE "${schema}".assessments
         SET requires_review = true, framework_change_type = $1, updated_at = NOW()
         WHERE assessment_id = $2`,
        [changeType, assessment.assessment_id],
      );
    }

    const linkedRisks = await safeQuery(
      `SELECT DISTINCT r.risk_id FROM "${schema}".risks r
       JOIN "${schema}".risk_compliance_links rcl ON rcl.risk_id = r.risk_id
       JOIN "${schema}".compliance_controls cc ON cc.control_id = rcl.control_id
       WHERE cc.framework_id = $1 LIMIT 50`,
      [frameworkId],
    );

    if (linkedRisks.rows.length > 0 && changeType === 'controls_removed') {
      await createProcessTask(tenantId, {
        title: `Risk review: ${linkedRisks.rows.length} risk(s) affected by framework control removal`,
        description: `Controls removed from framework. ${linkedRisks.rows.length} linked risk(s) may need re-assessment.`,
        taskType: 'risk_assessment',
        priority: 'high',
        entityType: 'framework',
        entityId: frameworkId,
        triggerSource: 'compliance.framework_updated',
      });
    }

    await swallow(EC.EVENT_BUS, eventBus.publish({
      eventType: 'compliance.framework_impact_propagated' as any,
      tenantId, sourceService: 'cross-handshake', severity: 'info',
      entityType: 'framework', entityId: frameworkId,
      payload: { frameworkId, changeType, policiesAffected: linkedPolicies.rows.length, risksAffected: linkedRisks.rows.length },
    }));

    handshakeSuccessCounter.inc({ source_module: 'compliance', target_module: 'policy' });
    handshakeSuccessCounter.inc({ source_module: 'compliance', target_module: 'risk' });
  } catch (err) {
    handshakeFailureCounter.inc({ source_module: 'compliance', target_module: 'policy' });
    logger.error(`[CrossHandshake] framework update propagation failed: ${(err as Error).message}`);
  }
}

export async function propagateIncidentToVendorRisk(
  tenantId: string,
  incidentId: string,
  vendorId: string | null,
  severity: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  if (!vendorId) return;

  try {
    const vendor = getFirstRow(await safeQuery(
      `SELECT vendor_id, risk_score, risk_rating FROM "${schema}".vendors WHERE vendor_id = $1`,
      [vendorId],
    ));
    if (!vendor) return;

    const severityBoost: Record<string, number> = { critical: 20, high: 10, medium: 5, low: 2 };
    const boost = severityBoost[severity] ?? 5;
    const newScore = Math.min(100, (vendor.risk_score ?? 50) + boost);

    let newRating = vendor.risk_rating;
    if (newScore >= 80) newRating = 'critical';
    else if (newScore >= 60) newRating = 'high';
    else if (newScore >= 35) newRating = 'medium';

    await safeQuery(
      `UPDATE "${schema}".vendors
       SET risk_score = $1, risk_rating = $2, incident_count = COALESCE(incident_count, 0) + 1,
           last_incident_at = NOW(), updated_at = NOW()
       WHERE vendor_id = $3`,
      [newScore, newRating, vendorId],
    );

    if (newRating !== vendor.risk_rating) {
      await swallow(EC.EVENT_BUS, eventBus.publish({
        eventType: 'vendor.risk_changed' as any,
        tenantId, sourceService: 'cross-handshake', severity: newRating === 'critical' ? 'critical' : 'warning',
        entityType: 'vendor', entityId: vendorId,
        payload: { vendorId, riskRating: newRating, riskScore: newScore, reason: `incident:${incidentId}` },
      }));
    }

    handshakeSuccessCounter.inc({ source_module: 'incident', target_module: 'vendor' });
  } catch (err) {
    handshakeFailureCounter.inc({ source_module: 'incident', target_module: 'vendor' });
    logger.error(`[CrossHandshake] incident→vendor propagation failed: ${(err as Error).message}`);
  }
}

export async function propagateIssueToRiskAndRemediation(
  tenantId: string,
  issueId: string,
  severity: string,
  sourceModule: string,
  _linkedEntityId: string | null,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    if (severity === 'critical' || severity === 'high') {
      await safeQuery(
        `INSERT INTO "${schema}".risk_compliance_links (gap_id, source_module, severity, status, created_at)
         VALUES ($1, $2, $3, 'pending_review', NOW()) ON CONFLICT DO NOTHING`,
        [issueId, 'issues', severity],
      );

      await createProcessTask(tenantId, {
        title: `Risk review: ${severity} issue raised from ${sourceModule}`,
        description: `A ${severity} issue requires risk impact analysis.`,
        taskType: 'risk_assessment',
        priority: severity === 'critical' ? 'critical' : 'high',
        entityType: 'issue',
        entityId: issueId,
        triggerSource: 'issues.created',
      });
    }

    await createProcessTask(tenantId, {
      title: `Remediation: Issue ${issueId} requires action`,
      description: `Issue raised from ${sourceModule}. Create remediation plan.`,
      taskType: 'remediation',
      priority: severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'medium',
      entityType: 'issue',
      entityId: issueId,
      triggerSource: 'issues.created',
    });

    handshakeSuccessCounter.inc({ source_module: 'issues', target_module: 'risk' });
    handshakeSuccessCounter.inc({ source_module: 'issues', target_module: 'remediation' });
  } catch (err) {
    handshakeFailureCounter.inc({ source_module: 'issues', target_module: 'risk' });
    logger.error(`[CrossHandshake] issue→risk/remediation failed: ${(err as Error).message}`);
  }
}

export async function propagateRecordRetentionExpiry(
  tenantId: string,
  recordId: string,
  retentionPolicy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    const record = getFirstRow(await safeQuery(
      `SELECT record_id, title, entity_type, entity_id, classification
       FROM "${schema}".records WHERE record_id = $1`,
      [recordId],
    ));
    if (!record) return;

    if (record.classification === 'restricted' || record.classification === 'confidential') {
      await createProcessTask(tenantId, {
        title: `Records: Retention expiry for ${record.classification} record`,
        description: `Record "${record.title}" retention period expired under policy "${retentionPolicy}". Review for disposal or extension.`,
        taskType: 'verification',
        priority: record.classification === 'restricted' ? 'high' : 'medium',
        entityType: 'record',
        entityId: recordId,
        triggerSource: 'records.retention_expired',
      });
    }

    if (record.entity_type === 'audit_finding' && record.entity_id) {
      await swallow(EC.EVENT_BUS, eventBus.publish({
        eventType: 'records.audit_evidence_expiring' as any,
        tenantId, sourceService: 'cross-handshake', severity: 'warning',
        entityType: 'record', entityId: recordId,
        payload: { recordId, entityType: record.entity_type, entityId: record.entity_id, retentionPolicy },
      }));
    }

    handshakeSuccessCounter.inc({ source_module: 'records', target_module: 'audit' });
  } catch (err) {
    handshakeFailureCounter.inc({ source_module: 'records', target_module: 'audit' });
    logger.error(`[CrossHandshake] record retention propagation failed: ${(err as Error).message}`);
  }
}

export function registerCrossModuleHandshakeSubscribers(): void {
  eventBus.subscribe('audit.finding_closed' as any, 'x-handshake:finding-closure', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    const findingId = event.payload?.findingId as string || event.entityId;
    if (findingId) await propagateAuditFindingClosure(event.tenantId, findingId);
  });

  eventBus.subscribe('compliance.framework_updated' as any, 'x-handshake:fw-update', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    const frameworkId = event.payload?.frameworkId as string || event.entityId;
    const changeType = event.payload?.changeType as any || 'requirements_changed';
    if (frameworkId) await propagateComplianceFrameworkUpdate(event.tenantId, frameworkId, changeType);
  });

  eventBus.subscribe('incident.classified' as any, 'x-handshake:incident-vendor', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    const incidentId = event.entityId || event.payload?.incidentId as string;
    const vendorId = event.payload?.vendorId as string ?? null;
    const severity = event.payload?.severity as string || 'medium';
    if (incidentId) await propagateIncidentToVendorRisk(event.tenantId, incidentId, vendorId, severity);
  });

  eventBus.subscribe('issues.created' as any, 'x-handshake:issue-risk', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    const issueId = event.entityId || event.payload?.issueId as string;
    const severity = event.payload?.severity as string || 'medium';
    const sourceModule = event.payload?.sourceModule as string || 'issues';
    const linkedEntityId = event.payload?.linkedEntityId as string ?? null;
    if (issueId) await propagateIssueToRiskAndRemediation(event.tenantId, issueId, severity, sourceModule, linkedEntityId);
  });

  eventBus.subscribe('records.retention_expired' as any, 'x-handshake:record-retention', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    const recordId = event.entityId || event.payload?.recordId as string;
    const retentionPolicy = event.payload?.retentionPolicy as string || 'default';
    if (recordId) await propagateRecordRetentionExpiry(event.tenantId, recordId, retentionPolicy);
  });

  logger.info('[CrossModuleHandshake] 5 handshake subscribers registered');
}
