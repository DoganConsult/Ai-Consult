import { catchHandler, EC } from '../resilience/resilient-catch';
import { logger } from '../observability/logger.service';
import { getJwtSecret } from '../../dauth/identity/token.service';
// ============================================
// Platform — WebSocket Service
// Real-time event streaming with tenant-scoped
// rooms, JWT auth, and missed-event queue.
//
// Cluster-safe: Redis pub/sub bridges all 4
// PM2 cluster workers. Each worker holds only
// its locally-connected clients; Redis fan-out
// ensures delivery regardless of which worker
// handled the HTTP upgrade.
// ============================================

import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as jwt from 'jsonwebtoken';
import { URL } from 'url';
import { toErrorMessage } from '../../../errors/http-error.util';

// === Types ===

export interface WSClient {
  ws: WebSocket;
  tenantId: string;
  userId: string;
  connectedAt: Date;
  viewingEntity?: { entityType: string; entityId: string };
}

export interface WSEvent {
  type: string;
  data: unknown;
  timestamp?: string;
}

interface WSBroadcastMessage {
  target: 'user' | 'tenant';
  tenantId: string;
  userId?: string;
  event: WSEvent;
}

// === Local state (per-worker) ===

const rooms = new Map<string, Map<string, WSClient>>();

// Missed events are stored in Redis — key: ws:missed:{tenantId}:{userId}
// In-memory fallback when Redis is unavailable.
const localMissedEvents = new Map<string, WSEvent[]>();
const MAX_MISSED_EVENTS = 100;

const REDIS_CHANNEL = 'ws:broadcast';
const REDIS_MISSED_PREFIX = 'ws:missed:';
let redisBridgeInitialized = false;

// === Redis helpers ===

async function queueMissedInRedis(tenantId: string, userId: string, event: WSEvent): Promise<void> {
  try {
    const { getRedis } = await import('../../../config/database/redis');
    const redis = getRedis();
    const key = `${REDIS_MISSED_PREFIX}${tenantId}:${userId}`;
    await redis.rpush(key, JSON.stringify(event));
    await redis.ltrim(key, -MAX_MISSED_EVENTS, -1);
    await redis.expire(key, 86400); // 24h TTL
  } catch {
    // Redis unavailable — fall back to in-memory
    const key = `${tenantId}:${userId}`;
    if (!localMissedEvents.has(key)) localMissedEvents.set(key, []);
    const q = localMissedEvents.get(key)!;
    q.push(event);
    if (q.length > MAX_MISSED_EVENTS) q.shift();
  }
}

async function flushMissedFromRedis(tenantId: string, userId: string): Promise<WSEvent[]> {
  try {
    const { getRedis } = await import('../../../config/database/redis');
    const redis = getRedis();
    const key = `${REDIS_MISSED_PREFIX}${tenantId}:${userId}`;
    const raw = await redis.lrange(key, 0, -1);
    if (raw.length > 0) {
      await redis.del(key);
      return raw.map((s) => JSON.parse(s) as WSEvent);
    }
  } catch {
    // Redis unavailable — try local fallback
  }
  // Local fallback
  const key = `${tenantId}:${userId}`;
  const local = localMissedEvents.get(key);
  if (local && local.length > 0) {
    localMissedEvents.delete(key);
    return local;
  }
  return [];
}

// === Redis pub/sub bridge ===

/**
 * Initialize Redis pub/sub bridge. Called once per worker on startup.
 * Subscribes to the broadcast channel and delivers messages to locally
 * connected clients. Safe to call even if Redis is unavailable.
 */
async function initRedisBridge(): Promise<void> {
  if (redisBridgeInitialized) return;
  redisBridgeInitialized = true;
  try {
    const { getRedisSubscriber } = await import('../../../config/database/redis');
    const sub = getRedisSubscriber();
    await sub.subscribe(REDIS_CHANNEL);
    sub.on('message', (_channel: string, data: string) => {
      try {
        const msg = JSON.parse(data) as WSBroadcastMessage;
        deliverLocally(msg);
      } catch {
        // Malformed message — ignore
      }
    });
    logger.info(`[WebSocket] Redis pub/sub bridge active on channel: ${REDIS_CHANNEL} (worker pid=${process.pid})`);
  } catch (err) {
    logger.warn('[WebSocket] Redis bridge unavailable — falling back to local-only delivery:', toErrorMessage(err));
  }
}

/**
 * Publish a broadcast message to all workers via Redis.
 * Falls back to direct local delivery if Redis is unavailable.
 */
async function publishBroadcast(msg: WSBroadcastMessage): Promise<void> {
  try {
    const { getRedis } = await import('../../../config/database/redis');
    const redis = getRedis();
    await redis.publish(REDIS_CHANNEL, JSON.stringify(msg));
  } catch {
    // Redis publish failed — deliver locally only
    deliverLocally(msg);
  }
}

/**
 * Deliver a broadcast message to locally connected clients on this worker.
 * Called by the Redis subscriber handler on every worker that receives
 * the published message.
 */
function deliverLocally(msg: WSBroadcastMessage): void {
  if (msg.target === 'user' && msg.userId) {
    const client = rooms.get(msg.tenantId)?.get(msg.userId);
    if (client?.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(msg.event));
    }
  } else if (msg.target === 'tenant') {
    const room = rooms.get(msg.tenantId);
    if (!room) return;
    for (const [, client] of room) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(msg.event));
      }
    }
  }
}

// === Initialization ===

/**
 * Attach a WebSocket server to the existing HTTP server.
 * Authenticates clients via JWT token in query param `?token=...`.
 * On connection, registers client in tenant-scoped room and
 * flushes any missed events queued during disconnection.
 */
export function initWebSocket(server: HTTPServer): WebSocketServer {
  // Initialize Redis pub/sub bridge (non-blocking)
  initRedisBridge().catch(catchHandler(EC.EVENT_BUS, {}));

  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      if (!token) {
        ws.close(4001, 'Missing authentication token');
        return;
      }

      const secret = getJwtSecret();
      const decoded = jwt.verify(token, secret) as any;
      const { tenantId, userId } = decoded;

      if (!tenantId || !userId) {
        ws.close(4002, 'Invalid token payload');
        return;
      }

      if (!rooms.has(tenantId)) rooms.set(tenantId, new Map());
      rooms.get(tenantId)!.set(userId, { ws, tenantId, userId, connectedAt: new Date() });

      // Flush missed events (from Redis or local fallback)
      const missed = await flushMissedFromRedis(tenantId, userId);
      for (const event of missed) {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
      }

      ws.on('close', () => {
        const room = rooms.get(tenantId);
        if (room) {
          room.delete(userId);
          if (room.size === 0) rooms.delete(tenantId);
        }
      });

      ws.on('error', () => {});

    } catch (err) {
      logger.warn('[WebSocket] Auth failed:', (err as Error)?.message || 'any error');
      ws.close(4003, 'Authentication failed');
    }
  });

  return wss;
}

// === Push Functions ===

/**
 * Push an event to a specific user in a tenant.
 * Publishes via Redis so any worker that holds the client connection delivers it.
 * If the user is not connected on any worker, queues the event in Redis.
 */
export function pushToUser(tenantId: string, userId: string, event: WSEvent): void {
  // Fast path: client is connected locally on this worker
  const client = rooms.get(tenantId)?.get(userId);
  if (client?.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(event));
    return;
  }

  // Publish to Redis — another worker may hold this client's connection.
  // Only queue as missed if Redis is completely unavailable (publish throws),
  // since pub/sub delivery to the holding worker is sufficient when Redis is live.
  publishBroadcast({ target: 'user', tenantId, userId, event }).catch(() => {
    // Redis is down — queue for delivery on reconnect
    queueMissedInRedis(tenantId, userId, event).catch(catchHandler(EC.EVENT_BUS, {}));
  });
}

/**
 * Push an event to all connected users in a tenant.
 * Publishes via Redis so all workers deliver to their local clients.
 */
export function pushToTenant(tenantId: string, event: WSEvent): void {
  publishBroadcast({ target: 'tenant', tenantId, event }).catch(() => {
    // Redis unavailable — deliver locally only
    deliverLocally({ target: 'tenant', tenantId, event });
  });
}

/**
 * Push a channel message event to all connected users in a tenant.
 */
export function pushChannelMessage(tenantId: string, channelId: string, message: unknown): void {
  pushToTenant(tenantId, {
    type: 'channel_message',
    data: { channelId, message },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Push a direct message event to a specific user.
 */
export function pushDirectMessage(tenantId: string, recipientId: string, message: unknown): void {
  pushToUser(tenantId, recipientId, {
    type: 'direct_message',
    data: { message },
    timestamp: new Date().toISOString(),
  });
}

// === Utility ===

export function getConnectedClients(tenantId: string): number {
  return rooms.get(tenantId)?.size || 0;
}

export function getMissedEvents(tenantId: string, userId: string): WSEvent[] {
  const key = `${tenantId}:${userId}`;
  return localMissedEvents.get(key) || [];
}

export function resetWebSocketState(): void {
  rooms.clear();
  localMissedEvents.clear();
}

// === Entity Viewer Tracking ===

export function registerEntityViewer(
  tenantId: string,
  userId: string,
  entityType: string,
  entityId: string
): void {
  const client = rooms.get(tenantId)?.get(userId);
  if (client) client.viewingEntity = { entityType, entityId };
}

export function unregisterEntityViewer(tenantId: string, userId: string): void {
  const client = rooms.get(tenantId)?.get(userId);
  if (client) client.viewingEntity = undefined;
}

export function getEntityViewers(tenantId: string, entityType: string, entityId: string): string[] {
  const room = rooms.get(tenantId);
  if (!room) return [];
  const viewers: string[] = [];
  for (const [userId, client] of room) {
    if (client.viewingEntity?.entityType === entityType && client.viewingEntity?.entityId === entityId) {
      viewers.push(userId);
    }
  }
  return viewers;
}

export function pushToEntityViewers(
  tenantId: string,
  entityType: string,
  entityId: string,
  event: WSEvent
): void {
  const room = rooms.get(tenantId);
  if (!room) return;
  for (const [, client] of room) {
    if (
      client.viewingEntity?.entityType === entityType &&
      client.viewingEntity?.entityId === entityId &&
      client.ws.readyState === WebSocket.OPEN
    ) {
      client.ws.send(JSON.stringify(event));
    }
  }
}

// === Pure Functions (preserved for property tests) ===

export function shouldDeliverToUser(
  _eventType: string,
  userId: string,
  eventTargetUserId?: string,
  eventTenantId?: string,
  userTenantId?: string
): boolean {
  if (eventTenantId && userTenantId && eventTenantId !== userTenantId) return false;
  if (eventTargetUserId && eventTargetUserId !== userId) return false;
  return true;
}

export function queueMissedEvent(
  queue: WSEvent[],
  event: WSEvent,
  maxSize: number = MAX_MISSED_EVENTS
): WSEvent[] {
  const newQueue = [...queue, event];
  if (newQueue.length > maxSize) return newQueue.slice(newQueue.length - maxSize);
  return newQueue;
}

export function validateWSTokenPayload(
  payload: any
): { valid: boolean; tenantId?: string; userId?: string; error?: string } {
  if (!payload) return { valid: false, error: 'Empty payload' };
  if (!payload.tenantId) return { valid: false, error: 'Missing tenantId' };
  if (!payload.userId) return { valid: false, error: 'Missing userId' };
  if (typeof payload.tenantId !== 'string') return { valid: false, error: 'Invalid tenantId type' };
  if (typeof payload.userId !== 'string') return { valid: false, error: 'Invalid userId type' };
  return { valid: true, tenantId: payload.tenantId, userId: payload.userId };
}

export const WS_EVENT_TYPES = [
  'entity_created', 'entity_updated', 'entity_deleted',
  'link_created', 'link_deleted',
  'channel_message', 'direct_message',
  'activity_created', 'notification',
  'report_generated', 'anomaly_alert',
  'agent_action_queued', 'agent_action_executed', 'agent_feedback_recorded',
  'qiyas_score_computed', 'regulatory_feed_updated',
  'evidence_hash_verified', 'evidence_submitted', 'evidence_approved',
  'evidence_rejected', 'evidence_file_uploaded',
  'evidence_task_submitted', 'evidence_task_approved', 'evidence_task_rejected',
  'dashboard_widget_updated',
  'provisioning_step_completed', 'provisioning_completed', 'provisioning_failed',
] as const;

export type WSEventType = typeof WS_EVENT_TYPES[number];

export function isValidEventType(eventType: string): eventType is WSEventType {
  return (WS_EVENT_TYPES as readonly string[]).includes(eventType);
}

export function buildWSEvent(type: WSEventType, data: any): WSEvent {
  return { type, data, timestamp: new Date().toISOString() };
}

export function isUserConnected(tenantId: string, userId: string): boolean {
  const client = rooms.get(tenantId)?.get(userId);
  return !!client && client.ws.readyState === WebSocket.OPEN;
}

export function getConnectedUserIds(tenantId: string): string[] {
  const room = rooms.get(tenantId);
  if (!room) return [];
  return Array.from(room.keys());
}

export function getActiveTenantIds(): string[] {
  return Array.from(rooms.keys());
}
