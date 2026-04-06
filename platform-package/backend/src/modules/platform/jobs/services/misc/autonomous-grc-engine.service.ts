/**
 * Autonomous GRC Engine — Automated compliance scanning and remediation.
 *
 * Runs four scan categories:
 *   1. Evidence staleness — flags evidence older than collection SLA
 *   2. Policy expiry — flags policies nearing or past expiry
 *   3. Control gaps — finds controls without evidence or testing
 *   4. Risk drift — detects risk scores that have increased since last assessment
 *
 * Creates remediation actions in the `remediation_actions` table for each issue.
 */

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../../../../config/database';
import { logger } from '../../../../../platform/dos/observability/logger.service';

export interface AutonomousEngineResult {
  scansCompleted: number;
  issuesFound: number;
  actionsCreated: number;
}

export async function runAutonomousEngine(
  tenantId: string,
): Promise<AutonomousEngineResult> {
  const schema = tenantSchema(tenantId);
  let issuesFound = 0;
  let actionsCreated = 0;
  let scansCompleted = 0;

  try {
    // --- 1. Evidence Staleness ---
    const staleResult = await scanStaleEvidence(schema, tenantId);
    issuesFound += staleResult.issues;
    actionsCreated += staleResult.actions;
    scansCompleted++;

    // --- 2. Policy Expiry ---
    const policyResult = await scanPolicyExpiry(schema, tenantId);
    issuesFound += policyResult.issues;
    actionsCreated += policyResult.actions;
    scansCompleted++;

    // --- 3. Control Gaps ---
    const controlResult = await scanControlGaps(schema, tenantId);
    issuesFound += controlResult.issues;
    actionsCreated += controlResult.actions;
    scansCompleted++;

    // --- 4. Risk Drift ---
    const riskResult = await scanRiskDrift(schema, tenantId);
    issuesFound += riskResult.issues;
    actionsCreated += riskResult.actions;
    scansCompleted++;

    logger.info('[AutonomousGRC] Scan cycle complete', {
      tenantId,
      scansCompleted,
      issuesFound,
      actionsCreated,
    });

    return { scansCompleted, issuesFound, actionsCreated };
  } catch (err) {
    logger.error('[AutonomousGRC] Engine run failed', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { scansCompleted, issuesFound, actionsCreated };
  }
}

interface ScanResult {
  issues: number;
  actions: number;
}

async function scanStaleEvidence(schema: string, tenantId: string): Promise<ScanResult> {
  const { rows } = await safeQuery(
    `SELECT id, title, control_id
     FROM "${schema}".evidence
     WHERE collected_at < NOW() - INTERVAL '90 days'
       AND status = 'active'
     LIMIT 200`,
  ).catch(() => ({ rows: [] }));

  let actions = 0;
  for (const row of rows) {
    const created = await createRemediationAction(schema, tenantId, {
      issueType: 'evidence_stale',
      entityType: 'evidence',
      entityId: row.id,
      title: `Re-collect stale evidence: ${row.title || row.id}`,
      description: `Evidence has not been updated in over 90 days. Linked control: ${row.control_id || 'none'}.`,
      priority: 'medium',
    });
    if (created) actions++;
  }

  return { issues: rows.length, actions };
}

async function scanPolicyExpiry(schema: string, tenantId: string): Promise<ScanResult> {
  const { rows } = await safeQuery(
    `SELECT id, title, expiry_date
     FROM "${schema}".policies
     WHERE status = 'active'
       AND expiry_date IS NOT NULL
       AND expiry_date <= NOW() + INTERVAL '30 days'
     LIMIT 200`,
  ).catch(() => ({ rows: [] }));

  let actions = 0;
  for (const row of rows) {
    const isExpired = new Date(row.expiry_date) <= new Date();
    const created = await createRemediationAction(schema, tenantId, {
      issueType: 'policy_expiry',
      entityType: 'policy',
      entityId: row.id,
      title: `${isExpired ? 'Expired' : 'Expiring'} policy: ${row.title || row.id}`,
      description: `Policy ${isExpired ? 'expired on' : 'expires on'} ${row.expiry_date}. Review and renew.`,
      priority: isExpired ? 'high' : 'medium',
    });
    if (created) actions++;
  }

  return { issues: rows.length, actions };
}

async function scanControlGaps(schema: string, tenantId: string): Promise<ScanResult> {
  // Controls with no linked evidence
  const { rows } = await safeQuery(
    `SELECT c.id, c.title
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".evidence e ON e.control_id = c.id AND e.status = 'active'
     WHERE c.status = 'active'
       AND e.id IS NULL
     LIMIT 200`,
  ).catch(() => ({ rows: [] }));

  let actions = 0;
  for (const row of rows) {
    const created = await createRemediationAction(schema, tenantId, {
      issueType: 'control_gap',
      entityType: 'control',
      entityId: row.id,
      title: `Control lacks evidence: ${row.title || row.id}`,
      description: 'No active evidence is linked to this control. Collect or attach evidence.',
      priority: 'high',
    });
    if (created) actions++;
  }

  return { issues: rows.length, actions };
}

async function scanRiskDrift(schema: string, tenantId: string): Promise<ScanResult> {
  // Risks whose current score exceeds their previous assessment score
  const { rows } = await safeQuery(
    `SELECT id, title, risk_score, previous_score
     FROM "${schema}".risks
     WHERE risk_score IS NOT NULL
       AND previous_score IS NOT NULL
       AND risk_score > previous_score
       AND status = 'active'
     LIMIT 200`,
  ).catch(() => ({ rows: [] }));

  let actions = 0;
  for (const row of rows) {
    const drift = row.risk_score - row.previous_score;
    const created = await createRemediationAction(schema, tenantId, {
      issueType: 'risk_drift',
      entityType: 'risk',
      entityId: row.id,
      title: `Risk score increased: ${row.title || row.id} (+${drift})`,
      description: `Risk score drifted from ${row.previous_score} to ${row.risk_score}. Investigate root cause.`,
      priority: drift >= 20 ? 'critical' : drift >= 10 ? 'high' : 'medium',
    });
    if (created) actions++;
  }

  return { issues: rows.length, actions };
}

async function createRemediationAction(
  schema: string,
  tenantId: string,
  params: {
    issueType: string;
    entityType: string;
    entityId: string;
    title: string;
    description: string;
    priority: string;
  },
): Promise<boolean> {
  try {
    // Avoid duplicates: check for existing open action on same entity + issue type
    const { rows: existing } = await safeQuery(
      `SELECT 1 FROM "${schema}".remediation_actions
       WHERE entity_type = $1 AND entity_id = $2 AND issue_type = $3
         AND status IN ('open', 'in_progress')
       LIMIT 1`,
      [params.entityType, params.entityId, params.issueType],
    ).catch(() => ({ rows: [] }));

    if (existing.length > 0) return false;

    await safeQuery(
      `INSERT INTO "${schema}".remediation_actions
         (id, tenant_id, issue_type, entity_type, entity_id, title, description, priority, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', NOW())`,
      [
        uuid(),
        tenantId,
        params.issueType,
        params.entityType,
        params.entityId,
        params.title,
        params.description,
        params.priority,
      ],
    );

    return true;
  } catch (err) {
    logger.warn('[AutonomousGRC] Failed to create remediation action', {
      entityId: params.entityId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
