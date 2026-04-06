import { query } from '../../../config/database/database';
import { blacklistToken, revokeAllUserTokens } from './token-blacklist.service';
import { revokeAllFamiliesForUser } from './refresh.service';
import { publish } from '../../dos/events/event-bus';

export async function revokeSession(
  userId: string,
  jti: string,
  reason: string,
  revokedBy: string,
): Promise<void> {
  await blacklistToken(jti, userId);
  await publish('dauth.session.revoked', '', {
    userId,
    jti,
    reason,
    revokedBy,
    revokedAt: new Date().toISOString(),
  });
}

export async function revokeAllUserSessions(
  userId: string,
  reason: string,
  revokedBy: string,
): Promise<{ tokensRevoked: number; familiesRevoked: number }> {
  const [, familiesRevoked] = await Promise.all([
    revokeAllUserTokens(userId),
    revokeAllFamiliesForUser(userId),
  ]);
  await publish('dauth.sessions.bulk_revoked', '', {
    userId,
    reason,
    revokedBy,
    familiesRevoked,
    revokedAt: new Date().toISOString(),
  });
  return { tokensRevoked: 0, familiesRevoked };
}

export async function revokeSessionsByTenant(
  tenantId: string,
  reason: string,
  revokedBy: string,
): Promise<number> {
  const { rows } = await query(
    `SELECT DISTINCT user_id FROM tenant_user_memberships WHERE tenant_id = $1 AND status = 'active'`,
    [tenantId],
  );
  let count = 0;
  for (const row of rows) {
    await revokeAllUserSessions(row.user_id, reason, revokedBy);
    count++;
  }
  return count;
}
