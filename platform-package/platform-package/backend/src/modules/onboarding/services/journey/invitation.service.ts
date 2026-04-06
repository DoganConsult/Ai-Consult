// @ts-nocheck
import { catchHandler, EC } from '../../../../utils/resilient-catch';
// ============================================
// Platform — Invitation Service
// Secure magic-link invitations for external
// stakeholders (vendors, regulators, consultants,
// external auditors).
//
// Token: 256-bit crypto.randomBytes(32) → base64url
// Storage: SHA-256 hash (never raw token)
// Validation: constant-time via crypto.timingSafeEqual
//
// Requirements: 2.1–2.8, 23.1–23.3
// ============================================

import { safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../../../../config/database';
import { getProductUrl } from '../../../../platform/dos/branding/product-identity';
import { eventBus } from '../../../platform/services/event/event-bus.service';
import { createNotification } from '../../../notification/services/notification.service';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { sendTenantEmail } from '../../../../platform/dos/config/registry/tenant-email-config.service';
import { renderEmailTemplate, renderInvitationEmail } from '../../../../platform/dos/notifications/email.service';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { logger } from '../../../../platform/dos/observability/services/logger.service';
import type {
  ExternalRole,
  InvitationRecord,
  InvitationFilters,
} from '../../../../types/engagement.types';
import { getFirstRow } from '../../../../utils/db-utils';
import type {} from '../../../../types/db-rows.types';

// ── Re-export companion modules so callers don't break ───────────────────────

export {
  generateToken,
  hashToken,
  verifyTokenHash,
  INVITATION_EXPIRY_MS,
  EXTERNAL_ROLE_PERMISSIONS,
  EXTERNAL_ROLES,
  isExternalRole,
  ROLE_DEFAULT_TEAMS,
  ROLE_LANDING,
  ROLE_MODULES,
  ROLE_LABELS,
  ROLE_MODULES_EMAIL,
  ROLE_WIDGETS_EMAIL,
} from './invitation.types';

export {
  acceptInvitation,
  acceptAndRegister,
  assignTenantRole,
} from './invitation-acceptance';

import { SYSTEM_JOB_ACTOR } from '../../../../platform/dos/constants/system-actors';
import {
  generateToken,
  hashToken,
  verifyTokenHash,
  INVITATION_EXPIRY_MS,
  ROLE_LABELS,
  ROLE_MODULES_EMAIL,
  ROLE_WIDGETS_EMAIL,
} from './invitation.types';

// ── Row → InvitationRecord mapper ────────────────────────────────────────────

function rowToRecord(row: InvitationRow): InvitationRecord & { emailSent?: boolean; emailError?: string | null; metadata?: Record<string, unknown> } {
  return {
    invitationId: row.invitation_id as string,
    email: row.email as string,
    role: row.role as ExternalRole,
    entityScope: typeof row.entity_scope === 'string'
      ? JSON.parse(row.entity_scope)
      : row.entity_scope as { entityType: string; entityId: string },
    status: row.status as InvitationRecord['status'],
    expiresAt: row.expires_at as string,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    emailSent: row.email_sent ?? false,
    emailError: row.email_error || null,
    metadata: (row.metadata || {}) as Record<string, unknown>,
  };
}

// ── Ensure tables exist for existing tenants ─────────────────────────────────

async function ensureInvitationTables(schema: string): Promise<void> {
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".invitations (
      invitation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      entity_scope JSONB NOT NULL DEFAULT '{}',
      token_hash VARCHAR(128) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_by VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      accepted_at TIMESTAMPTZ,
      email_sent BOOLEAN DEFAULT FALSE,
      email_error TEXT,
      metadata JSONB DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS "${schema}".external_user_scopes (
      scope_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(64) NOT NULL,
      role VARCHAR(50) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(100) NOT NULL,
      permissions JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await safeQuery(`ALTER TABLE "${schema}".invitations ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE`);
  await safeQuery(`ALTER TABLE "${schema}".invitations ADD COLUMN IF NOT EXISTS email_error TEXT`);
  await safeQuery(`ALTER TABLE "${schema}".invitations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`);
}

// ── Service functions ────────────────────────────────────────────────────────

/**
 * Create a new invitation.
 *
 * Generates a 256-bit random token, stores its SHA-256 hash in the
 * invitations table, sends a magic-link email, and publishes
 * `stakeholder.invited` to the EventBus.
 *
 * Requirements: 2.1, 2.2, 2.6
 */
export async function createInvitation(
  tenantId: string,
  input: {
    email: string;
    role: string;
    entityType: string;
    entityId: string;
    createdBy: string;
    metadata?: Record<string, unknown>;
  },
): Promise<{ invitationId: string; token: string }> {
  const schema = tenantSchema(tenantId);
  await ensureInvitationTables(schema);
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS).toISOString();
  const entityScope = JSON.stringify({ entityType: input.entityType, entityId: input.entityId });

  const metadataJson = JSON.stringify(input.metadata || {});

  const result = await safeQuery(
    `INSERT INTO "${schema}".invitations
      (email, role, entity_scope, token_hash, expires_at, status, created_by, metadata)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
     RETURNING invitation_id`,
    [input.email, input.role, entityScope, tokenHash, expiresAt, input.createdBy, metadataJson],
  );

  const invitationId: string = getFirstRow(result)?.invitation_id;

  const metaObj = (input.metadata || {}) as Record<string, unknown>;
  const invitedName = (metaObj.name as string) || input.email.split('@')[0];
  const invitedUserId = `usr_inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    await safeQuery(
      `INSERT INTO users (user_id, email, name, full_name, role, password_hash, tenant_id, status, department_id)
       VALUES ($1, LOWER($2), $3, $3, $4, '', $5, 'invited', $6)
       ON CONFLICT (email) DO UPDATE SET status = CASE WHEN users.status = 'deleted' THEN 'invited' ELSE users.status END`,
      [invitedUserId, input.email, invitedName, input.role, tenantId, (metaObj.department_id as string) || null],
    );
  } catch { /* best-effort — user may already exist */ }

  if (input.entityType === 'team' && input.entityId && input.entityId !== 'default') {
    try {
      const existingUser = await safeQuery(`SELECT user_id FROM users WHERE LOWER(email) = LOWER($1) AND tenant_id = $2`, [input.email, tenantId]);
      const uid = getFirstRow(existingUser)?.user_id || invitedUserId;
      await safeQuery(
        `INSERT INTO "${schema}".team_members (team_id, user_id, team_role, active, lifecycle_status, activation_mode)
         VALUES ($1, $2, 'member', true, 'invited', 'human_only')
         ON CONFLICT (team_id, user_id) DO NOTHING`,
        [input.entityId, uid],
      );
    } catch { /* best-effort */ }
  }

  const acceptLink = `${getProductUrl()}/invitations/accept?token=${encodeURIComponent(token)}&tenantId=${encodeURIComponent(tenantId)}`;

  try {
    const metaName = input.metadata?.name as string | undefined;
    const roleLabel = ROLE_LABELS[input.role] || input.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const { getProductName } = await import('../../../../platform/dos/branding/product-identity');
    let orgName = getProductName();
    try {
      const tRes = await safeQuery('SELECT org_name FROM tenants WHERE tenant_id = $1', [tenantId]);
      orgName = getFirstRow(tRes)?.org_name || orgName;
    } catch (err: unknown) {
      logger.warn('[Invitation] Failed to fetch org name for invitation email', {
        tenantId,
        error: toErrorMessage(err)
      });
    }

    const html = renderInvitationEmail({
      recipientName: metaName || input.email,
      roleName: input.role,
      roleDescription: roleLabel,
      modules: ROLE_MODULES_EMAIL[input.role] || ['Dashboard'],
      responsibilities: [],
      dashboardWidgets: ROLE_WIDGETS_EMAIL[input.role] || [],
      acceptUrl: acceptLink,
      expiryDate: new Date(Date.now() + INVITATION_EXPIRY_MS).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      orgName,
      language: (input.metadata?.language as 'en' | 'ar') || 'en',
    });
    const emailResult = await sendTenantEmail(
      tenantId,
      input.email,
      `[${orgName}] You've Been Invited`,
      html,
    );
    await safeQuery(
      `UPDATE "${schema}".invitations SET email_sent = $1, email_error = $2 WHERE invitation_id = $3`,
      [emailResult.success, emailResult.success ? null : (emailResult.error || 'Unknown error'), invitationId],
    ).catch(catchHandler(EC.EVENT_BUS, {}));
    if (!emailResult.success) {
      logger.warn(`[Invitation] Email to ${input.email} failed: ${emailResult.error}`);
    }
  } catch (err: unknown) {
    logger.warn(`[Invitation] Email dispatch error for ${input.email}: ${toErrorMessage(err)}`);
    await safeQuery(
      `UPDATE "${schema}".invitations SET email_sent = false, email_error = $1 WHERE invitation_id = $2`,
      [toErrorMessage(err), invitationId],
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  // In-app notification for the creator (best-effort)
  try {
    await createNotification(tenantId, {
      userId: input.createdBy,
      type: 'invitation',
      title: `Invitation sent to ${input.email}`,
      body: `A ${input.role} invitation was sent to ${input.email}.`,
      link: `/invitations/accept?token=${token}`,
    });
  } catch { /* best-effort */ }

  // Record audit trail
  try {
    await recordAudit({
      tenantId,
      userId: input.createdBy,
      module: 'invitation',
      action: 'create',
      entityType: 'invitation',
      entityId: invitationId,
      afterState: { email: input.email, role: input.role, entityScope: input.entityType + ':' + input.entityId },
    });
  } catch { /* best-effort */ }

  // Publish event
  try {
    await eventBus.publish({
      eventType: 'stakeholder.invited' as any,
      tenantId,
      sourceService: 'invitation-service',
      entityType: 'invitation',
      entityId: invitationId,
      severity: 'info',
      payload: { email: input.email, role: input.role, entityType: input.entityType, entityId: input.entityId },
    });
  } catch { /* best-effort */ }

  return { invitationId, token };
}

/**
 * Validate a raw token against the invitations table.
 *
 * Looks up all pending invitations, performs constant-time comparison
 * against each stored hash, and checks expiry + status.
 *
 * Returns the matching InvitationRecord or null.
 *
 * Requirements: 2.3, 2.4, 2.5, 23.2, 23.3
 */
export async function validateToken(
  tenantId: string,
  token: string,
): Promise<InvitationRecord | null> {
  const schema = tenantSchema(tenantId);
  await ensureInvitationTables(schema);
  const candidateHash = hashToken(token);

  // Direct lookup by hash (unique index) — still use timingSafeEqual for safety
  const result = await safeQuery(
    `SELECT * FROM "${schema}".invitations WHERE token_hash = $1 LIMIT 1`,
    [candidateHash],
  );

  if (result.rows.length === 0) return null;

  const row = getFirstRow(result);

  // Constant-time verification
  if (!verifyTokenHash(token, row.token_hash)) return null;

  // Check status
  if (row.status === 'accepted') return null;
  if (row.status === 'revoked') return null;

  // Check expiry
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  return rowToRecord(row);
}

/**
 * Revoke a pending invitation.
 *
 * Marks the invitation as revoked and publishes
 * `stakeholder.invitation_revoked`.
 *
 * Requirements: 2.8
 */
export async function revokeInvitation(
  tenantId: string,
  token: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await ensureInvitationTables(schema);
  const tokenHash = hashToken(token);

  const row = await withTransaction(tenantId, async (client) => {
    const result = await safeQueryWithClient(
      `UPDATE "${schema}".invitations
       SET status = 'revoked'
       WHERE token_hash = $1 AND status = 'pending'
       RETURNING invitation_id, email, role`,
      [tokenHash], client,
    );
    if (result.rows.length === 0) {
      throw new Error('Invitation not found or not in pending state');
    }
    const r = getFirstRow(result);
    await safeQueryWithClient(
      `UPDATE users SET status = 'disabled', updated_at = NOW()
       WHERE LOWER(email) = LOWER($1) AND tenant_id = $2 AND status = 'invited'`,
      [r.email, tenantId], client,
    );
    return r;
  });

  try {
    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'invitation',
      action: 'update',
      entityType: 'invitation',
      entityId: row.invitation_id,
      afterState: { status: 'revoked' },
    });
  } catch { /* best-effort */ }

  try {
    await eventBus.publish({
      eventType: 'stakeholder.invitation_revoked' as any,
      tenantId,
      sourceService: 'invitation-service',
      entityType: 'invitation',
      entityId: row.invitation_id,
      severity: 'info',
      payload: { email: row.email, role: row.role },
    });
  } catch { /* best-effort */ }
}

export async function revokeInvitationById(
  tenantId: string,
  invitationId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await ensureInvitationTables(schema);

  const row = await withTransaction(tenantId, async (client) => {
    const result = await safeQueryWithClient(
      `UPDATE "${schema}".invitations
       SET status = 'revoked'
       WHERE invitation_id = $1 AND status = 'pending'
       RETURNING invitation_id, email, role`,
      [invitationId], client,
    );
    if (result.rows.length === 0) {
      throw new Error('Invitation not found or not in pending state');
    }
    const r = getFirstRow(result);
    await safeQueryWithClient(
      `UPDATE users SET status = 'disabled', updated_at = NOW()
       WHERE LOWER(email) = LOWER($1) AND tenant_id = $2 AND status = 'invited'`,
      [r.email, tenantId], client,
    );
    return r;
  });

  try {
    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'invitation',
      action: 'update',
      entityType: 'invitation',
      entityId: row.invitation_id,
      afterState: { status: 'revoked' },
    });
  } catch { /* best-effort */ }

  try {
    await eventBus.publish({
      eventType: 'stakeholder.invitation_revoked' as any,
      tenantId,
      sourceService: 'invitation-service',
      entityType: 'invitation',
      entityId: row.invitation_id,
      severity: 'info',
      payload: { email: row.email, role: row.role },
    });
  } catch { /* best-effort */ }
}

export async function resendInvitationEmail(
  tenantId: string,
  invitationId: string,
): Promise<{ success: boolean; error?: string }> {
  const schema = tenantSchema(tenantId);
  await ensureInvitationTables(schema);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".invitations WHERE invitation_id = $1 AND status = 'pending'`,
    [invitationId],
  );

  if (result.rows.length === 0) {
    throw new Error('Invitation not found or not in pending state');
  }

  const row = getFirstRow(result);

  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw new Error('Invitation has expired');
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  await safeQuery(
    `UPDATE "${schema}".invitations SET token_hash = $1 WHERE invitation_id = $2`,
    [tokenHash, invitationId],
  );

  const acceptLink = `${getProductUrl()}/invitations/accept?token=${encodeURIComponent(token)}&tenantId=${encodeURIComponent(tenantId)}`;
  const orgName = (row as any).org_name || 'Your Organization';
  const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata || '{}') : (row.metadata || {});

  const roleLabel = ROLE_LABELS[row.role] || row.role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

  const html = renderEmailTemplate('notification', {
    title: `You've Been Invited to ${orgName}`,
    body: `You have been invited to join as <strong>${roleLabel}</strong>.<br><br>` +
          `Click the button below to accept your invitation. This link expires in 72 hours.`,
    ctaLabel: 'Accept Invitation',
    ctaUrl: acceptLink,
    recipientName: metadata.name || row.email,
  });

  try {
    const emailResult = await sendTenantEmail(tenantId, row.email, `[${orgName}] You've Been Invited`, html);
    await safeQuery(
      `UPDATE "${schema}".invitations SET email_sent = $1, email_error = $2 WHERE invitation_id = $3`,
      [emailResult.success, emailResult.success ? null : (emailResult.error || 'Unknown error'), invitationId],
    ).catch(catchHandler(EC.EVENT_BUS, {}));
    return { success: emailResult.success, error: emailResult.error };
  } catch (err: unknown) {
    await safeQuery(
      `UPDATE "${schema}".invitations SET email_sent = false, email_error = $1 WHERE invitation_id = $2`,
      [toErrorMessage(err), invitationId],
    ).catch(catchHandler(EC.EVENT_BUS, {}));
    return { success: false, error: toErrorMessage(err) };
  }
}

/**
 * List invitations for a tenant with optional filters.
 *
 * Requirements: 2.1
 */
export async function listInvitations(
  tenantId: string,
  filters?: InvitationFilters,
): Promise<InvitationRecord[]> {
  const schema = tenantSchema(tenantId);
  await ensureInvitationTables(schema);

  await safeQuery(
    `UPDATE "${schema}".invitations SET status = 'expired'
     WHERE status = 'pending' AND expires_at < NOW()`,
  );

  const conditions: string[] = [];
  const params: (string | number | null)[] = [];
  let idx = 1;

  if (filters?.status) {
    conditions.push(`status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters?.role) {
    conditions.push(`role = $${idx++}`);
    params.push(filters.role);
  }
  if (filters?.email) {
    conditions.push(`email ILIKE $${idx++}`);
    params.push(`%${filters.email}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await safeQuery(
    `SELECT * FROM "${schema}".invitations ${where} ORDER BY created_at DESC`,
    params,
  );

  return result.rows.map(rowToRecord);
}
