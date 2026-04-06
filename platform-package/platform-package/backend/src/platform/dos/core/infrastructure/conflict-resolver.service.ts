// @ts-nocheck
import { catchHandler, EC } from '../../../../utils/resilient-catch';
import { logger } from '../../observability/services/logger.service';
// ============================================
// AGRC-OS — Advanced Conflict Resolution Service
// Requirements: 5.1 Advanced Conflict Resolution
// ============================================

import { safeQuery, tenantSchema } from '../../../../config/database';
import { eventBus } from '../../../../modules/platform/services/event/event-bus.service';
import { toErrorMessage } from '../../../../utils/http-error.util';
import type { AgentDiscovery, AgentHandoff } from '../../../../modules/ai/services/agent-cooperation.service';
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';

export interface AgentConflict {
  conflictId: string; // UUID or string
  tenantId: string; // VARCHAR(64) or UUID
  type: 'contradictory_findings' | 'duplicate_actions' | 'resource_contention' | 'priority_mismatch' | 'data_inconsistency' | 'contradictory_outcome' | 'severity_disagreement' | 'action_conflict';
  severity?: 'critical' | 'high' | 'medium' | 'low';
  agents?: string[];
  entities?: Array<{ entityType: string; entityId?: string }>;
  description?: string;
  evidence?: Array<{ agentId: string; discoveryId?: string; handoffId?: string; details: string; timestamp: string }>;
  detectedAt?: string;
  status: 'open' | 'detected' | 'resolving' | 'resolved' | 'ignored' | 'dismissed';
  resolution?: {
    strategy: 'merge' | 'prioritize' | 'defer' | 'escalate' | 'auto_resolve';
    resolvedBy?: string;
    resolvedAt?: string;
    resolutionDetails?: string;
  };
  metadata?: Record<string, any>;
  proposals?: Array<{ agentId: string; type: string; severity: string; title: string; details: string; entityType: string; entityId?: string }>;
  cycleId?: string;
  entityType?: string;
  entityId?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt?: string;
}

export interface ConflictResolutionStrategy {
  strategy: 'merge' | 'prioritize' | 'defer' | 'escalate' | 'auto_resolve';
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
  actions: Array<{ type: string; agentId?: string; description: string }>;
}

/**
 * Enhanced conflict detection with multiple conflict types
 * Requirements: 5.1 Advanced Conflict Resolution
 */
export async function detectConflictsAdvanced(
  tenantId: string,
  discoveries?: AgentDiscovery[],
  handoffs?: AgentHandoff[]
): Promise<AgentConflict[]> {
  const schema = tenantSchema(tenantId);
  const conflicts: AgentConflict[] = [];

  try {
    // Get recent discoveries if not provided
    if (!discoveries || discoveries.length === 0) {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const discRes = await safeQuery(
        `SELECT id, agent_id, discovery_type, title, severity, entity_type, entity_id, details, created_at
         FROM "${schema}".agent_discoveries
         WHERE tenant_id = $1 AND created_at >= $2
         ORDER BY created_at DESC
         LIMIT 500`,
        [tenantId, last24h],
      );
      discoveries = discRes.rows.map((r: GenericRow) => ({
        id: r.id,
        agentId: r.agent_id,
        type: r.discovery_type as AgentDiscovery['type'],
        severity: r.severity as AgentDiscovery['severity'],
        entityType: r.entity_type || '',
        entityId: r.entity_id,
        title: r.title,
        details: r.details || '',
        timestamp: r.created_at,
      }));
    }

    // Get recent handoffs if not provided
    if (!handoffs || handoffs.length === 0) {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const handoffRes = await safeQuery(
        `SELECT id, from_agent, to_agent, handoff_type, priority, payload, status, created_at
         FROM "${schema}".agent_handoffs
         WHERE tenant_id = $1 AND created_at >= $2
         ORDER BY created_at DESC
         LIMIT 200`,
        [tenantId, last24h],
      );
      handoffs = handoffRes.rows.map((r: GenericRow) => ({
        id: r.id,
        tenantId,
        fromAgent: r.from_agent,
        toAgent: r.to_agent,
        handoffType: r.handoff_type as AgentHandoff['handoffType'],
        priority: r.priority as AgentHandoff['priority'],
        payload: r.payload || {},
        status: r.status as AgentHandoff['status'],
        createdAt: r.created_at,
      }));
    }
    const resolvedHandoffs = handoffs || [];

    // 1. Contradictory Findings: Same entity, opposite conclusions
    const entityMap = new Map<string, AgentDiscovery[]>();
    for (const disc of discoveries) {
      if (disc.entityId && disc.entityType) {
        const key = `${disc.entityType}:${disc.entityId}`;
        if (!entityMap.has(key)) entityMap.set(key, []);
        entityMap.get(key)!.push(disc);
      }
    }

    for (const [entityKey, entityDiscs] of entityMap.entries()) {
      if (entityDiscs.length < 2) continue;

      // Check for contradictory severity or type
      const severityCounts = new Map<string, number>();
      const typeCounts = new Map<string, number>();
      for (const disc of entityDiscs) {
        severityCounts.set(disc.severity, (severityCounts.get(disc.severity) || 0) + 1);
        typeCounts.set(disc.type, (typeCounts.get(disc.type) || 0) + 1);
      }

      // Flag if same entity has both high/critical and low severity, or conflicting types
      const severities = Array.from(severityCounts.keys());
      const hasHighSeverity = severities.some(s => s === 'high' || s === 'critical');
      const hasLowSeverity = severities.some(s => s === 'low' || s === 'medium');
      
      if (hasHighSeverity && hasLowSeverity && entityDiscs.length >= 2) {
        const [entityType, entityId] = entityKey.split(':');
        conflicts.push({
          conflictId: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          tenantId,
          type: 'contradictory_findings',
          severity: 'high',
          agents: Array.from(new Set(entityDiscs.map(d => d.agentId))),
          entities: [{ entityType, entityId }],
          entityType,
          entityId,
          description: `Contradictory findings for ${entityType} ${entityId}: mixed severity levels (${severities.join(', ')})`,
          evidence: entityDiscs.map(d => ({
            agentId: d.agentId,
            discoveryId: d.id,
            details: `${d.type} - ${d.severity}: ${d.title}`,
            timestamp: d.timestamp,
          })),
          proposals: entityDiscs.map(d => ({
            agentId: d.agentId,
            type: d.type,
            severity: d.severity,
            title: d.title,
            details: d.details,
            entityType: d.entityType,
            entityId: d.entityId,
          })),
          detectedAt: new Date().toISOString(),
          status: 'detected',
        });
      }
    }

    // 2. Duplicate Actions: Multiple agents proposing same action for same entity
    const actionMap = new Map<string, Array<{ agentId: string; handoffId: string; priority: string; timestamp: string }>>();
    for (const handoff of resolvedHandoffs) {
      if (handoff.payload?.entityId && handoff.payload?.requestedAction) {
        const key = `${handoff.payload.entityType || 'any'}:${handoff.payload.entityId}:${handoff.payload.requestedAction}`;
        if (!actionMap.has(key)) actionMap.set(key, []);
        actionMap.get(key)!.push({
          agentId: handoff.fromAgent,
          handoffId: handoff.id,
          priority: handoff.priority,
          timestamp: handoff.createdAt,
        });
      }
    }

    for (const [actionKey, actionHandoffs] of actionMap.entries()) {
      if (actionHandoffs.length >= 2) {
        const [entityType, entityId, action] = actionKey.split(':');
        conflicts.push({
          conflictId: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          tenantId,
          type: 'duplicate_actions',
          severity: actionHandoffs.some(h => h.priority === 'critical' || h.priority === 'high') ? 'high' : 'medium',
          agents: Array.from(new Set(actionHandoffs.map(h => h.agentId))),
          entities: [{ entityType, entityId }],
          entityType,
          entityId,
          description: `Multiple agents proposing same action "${action}" for ${entityType} ${entityId}`,
          evidence: actionHandoffs.map(h => ({
            agentId: h.agentId,
            handoffId: h.handoffId,
            details: `Priority: ${h.priority}`,
            timestamp: h.timestamp,
          })),
          detectedAt: new Date().toISOString(),
          status: 'detected',
        });
      }
    }

    // 3. Resource Contention: Multiple agents trying to modify same resource simultaneously
    const resourceMap = new Map<string, Array<{ agentId: string; handoffId: string; timestamp: string }>>();
    for (const handoff of resolvedHandoffs) {
      if (handoff.payload?.entityId && handoff.handoffType === 'remediation_chain') {
        const key = `${handoff.payload.entityType || 'any'}:${handoff.payload.entityId}`;
        if (!resourceMap.has(key)) resourceMap.set(key, []);
        resourceMap.get(key)!.push({
          agentId: handoff.fromAgent,
          handoffId: handoff.id,
          timestamp: handoff.createdAt,
        });
      }
    }

    for (const [resourceKey, resourceHandoffs] of resourceMap.entries()) {
      if (resourceHandoffs.length >= 2) {
        // Check if handoffs are within 5 minutes (concurrent contention)
        const sorted = resourceHandoffs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const timeWindow = 5 * 60 * 1000; // 5 minutes
        const concurrent = sorted.filter((h, idx) => {
          if (idx === 0) return false;
          const timeDiff = new Date(h.timestamp).getTime() - new Date(sorted[idx - 1].timestamp).getTime();
          return timeDiff < timeWindow;
        });

        if (concurrent.length > 0) {
          const [entityType, entityId] = resourceKey.split(':');
          conflicts.push({
            conflictId: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            tenantId,
            type: 'resource_contention',
            severity: 'medium',
            agents: Array.from(new Set(resourceHandoffs.map(h => h.agentId))),
            entities: [{ entityType, entityId }],
            entityType,
            entityId,
            description: `Concurrent remediation attempts on ${entityType} ${entityId} by multiple agents`,
            evidence: resourceHandoffs.map(h => ({
              agentId: h.agentId,
              handoffId: h.handoffId,
              details: 'Remediation chain handoff',
              timestamp: h.timestamp,
            })),
            detectedAt: new Date().toISOString(),
            status: 'detected',
          });
        }
      }
    }

    // 4. Priority Mismatch: Same entity, different priority levels from different agents
    for (const [entityKey, entityDiscs] of entityMap.entries()) {
      if (entityDiscs.length < 2) continue;
      const priorities = new Set(entityDiscs.map(d => d.severity));
      if (priorities.size > 2) { // More than 2 different priority levels
        const [entityType, entityId] = entityKey.split(':');
        conflicts.push({
          conflictId: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          tenantId,
          type: 'priority_mismatch',
          severity: 'medium',
          agents: Array.from(new Set(entityDiscs.map(d => d.agentId))),
          entities: [{ entityType, entityId }],
          entityType,
          entityId,
          description: `Priority mismatch for ${entityType} ${entityId}: agents assigned different severity levels`,
          evidence: entityDiscs.map(d => ({
            agentId: d.agentId,
            discoveryId: d.id,
            details: `Severity: ${d.severity} - ${d.title}`,
            timestamp: d.timestamp,
          })),
          proposals: entityDiscs.map(d => ({
            agentId: d.agentId,
            type: d.type,
            severity: d.severity,
            title: d.title,
            details: d.details,
            entityType: d.entityType,
            entityId: d.entityId,
          })),
          detectedAt: new Date().toISOString(),
          status: 'detected',
        });
      }
    }

    // Store conflicts in DB (using enhanced schema)
    for (const conflict of conflicts) {
      await storeConflictEnhanced(tenantId, conflict);
    }

    return conflicts;
  } catch (err) {
    logger.error(`[ConflictResolver] Error detecting conflicts: ${toErrorMessage(err)}`);
    return [];
  }
}

/**
 * Store conflict in database (enhanced schema)
 */
async function storeConflictEnhanced(tenantId: string, conflict: AgentConflict): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    // Check if enhanced columns exist
    const colCheck = await safeQuery(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = current_schema() AND table_name = 'agent_conflicts' AND column_name IN ('severity', 'agents', 'evidence', 'detected_at')`,
      [],
    );
    const hasEnhanced = colCheck.rows.length >= 4;

    if (hasEnhanced) {
      // Use enhanced schema
      await safeQuery(
        `INSERT INTO "${schema}".agent_conflicts
         (conflict_id, tenant_id, conflict_type, severity, agents, entities, description, evidence, detected_at, status, metadata, cycle_id, entity_type, entity_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (conflict_id) DO UPDATE SET
           status = EXCLUDED.status,
           resolution = EXCLUDED.resolution,
           severity = EXCLUDED.severity,
           agents = EXCLUDED.agents,
           evidence = EXCLUDED.evidence,
           description = EXCLUDED.description`,
        [
          conflict.conflictId,
          tenantId,
          conflict.type,
          conflict.severity || null,
          conflict.agents || null,
          conflict.entities ? JSON.stringify(conflict.entities) : null,
          conflict.description || null,
          conflict.evidence ? JSON.stringify(conflict.evidence) : null,
          conflict.detectedAt || new Date().toISOString(),
          conflict.status,
          conflict.metadata ? JSON.stringify(conflict.metadata) : null,
          conflict.cycleId || null,
          conflict.entityType || (conflict.entities && conflict.entities[0]?.entityType) || null,
          conflict.entityId || (conflict.entities && conflict.entities[0]?.entityId) || null,
        ],
      );
    } else {
      // Fallback to legacy schema
      await safeQuery(
        `INSERT INTO "${schema}".agent_conflicts
         (conflict_id, tenant_id, conflict_type, status, entity_type, entity_id, proposals, resolution)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (conflict_id) DO UPDATE SET
           status = EXCLUDED.status,
           resolution = EXCLUDED.resolution`,
        [
          conflict.conflictId,
          tenantId,
          conflict.type,
          conflict.status,
          conflict.entityType || (conflict.entities && conflict.entities[0]?.entityType) || 'any',
          conflict.entityId || (conflict.entities && conflict.entities[0]?.entityId) || null,
          conflict.proposals ? JSON.stringify(conflict.proposals) : (conflict.evidence ? JSON.stringify(conflict.evidence!.map(e => ({ agentId: e.agentId, details: e.details }))) : '[]'),
          conflict.resolution ? JSON.stringify(conflict.resolution) : null,
        ],
      );
    }
  } catch (err) {
    logger.warn(`[ConflictResolver] Failed to store conflict ${conflict.conflictId}: ${toErrorMessage(err)}`);
  }
}

/**
 * Resolve conflict using strategy
 * Requirements: 5.1 Advanced Conflict Resolution
 */
export async function resolveConflict(
  tenantId: string,
  conflictId: string,
  strategy: ConflictResolutionStrategy,
  resolvedBy: string
): Promise<AgentConflict> {
  const schema = tenantSchema(tenantId);

  // Get conflict (handle both UUID and string conflict_id)
  const conflictRes = await safeQuery(
    `SELECT * FROM "${schema}".agent_conflicts 
     WHERE (conflict_id::text = $1 OR conflict_id = $1::uuid) AND tenant_id = $2`,
    [conflictId, tenantId],
  );

  if (conflictRes.rows.length === 0) {
    throw new Error(`Conflict ${conflictId} not found`);
  }

  const row = getFirstRow(conflictRes);
  const conflict: AgentConflict = {
    conflictId: String(row.conflict_id),
    tenantId: String(row.tenant_id),
    type: row.conflict_type as AgentConflict['type'],
    severity: row.severity as AgentConflict['severity'],
    agents: row.agents || [],
    entities: typeof row.entities === 'string' ? JSON.parse(row.entities) : (row.entities || []),
    description: row.description,
    evidence: typeof row.evidence === 'string' ? JSON.parse(row.evidence) : (row.evidence || []),
    detectedAt: row.detected_at || row.created_at,
    status: row.status as AgentConflict['status'],
    resolution: typeof row.resolution === 'string' ? JSON.parse(row.resolution) : (row.resolution || undefined),
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || undefined),
    proposals: typeof row.proposals === 'string' ? JSON.parse(row.proposals) : (row.proposals || undefined),
    cycleId: row.cycle_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };

  // Apply resolution strategy
  conflict.status = 'resolved';
  conflict.resolution = {
    strategy: strategy.strategy,
    resolvedBy,
    resolvedAt: new Date().toISOString(),
    resolutionDetails: strategy.reasoning,
  };

  // Execute resolution actions
  for (const action of strategy.actions) {
    try {
      if (action.type === 'merge_discoveries') {
        // Merge duplicate discoveries
        await mergeDiscoveries(tenantId, conflict);
      } else if (action.type === 'prioritize_agent') {
        // Prioritize one agent's findings
        await prioritizeAgentFindings(tenantId, conflict, action.agentId!);
      } else if (action.type === 'defer_handoff') {
        // Defer one of the conflicting handoffs
        await deferHandoff(tenantId, conflict, action.agentId!);
      } else if (action.type === 'escalate') {
        // Escalate to human review
        await escalateConflict(tenantId, conflict);
      }
    } catch (err) {
      logger.warn(`[ConflictResolver] Failed to execute action ${action.type}: ${toErrorMessage(err)}`);
    }
  }

  // Update conflict in DB (handle both UUID and string conflict_id)
  await safeQuery(
    `UPDATE "${schema}".agent_conflicts
     SET status = $1, resolution = $2, resolved_by = $3, resolved_at = NOW()
     WHERE (conflict_id::text = $4 OR conflict_id = $4::uuid) AND tenant_id = $5`,
    [
      conflict.status,
      JSON.stringify(conflict.resolution),
      resolvedBy,
      conflictId,
      tenantId,
    ],
  );

  // Publish event
  eventBus.publish({
    eventType: 'agent.conflict.resolved',
    tenantId,
    sourceService: 'conflict-resolver',
    severity: 'info',
    payload: { conflictId, strategy: strategy.strategy, resolvedBy },
  });

  return conflict;
}

/**
 * Auto-resolve conflicts using heuristics
 * Requirements: 5.1 Advanced Conflict Resolution
 */
export async function autoResolveConflicts(tenantId: string): Promise<{ resolved: number; failed: number }> {
  const schema = tenantSchema(tenantId);
  let resolved = 0;
  let failed = 0;

  try {
    // Get unresolved conflicts
    const conflictsRes = await safeQuery(
      `SELECT * FROM "${schema}".agent_conflicts
       WHERE tenant_id = $1 AND status = 'detected'
       ORDER BY 
         CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         detected_at ASC
       LIMIT 50`,
      [tenantId],
    );

    for (const row of conflictsRes.rows) {
      try {
        const conflict: AgentConflict = {
          conflictId: row.conflict_id,
          tenantId: row.tenant_id,
          type: row.conflict_type as AgentConflict['type'],
          severity: row.severity as AgentConflict['severity'],
          agents: row.agents || [],
          entities: row.entities || [],
          description: row.description,
          evidence: row.evidence || [],
          detectedAt: row.detected_at,
          status: row.status as AgentConflict['status'],
        };

        // Determine auto-resolution strategy
        const strategy = determineAutoResolutionStrategy(conflict);
        if (strategy) {
          await resolveConflict(tenantId, conflict.conflictId, strategy, 'system');
          resolved++;
        }
      } catch (err) {
        logger.warn(`[ConflictResolver] Failed to auto-resolve conflict ${row.conflict_id}: ${toErrorMessage(err)}`);
        failed++;
      }
    }
  } catch (err) {
    logger.error(`[ConflictResolver] Error in auto-resolve: ${toErrorMessage(err)}`);
  }

  return { resolved, failed };
}

/**
 * Determine auto-resolution strategy based on conflict type and evidence
 */
function determineAutoResolutionStrategy(conflict: AgentConflict): ConflictResolutionStrategy | null {
  // For duplicate actions: merge or prioritize by agent priority
  if (conflict.type === 'duplicate_actions') {
    const _priorities = conflict.evidence!.map(_e => {
      // Extract priority from handoff if available
      return 'medium'; // Default
    });
    const _highestPriorityIdx = 0; // Simplified
    return {
      strategy: 'merge',
      priority: conflict.severity || 'medium',
      reasoning: 'Merging duplicate actions from multiple agents',
      actions: [{ type: 'merge_discoveries', description: 'Merge duplicate action proposals' }],
    };
  }

  // For contradictory findings: prioritize by agent trust or recency
  if (conflict.type === 'contradictory_findings') {
    // Prioritize most recent finding
    const sortedEvidence = conflict.evidence!.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return {
      strategy: 'prioritize',
      priority: conflict.severity || 'medium',
      reasoning: `Prioritizing most recent finding from ${sortedEvidence[0].agentId}`,
      actions: [{ type: 'prioritize_agent', agentId: sortedEvidence[0].agentId, description: 'Use most recent finding' }],
    };
  }

  // For resource contention: defer lower priority handoffs
  if (conflict.type === 'resource_contention') {
    return {
      strategy: 'defer',
      priority: conflict.severity || 'medium',
      reasoning: 'Deferring lower priority remediation attempts',
      actions: [{ type: 'defer_handoff', agentId: conflict.agents?.[1], description: 'Defer second agent handoff' }],
    };
  }

  // For priority mismatch: escalate to human
  if (conflict.type === 'priority_mismatch') {
    return {
      strategy: 'escalate',
      priority: conflict.severity || 'medium',
      reasoning: 'Priority mismatch requires human review',
      actions: [{ type: 'escalate', description: 'Escalate to human review' }],
    };
  }

  return null;
}

// Helper functions for resolution actions
async function mergeDiscoveries(tenantId: string, conflict: AgentConflict): Promise<void> {
  const schema = tenantSchema(tenantId);
  // Mark duplicate discoveries as merged
  for (const ev of conflict.evidence || []) {
    if (ev.discoveryId) {
      await safeQuery(
        `UPDATE "${schema}".agent_discoveries
         SET status = 'merged', merged_with_conflict = $1
         WHERE id = $2 AND tenant_id = $3`,
        [conflict.conflictId, ev.discoveryId, tenantId],
      ).catch(catchHandler(EC.EVENT_BUS, {}));
    }
  }
}

async function prioritizeAgentFindings(tenantId: string, conflict: AgentConflict, agentId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  // Mark other agents' findings as superseded
  for (const ev of conflict.evidence || []) {
    if (ev.agentId !== agentId && ev.discoveryId) {
      await safeQuery(
        `UPDATE "${schema}".agent_discoveries
         SET status = 'superseded', superseded_by_agent = $1
         WHERE id = $2 AND tenant_id = $3`,
        [agentId, ev.discoveryId, tenantId],
      ).catch(catchHandler(EC.EVENT_BUS, {}));
    }
  }
}

async function deferHandoff(tenantId: string, conflict: AgentConflict, agentId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  // Mark handoff as deferred
  for (const ev of conflict.evidence || []) {
    if (ev.agentId === agentId && ev.handoffId) {
      await safeQuery(
        `UPDATE "${schema}".agent_handoffs
         SET status = 'deferred', deferred_reason = $1
         WHERE id = $2 AND tenant_id = $3`,
        [`Deferred due to conflict ${conflict.conflictId}`, ev.handoffId, tenantId],
      ).catch(catchHandler(EC.EVENT_BUS, {}));
    }
  }
}

async function escalateConflict(tenantId: string, conflict: AgentConflict): Promise<void> {
  // Create escalation task/notification
  eventBus.publish({
    eventType: 'agent.conflict.escalated',
    tenantId,
    sourceService: 'conflict-resolver',
    severity: 'warning',
    payload: { conflictId: conflict.conflictId, type: conflict.type, severity: conflict.severity },
  });
}

/**
 * Get conflicts for tenant
 */
export async function getConflicts(
  tenantId: string,
  status?: 'detected' | 'resolving' | 'resolved' | 'ignored'
): Promise<AgentConflict[]> {
  const schema = tenantSchema(tenantId);
  const query = status
    ? `SELECT * FROM "${schema}".agent_conflicts WHERE tenant_id = $1 AND status = $2 ORDER BY detected_at DESC LIMIT 100`
    : `SELECT * FROM "${schema}".agent_conflicts WHERE tenant_id = $1 ORDER BY detected_at DESC LIMIT 100`;
  const params = status ? [tenantId, status] : [tenantId];

  const result = await safeQuery(query, params);
  return result.rows.map((row: GenericRow) => ({
    conflictId: String(row.conflict_id),
    tenantId: String(row.tenant_id),
    type: row.conflict_type as AgentConflict['type'],
    severity: row.severity as AgentConflict['severity'],
    agents: row.agents || [],
    entities: typeof row.entities === 'string' ? JSON.parse(row.entities) : (row.entities || []),
    description: row.description,
    evidence: typeof row.evidence === 'string' ? JSON.parse(row.evidence) : (row.evidence || []),
    detectedAt: row.detected_at || row.created_at,
    status: row.status as AgentConflict['status'],
    resolution: typeof row.resolution === 'string' ? JSON.parse(row.resolution) : (row.resolution || undefined),
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || undefined),
    proposals: typeof row.proposals === 'string' ? JSON.parse(row.proposals) : (row.proposals || undefined),
    cycleId: row.cycle_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  }));
}
