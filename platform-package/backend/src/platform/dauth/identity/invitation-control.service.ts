import * as crypto from 'crypto';
import { query } from '../../../config/database/database';
import { publish } from '../../dos/events/event-bus';
import { getTenantSecurityPolicy } from '../policies/tenant-security-policy.service';
import type { InvitationStatus } from '../types/dauth.types';

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export interface Invitation {
  invitationId: string;
  tenantId: string;
  email: string;
  roleCode: string;
  invitedBy: string;
  status: InvitationStatus;
  token: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
}

export async function createInvitation(
  tenantId: string,
  email: string,
  roleCode: string,
  invitedBy: string,
): Promise<Invitation> {
  const policy = await getTenantSecurityPolicy(tenantId);
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + policy.invitationExpiryHours * 60 * 60_000);

  const { rows } = await query(
    `INSERT INTO invitations (tenant_id, email, role_code, invited_by, status, token, expires_at)
     VALUES ($1, $2, $3, $4, 'pending', $5, $6)
     RETURNING invitation_id, created_at`,
    [tenantId, email, roleCode, invitedBy, tokenHash, expiresAt],
  );

  await publish('dauth.invitation.created', tenantId, { email, roleCode, invitedBy }).catch(() => {});

  return {
    invitationId: rows[0].invitation_id,
    tenantId,
    email,
    roleCode,
    invitedBy,
    status: 'pending',
    token,
    expiresAt: expiresAt.toISOString(),
    createdAt: rows[0].created_at?.toISOString?.() ?? new Date().toISOString(),
    acceptedAt: null,
  };
}

export async function validateInvitation(token: string): Promise<Invitation | null> {
  const tokenHash = hashToken(token);
  const { rows } = await query(
    `SELECT invitation_id, tenant_id, email, role_code, invited_by, status,
            token, expires_at, created_at, accepted_at
     FROM invitations
     WHERE token = $1 AND status = 'pending' AND expires_at > NOW() LIMIT 1`,
    [tokenHash],
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    invitationId: r.invitation_id,
    tenantId: r.tenant_id,
    email: r.email,
    roleCode: r.role_code,
    invitedBy: r.invited_by,
    status: r.status,
    token: r.token,
    expiresAt: r.expires_at?.toISOString?.() ?? '',
    createdAt: r.created_at?.toISOString?.() ?? '',
    acceptedAt: null,
  };
}

export async function acceptInvitation(token: string): Promise<boolean> {
  const tokenHash = hashToken(token);
  const result = await query(
    `UPDATE invitations SET status = 'accepted', accepted_at = NOW()
     WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`,
    [tokenHash],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function revokeInvitation(invitationId: string, _revokedBy: string): Promise<boolean> {
  const result = await query(
    `UPDATE invitations SET status = 'revoked'
     WHERE invitation_id = $1 AND status = 'pending'`,
    [invitationId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getPendingInvitations(tenantId: string): Promise<Invitation[]> {
  const { rows } = await query(
    `SELECT invitation_id, tenant_id, email, role_code, invited_by, status,
            token, expires_at, created_at, accepted_at
     FROM invitations
     WHERE tenant_id = $1 AND status = 'pending' AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [tenantId],
  );
  return rows.map((r: any) => ({
    invitationId: r.invitation_id,
    tenantId: r.tenant_id,
    email: r.email,
    roleCode: r.role_code,
    invitedBy: r.invited_by,
    status: r.status,
    token: r.token,
    expiresAt: r.expires_at?.toISOString?.() ?? '',
    createdAt: r.created_at?.toISOString?.() ?? '',
    acceptedAt: null,
  }));
}

export async function expireStaleInvitations(): Promise<number> {
  const result = await query(
    `UPDATE invitations SET status = 'expired'
     WHERE status = 'pending' AND expires_at < NOW()`,
  );
  return result.rowCount ?? 0;
}
