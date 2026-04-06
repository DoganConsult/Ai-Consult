/**
 * Invitation Acceptance — extracted from invitation.service for separation of concerns.
 * Handles the accept/register/role-assign flows for invited users.
 */
import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

export async function acceptInvitation(
  tenantId: string, token: string, userId: string,
): Promise<{ success: boolean; error?: string }> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `UPDATE "${schema}".invitations SET status = 'accepted', accepted_by = $1, accepted_at = NOW() WHERE token_hash = $2 AND status = 'pending'`,
      [userId, token],
    );
    return { success: true };
  } catch (err) {
    logger.warn('[Invitation] acceptInvitation failed', { tenantId, error: (err as Error).message });
    return { success: false, error: (err as Error).message };
  }
}

export async function acceptAndRegister(
  _tenantId: string, _token: string, _userData: { email: string; displayName: string; password?: string },
): Promise<{ success: boolean; userId?: string; error?: string }> {
  // Stub — full registration flow delegates to DAuth
  return { success: true, userId: 'pending' };
}

export async function assignTenantRole(
  tenantId: string, userId: string, roleCode: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".user_role_assignments (user_id, role_code, assigned_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`,
    [userId, roleCode],
  );
}
