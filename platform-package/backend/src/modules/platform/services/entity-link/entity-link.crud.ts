// @ts-nocheck
// Entity Link CRUD Operations (create, delete, get, bulk, legacy DB functions)
// Extracted from entity-link.service.ts -- all database write/read operations for links

import { safeQuery, tenantSchema, getClient } from '../../../../config/database/database';
import { recordAudit } from '../../../audit/services/audit/audit-trail.service';
import { getFirstRow } from '../../../../shared/data/db-utils';

import {
  EntityType,
  RelationshipType,
  EntityLink,
  EntityLinkInput,
  LegacyEntityLink,
  EntityLinkWithMeta,
  VALID_ENTITY_TYPES,
  _VALID_RELATIONSHIP_TYPES,
} from './entity-link.types';

import {
  validateEntityLink,
  buildBidirectionalLinks,
} from './entity-link.helpers';

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Entity existence validation helper.
 * Validates: Requirements 9.1
 */
async function entityExists(tenantId: string, entityType: EntityType, entityId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const tableMap: Record<EntityType, string> = {
    risk: 'risks',
    control: 'controls',
    policy: 'policies',
    framework: 'frameworks',
    incident: 'incidents',
    vendor: 'vendors',
    evidence: 'evidence',
    finding: 'assessment_items',
    remediation: 'remediation_plans',
    team: 'teams',
    workflow: 'workflows',
    asset: 'assets',
    bcp_plan: 'bcp_plans',
    exception: 'control_exceptions',
    process_task: 'process_tasks',
  };

  const table = tableMap[entityType];
  if (!table) return false;

  const idColumn = entityType === 'finding' ? 'item_id' :
                   entityType === 'evidence' ? 'evidence_id' :
                   entityType === 'incident' ? 'incident_id' :
                   entityType === 'vendor' ? 'vendor_id' :
                   `${entityType}_id`;

  try {
    const res = await safeQuery(
      `SELECT 1 FROM "${schema}".${table} WHERE ${idColumn} = $1 LIMIT 1`,
      [entityId]
    );
    return res.rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if a link already exists between two entities.
 * Validates: Requirements 9.2
 */
async function linkExists(
  tenantId: string,
  sourceType: EntityType,
  sourceId: string,
  targetType: EntityType,
  targetId: string,
  relationshipType: RelationshipType
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT 1 FROM "${schema}".entity_links
     WHERE source_type = $1 AND source_id = $2
       AND target_type = $3 AND target_id = $4
       AND link_type = $5
     LIMIT 1`,
    [sourceType, sourceId, targetType, targetId, relationshipType]
  );
  return res.rows.length > 0;
}

/**
 * Convert database row to EntityLink type.
 */
export function rowToEntityLink(row: any): EntityLink {
  return {
    linkId: row.link_id,
    sourceType: row.source_type as EntityType,
    sourceId: row.source_id,
    targetType: row.target_type as EntityType,
    targetId: row.target_id,
    relationshipType: row.link_type as RelationshipType,
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    createdBy: row.created_by,
  };
}

// ============================================================================
// Database Functions (Legacy API)
// ============================================================================

export async function createLinkLegacy(tenantId: string, data: {
  source_type: string; source_id: string; target_type: string; target_id: string;
  link_type?: string; created_by: string; metadata?: Record<string, string>;
}): Promise<LegacyEntityLink> {
  const schema = tenantSchema(tenantId);
  const linkType = data.link_type || 'related';
  const res = await safeQuery(
    `INSERT INTO "${schema}".entity_links (source_type, source_id, target_type, target_id, link_type, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.source_type, data.source_id, data.target_type, data.target_id, linkType, data.created_by]
  );
  const link = getFirstRow(res);
  if (data.metadata) {
    for (const [key, value] of Object.entries(data.metadata)) {
      await setLinkMetadata(tenantId, link.link_id, key, value);
    }
  }
  return link;
}

export async function getLinksForEntityLegacy(tenantId: string, entityType: string, entityId: string): Promise<LegacyEntityLink[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".entity_links
     WHERE (source_type = $1 AND source_id = $2) OR (target_type = $1 AND target_id = $2)
     ORDER BY created_at DESC`,
    [entityType, entityId]
  );
  return res.rows;
}

/** Get all links for an entity type (no specific entity -- used when entityId is 'all') */
export async function getLinksByEntityType(tenantId: string, entityType: string): Promise<LegacyEntityLink[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".entity_links
     WHERE source_type = $1 OR target_type = $1
     ORDER BY created_at DESC LIMIT 100`,
    [entityType]
  );
  return res.rows;
}

export async function getLinksWithMetadata(tenantId: string, entityType: string, entityId: string): Promise<EntityLinkWithMeta[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT el.*, COALESCE(
       json_object_agg(elm.key, elm.value) FILTER (WHERE elm.key IS NOT NULL), '{}'
     ) as metadata
     FROM "${schema}".entity_links el
     LEFT JOIN "${schema}".entity_link_metadata elm ON el.link_id = elm.link_id
     WHERE (el.source_type = $1 AND el.source_id = $2) OR (el.target_type = $1 AND el.target_id = $2)
     GROUP BY el.link_id
     ORDER BY el.created_at DESC`,
    [entityType, entityId]
  );
  return res.rows;
}

export async function getLinksByType(tenantId: string, entityType: string, entityId: string, linkType: string): Promise<LegacyEntityLink[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".entity_links
     WHERE ((source_type = $1 AND source_id = $2) OR (target_type = $1 AND target_id = $2))
       AND link_type = $3
     ORDER BY created_at DESC`,
    [entityType, entityId, linkType]
  );
  return res.rows;
}

export async function setLinkMetadata(tenantId: string, linkId: string, key: string, value: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".entity_link_metadata (link_id, key, value)
     VALUES ($1, $2, $3)
     ON CONFLICT (link_id, key) DO UPDATE SET value = $3`,
    [linkId, key, value]
  );
}

export async function deleteLinkLegacy(tenantId: string, linkId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  await safeQuery(`DELETE FROM "${schema}".entity_link_metadata WHERE link_id = $1`, [linkId]);
  const res = await safeQuery(`DELETE FROM "${schema}".entity_links WHERE link_id = $1`, [linkId]);
  return (res.rowCount ?? 0) > 0;
}

// ============================================================================
// New CRUD Operations (per design spec Requirements 1.1, 1.6, 9.1-9.5)
// ============================================================================

/**
 * Creates a bidirectional entity link.
 * Validates: Requirements 1.1, 1.6, 9.1, 9.2, 9.4
 */
export async function createLink(
  tenantId: string,
  userId: string,
  input: EntityLinkInput
): Promise<EntityLink> {
  // Validate input
  const validation = validateEntityLink(input);
  if (!validation.valid) {
    throw new Error(`Invalid link input: ${validation.errors.join(', ')}`);
  }

  // Validate both entities exist (Requirement 9.1)
  const [sourceExists, targetExists] = await Promise.all([
    entityExists(tenantId, input.sourceType, input.sourceId),
    entityExists(tenantId, input.targetType, input.targetId),
  ]);

  if (!sourceExists) {
    throw new Error(`Source entity not found: ${input.sourceType}/${input.sourceId}`);
  }
  if (!targetExists) {
    throw new Error(`Target entity not found: ${input.targetType}/${input.targetId}`);
  }

  // Check for duplicate (Requirement 9.2)
  const duplicateExists = await linkExists(
    tenantId,
    input.sourceType,
    input.sourceId,
    input.targetType,
    input.targetId,
    input.relationshipType
  );
  if (duplicateExists) {
    throw new Error(`Duplicate link: ${input.sourceType}/${input.sourceId} -> ${input.targetType}/${input.targetId} (${input.relationshipType})`);
  }

  const schema = tenantSchema(tenantId);
  const [forwardLink, reverseLink] = buildBidirectionalLinks(input);

  // Create both links atomically in a transaction (Requirement 1.6)
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Create forward link
    const forwardRes = await client.query(
      `INSERT INTO "${schema}".entity_links
       (source_type, source_id, target_type, target_id, link_type, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [forwardLink.sourceType, forwardLink.sourceId, forwardLink.targetType,
       forwardLink.targetId, forwardLink.relationshipType, userId]
    );

    // Store metadata for forward link
    if (input.metadata) {
      for (const [key, value] of Object.entries(input.metadata)) {
        await client.query(
          `INSERT INTO "${schema}".entity_link_metadata (link_id, key, value)
           VALUES ($1, $2, $3)
           ON CONFLICT (link_id, key) DO UPDATE SET value = $3`,
          [getFirstRow(forwardRes)?.link_id, key, String(value)]
        );
      }
    }

    // Create reverse link (bidirectional)
    await client.query(
      `INSERT INTO "${schema}".entity_links
       (source_type, source_id, target_type, target_id, link_type, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (source_type, source_id, target_type, target_id, link_type) DO UPDATE SET
         created_by = EXCLUDED.created_by
       WHERE entity_links.created_by IS DISTINCT FROM EXCLUDED.created_by`,
      [reverseLink.sourceType, reverseLink.sourceId, reverseLink.targetType,
       reverseLink.targetId, reverseLink.relationshipType, userId]
    );

    await client.query('COMMIT');

    // Log audit trail for link creation (Requirement 9.6)
    await recordAudit({
      tenantId,
      userId,
      module: 'entity_links',
      action: 'create',
      entityType: 'entity_link',
      entityId: getFirstRow(forwardRes)?.link_id,
      afterState: {
        linkId: getFirstRow(forwardRes)?.link_id,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        targetType: input.targetType,
        targetId: input.targetId,
        relationshipType: input.relationshipType,
        metadata: input.metadata || {},
      },
    });

    return {
      linkId: getFirstRow(forwardRes)?.link_id,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      targetType: input.targetType,
      targetId: input.targetId,
      relationshipType: input.relationshipType,
      metadata: input.metadata || {},
      createdAt: getFirstRow(forwardRes)?.created_at?.toISOString?.() || new Date().toISOString(),
      createdBy: userId,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Deletes a link and its bidirectional counterpart atomically.
 * Validates: Requirements 1.6, 9.3, 9.6
 */
export async function deleteLink(tenantId: string, linkId: string, userId?: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);

  // First, get the link details to find the reverse link
  const linkRes = await safeQuery(
    `SELECT * FROM "${schema}".entity_links WHERE link_id = $1`,
    [linkId]
  );

  if (linkRes.rows.length === 0) {
    return false;
  }

  const link = getFirstRow(linkRes);
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Delete metadata for the forward link
    await client.query(
      `DELETE FROM "${schema}".entity_link_metadata WHERE link_id = $1`,
      [linkId]
    );

    // Delete the forward link
    await client.query(
      `DELETE FROM "${schema}".entity_links WHERE link_id = $1`,
      [linkId]
    );

    // Find and delete the reverse link (bidirectional deletion)
    const reverseRes = await client.query(
      `SELECT link_id FROM "${schema}".entity_links
       WHERE source_type = $1 AND source_id = $2
         AND target_type = $3 AND target_id = $4`,
      [link.target_type, link.target_id, link.source_type, link.source_id]
    );

    if (reverseRes.rows.length > 0) {
      const reverseLinkId = getFirstRow(reverseRes)?.link_id;
      await client.query(
        `DELETE FROM "${schema}".entity_link_metadata WHERE link_id = $1`,
        [reverseLinkId]
      );
      await client.query(
        `DELETE FROM "${schema}".entity_links WHERE link_id = $1`,
        [reverseLinkId]
      );
    }

    await client.query('COMMIT');

    // Log audit trail for link deletion (Requirement 9.6)
    await recordAudit({
      tenantId,
      userId: userId || link.created_by || 'system',
      module: 'entity_links',
      action: 'delete',
      entityType: 'entity_link',
      entityId: linkId,
      beforeState: {
        linkId: link.link_id,
        sourceType: link.source_type,
        sourceId: link.source_id,
        targetType: link.target_type,
        targetId: link.target_id,
        relationshipType: link.link_type,
      },
    });

    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Gets all links for an entity with tenant isolation.
 * Validates: Requirements 9.4
 */
export async function getLinksForEntity(
  tenantId: string,
  entityType: EntityType,
  entityId: string
): Promise<EntityLink[]> {
  const schema = tenantSchema(tenantId);

  // Validate entity type
  if (!VALID_ENTITY_TYPES.includes(entityType)) {
    throw new Error(`Invalid entity type: ${entityType}`);
  }

  const res = await safeQuery(
    `SELECT el.*, COALESCE(
       json_object_agg(elm.key, elm.value) FILTER (WHERE elm.key IS NOT NULL), '{}'
     ) as metadata
     FROM "${schema}".entity_links el
     LEFT JOIN "${schema}".entity_link_metadata elm ON el.link_id = elm.link_id
     WHERE (el.source_type = $1 AND el.source_id = $2)
        OR (el.target_type = $1 AND el.target_id = $2)
     GROUP BY el.link_id
     ORDER BY el.created_at DESC`,
    [entityType, entityId]
  );

  return res.rows.map(rowToEntityLink);
}

/**
 * Bulk creates links with all-or-nothing validation.
 * Validates: Requirements 9.1, 9.2, 9.5
 */
export async function bulkCreateLinks(
  tenantId: string,
  userId: string,
  links: EntityLinkInput[]
): Promise<{ created: number; errors: string[] }> {
  const errors: string[] = [];

  if (!links || links.length === 0) {
    return { created: 0, errors: ['No links provided'] };
  }

  // Phase 1: Validate ALL links before committing any (Requirement 9.5)
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const prefix = `Link ${i + 1}`;

    // Validate input structure
    const validation = validateEntityLink(link);
    if (!validation.valid) {
      errors.push(`${prefix}: ${validation.errors.join(', ')}`);
      continue;
    }

    // Validate source entity exists (Requirement 9.1)
    const sourceExists = await entityExists(tenantId, link.sourceType, link.sourceId);
    if (!sourceExists) {
      errors.push(`${prefix}: Source entity not found: ${link.sourceType}/${link.sourceId}`);
    }

    // Validate target entity exists (Requirement 9.1)
    const targetExists = await entityExists(tenantId, link.targetType, link.targetId);
    if (!targetExists) {
      errors.push(`${prefix}: Target entity not found: ${link.targetType}/${link.targetId}`);
    }

    // Check for duplicate (Requirement 9.2)
    const duplicateExists = await linkExists(
      tenantId,
      link.sourceType,
      link.sourceId,
      link.targetType,
      link.targetId,
      link.relationshipType
    );
    if (duplicateExists) {
      errors.push(`${prefix}: Duplicate link already exists`);
    }
  }

  // If any validation errors, return without creating any links (all-or-nothing)
  if (errors.length > 0) {
    return { created: 0, errors };
  }

  // Phase 2: Create all links in a single transaction
  const schema = tenantSchema(tenantId);
  const client = await getClient();
  let created = 0;

  try {
    await client.query('BEGIN');

    for (const link of links) {
      const [forwardLink, reverseLink] = buildBidirectionalLinks(link);

      // Create forward link
      const forwardRes = await client.query(
        `INSERT INTO "${schema}".entity_links
         (source_type, source_id, target_type, target_id, link_type, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING link_id`,
        [forwardLink.sourceType, forwardLink.sourceId, forwardLink.targetType,
         forwardLink.targetId, forwardLink.relationshipType, userId]
      );

      // Store metadata for forward link
      if (link.metadata) {
        for (const [key, value] of Object.entries(link.metadata)) {
          await client.query(
            `INSERT INTO "${schema}".entity_link_metadata (link_id, key, value)
             VALUES ($1, $2, $3)
             ON CONFLICT (link_id, key) DO UPDATE SET value = $3`,
            [getFirstRow(forwardRes)?.link_id, key, String(value)]
          );
        }
      }

      // Create reverse link (bidirectional)
      await client.query(
        `INSERT INTO "${schema}".entity_links
         (source_type, source_id, target_type, target_id, link_type, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (source_type, source_id, target_type, target_id, link_type) DO UPDATE SET
           created_by = EXCLUDED.created_by
         WHERE (entity_links.created_by) IS DISTINCT FROM (EXCLUDED.created_by)`,
        [reverseLink.sourceType, reverseLink.sourceId, reverseLink.targetType,
         reverseLink.targetId, reverseLink.relationshipType, userId]
      );

      created++;
    }

    await client.query('COMMIT');

    // Log audit trail for bulk link creation (Requirement 9.6)
    // Log each created link individually for proper audit trail
    for (const link of links) {
      await recordAudit({
        tenantId,
        userId,
        module: 'entity_links',
        action: 'create',
        entityType: 'entity_link',
        entityId: `bulk_${link.sourceType}_${link.sourceId}_${link.targetType}_${link.targetId}`,
        afterState: {
          sourceType: link.sourceType,
          sourceId: link.sourceId,
          targetType: link.targetType,
          targetId: link.targetId,
          relationshipType: link.relationshipType,
          metadata: link.metadata || {},
          bulkOperation: true,
        },
      });
    }

    return { created, errors: [] };
  } catch (error) {
    await client.query('ROLLBACK');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { created: 0, errors: [`Transaction failed: ${errorMessage}`] };
  } finally {
    client.release();
  }
}
