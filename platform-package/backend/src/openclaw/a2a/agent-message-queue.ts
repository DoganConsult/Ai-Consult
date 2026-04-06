// @ts-nocheck
// ============================================
// A2A (Agent-to-Agent) Message Queue
// Enables agents to communicate with each other
// via standardized message protocol
// ============================================

import { v4 as uuidv4 } from 'uuid';
import { safeQuery, tenantSchema } from '../../config/database/database';
import { logger } from '../../platform/dos/observability/logger.service';
import { toErrorMessage } from '../../errors/http-error.util';
import type { GenericRow } from '../../types/db-rows.types';
import { EC, catchHandler } from '../../utils/resilient-catch';

export interface AgentMessage {
  messageId: string;
  fromAgentId: string;
  toAgentId: string;
  tenantId: string;
  message: string;
  payload?: Record<string, any>;
  status: 'pending' | 'delivered' | 'read' | 'failed';
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
  error?: string;
}

/**
 * Send a message from one agent to another (A2A)
 */
export async function sendAgentMessage(
  tenantId: string,
  fromAgentId: string,
  toAgentId: string,
  message: string,
  payload?: Record<string, any>
): Promise<AgentMessage> {
  const schema = tenantSchema(tenantId);
  const messageId = uuidv4();
  const now = new Date().toISOString();

  // Create agent_messages table if it doesn't exist
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".agent_messages (
      message_id UUID PRIMARY KEY,
      from_agent_id VARCHAR(50) NOT NULL,
      to_agent_id VARCHAR(50) NOT NULL,
      tenant_id UUID NOT NULL,
      message TEXT NOT NULL,
      payload JSONB,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      delivered_at TIMESTAMP,
      read_at TIMESTAMP,
      error TEXT,
      INDEX idx_to_agent_status (to_agent_id, status),
      INDEX idx_from_agent (from_agent_id),
      INDEX idx_tenant (tenant_id)
    )
  `).catch(catchHandler(EC.EVENT_BUS));

  const agentMessage: AgentMessage = {
    messageId,
    fromAgentId,
    toAgentId,
    tenantId,
    message,
    payload,
    status: 'pending',
    createdAt: now,
  };

  try {
    await safeQuery(
      `INSERT INTO "${schema}".agent_messages 
       (message_id, from_agent_id, to_agent_id, tenant_id, message, payload, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        messageId,
        fromAgentId,
        toAgentId,
        tenantId,
        message,
        payload ? JSON.stringify(payload) : null,
        'pending',
        now,
      ]
    );

    // Mark as delivered immediately (in real implementation, this would be async)
    await safeQuery(
      `UPDATE "${schema}".agent_messages 
       SET status = 'delivered', delivered_at = NOW()
       WHERE message_id = $1`,
      [messageId]
    );

    agentMessage.status = 'delivered';
    agentMessage.deliveredAt = new Date().toISOString();

    logger.info('[A2A] Message sent', {
      messageId,
      from: fromAgentId,
      to: toAgentId,
      tenantId,
    });

    return agentMessage;
  } catch (err: unknown) {
    const errorMsg = toErrorMessage(err);
    logger.error('[A2A] Failed to send message', {
      messageId,
      error: errorMsg,
    });

    agentMessage.status = 'failed';
    agentMessage.error = errorMsg;

    // Try to update status in DB
    try {
      await safeQuery(
        `UPDATE "${schema}".agent_messages 
         SET status = 'failed', error = $1
         WHERE message_id = $2`,
        [errorMsg, messageId]
      );
    } catch {
      // Best effort
    }

    throw new Error(`Failed to send A2A message: ${errorMsg}`);
  }
}

/**
 * Get pending messages for an agent
 */
export async function getPendingMessages(
  tenantId: string,
  agentId: string
): Promise<AgentMessage[]> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".agent_messages
       WHERE to_agent_id = $1 AND status = 'pending'
       ORDER BY created_at ASC
       LIMIT 100`,
      [agentId]
    );

    return result.rows.map((row: GenericRow) => ({
      messageId: row.message_id,
      fromAgentId: row.from_agent_id,
      toAgentId: row.to_agent_id,
      tenantId: row.tenant_id,
      message: row.message,
      payload: row.payload ? JSON.parse(row.payload) : undefined,
      status: row.status,
      createdAt: row.created_at,
      deliveredAt: row.delivered_at,
      readAt: row.read_at,
      error: row.error,
    }));
  } catch (err: unknown) {
    logger.warn('[A2A] Failed to get pending messages', {
      agentId,
      error: toErrorMessage(err),
    });
    return [];
  }
}

/**
 * Mark a message as read
 */
export async function markMessageAsRead(
  tenantId: string,
  messageId: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".agent_messages
     SET status = 'read', read_at = NOW()
     WHERE message_id = $1`,
    [messageId]
  );

  logger.debug('[A2A] Message marked as read', { messageId });
}

/**
 * Get message history between two agents
 */
export async function getMessageHistory(
  tenantId: string,
  agentId1: string,
  agentId2: string,
  limit: number = 50
): Promise<AgentMessage[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".agent_messages
     WHERE tenant_id = $1
       AND ((from_agent_id = $2 AND to_agent_id = $3)
            OR (from_agent_id = $3 AND to_agent_id = $2))
     ORDER BY created_at DESC
     LIMIT $4`,
    [tenantId, agentId1, agentId2, limit]
  );

  return result.rows.map((row: GenericRow) => ({
    messageId: row.message_id,
    fromAgentId: row.from_agent_id,
    toAgentId: row.to_agent_id,
    tenantId: row.tenant_id,
    message: row.message,
    payload: row.payload ? JSON.parse(row.payload) : undefined,
    status: row.status,
    createdAt: row.created_at,
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
    error: row.error,
  }));
}
