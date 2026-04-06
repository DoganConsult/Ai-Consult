// @ts-nocheck
import { logger } from '../../../../platform/dos/observability/services/logger.service';
// ============================================
// Shahin GRC — Knowledge Graph Engine
// Graph traversal, path-finding, impact propagation
// for entity relationships
// ============================================

import { safeQuery, tenantSchema } from '../../../../config/database';
import { recordObservation } from '../../../ai/services/observability/ai-observation.service';
import type { EntityType, RelationshipType } from '../entity-link/entity-link.types';

// ── Types ──────────────────────────────────────────────────────────────────

interface GraphNode {
  entityType: EntityType;
  entityId: string;
}

interface GraphEdge {
  source: GraphNode;
  target: GraphNode;
  relationshipType: RelationshipType;
}

interface Graph {
  nodes: Map<string, GraphNode>; // key: `${entityType}:${entityId}`
  edges: Map<string, Set<string>>; // adjacency list: nodeKey -> Set<neighborKeys>
  edgeMetadata: Map<string, RelationshipType>; // edgeKey -> relationshipType
}

interface PathSegment {
  from: GraphNode;
  to: GraphNode;
  relationshipType: RelationshipType;
}

interface ImpactRadiusResult {
  center: GraphNode;
  depth: number;
  entities: Array<{
    node: GraphNode;
    distance: number;
    path: PathSegment[];
  }>;
}

// ── Graph Cache ────────────────────────────────────────────────────────────

const graphCache = new Map<string, { graph: Graph; cachedAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── Core Graph Operations ───────────────────────────────────────────────────

/**
 * Builds an in-memory graph from entity_links table.
 * Uses adjacency list representation for efficient traversal.
 */
export async function buildGraph(tenantId: string, forceRefresh = false): Promise<Graph> {
  const cacheKey = tenantId;
  const now = Date.now();

  // Check cache
  if (!forceRefresh) {
    const cached = graphCache.get(cacheKey);
    if (cached && (now - cached.cachedAt) < CACHE_TTL_MS) {
      return cached.graph;
    }
  }

  const schema = tenantSchema(tenantId);
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, Set<string>>();
  const edgeMetadata = new Map<string, RelationshipType>();

  // Load all entity links
  const linksResult = await safeQuery(
    `SELECT source_type, source_id, target_type, target_id, link_type as relationship_type
     FROM "${schema}".entity_links
     ORDER BY created_at`,
    []
  );

  for (const link of linksResult.rows) {
    const sourceKey = `${link.source_type}:${link.source_id}`;
    const targetKey = `${link.target_type}:${link.target_id}`;
    const edgeKey = `${sourceKey}->${targetKey}`;

    // Add nodes
    if (!nodes.has(sourceKey)) {
      nodes.set(sourceKey, {
        entityType: link.source_type as EntityType,
        entityId: link.source_id,
      });
    }
    if (!nodes.has(targetKey)) {
      nodes.set(targetKey, {
        entityType: link.target_type as EntityType,
        entityId: link.target_id,
      });
    }

    // Add edges (bidirectional)
    if (!edges.has(sourceKey)) {
      edges.set(sourceKey, new Set());
    }
    if (!edges.has(targetKey)) {
      edges.set(targetKey, new Set());
    }

    edges.get(sourceKey)!.add(targetKey);
    edges.get(targetKey)!.add(sourceKey);

    // Store relationship type
    edgeMetadata.set(edgeKey, link.relationship_type as RelationshipType);
  }

  const graph: Graph = { nodes, edges, edgeMetadata };

  // Update cache
  graphCache.set(cacheKey, { graph, cachedAt: now });

  return graph;
}

/**
 * Finds shortest path between two entities using BFS.
 * Returns path segments or null if no path exists.
 */
export async function findShortestPath(
  tenantId: string,
  entityTypeA: EntityType,
  entityIdA: string,
  entityTypeB: EntityType,
  entityIdB: string
): Promise<PathSegment[] | null> {
  const graph = await buildGraph(tenantId);
  const startKey = `${entityTypeA}:${entityIdA}`;
  const endKey = `${entityTypeB}:${entityIdB}`;

  if (!graph.nodes.has(startKey) || !graph.nodes.has(endKey)) {
    return null;
  }

  if (startKey === endKey) {
    return []; // Same entity
  }

  // BFS with path tracking
  const queue: Array<{ key: string; path: PathSegment[] }> = [{ key: startKey, path: [] }];
  const visited = new Set<string>([startKey]);

  while (queue.length > 0) {
    const { key: currentKey, path } = queue.shift()!;

    if (currentKey === endKey) {
      return path;
    }

    const neighbors = graph.edges.get(currentKey);
    if (!neighbors) continue;

    for (const neighborKey of Array.from(neighbors)) {
      if (visited.has(neighborKey)) continue;

      visited.add(neighborKey);
      const sourceNode = graph.nodes.get(currentKey)!;
      const targetNode = graph.nodes.get(neighborKey)!;
      const edgeKey = `${currentKey}->${neighborKey}`;
      const relationshipType = graph.edgeMetadata.get(edgeKey) || graph.edgeMetadata.get(`${neighborKey}->${currentKey}`) || 'related_to' as RelationshipType;

      queue.push({
        key: neighborKey,
        path: [
          ...path,
          {
            from: sourceNode,
            to: targetNode,
            relationshipType,
          },
        ],
      });
    }
  }

  return null; // No path found
}

/**
 * Gets all entities within N hops (depth) from a center entity.
 * Useful for impact propagation analysis.
 */
export async function getImpactRadius(
  tenantId: string,
  entityType: EntityType,
  entityId: string,
  depth = 3
): Promise<ImpactRadiusResult> {
  const graph = await buildGraph(tenantId);
  const centerKey = `${entityType}:${entityId}`;

  if (!graph.nodes.has(centerKey)) {
    return {
      center: { entityType, entityId },
      depth,
      entities: [],
    };
  }

  const centerNode = graph.nodes.get(centerKey)!;
  const result: ImpactRadiusResult = {
    center: centerNode,
    depth,
    entities: [],
  };

  // BFS with depth tracking
  const queue: Array<{ key: string; distance: number; path: PathSegment[] }> = [
    { key: centerKey, distance: 0, path: [] },
  ];
  const visited = new Set<string>([centerKey]);

  while (queue.length > 0) {
    const { key: currentKey, distance, path } = queue.shift()!;

    if (distance > depth) continue;

    if (distance > 0) {
      // Add to results (exclude center)
      const currentNode = graph.nodes.get(currentKey)!;
      result.entities.push({
        node: currentNode,
        distance,
        path: [...path],
      });
    }

    if (distance >= depth) continue; // Don't traverse beyond depth

    const neighbors = graph.edges.get(currentKey);
    if (!neighbors) continue;

    for (const neighborKey of Array.from(neighbors)) {
      if (visited.has(neighborKey)) continue;

      visited.add(neighborKey);
      const sourceNode = graph.nodes.get(currentKey)!;
      const targetNode = graph.nodes.get(neighborKey)!;
      const edgeKey = `${currentKey}->${neighborKey}`;
      const relationshipType = graph.edgeMetadata.get(edgeKey) || graph.edgeMetadata.get(`${neighborKey}->${currentKey}`) || 'related_to' as RelationshipType;

      queue.push({
        key: neighborKey,
        distance: distance + 1,
        path: [
          ...path,
          {
            from: sourceNode,
            to: targetNode,
            relationshipType,
          },
        ],
      });
    }
  }

  return result;
}

/**
 * Finds entities with no links (disconnected from the graph).
 * These become 'gap' observations.
 */
export async function findDisconnectedEntities(tenantId: string): Promise<Array<{ entityType: EntityType; entityId: string }>> {
  const schema = tenantSchema(tenantId);
  const disconnected: Array<{ entityType: EntityType; entityId: string }> = [];

  // Get all entity types from the system
  const entityTypes: EntityType[] = ['risk', 'control', 'policy', 'framework', 'incident', 'vendor', 'evidence', 'finding', 'asset', 'bcp_plan', 'exception', 'workflow', 'team', 'remediation'];

  for (const entityType of entityTypes) {
    // Get all entities of this type
    let tableName: string;
    let idColumn: string;

    switch (entityType) {
      case 'risk':
        tableName = 'risks';
        idColumn = 'risk_id';
        break;
      case 'control':
        tableName = 'controls';
        idColumn = 'control_id';
        break;
      case 'policy':
        tableName = 'policies';
        idColumn = 'policy_id';
        break;
      case 'framework':
        tableName = 'frameworks';
        idColumn = 'framework_id';
        break;
      case 'incident':
        tableName = 'incidents';
        idColumn = 'incident_id';
        break;
      case 'vendor':
        tableName = 'vendors';
        idColumn = 'vendor_id';
        break;
      case 'evidence':
        tableName = 'evidence';
        idColumn = 'evidence_id';
        break;
      case 'finding':
        tableName = 'findings';
        idColumn = 'finding_id';
        break;
      case 'asset':
        tableName = 'assets';
        idColumn = 'asset_id';
        break;
      default:
        continue; // Skip unsupported types for now
    }

    try {
      // Get all entities of this type
      const entitiesResult = await safeQuery(
        `SELECT ${idColumn} FROM "${schema}".${tableName} LIMIT 1000`,
        []
      );

      // Check which ones have no links
      for (const row of entitiesResult.rows) {
        const entityId = row[idColumn];
        const linksResult = await safeQuery(
          `SELECT COUNT(*) as link_count
           FROM "${schema}".entity_links
           WHERE (source_type = $1 AND source_id = $2)
              OR (target_type = $1 AND target_id = $2)`,
          [entityType, entityId]
        );

        const linkCount = parseInt(linksResult.rows[0]?.link_count || '0', 10);
        if (linkCount === 0) {
          disconnected.push({ entityType, entityId });
        }
      }
    } catch (err: unknown) {
      // Table might not exist for this entity type, skip
      logger.warn(`[KnowledgeGraph] Could not check disconnected entities for ${entityType}: ${err}`);
    }
  }

  return disconnected;
}

/**
 * Records disconnected entities as 'gap' observations.
 * Should be called periodically (e.g., daily job).
 */
export async function recordDisconnectedEntitiesAsGaps(tenantId: string): Promise<number> {
  const disconnected = await findDisconnectedEntities(tenantId);
  let recorded = 0;

  for (const entity of disconnected) {
    try {
      await recordObservation({
        tenantId,
        observationType: 'gap',
        title: `Disconnected entity: ${entity.entityType}/${entity.entityId}`,
        description: `Entity ${entity.entityType}/${entity.entityId} has no relationships in the knowledge graph. Consider linking it to related entities.`,
        severity: 'info',
        entityType: entity.entityType,
        entityId: entity.entityId,
        confidence: 1.0,
      });
      recorded++;
    } catch (err: unknown) {
      logger.warn(`[KnowledgeGraph] Failed to record gap observation for ${entity.entityType}/${entity.entityId}: ${err}`);
    }
  }

  return recorded;
}

/**
 * Invalidates graph cache for a tenant.
 * Should be called when entity links are created/deleted.
 */
export function invalidateGraphCache(tenantId: string): void {
  graphCache.delete(tenantId);
}

// ── Event Subscriptions (for cache invalidation) ──────────────────────────

/**
 * Initialize event subscriptions for cache invalidation.
 * Should be called during service registration.
 */
export function initializeGraphCacheInvalidation(): void {
  // Subscribe to entity link events (if event bus supports it)
  // Note: This assumes event bus has a subscribe method
  // If not, we'll handle invalidation in entity-link.service.ts directly
}
