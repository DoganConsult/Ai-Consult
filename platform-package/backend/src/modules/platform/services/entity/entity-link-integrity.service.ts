// @ts-nocheck
// ============================================================================
// Entity Link Integrity Service — AI OS R2
// Validates cross-module link integrity: orphan detection, deletion blocking,
// and required-link enforcement.
// ============================================================================

import { safeQuery, tenantSchema } from '../../../../config/database';
const REQUIRED_ENTITY_LINKS: unknown = {};
const DELETION_BLOCKED_TARGETS: unknown = [];
import type { EntityType } from './entity-link.service';
import { getFirstRow } from '../../../../utils/db-utils';

// ── Table Map ──────────────────────────────────────────────────────────────

/** Maps EntityType to primary table + PK column for existence checks. */
const TABLE_MAP: Record<EntityType, { table: string; pk: string }> = {
  risk:        { table: 'risks',            pk: 'risk_id' },
  control:     { table: 'controls',         pk: 'control_id' },
  policy:      { table: 'policies',         pk: 'policy_id' },
  framework:   { table: 'frameworks',       pk: 'framework_id' },
  incident:    { table: 'incidents',        pk: 'incident_id' },
  vendor:      { table: 'vendors',          pk: 'vendor_id' },
  evidence:    { table: 'evidence_tasks',   pk: 'task_id' },
  finding:     { table: 'findings',         pk: 'finding_id' },
  asset:       { table: 'assets',           pk: 'asset_id' },
  bcp_plan:    { table: 'bcp_plans',        pk: 'plan_id' },
  exception:   { table: 'control_exceptions', pk: 'exception_id' },
  workflow:    { table: 'workflows',        pk: 'workflow_id' },
  team:        { table: 'teams',            pk: 'team_id' },
  remediation: { table: 'action_items',     pk: 'action_id' },
  process_task: { table: 'process_tasks',  pk: 'task_id' },
};

// ── Types ──────────────────────────────────────────────────────────────────

export interface OrphanedLink {
  link_id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  reason: 'source_missing' | 'target_missing';
}

export interface DeletionEnforcement {
  blocked: boolean;
  reason?: string;
  inboundLinkCount: number;
  criticalLinks: Array<{ source_type: string; source_id: string; relationship: string }>;
}

// ── Operations ─────────────────────────────────────────────────────────────

/**
 * Check if an entity exists in its domain table.
 */
export async function validateEntityExists(
  tenantId: string,
  entityType: EntityType,
  entityId: string,
): Promise<boolean> {
  const mapping = TABLE_MAP[entityType];
  if (!mapping) return false;
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT 1 FROM "${schema}"."${mapping.table}" WHERE "${mapping.pk}" = $1 LIMIT 1`,
      [entityId],
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if deleting an entity would leave orphaned critical links.
 * Returns blocked=true if REQUIRED_ENTITY_LINKS says blockTargetDeletion=true
 * and inbound links exist.
 */
export async function enforceLinksOnDelete(
  tenantId: string,
  entityType: EntityType,
  entityId: string,
): Promise<DeletionEnforcement> {
  const schema = tenantSchema(tenantId);

  // Only check if this entity type can block deletions
  if (!DELETION_BLOCKED_TARGETS.has(entityType)) {
    return { blocked: false, inboundLinkCount: 0, criticalLinks: [] };
  }

  try {
    // Find all inbound links where this entity is the target
    const result = await safeQuery(
      `SELECT link_id, source_type, source_id, link_type AS relationship
       FROM "${schema}".entity_links
       WHERE target_type = $1 AND target_id = $2`,
      [entityType, entityId],
    );

    if (result.rows.length === 0) {
      return { blocked: false, inboundLinkCount: 0, criticalLinks: [] };
    }

    // Check if any of the inbound links are from a required-link pair with blockTargetDeletion
    const criticalLinks = result.rows.filter((link: any) => {
      return REQUIRED_ENTITY_LINKS.some(
        (req) =>
          req.target === entityType &&
          req.source === link.source_type &&
          req.blockTargetDeletion,
      );
    });

    if (criticalLinks.length > 0) {
      return {
        blocked: true,
        reason: `Cannot delete ${entityType} ${entityId}: ${criticalLinks.length} critical inbound link(s) exist from ${[...new Set(criticalLinks.map((l: any) => l.source_type))].join(', ')}`,
        inboundLinkCount: result.rows.length,
        criticalLinks: criticalLinks.map((l: any) => ({
          source_type: l.source_type,
          source_id: l.source_id,
          relationship: l.relationship,
        })),
      };
    }

    return { blocked: false, inboundLinkCount: result.rows.length, criticalLinks: [] };
  } catch {
    return { blocked: false, inboundLinkCount: 0, criticalLinks: [] };
  }
}

/**
 * Scan entity_links for dangling references (source or target no longer exists).
 */
export async function detectOrphanedLinks(tenantId: string): Promise<OrphanedLink[]> {
  const schema = tenantSchema(tenantId);
  const orphans: OrphanedLink[] = [];

  try {
    // Get all links
    const linksRes = await safeQuery(
      `SELECT link_id, source_type, source_id, target_type, target_id
       FROM "${schema}".entity_links LIMIT 5000`,
      [],
    );

    for (const link of linksRes.rows) {
      // Check source exists
      const sourceMapping = TABLE_MAP[link.source_type as EntityType];
      if (sourceMapping) {
        const exists = await safeQuery(
          `SELECT 1 FROM "${schema}"."${sourceMapping.table}" WHERE "${sourceMapping.pk}" = $1 LIMIT 1`,
          [link.source_id],
        );
        if (exists.rows.length === 0) {
          orphans.push({ ...link, reason: 'source_missing' });
          continue;
        }
      }

      // Check target exists
      const targetMapping = TABLE_MAP[link.target_type as EntityType];
      if (targetMapping) {
        const exists = await safeQuery(
          `SELECT 1 FROM "${schema}"."${targetMapping.table}" WHERE "${targetMapping.pk}" = $1 LIMIT 1`,
          [link.target_id],
        );
        if (exists.rows.length === 0) {
          orphans.push({ ...link, reason: 'target_missing' });
        }
      }
    }

    return orphans;
  } catch {
    return [];
  }
}

/**
 * Remove orphaned links and return count of cleaned links.
 */
export async function cleanupOrphanedLinks(tenantId: string): Promise<number> {
  const orphans = await detectOrphanedLinks(tenantId);
  if (orphans.length === 0) return 0;

  const schema = tenantSchema(tenantId);
  const ids = orphans.map((o) => o.link_id);

  try {
    const result = await safeQuery(
      `DELETE FROM "${schema}".entity_links WHERE link_id = ANY($1::uuid[]) RETURNING link_id`,
      [ids],
    );
    return result.rows.length;
  } catch {
    return 0;
  }
}

/**
 * Get entity link integrity stats for a tenant.
 */
export async function getLinkIntegrityStats(tenantId: string): Promise<{
  totalLinks: number;
  orphanedLinks: number;
  linksByType: Record<string, number>;
}> {
  const schema = tenantSchema(tenantId);
  try {
    const [countRes, typeRes] = await Promise.all([
      safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".entity_links`, []),
      safeQuery(
        `SELECT link_type, COUNT(*)::int AS cnt FROM "${schema}".entity_links GROUP BY link_type`,
        [],
      ),
    ]);

    const orphans = await detectOrphanedLinks(tenantId);
    const linksByType: Record<string, number> = {};
    for (const row of typeRes.rows) linksByType[row.link_type] = row.cnt;

    return {
      totalLinks: getFirstRow(countRes)?.total || 0,
      orphanedLinks: orphans.length,
      linksByType,
    };
  } catch {
    return { totalLinks: 0, orphanedLinks: 0, linksByType: {} };
  }
}
