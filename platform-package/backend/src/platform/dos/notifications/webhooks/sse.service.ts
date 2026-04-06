// @ts-nocheck
import { Request, Response } from 'express';
import { logger } from '../../observability/services/logger.service';
import { toErrorMessage } from '../../../../utils/http-error.util';

let Session: unknown = null;
let Channel: unknown = null;
let betterSseAvailable = false;

interface SseClient {
  id: string;
  tenantId: string;
  userId: string;
  res: Response;
  session?: unknown;
}

const clients = new Map<string, SseClient>();
const channels = new Map<string, any>();

async function ensureBetterSse(): Promise<boolean> {
  if (betterSseAvailable) return true;
  try {
    const mod = await import('better-sse');
    Session = mod.createSession;
    Channel = mod.createChannel;
    betterSseAvailable = true;
    return true;
  } catch {
    return false;
  }
}

export function getOrCreateChannel(name: string): unknown {
  if (!betterSseAvailable || !Channel) return null;
  if (!channels.has(name)) {
    channels.set(name, Channel());
  }
  return channels.get(name);
}

export async function initSseConnection(req: Request, res: Response, userId: string, tenantId: string): Promise<string> {
  const clientId = `${tenantId}:${userId}:${Date.now()}`;

  const hasBetterSse = await ensureBetterSse();

  if (hasBetterSse && Session) {
    try {
      const session = await Session(req, res, { keepAlive: 30000 });
      session.push({ type: 'connected', clientId }, 'connection');

      const tenantChannel = getOrCreateChannel(`tenant:${tenantId}`);
      if (tenantChannel) tenantChannel.register(session);

      clients.set(clientId, { id: clientId, tenantId, userId, res, session });

      req.on('close', () => {
        if (tenantChannel) tenantChannel.deregister(session);
        clients.delete(clientId);
      });

      return clientId;
    } catch (err: unknown) {
      logger.debug(`[SSE] better-sse session creation failed, falling back: ${toErrorMessage(err)}`);
    }
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

  clients.set(clientId, { id: clientId, tenantId, userId, res });

  req.on('close', () => {
    clients.delete(clientId);
  });

  return clientId;
}

export function sendSseEvent(
  target: { userId?: string; tenantId?: string },
  event: string,
  data: unknown,
): number {
  let sent = 0;

  for (const client of clients.values()) {
    if (target.userId && client.userId !== target.userId) continue;
    if (target.tenantId && client.tenantId !== target.tenantId) continue;
    try {
      if (client.session && betterSseAvailable) {
        client.session.push(data, event);
      } else {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        client.res.write(payload);
      }
      sent++;
    } catch {
      clients.delete(client.id);
    }
  }
  return sent;
}

export function broadcastSseEvent(tenantId: string, event: string, data: unknown): number {
  if (betterSseAvailable) {
    const channel = channels.get(`tenant:${tenantId}`);
    if (channel) {
      try {
        channel.broadcast(data, event);
        return channel.sessionCount ?? 0;
      } catch {
        return sendSseEvent({ tenantId }, event, data);
      }
    }
  }
  return sendSseEvent({ tenantId }, event, data);
}

export function getSseClientCount(): number {
  return clients.size;
}

export function getChannelCount(): number {
  return channels.size;
}
