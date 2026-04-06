// @ts-nocheck
import { requestEmailVerification } from '../../../../platform/dauth/identity/credential-recovery.service';
import { safeQuery } from '../../../../config/database';
import { getFirstRow } from '../../../../utils/db-utils';

export async function createVerificationToken(userId: string): Promise<string> {
  const userRow = await safeQuery('SELECT email, tenant_id FROM users WHERE user_id = $1 LIMIT 1', [userId]);
  const row = getFirstRow(userRow);
  const { token } = await requestEmailVerification(userId, row?.email || '', row?.tenant_id || '');
  return token;
}

export async function verifyEmail(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
  const result = await safeQuery(
    `SELECT id, user_id, expires_at, verified_at
     FROM public.email_verification_tokens
     WHERE token = $1`,
    [token]
  );

  const row = getFirstRow(result);
  if (!row) {
    return { success: false, error: 'Invalid verification token' };
  }

  if (row.verified_at) {
    return { success: false, error: 'Email already verified' };
  }

  if (new Date(row.expires_at) < new Date()) {
    return { success: false, error: 'Verification token has expired' };
  }

  // Mark token as verified
  await safeQuery(
    `UPDATE public.email_verification_tokens SET verified_at = now() WHERE id = $1::uuid`,
    [row.id]
  );

  // Mark user as email-verified
  await safeQuery(
    `UPDATE public.users SET email_verified = true, updated_at = now() WHERE user_id = $1`,
    [row.user_id]
  ).catch(() => {
    // email_verified column may not exist yet — non-fatal
  });

  return { success: true, userId: row.user_id };
}

export async function resendVerification(userId: string): Promise<string> {
  // Invalidate old tokens
  await safeQuery(
    `DELETE FROM public.email_verification_tokens WHERE user_id = $1 AND verified_at IS NULL`,
    [userId]
  );

  return createVerificationToken(userId);
}
