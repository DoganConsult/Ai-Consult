// @ts-nocheck
import { query } from '../../../config/database/database';
import { logAuthDecision } from '../audit/decision-log.service';
import { SYSTEM_TENANT } from '../../../platform/dos/constants/system-actors';

export type PrincipalType = 'human' | 'agent' | 'service_account' | 'external';

export interface PrincipalIdentity {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  status: 'active' | 'inactive' | 'locked' | 'pending';
  principalType: PrincipalType;
  name?: string;
  language?: string;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
}

export async function resolvePrincipal(userId: string): Promise<PrincipalIdentity | null> {
  const result = await query(
    `SELECT user_id, email, tenant_id, role, status, name, language,
            COALESCE((SELECT TRUE FROM user_mfa WHERE user_id = u.user_id AND enabled = TRUE LIMIT 1), FALSE) AS mfa_enabled,
            last_login_at
     FROM users u WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  if (!result.rows.length) return null;
  const row = result.rows[0];
  return {
    userId: row.user_id,
    email: row.email,
    tenantId: row.tenant_id,
    role: row.role,
    status: row.status || 'active',
    principalType: 'human',
    name: row.name,
    language: row.language,
    mfaEnabled: row.mfa_enabled === true,
    lastLoginAt: row.last_login_at,
  };
}

export async function resolvePrincipalByEmail(email: string): Promise<PrincipalIdentity | null> {
  const result = await query(
    `SELECT user_id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email],
  );
  if (!result.rows.length) return null;
  return resolvePrincipal(result.rows[0].user_id);
}

export async function validateTenantMembership(userId: string, tenantId: string): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM tenant_user_memberships
     WHERE user_id = $1 AND tenant_id = $2 AND status = 'active' LIMIT 1`,
    [userId, tenantId],
  );
  return result.rows.length > 0;
}

export async function isPrincipalActive(userId: string): Promise<boolean> {
  const principal = await resolvePrincipal(userId);
  return principal?.status === 'active';
}

export async function updateLastLogin(userId: string): Promise<void> {
  await query(
    `UPDATE users SET last_login_at = NOW(), login_count = COALESCE(login_count, 0) + 1 WHERE user_id = $1`,
    [userId],
  ).catch(() => {});
}

export interface CreateIdentityInput {
  userId: string;
  email: string;
  passwordHash: string;
  name: string;
  tenantId: string | null;
  role: string;
  userType?: string;
  status?: string;
}

export async function createIdentity(input: CreateIdentityInput, txClient?: { query: (sql: string, params: unknown[]) => Promise<unknown> }): Promise<PrincipalIdentity> {
  const exec = txClient ? txClient.query.bind(txClient) : (sql: string, params: unknown[]) => query(sql, params);

  if (input.passwordHash && !input.passwordHash.startsWith('$2')) {
    throw new Error('Invalid password hash format — must be bcrypt');
  }

  const existing = await exec('SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)', [input.email]);
  if (existing.rows.length > 0) {
    throw new Error('IDENTITY_ALREADY_EXISTS');
  }

  await exec(
    `INSERT INTO users (user_id, email, password_hash, name, full_name, tenant_id, role, user_type, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      input.userId,
      input.email.trim().toLowerCase(),
      input.passwordHash,
      input.name,
      input.name,
      input.tenantId,
      input.role,
      input.userType || 'internal',
      input.status || 'active',
    ],
  );

  if (input.tenantId) {
    const isOwner = ['owner', 'admin'].includes(input.role);
    const mRole = ['owner'].includes(input.role) ? 'owner' : (['admin'].includes(input.role) ? 'admin' : 'member');
    await exec(
      `INSERT INTO tenant_user_memberships
         (user_id, tenant_id, role, membership_type, is_tenant_owner, status, is_primary)
       VALUES ($1, $2, $3, 'internal', $4, 'active', TRUE)
       ON CONFLICT (user_id, tenant_id) DO UPDATE SET
         role = EXCLUDED.role, status = 'active', updated_at = NOW()`,
      [input.userId, input.tenantId, mRole, isOwner],
    );
  }

  await logAuthDecision(input.tenantId || SYSTEM_TENANT, {
    userId: input.userId,
    permissionCode: 'identity.create',
    decision: 'allow',
    reason: 'Identity created via DAuth identity service',
  }).catch(() => {});

  return {
    userId: input.userId,
    email: input.email.trim().toLowerCase(),
    tenantId: input.tenantId!,
    role: input.role,
    status: (input.status) || 'active',
    principalType: 'human',
    name: input.name,
    mfaEnabled: false,
    lastLoginAt: null,
  };
}
