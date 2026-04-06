/**
 * GRC Data Integrity Guard — checks referential integrity across GRC entities.
 *
 * Detects orphan records, stale references, missing mandatory relationships,
 * and broken entity link chains. Run on a schedule or on-demand per tenant.
 *
 * @owner DOS
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../observability/services/logger.service';

export interface IntegrityIssue {
  type: 'orphan' | 'stale_reference' | 'missing_relationship' | 'invalid_state' | 'broken_link';
  entity: string;
  entityId: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  field?: string;
  referencedEntity?: string;
  referencedId?: string;
}

export interface IntegrityGuardResult {
  checksRun: number;
  issuesFound: number;
  issues: IntegrityIssue[];
  durationMs: number;
}

/**
 * Run the full integrity guard suite for a tenant.
 * Each check is independent and failures in one check do not block others.
 */
export async function runIntegrityGuard(
  tenantId: string,
): Promise<IntegrityGuardResult> {
  const schema = tenantSchema(tenantId);
  const startTime = Date.now();
  const allIssues: IntegrityIssue[] = [];
  let checksRun = 0;

  const checks: Array<{ name: string; fn: () => Promise<IntegrityIssue[]> }> = [
    { name: 'orphan_evidence', fn: () => checkOrphanEvidence(schema) },
    { name: 'orphan_controls', fn: () => checkOrphanControls(schema) },
    { name: 'risks_without_owners', fn: () => checkRisksWithoutOwners(schema) },
    { name: 'stale_entity_links', fn: () => checkStaleEntityLinks(schema) },
    { name: 'controls_without_frameworks', fn: () => checkControlsWithoutFrameworks(schema) },
    { name: 'orphan_workflow_instances', fn: () => checkOrphanWorkflowInstances(schema) },
    { name: 'invalid_workflow_states', fn: () => checkInvalidWorkflowStates(schema) },
    { name: 'findings_without_source', fn: () => checkFindingsWithoutSource(schema) },
  ];

  for (const check of checks) {
    try {
      const issues = await check.fn();
      allIssues.push(...issues);
      checksRun++;
    } catch (err) {
      logger.warn(
        `[INTEGRITY_GUARD] Check ${check.name} failed for tenant=${tenantId}: ${(err as Error).message}`,
      );
      checksRun++;
    }
  }

  const durationMs = Date.now() - startTime;

  if (allIssues.length > 0) {
    logger.warn(
      `[INTEGRITY_GUARD] tenant=${tenantId} checks=${checksRun} issues=${allIssues.length} duration=${durationMs}ms`,
    );
  } else {
    logger.info(
      `[INTEGRITY_GUARD] tenant=${tenantId} checks=${checksRun} issues=0 duration=${durationMs}ms`,
    );
  }

  return {
    checksRun,
    issuesFound: allIssues.length,
    issues: allIssues,
    durationMs,
  };
}

// ── Individual integrity checks ──

/**
 * Evidence records not linked to any control.
 */
async function checkOrphanEvidence(schema: string): Promise<IntegrityIssue[]> {
  const result = await safeQuery(
    `SELECT e.id, e.title
     FROM ${schema}.evidence e
     LEFT JOIN ${schema}.entity_links el
       ON el.source_type = 'evidence' AND el.source_id = e.id::text
       AND el.target_type = 'control'
     LEFT JOIN ${schema}.entity_links el2
       ON el2.target_type = 'evidence' AND el2.target_id = e.id::text
       AND el2.source_type = 'control'
     WHERE el.id IS NULL AND el2.id IS NULL
     LIMIT 500`,
  );

  return result.rows.map((r: any) => ({
    type: 'orphan' as const,
    entity: 'evidence',
    entityId: r.id,
    description: `Evidence "${r.title ?? r.id}" is not linked to any control`,
    severity: 'medium' as const,
  }));
}

/**
 * Controls not linked to any framework.
 */
async function checkControlsWithoutFrameworks(schema: string): Promise<IntegrityIssue[]> {
  const result = await safeQuery(
    `SELECT c.id, c.title
     FROM ${schema}.controls c
     LEFT JOIN ${schema}.entity_links el
       ON (el.source_type = 'control' AND el.source_id = c.id::text AND el.target_type = 'framework')
       OR (el.target_type = 'control' AND el.target_id = c.id::text AND el.source_type = 'framework')
     WHERE el.id IS NULL
     LIMIT 500`,
  );

  return result.rows.map((r: any) => ({
    type: 'orphan' as const,
    entity: 'control',
    entityId: r.id,
    description: `Control "${r.title ?? r.id}" is not linked to any framework`,
    severity: 'medium' as const,
  }));
}

/**
 * Controls not linked to any evidence (no evidence supporting the control).
 */
async function checkOrphanControls(schema: string): Promise<IntegrityIssue[]> {
  const result = await safeQuery(
    `SELECT c.id, c.title
     FROM ${schema}.controls c
     LEFT JOIN ${schema}.entity_links el
       ON (el.source_type = 'control' AND el.source_id = c.id::text AND el.target_type = 'evidence')
       OR (el.target_type = 'control' AND el.target_id = c.id::text AND el.source_type = 'evidence')
     WHERE el.id IS NULL
     LIMIT 500`,
  );

  return result.rows.map((r: any) => ({
    type: 'missing_relationship' as const,
    entity: 'control',
    entityId: r.id,
    description: `Control "${r.title ?? r.id}" has no supporting evidence`,
    severity: 'high' as const,
  }));
}

/**
 * Risks without an assigned owner.
 */
async function checkRisksWithoutOwners(schema: string): Promise<IntegrityIssue[]> {
  const result = await safeQuery(
    `SELECT id, title
     FROM ${schema}.risks
     WHERE (owner_id IS NULL OR owner_id = '')
     LIMIT 500`,
  );

  return result.rows.map((r: any) => ({
    type: 'missing_relationship' as const,
    entity: 'risk',
    entityId: r.id,
    description: `Risk "${r.title ?? r.id}" has no assigned owner`,
    severity: 'high' as const,
    field: 'owner_id',
  }));
}

/**
 * Entity links referencing entities that no longer exist (stale references).
 * Checks a representative set of entity types.
 */
async function checkStaleEntityLinks(schema: string): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];

  // Check source-side stale references for common entity types
  const entityTables: Record<string, string> = {
    risk: 'risks',
    control: 'controls',
    evidence: 'evidence',
    policy: 'policies',
    audit: 'audits',
    incident: 'incidents',
    vendor: 'vendors',
  };

  for (const [entityType, tableName] of Object.entries(entityTables)) {
    // Check source references
    const staleSource = await safeQuery(
      `SELECT el.id, el.source_id, el.target_type, el.target_id, el.link_type
       FROM ${schema}.entity_links el
       LEFT JOIN ${schema}.${tableName} t ON t.id::text = el.source_id
       WHERE el.source_type = $1 AND t.id IS NULL
       LIMIT 100`,
      [entityType],
    );

    for (const r of staleSource.rows) {
      issues.push({
        type: 'stale_reference',
        entity: 'entity_link',
        entityId: r.id,
        description: `Entity link references deleted ${entityType} (source_id=${r.source_id})`,
        severity: 'low',
        referencedEntity: entityType,
        referencedId: r.source_id,
      });
    }

    // Check target references
    const staleTarget = await safeQuery(
      `SELECT el.id, el.source_type, el.source_id, el.target_id, el.link_type
       FROM ${schema}.entity_links el
       LEFT JOIN ${schema}.${tableName} t ON t.id::text = el.target_id
       WHERE el.target_type = $1 AND t.id IS NULL
       LIMIT 100`,
      [entityType],
    );

    for (const r of staleTarget.rows) {
      issues.push({
        type: 'stale_reference',
        entity: 'entity_link',
        entityId: r.id,
        description: `Entity link references deleted ${entityType} (target_id=${r.target_id})`,
        severity: 'low',
        referencedEntity: entityType,
        referencedId: r.target_id,
      });
    }
  }

  return issues;
}

/**
 * Workflow instances referencing deleted or non-existent workflow definitions.
 */
async function checkOrphanWorkflowInstances(schema: string): Promise<IntegrityIssue[]> {
  const result = await safeQuery(
    `SELECT wi.id, wi.workflow_code, wi.current_state
     FROM ${schema}.workflow_instances wi
     LEFT JOIN ${schema}.module_workflow_registry wr
       ON wr.workflow_code = wi.workflow_code
     WHERE wr.id IS NULL
     LIMIT 200`,
  );

  return result.rows.map((r: any) => ({
    type: 'orphan' as const,
    entity: 'workflow_instance',
    entityId: r.id,
    description: `Workflow instance references missing definition: ${r.workflow_code}`,
    severity: 'medium' as const,
    referencedEntity: 'module_workflow_registry',
    referencedId: r.workflow_code,
  }));
}

/**
 * Workflow instances stuck in states that have no outgoing transitions.
 * Excludes terminal states (completed, cancelled, rejected, closed, archived).
 */
async function checkInvalidWorkflowStates(schema: string): Promise<IntegrityIssue[]> {
  const terminalStates = ['completed', 'cancelled', 'rejected', 'closed', 'archived', 'done'];
  const placeholders = terminalStates.map((_, i) => `$${i + 1}`).join(', ');

  const result = await safeQuery(
    `SELECT wi.id, wi.workflow_code, wi.current_state
     FROM ${schema}.workflow_instances wi
     LEFT JOIN ${schema}.module_lifecycle_transitions lt
       ON lt.module_code = wi.workflow_code
       AND lt.from_status = wi.current_state
     WHERE lt.id IS NULL
       AND wi.current_state NOT IN (${placeholders})
     LIMIT 200`,
    terminalStates,
  );

  return result.rows.map((r: any) => ({
    type: 'invalid_state' as const,
    entity: 'workflow_instance',
    entityId: r.id,
    description: `Workflow instance in state "${r.current_state}" has no available transitions (workflow=${r.workflow_code})`,
    severity: 'high' as const,
  }));
}

/**
 * Findings without a source audit or assessment.
 */
async function checkFindingsWithoutSource(schema: string): Promise<IntegrityIssue[]> {
  const result = await safeQuery(
    `SELECT id, title
     FROM ${schema}.findings
     WHERE (source_id IS NULL OR source_id = '')
       AND (audit_id IS NULL OR audit_id = '')
     LIMIT 500`,
  );

  return result.rows.map((r: any) => ({
    type: 'missing_relationship' as const,
    entity: 'finding',
    entityId: r.id,
    description: `Finding "${r.title ?? r.id}" has no source audit or assessment`,
    severity: 'medium' as const,
    field: 'source_id',
  }));
}
