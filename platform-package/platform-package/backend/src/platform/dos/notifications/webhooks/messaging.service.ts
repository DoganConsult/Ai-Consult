// @ts-nocheck
// ============================================
// Shahin — Messaging Service
// Channels, DMs, mentions, entity attachments
// ============================================

import { safeQuery, tenantSchema } from "../../../../config/database";
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';

// === Types ===

export interface Channel {
  channelId: string;
  name: string;
  type: 'predefined' | 'custom';
  createdBy: string;
  createdAt: string;
}

export interface EntityAttachment {
  entityType: string;
  entityId: string;
  label: string;
}

export interface Message {
  messageId: string;
  channelId: string | null;
  senderId: string;
  recipientId: string | null;
  content: string;
  entityAttachments: EntityAttachment[];
  mentions: string[];
  createdAt: string;
}

// === Pure Functions ===

export function serializeMessage(msg: Message): string {
  return JSON.stringify(msg);
}

export function deserializeMessage(json: string): Message {
  const parsed = JSON.parse(json);
  if (!parsed.senderId || !parsed.content) {
    throw new Error('Invalid message: missing required fields');
  }
  return {
    messageId: parsed.messageId || '',
    channelId: parsed.channelId || null,
    senderId: parsed.senderId,
    recipientId: parsed.recipientId || null,
    content: parsed.content,
    entityAttachments: Array.isArray(parsed.entityAttachments) ? parsed.entityAttachments : [],
    mentions: Array.isArray(parsed.mentions) ? parsed.mentions : [],
    createdAt: parsed.createdAt || new Date().toISOString(),
  };
}

export function extractMentions(content: string): string[] {
  const regex = /@([a-zA-Z0-9_-]+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (!mentions.includes(match[1])) mentions.push(match[1]);
  }
  return mentions;
}

export function computeUnreadCount(
  messages: Message[],
  userId: string,
  lastReadTimestamps: Record<string, string>
): number {
  let count = 0;
  for (const msg of messages) {
    if (msg.senderId === userId) continue;
    const channelKey = msg.channelId || `dm_${msg.senderId}`;
    const lastRead = lastReadTimestamps[channelKey];
    if (!lastRead || new Date(msg.createdAt) > new Date(lastRead)) count++;
  }
  return count;
}

// === Predefined Channels ===

const PREDEFINED_CHANNELS = [
  { name: 'general', type: 'predefined' as const },
  { name: 'risk-team', type: 'predefined' as const },
  { name: 'audit-team', type: 'predefined' as const },
  { name: 'compliance-team', type: 'predefined' as const },
];

// === API Functions ===

export async function ensurePredefinedChannels(tenantId: string, createdBy: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  for (const ch of PREDEFINED_CHANNELS) {
    await safeQuery(
      `INSERT INTO "${schema}".channels (name, type, created_by)
       SELECT $1, $2, $3 WHERE NOT EXISTS (SELECT 1 FROM "${schema}".channels WHERE name = $1)`,
      [ch.name, ch.type, createdBy]
    );
  }
}

export async function getChannels(tenantId: string): Promise<Channel[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`SELECT channel_id, name, type, created_by, created_at FROM "${schema}".channels ORDER BY name`);
  return result.rows.map((r: GenericRow) => ({
    channelId: r.channel_id, name: r.name, type: r.type, createdBy: r.created_by,
    createdAt: r.created_at?.toISOString?.() || r.created_at,
  }));
}

export async function createChannel(tenantId: string, name: string, createdBy: string): Promise<Channel> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".channels (name, type, created_by) VALUES ($1, 'custom', $2) RETURNING *`,
    [name, createdBy]
  );
  const r = getFirstRow(result);
  return { channelId: r.channel_id, name: r.name, type: r.type, createdBy: r.created_by, createdAt: r.created_at };
}

export async function sendChannelMessage(tenantId: string, channelId: string, senderId: string, content: string, entityAttachments?: EntityAttachment[]): Promise<Message> {
  const schema = tenantSchema(tenantId);
  const mentions = extractMentions(content);
  const result = await safeQuery(
    `INSERT INTO "${schema}".messages (channel_id, sender_id, content, entity_attachments, mentions)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [channelId, senderId, content, JSON.stringify(entityAttachments || []), mentions]
  );
  const r = getFirstRow(result);
  return {
    messageId: r.message_id, channelId: r.channel_id, senderId: r.sender_id, recipientId: null,
    content: r.content, entityAttachments: r.entity_attachments || [], mentions: r.mentions || [],
    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

export async function sendDirectMessage(tenantId: string, senderId: string, recipientId: string, content: string, entityAttachments?: EntityAttachment[]): Promise<Message> {
  const schema = tenantSchema(tenantId);
  const mentions = extractMentions(content);
  const result = await safeQuery(
    `INSERT INTO "${schema}".messages (sender_id, recipient_id, content, entity_attachments, mentions)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [senderId, recipientId, content, JSON.stringify(entityAttachments || []), mentions]
  );
  const r = getFirstRow(result);
  return {
    messageId: r.message_id, channelId: null, senderId: r.sender_id, recipientId: r.recipient_id,
    content: r.content, entityAttachments: r.entity_attachments || [], mentions: r.mentions || [],
    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

export async function getChannelMessages(tenantId: string, channelId: string, limit = 50, offset = 0): Promise<Message[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".messages WHERE channel_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [channelId, limit, offset]
  );
  return result.rows.map((r: GenericRow) => ({
    messageId: r.message_id, channelId: r.channel_id, senderId: r.sender_id, recipientId: r.recipient_id,
    content: r.content, entityAttachments: r.entity_attachments || [], mentions: r.mentions || [],
    createdAt: r.created_at?.toISOString?.() || r.created_at,
  }));
}

export async function getDirectMessages(tenantId: string, userId1: string, userId2: string, limit = 50): Promise<Message[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".messages
     WHERE channel_id IS NULL AND ((sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1))
     ORDER BY created_at DESC LIMIT $3`,
    [userId1, userId2, limit]
  );
  return result.rows.map((r: GenericRow) => ({
    messageId: r.message_id, channelId: null, senderId: r.sender_id, recipientId: r.recipient_id,
    content: r.content, entityAttachments: r.entity_attachments || [], mentions: r.mentions || [],
    createdAt: r.created_at?.toISOString?.() || r.created_at,
  }));
}

export async function getUnreadCount(tenantId: string, userId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  // Get last read timestamps
  const readStatus = await safeQuery(
    `SELECT channel_id, last_read_at FROM "${schema}".message_read_status WHERE user_id = $1`,
    [userId]
  );
  const lastReadMap: Record<string, string> = {};
  for (const r of readStatus.rows) lastReadMap[r.channel_id] = r.last_read_at;

  // Count unread channel messages
  let total = 0;
  for (const [channelId, lastRead] of Object.entries(lastReadMap)) {
    const result = await safeQuery(
      `SELECT COUNT(*) as cnt FROM "${schema}".messages
       WHERE channel_id = $1 AND sender_id != $2 AND created_at > $3`,
      [channelId, userId, lastRead]
    );
    total += parseInt(getFirstRow(result)?.cnt, 10);
  }

  // Count unread DMs
  const dmResult = await safeQuery(
    `SELECT COUNT(*) as cnt FROM "${schema}".messages
     WHERE channel_id IS NULL AND recipient_id = $1
     AND created_at > COALESCE((SELECT MAX(last_read_at) FROM "${schema}".message_read_status WHERE user_id = $1), '1970-01-01')`,
    [userId]
  );
  total += parseInt(getFirstRow(dmResult)?.cnt, 10);

  return total;
}
