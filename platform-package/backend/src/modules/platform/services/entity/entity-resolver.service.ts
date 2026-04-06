// @ts-nocheck
import { logger } from '../../../../platform/dos/observability/services/logger.service';
// ============================================
// Shahin — Entity Resolver Service
// Unified service for resolving entities by type + ID
// to display info (title, link, module) for use in
// report-hub, copilot, and evidence-lifecycle.
// Enhanced with cross-module queries and relationships.
// ============================================

import { safeQuery, tenantSchema } from "../../../../config/database";
import { resolveByEntity, getAllModuleDescriptors } from '../../../../platform/dos/modules/lifecycle/module-workflow-registry.service';
import { getLinksForEntity, getEntityGraph, EntityType } from "./entity-link.service";
import { getFirstRow } from '../../../../utils/db-utils';

export interface ResolvedEntity {
  moduleCode: string;
  title: string;
  routePath: string;
  grcModule?: string;
  status?: string;
  exists: boolean;
  entityId?: string;
  entityType?: string;
}

export interface EntityGraphNode {
  id: string;
  type: string;
  title: string;
  status?: string;
  moduleCode: string;
  routePath: string;
  exists: boolean;
}

export interface CrossModuleQuery {
  entityTypes?: string[]; // Filter by entity types
  modules?: string[]; // Filter by module codes
  filters?: Record<string, any>; // Additional filters per module
  limit?: number; // Max results per module
}

/**
 * Resolves an entity by type and ID to minimal display info.
 * Uses module registry to determine table/column mappings.
 *
 * @param tenantId - Tenant ID
 * @param entityType - Entity type (risk, control, policy, evidence, incident, vendor, assessment, finding, asset, workflow, etc.)
 * @param entityId - Entity ID
 * @returns Resolved entity info or null if not found/invalid
 */
export async function resolveEntity(
  tenantId: string,
  entityType: string,
  entityId: string
): Promise<ResolvedEntity | null> {
  if (!tenantId || !entityType || !entityId) {
    return null;
  }

  // Resolve module descriptor for this entity type
  const descriptor = resolveByEntity(entityType, tenantId);
  if (!descriptor) {
    return null;
  }

  // If no table mapping, return basic info
  if (!descriptor.entityTableName || !descriptor.entityIdColumn) {
    return {
      moduleCode: descriptor.moduleCode,
      title: `${entityType}:${entityId}`,
      routePath: `/${descriptor.grcModuleName}/${entityId}`,
      grcModule: descriptor.grcModuleName,
      exists: false,
    };
  }

  const schema = tenantSchema(tenantId);

  // Determine title column based on entity type
  const titleColumnMap: Record<string, string> = {
    risk: "title",
    control: "title",
    policy: "title",
    evidence: "title",
    incident: "title",
    vendor: "name",
    assessment: "name",
    finding: "control_node_id", // assessment_items uses control_node_id
    asset: "name",
    workflow: "name",
    exception: "title",
    remediation: "title",
    bcp: "title",
    team: "team_name",
  };

  const titleColumn = titleColumnMap[entityType] || "title";
  const statusColumn = ["risk", "control", "policy", "incident", "vendor", "assessment", "finding", "asset", "workflow", "exception", "remediation", "bcp"].includes(entityType)
    ? "status"
    : null;

  try {
    const selectFields = statusColumn
      ? `"${titleColumn}" AS title, "${statusColumn}" AS status`
      : `"${titleColumn}" AS title, NULL AS status`;

    const result = await safeQuery(
      `SELECT ${selectFields}
       FROM "${schema}"."${descriptor.entityTableName}"
       WHERE "${descriptor.entityIdColumn}" = $1
       LIMIT 1`,
      [entityId]
    );

    if (result.rows.length === 0) {
      return {
        moduleCode: descriptor.moduleCode,
        title: `${entityType}:${entityId}`,
        routePath: `/${descriptor.grcModuleName}/${entityId}`,
        grcModule: descriptor.grcModuleName,
        exists: false,
      };
    }

    const row = getFirstRow(result);
    return {
      moduleCode: descriptor.moduleCode,
      title: row.title || `${entityType}:${entityId}`,
      routePath: `/${descriptor.grcModuleName}/${entityId}`,
      grcModule: descriptor.grcModuleName,
      status: row.status || undefined,
      exists: true,
    };
  } catch (err: unknown) {
    // On error, return basic info
    return {
      moduleCode: descriptor.moduleCode,
      title: `${entityType}:${entityId}`,
      routePath: `/${descriptor.grcModuleName}/${entityId}`,
      grcModule: descriptor.grcModuleName,
      exists: false,
    };
  }
}

/**
 * Resolves multiple entities in batch.
 * Returns a map of entityId -> ResolvedEntity (or null if not found).
 */
export async function resolveEntities(
  tenantId: string,
  entityType: string,
  entityIds: string[]
): Promise<Map<string, ResolvedEntity | null>> {
  const results = new Map<string, ResolvedEntity | null>();

  if (!entityIds || entityIds.length === 0) {
    return results;
  }

  // Resolve in parallel
  const promises = entityIds.map(async (id) => {
    const resolved = await resolveEntity(tenantId, entityType, id);
    return [id, resolved] as [string, ResolvedEntity | null];
  });

  const resolved = await Promise.all(promises);
  for (const [id, entity] of resolved) {
    results.set(id, entity);
  }

  return results;
}

/**
 * Resolve entity relationships (related entities across modules)
 */
export async function resolveEntityRelations(
  tenantId: string,
  entityType: string,
  entityId: string
): Promise<ResolvedEntity[]> {
  if (!tenantId || !entityType || !entityId) {
    return [];
  }

  try {
    // Get links for this entity
    const links = await getLinksForEntity(tenantId, entityType as EntityType, entityId);

    // Resolve all linked entities
    const resolvedEntities: ResolvedEntity[] = [];
    const resolvePromises = links.map(async (link) => {
      // Resolve target entity
      const target = await resolveEntity(tenantId, link.targetType, link.targetId);
      if (target) {
        return {
          ...target,
          entityId: link.targetId,
          entityType: link.targetType,
        };
      }
      return null;
    });

    const resolved = await Promise.all(resolvePromises);
    for (const entity of resolved) {
      if (entity) {
        resolvedEntities.push(entity);
      }
    }

    return resolvedEntities;
  } catch (error: unknown) {
    logger.error(`Failed to resolve entity relations for ${entityType}:${entityId}:`, error);
    return [];
  }
}

/**
 * Resolve entity graph (related entities up to N levels deep)
 */
export async function resolveEntityGraph(
  tenantId: string,
  entityType: string,
  entityId: string,
  depth: number = 2
): Promise<{
  nodes: EntityGraphNode[];
  edges: Array<{ source: string; target: string; relationshipType: string }>;
}> {
  if (!tenantId || !entityType || !entityId || depth < 1) {
    return { nodes: [], edges: [] };
  }

  try {
    // Get entity graph from entity-link service
    const graph = await getEntityGraph(tenantId, entityType as EntityType, entityId, depth);

    // Convert graph nodes to EntityGraphNode format
    const nodes: EntityGraphNode[] = [];
    const nodeMap = new Map<string, EntityGraphNode>();

    // Resolve all nodes in the graph
    const resolvePromises = graph.nodes.map(async (node) => {
      const resolved = await resolveEntity(tenantId, node.type, node.id);
      if (resolved) {
        const graphNode: EntityGraphNode = {
          id: node.id,
          type: node.type,
          title: resolved.title,
          status: resolved.status,
          moduleCode: resolved.moduleCode,
          routePath: resolved.routePath,
          exists: resolved.exists,
        };
        nodeMap.set(`${node.type}:${node.id}`, graphNode);
        return graphNode;
      }
      return null;
    });

    const resolvedNodes = await Promise.all(resolvePromises);
    for (const node of resolvedNodes) {
      if (node) {
        nodes.push(node);
      }
    }

    // Convert edges
    const edges = graph.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      relationshipType: edge.relationshipType,
    }));

    return { nodes, edges };
  } catch (error: unknown) {
    logger.error(`Failed to resolve entity graph for ${entityType}:${entityId}:`, error);
    return { nodes: [], edges: [] };
  }
}

/**
 * Query entities across multiple modules
 */
export async function queryEntitiesAcrossModules(
  tenantId: string,
  query: CrossModuleQuery
): Promise<Map<string, ResolvedEntity[]>> {
  const results = new Map<string, ResolvedEntity[]>();

  if (!tenantId) {
    return results;
  }

  try {
    // Get all module descriptors
    const descriptors = getAllModuleDescriptors(tenantId);

    // Filter by requested modules or entity types
    const filteredDescriptors = descriptors.filter((desc) => {
      if (query.modules && !query.modules.includes(desc.moduleCode)) {
        return false;
      }
      if (query.entityTypes && !query.entityTypes.some((et) => desc.entityTypes.includes(et))) {
        return false;
      }
      return desc.entityTableName && desc.entityIdColumn;
    });

    // Query each module in parallel
    const queryPromises = filteredDescriptors.map(async (descriptor) => {
      const schema = tenantSchema(tenantId);
      const moduleResults: ResolvedEntity[] = [];

      try {
        // Build query based on filters
        let sql = `SELECT "${descriptor.entityIdColumn}" AS id`;
        const titleColumnMap: Record<string, string> = {
          risk: "title",
          control: "title",
          policy: "title",
          evidence: "title",
          incident: "title",
          vendor: "name",
          assessment: "name",
          finding: "control_node_id",
          asset: "name",
          workflow: "name",
          exception: "title",
          remediation: "title",
          bcp: "title",
          team: "team_name",
        };

        const entityType = descriptor.entityTypes[0] || descriptor.moduleCode;
        const titleColumn = titleColumnMap[entityType] || "title";
        sql += `, "${titleColumn}" AS title`;

        const statusColumn = ["risk", "control", "policy", "incident", "vendor", "assessment", "finding", "asset", "workflow", "exception", "remediation", "bcp"].includes(entityType)
          ? "status"
          : null;
        if (statusColumn) {
          sql += `, "${statusColumn}" AS status`;
        }

        sql += ` FROM "${schema}"."${descriptor.entityTableName}" WHERE 1=1`;

        const params: unknown[] = [];
        let paramIndex = 1;

        // Apply module-specific filters if provided
        if (query.filters && query.filters[descriptor.moduleCode]) {
          const moduleFilters = query.filters[descriptor.moduleCode];
          for (const [key, value] of Object.entries(moduleFilters)) {
            sql += ` AND "${key}" = $${paramIndex}`;
            params.push(value);
            paramIndex++;
          }
        }

        // Apply limit
        const limit = query.limit || 100;
        sql += ` LIMIT $${paramIndex}`;
        params.push(limit);

        const result = await safeQuery(sql, params);

        // Resolve each entity
        for (const row of result.rows) {
          const resolved = await resolveEntity(tenantId, entityType, row.id);
          if (resolved) {
            moduleResults.push({
              ...resolved,
              entityId: row.id,
              entityType,
            });
          }
        }
      } catch (error: unknown) {
        logger.error(`Failed to query entities for module ${descriptor.moduleCode}:`, error);
      }

      return [descriptor.moduleCode, moduleResults] as [string, ResolvedEntity[]];
    });

    const resolved = await Promise.all(queryPromises);
    for (const [moduleCode, entities] of resolved) {
      results.set(moduleCode, entities);
    }
  } catch (error: unknown) {
    logger.error(`Failed to query entities across modules:`, error);
  }

  return results;
}
