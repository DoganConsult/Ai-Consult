import { safeQuery } from '../../../../../config/database';

import { logger } from '../../../../../platform/dos/observability/services/logger.service';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  status: string;
}

interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
}

/**
 * Builds a control dependency graph suitable for frontend visualization.
 * When rootControlId is supplied, returns only the subgraph reachable from
 * that control (BFS traversal). Otherwise returns the full graph.
 */
export async function getControlDependencyGraphForVisualization(
  tenantId: string,
  rootControlId?: string,
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const schema = `tenant_${tenantId}`;

  try {
    // ── 1. Load all controls ─────────────────────────────────────────
    const controlsResult = await safeQuery(
      `SELECT id, title, control_type, status
         FROM ${schema}.controls
        ORDER BY id`,
    );
    const allControls: Array<{
      id: string;
      title: string;
      control_type: string;
      status: string;
    }> = controlsResult.rows ?? [];

    if (allControls.length === 0) {
      return { nodes: [], edges: [] };
    }

    const controlMap = new Map(allControls.map((c) => [c.id, c]));

    // ── 2. Load all dependency edges ─────────────────────────────────
    const depsResult = await safeQuery(
      `SELECT source_control_id, target_control_id, relationship_type
         FROM ${schema}.control_dependencies
        ORDER BY source_control_id, target_control_id`,
    );
    const allEdges: Array<{
      source_control_id: string;
      target_control_id: string;
      relationship_type: string;
    }> = depsResult.rows ?? [];

    // ── 3. If a root is specified, BFS to find reachable subgraph ────
    let relevantControlIds: Set<string>;

    if (rootControlId && controlMap.has(rootControlId)) {
      relevantControlIds = new Set<string>();
      const adjacency = new Map<string, string[]>();

      for (const edge of allEdges) {
        if (!adjacency.has(edge.source_control_id)) {
          adjacency.set(edge.source_control_id, []);
        }
        adjacency.get(edge.source_control_id)!.push(edge.target_control_id);

        // Traverse in both directions for a complete subgraph
        if (!adjacency.has(edge.target_control_id)) {
          adjacency.set(edge.target_control_id, []);
        }
        adjacency.get(edge.target_control_id)!.push(edge.source_control_id);
      }

      const queue: string[] = [rootControlId];
      relevantControlIds.add(rootControlId);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const neighbors = adjacency.get(current) ?? [];
        for (const neighbor of neighbors) {
          if (!relevantControlIds.has(neighbor)) {
            relevantControlIds.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
    } else {
      relevantControlIds = new Set(allControls.map((c) => c.id));
    }

    // ── 4. Build output structures ───────────────────────────────────
    const nodes: GraphNode[] = [];
    for (const cid of relevantControlIds) {
      const ctrl = controlMap.get(cid);
      if (ctrl) {
        nodes.push({
          id: ctrl.id,
          label: ctrl.title,
          type: ctrl.control_type ?? 'control',
          status: ctrl.status ?? 'unknown',
        });
      }
    }

    const edges: GraphEdge[] = allEdges
      .filter(
        (e) =>
          relevantControlIds.has(e.source_control_id) &&
          relevantControlIds.has(e.target_control_id),
      )
      .map((e) => ({
        source: e.source_control_id,
        target: e.target_control_id,
        relationship: e.relationship_type ?? 'depends_on',
      }));

    return { nodes, edges };
  } catch (err) {
    logger.error(
      `[CONTROL_DEPENDENCY_GRAPH] failed for tenant ${tenantId}:`,
      err,
    );
    return { nodes: [], edges: [] };
  }
}
