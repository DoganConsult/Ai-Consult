import { query, safeQuery } from '../../../config/database/database';
import type { SessionContext, SessionStatus } from '../types/dauth.types';
import { logger } from '../../dos/observability/logger.service';

function deriveStatus(r: any): SessionStatus {
  if (r.revoked_at) return 'revoked';
  if (r.expires_at && new Date(r.expires_at) < new Date()) return 'expired';
  return 'active';
}

function mapRow(r: any): SessionContext {
  return {
    sessionId: r.session_id,
    userId: r.user_id,
    tenantId: r.tenant_id,
    principalType: 'human',
    ip: r.ip_address ?? '',
    userAgent: r.user_agent ?? '',
    createdAt: r.created_at?.toISOString?.() ?? '',
    lastActivityAt: r.last_active_at?.toISOString?.() ?? '',
    status: deriveStatus(r),
  };
}

export async function getSessionContext(sessionId: string): Promise<SessionContext | null> {
  const { rows } = await query(
    `SELECT session_id, user_id, tenant_id, ip_address, user_agent,
            created_at, last_active_at, expires_at, revoked_at
     FROM public.sessions
     WHERE session_id = $1 LIMIT 1`,
    [sessionId],
  );
  if (!rows[0]) return null;
  return mapRow(rows[0]);
}

export async function recordSessionActivity(sessionId: string): Promise<void> {
  try {
    await safeQuery(
      `UPDATE public.sessions SET last_active_at = NOW() WHERE session_id = $1`,
      [sessionId],
    );
  } catch { /* non-critical heartbeat — swallow */ }
}

export async function createSessionRecord(
  sessionId: string,
  userId: string,
  tenantId: string,
  ip: string,
  userAgent: string,
): Promise<void> {
  await safeQuery(
    `INSERT INTO public.sessions (session_id, user_id, tenant_id, jti, ip_address, user_agent, last_active_at, expires_at)
     VALUES ($1, $2, $3, '', $4, $5, NOW(), NOW() + INTERVAL '1 day')
     ON CONFLICT (session_id) DO UPDATE SET last_active_at = NOW()`,
    [sessionId, userId, tenantId, ip, userAgent],
  );
}

export async function getActiveSessionsForUser(userId: string): Promise<SessionContext[]> {
  const { rows } = await query(
    `SELECT session_id, user_id, tenant_id, ip_address, user_agent,
            created_at, last_active_at, expires_at, revoked_at
     FROM public.sessions
     WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
     ORDER BY last_active_at DESC`,
    [userId],
  );
  return rows.map(mapRow);
}

export async function terminateExpiredSessions(timeoutMinutes: number): Promise<number> {
  const result = await query(
    `UPDATE public.sessions SET revoked_at = NOW()
     WHERE revoked_at IS NULL AND last_active_at < NOW() - INTERVAL '1 minute' * $1`,
    [timeoutMinutes],
  );
  return result.rowCount ?? 0;
}

export function scheduleSessionCleanup(intervalMinutes = 15, timeoutMinutes = 30): void {
  setInterval(async () => {
    try {
      const revoked = await terminateExpiredSessions(timeoutMinutes);
      if (revoked > 0) logger.info(`[DAuth] Cleaned up ${revoked} expired sessions`);
    } catch (err) {
      logger.error('[DAuth] Session cleanup failed', { error: (err as Error).message });
    }
  }, intervalMinutes * 60_000);
}
