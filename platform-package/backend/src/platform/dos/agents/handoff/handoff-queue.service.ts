import { logger } from '../../observability/logger.service';
// ============================================
// DOS Agent Handoff Queue Service (Patch 0 §5.5, Law 9)
// Canonical location: platform/dos/agents/handoff/
// @owner DOS
// @since 2026-03-30
// ============================================

import { safeQuery, tenantSchema } from '../../../../config/database';
import { eventBus } from '../../events/event-bus';
import { toErrorMessage } from '../../../../utils/http-error.util';
import type { AgentHandoff } from './handoff.types';

export interface HandoffBatch {
  batchId: string;
  tenantId: string;
  agentId: string;
  handoffs: AgentHandoff[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  createdAt: string;
  processedAt?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Priority queue for handoffs with batching support
 * Requirements: 5.2 Optimized Handoff Protocol
 */
export class HandoffPriorityQueue {
  private queues: Map<string, Map<string, AgentHandoff[]>> = new Map(); // tenantId -> priority -> handoffs[]

  /**
   * Enqueue handoff with priority ordering
   */
  enqueue(tenantId: string, handoff: AgentHandoff): void {
    if (!this.queues.has(tenantId)) {
      this.queues.set(tenantId, new Map([
        ['critical', []],
        ['high', []],
        ['medium', []],
        ['low', []],
      ]));
    }

    const tenantQueue = this.queues.get(tenantId)!;
    const priorityQueue = tenantQueue.get(handoff.priority) || [];
    priorityQueue.push(handoff);
    tenantQueue.set(handoff.priority, priorityQueue);
  }

  /**
   * Dequeue next handoff (highest priority first)
   */
  dequeue(tenantId: string): AgentHandoff | null {
    const tenantQueue = this.queues.get(tenantId);
    if (!tenantQueue) return null;

    const priorities: Array<'critical' | 'high' | 'medium' | 'low'> = ['critical', 'high', 'medium', 'low'];
    for (const priority of priorities) {
      const queue = tenantQueue.get(priority) || [];
      if (queue.length > 0) {
        return queue.shift() || null;
      }
    }
    return null;
  }

  /**
   * Peek at next handoff without removing it
   */
  peek(tenantId: string): AgentHandoff | null {
    const tenantQueue = this.queues.get(tenantId);
    if (!tenantQueue) return null;

    const priorities: Array<'critical' | 'high' | 'medium' | 'low'> = ['critical', 'high', 'medium', 'low'];
    for (const priority of priorities) {
      const queue = tenantQueue.get(priority) || [];
      if (queue.length > 0) {
        return queue[0];
      }
    }
    return null;
  }

  /**
   * Get batch of handoffs for an agent (up to maxBatchSize)
   */
  getBatch(tenantId: string, agentId: string, maxBatchSize: number = 10): AgentHandoff[] {
    const tenantQueue = this.queues.get(tenantId);
    if (!tenantQueue) return [];

    const batch: AgentHandoff[] = [];
    const priorities: Array<'critical' | 'high' | 'medium' | 'low'> = ['critical', 'high', 'medium', 'low'];

    for (const priority of priorities) {
      if (batch.length >= maxBatchSize) break;

      const queue = tenantQueue.get(priority) || [];
      const agentHandoffs = queue.filter(h => h.toAgent === agentId);
      
      // Take up to maxBatchSize
      const toTake = Math.min(agentHandoffs.length, maxBatchSize - batch.length);
      for (let i = 0; i < toTake; i++) {
        const handoff = agentHandoffs[i];
        batch.push(handoff);
        // Remove from queue
        const idx = queue.indexOf(handoff);
        if (idx >= 0) queue.splice(idx, 1);
      }
    }

    return batch;
  }

  /**
   * Get queue size for tenant
   */
  size(tenantId: string): number {
    const tenantQueue = this.queues.get(tenantId);
    if (!tenantQueue) return 0;

    let total = 0;
    for (const queue of tenantQueue.values()) {
      total += queue.length;
    }
    return total;
  }

  /**
   * Get queue size for specific agent
   */
  sizeForAgent(tenantId: string, agentId: string): number {
    const tenantQueue = this.queues.get(tenantId);
    if (!tenantQueue) return 0;

    let total = 0;
    for (const queue of tenantQueue.values()) {
      total += queue.filter(h => h.toAgent === agentId).length;
    }
    return total;
  }

  /**
   * Clear queue for tenant
   */
  clear(tenantId: string): void {
    this.queues.delete(tenantId);
  }
}

// Global priority queue instance
const globalHandoffQueue = new HandoffPriorityQueue();

/**
 * Enqueue handoff to priority queue
 * Requirements: 5.2 Optimized Handoff Protocol
 */
export function enqueueHandoff(tenantId: string, handoff: AgentHandoff): void {
  globalHandoffQueue.enqueue(tenantId, handoff);
  
  // Persist to DB
  persistHandoff(tenantId, handoff).catch(err => {
    logger.warn(`[HandoffQueue] Failed to persist handoff ${handoff.id}: ${toErrorMessage(err)}`);
  });

  // Publish event
  eventBus.publish({
    eventType: 'agent.handoff.queued',
    tenantId,
    sourceService: 'handoff-queue',
    severity: 'info',
    payload: { handoffId: handoff.id, fromAgent: handoff.fromAgent, toAgent: handoff.toAgent, priority: handoff.priority },
  });
}

/**
 * Get next batch of handoffs for agent
 * Requirements: 5.2 Optimized Handoff Protocol
 */
export async function getHandoffBatch(
  tenantId: string,
  agentId: string,
  maxBatchSize: number = 10
): Promise<HandoffBatch> {
  // Get from in-memory queue
  const handoffs = globalHandoffQueue.getBatch(tenantId, agentId, maxBatchSize);

  // Also query DB for any pending handoffs not in memory
  const schema = tenantSchema(tenantId);
  const dbHandoffs = await safeQuery(
    `SELECT id, from_agent, to_agent, handoff_type, priority, payload, status, created_at
     FROM "${schema}".agent_handoffs
     WHERE tenant_id = $1 AND to_agent = $2 AND status = 'pending'
     ORDER BY 
       CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
       created_at ASC
     LIMIT $3`,
    [tenantId, agentId, maxBatchSize],
  );

  // Merge and deduplicate
  const allHandoffs: AgentHandoff[] = [...handoffs];
  const handoffIds = new Set(handoffs.map(h => h.id));
  
  for (const row of dbHandoffs.rows) {
    if (!handoffIds.has(row.id)) {
      allHandoffs.push({
        id: row.id,
        fromAgent: row.from_agent,
        toAgent: row.to_agent,
        tenantId,
        handoffType: row.handoff_type as any,
        priority: row.priority,
        payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {}),
        status: row.status,
        createdAt: row.created_at,
      });
    }
  }

  // Determine batch priority (highest priority in batch)
  const priorities: Array<'critical' | 'high' | 'medium' | 'low'> = ['critical', 'high', 'medium', 'low'];
  let batchPriority: 'critical' | 'high' | 'medium' | 'low' = 'low';
  for (const priority of priorities) {
    if (allHandoffs.some(h => h.priority === priority)) {
      batchPriority = priority;
      break;
    }
  }

  const batch: HandoffBatch = {
    batchId: `batch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    tenantId,
    agentId,
    handoffs: allHandoffs.slice(0, maxBatchSize),
    priority: batchPriority,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  // Store batch in DB
  await storeBatch(tenantId, batch);

  return batch;
}

/**
 * Process handoff batch
 * Requirements: 5.2 Optimized Handoff Protocol
 */
export async function processHandoffBatch(
  tenantId: string,
  batchId: string,
  results: Array<{ handoffId: string; status: 'accepted' | 'completed' | 'rejected'; result?: Record<string, any> }>
): Promise<void> {
  const schema = tenantSchema(tenantId);

  // Update batch status
  await safeQuery(
    `UPDATE "${schema}".handoff_batches
     SET status = 'processing', processed_at = NOW()
     WHERE batch_id = $1 AND tenant_id = $2`,
    [batchId, tenantId],
  );

  // Update individual handoffs
  for (const result of results) {
    await safeQuery(
      `UPDATE "${schema}".agent_handoffs
       SET status = $1, result = $2, completed_at = NOW()
       WHERE id = $3 AND tenant_id = $4`,
      [
        result.status,
        result.result ? JSON.stringify(result.result) : null,
        result.handoffId,
        tenantId,
      ],
    );
  }

  // Mark batch as completed
  await safeQuery(
    `UPDATE "${schema}".handoff_batches
     SET status = 'completed'
     WHERE batch_id = $1 AND tenant_id = $2`,
    [batchId, tenantId],
  );

  // Publish event
  eventBus.publish({
    eventType: 'agent.handoff.batch.processed',
    tenantId,
    sourceService: 'handoff-queue',
    severity: 'info',
    payload: { batchId, handoffCount: results.length },
  });
}

/**
 * Get queue metrics for tenant
 */
export function getQueueMetrics(tenantId: string): {
  total: number;
  byPriority: Record<string, number>;
  byAgent: Record<string, number>;
} {
  const tenantQueue = globalHandoffQueue['queues'].get(tenantId);
  if (!tenantQueue) {
    return { total: 0, byPriority: {}, byAgent: {} };
  }

  const byPriority: Record<string, number> = {};
  const byAgent: Record<string, number> = {};

  for (const [priority, queue] of tenantQueue.entries()) {
    byPriority[priority] = queue.length;
    for (const handoff of queue) {
      byAgent[handoff.toAgent] = (byAgent[handoff.toAgent] || 0) + 1;
    }
  }

  return {
    total: globalHandoffQueue.size(tenantId),
    byPriority,
    byAgent,
  };
}

/**
 * Persist handoff to database
 */
async function persistHandoff(tenantId: string, handoff: AgentHandoff): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `INSERT INTO "${schema}".agent_handoffs
       (id, tenant_id, from_agent, to_agent, handoff_type, priority, payload, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         result = EXCLUDED.result,
         completed_at = EXCLUDED.completed_at`,
      [
        handoff.id,
        tenantId,
        handoff.fromAgent,
        handoff.toAgent,
        handoff.handoffType,
        handoff.priority,
        JSON.stringify(handoff.payload),
        handoff.status,
        handoff.createdAt,
      ],
    );
  } catch (err) {
    logger.warn(`[HandoffQueue] Failed to persist handoff: ${toErrorMessage(err)}`);
  }
}

/**
 * Store batch in database
 */
async function storeBatch(tenantId: string, batch: HandoffBatch): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `INSERT INTO "${schema}".handoff_batches
       (batch_id, tenant_id, agent_id, handoff_ids, priority, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (batch_id) DO UPDATE SET
         status = EXCLUDED.status,
         processed_at = EXCLUDED.processed_at`,
      [
        batch.batchId,
        tenantId,
        batch.agentId,
        batch.handoffs.map(h => h.id),
        batch.priority,
        batch.status,
        batch.createdAt,
      ],
    );
  } catch (err) {
    logger.warn(`[HandoffQueue] Failed to store batch: ${toErrorMessage(err)}`);
  }
}

/**
 * Load pending handoffs from DB into queue (on startup/recovery)
 */
export async function loadPendingHandoffs(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  let loaded = 0;

  try {
    const result = await safeQuery(
      `SELECT id, from_agent, to_agent, handoff_type, priority, payload, status, created_at
       FROM "${schema}".agent_handoffs
       WHERE tenant_id = $1 AND status = 'pending'
       ORDER BY 
         CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         created_at ASC`,
      [tenantId],
    );

    for (const row of result.rows) {
      const handoff: AgentHandoff = {
        id: row.id,
        fromAgent: row.from_agent,
        toAgent: row.to_agent,
        tenantId,
        handoffType: row.handoff_type as any,
        priority: row.priority,
        payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {}),
        status: row.status,
        createdAt: row.created_at,
      };
      globalHandoffQueue.enqueue(tenantId, handoff);
      loaded++;
    }
  } catch (err) {
    logger.warn(`[HandoffQueue] Failed to load pending handoffs: ${toErrorMessage(err)}`);
  }

  return loaded;
}
