// @ts-nocheck
// Entity Link Graph Traversal (entity graph building, metadata resolution)
// Extracted from entity-link.service.ts -- graph traversal and visualization support

import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { getFirstRow } from '../../../../shared/data/db-utils';

import {
  EntityType,
  RelationshipType,
  EntityGraph,
  EntityGraphNode,
  EntityGraphEdge,
  VALID_ENTITY_TYPES,
} from './entity-link.types';

import {
  normalizeLink,
} from './entity-link.helpers';

import {
  getLinksForEntityLegacy,
} from './entity-link.crud';

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Gets entity metadata (title, status) from the appropriate table.
 * Used by getEntityGraph to populate node metadata.
 */
async function getEntityMetadata(
  tenantId: string,
  entityType: EntityType,
  entityId: string
): Promise<{ title: string; status?: string }> {
  const schema = tenantSchema(tenantId);

  // Map entity types to their table configurations
  const tableConfig: Record<EntityType, { table: string; idColumn: string; titleColumn: string; statusColumn?: string }> = {
    risk: { table: 'risks', idColumn: 'risk_id', titleColumn: 'title', statusColumn: 'status' },
    control: { table: 'controls', idColumn: 'control_id', titleColumn: 'title', statusColumn: 'status' },
    policy: { table: 'policies', idColumn: 'policy_id', titleColumn: 'title', statusColumn: 'status' },
    framework: { table: 'frameworks', idColumn: 'framework_id', titleColumn: 'name', statusColumn: 'status' },
    incident: { table: 'incidents', idColumn: 'incident_id', titleColumn: 'title', statusColumn: 'status' },
    vendor: { table: 'vendors', idColumn: 'vendor_id', titleColumn: 'name', statusColumn: 'status' },
    evidence: { table: 'evidence', idColumn: 'evidence_id', titleColumn: 'title', statusColumn: undefined },
    finding: { table: 'assessment_items', idColumn: 'item_id', titleColumn: 'control_node_id', statusColumn: 'status' },
    remediation: { table: 'remediation_plans', idColumn: 'plan_id', titleColumn: 'title', statusColumn: 'status' },
    team: { table: 'teams', idColumn: 'team_id', titleColumn: 'team_name', statusColumn: undefined },
    workflow: { table: 'workflows', idColumn: 'workflow_id', titleColumn: 'name', statusColumn: 'status' },
    asset: { table: 'assets', idColumn: 'asset_id', titleColumn: 'name', statusColumn: 'status' },
    bcp_plan: { table: 'bcp_plans', idColumn: 'plan_id', titleColumn: 'title', statusColumn: 'status' },
    exception: { table: 'control_exceptions', idColumn: 'exception_id', titleColumn: 'title', statusColumn: 'status' },
    process_task: { table: 'process_tasks', idColumn: 'task_id', titleColumn: 'title', statusColumn: 'status' },
  };

  const config = tableConfig[entityType];
  if (!config) {
    return { title: `${entityType}:${entityId}`, status: undefined };
  }

  try {
    const statusSelect = config.statusColumn ? `, ${config.statusColumn} as status` : '';
    const res = await safeQuery(
      `SELECT ${config.titleColumn} as title${statusSelect}
       FROM "${schema}".${config.table}
       WHERE ${config.idColumn} = $1
       LIMIT 1`,
      [entityId]
    );

    if (res.rows.length > 0) {
      return {
        title: getFirstRow(res)?.title || `${entityType}:${entityId}`,
        status: getFirstRow(res)?.status,
      };
    }
  } catch {
    // Entity not found or table doesn't exist
  }

  return { title: `${entityType}:${entityId}`, status: undefined };
}

/**
 * Counts the number of links for an entity.
 * Used by getEntityGraph to populate linkCount in nodes.
 */
async function countLinksForEntity(
  tenantId: string,
  entityType: EntityType,
  entityId: string
): Promise<number> {
  const schema = tenantSchema(tenantId);

  try {
    const res = await safeQuery(
      `SELECT COUNT(*) as count
       FROM "${schema}".entity_links
       WHERE (source_type = $1 AND source_id = $2)
          OR (target_type = $1 AND target_id = $2)`,
      [entityType, entityId]
    );
    return parseInt(getFirstRow(res)?.count || '0', 10);
  } catch {
    return 0;
  }
}

// ============================================================================
// Graph Traversal (per design spec Requirement 1.5)
// ============================================================================

/**
 * Builds an entity graph with nodes and edges up to specified depth.
 * Includes node metadata (title, status, linkCount) for visualization.
 * Validates: Requirements 1.5
 *
 * @param tenantId - The tenant ID for data isolation
 * @param rootEntityType - The type of the root entity
 * @param rootEntityId - The ID of the root entity
 * @param depth - Maximum traversal depth (default: 2)
 * @returns EntityGraph with nodes containing metadata and edges with relationship types
 */
export async function getEntityGraph(
  tenantId: string,
  rootEntityType: EntityType,
  rootEntityId: string,
  depth: number = 2
): Promise<EntityGraph> {
  // Validate inputs
  if (!VALID_ENTITY_TYPES.includes(rootEntityType)) {
    throw new Error(`Invalid entity type: ${rootEntityType}`);
  }

  if (!rootEntityId || typeof rootEntityId !== 'string' || rootEntityId.trim() === '') {
    throw new Error('Invalid entity ID: must be a non-empty string');
  }

  if (depth < 0 || depth > 10) {
    throw new Error('Invalid depth: must be between 0 and 10');
  }

  const nodesMap = new Map<string, EntityGraphNode>();
  const edgesSet = new Set<string>(); // For deduplication
  const edges: EntityGraphEdge[] = [];
  const visited = new Set<string>();

  /**
   * Recursively traverses entity relationships to build the graph.
   */
  async function traverse(
    entityType: EntityType,
    entityId: string,
    currentDepth: number
  ): Promise<void> {
    const nodeKey = `${entityType}:${entityId}`;

    // Skip if already visited or exceeded depth
    if (visited.has(nodeKey) || currentDepth > depth) {
      return;
    }
    visited.add(nodeKey);

    // Fetch entity metadata and link count in parallel
    const [metadata, linkCount] = await Promise.all([
      getEntityMetadata(tenantId, entityType, entityId),
      countLinksForEntity(tenantId, entityType, entityId),
    ]);

    // Add node to the graph
    nodesMap.set(nodeKey, {
      id: entityId,
      type: entityType,
      title: metadata.title,
      status: metadata.status,
      linkCount,
    });

    // Get all links for this entity
    const links = await getLinksForEntityLegacy(tenantId, entityType, entityId);

    for (const link of links) {
      // Normalize the link to determine the related entity
      const normalized = normalizeLink(link, entityType, entityId);
      const relatedType = normalized.relatedType as EntityType;
      const relatedId = normalized.relatedId;

      // Create edge key for deduplication (sorted to handle bidirectional)
      const edgeKey = [
        `${entityType}:${entityId}`,
        `${relatedType}:${relatedId}`,
        link.link_type,
      ].sort().join('|');

      // Add edge if not already present
      if (!edgesSet.has(edgeKey)) {
        edgesSet.add(edgeKey);
        edges.push({
          source: entityId,
          target: relatedId,
          relationshipType: link.link_type as RelationshipType,
        });
      }

      // Recursively traverse related entity
      if (VALID_ENTITY_TYPES.includes(relatedType)) {
        await traverse(relatedType, relatedId, currentDepth + 1);
      }
    }
  }

  // Start traversal from the root entity
  await traverse(rootEntityType, rootEntityId, 0);

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
  };
}


