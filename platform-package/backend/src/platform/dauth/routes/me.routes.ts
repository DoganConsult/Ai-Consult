// @ts-nocheck
import { auditMiddleware } from '../../dos/http/middleware/audit';
import { Router, Request, Response } from 'express';
import { authenticate } from '..';
import { safeQuery, tenantSchema } from '../../../config/database/database';
import { asyncHandler } from '../../dos/http/error-handling/async-handler';
import { getFirstRow } from '../../../shared/data/db-utils';
import { accessSnapshotService } from '..';
import { recordAudit } from '../../../modules/audit/services/audit/core/audit-trail.service';
import { emitEvent } from '../../dos/events/event-bus';
import { errMsg } from '../../../i18n/error-messages';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const schema = tenantSchema(user.tenantId);

  const userResult = await safeQuery(
    `SELECT user_id, email, name, full_name, role, onboarding_complete, is_super_admin,
            tenant_id
     FROM users WHERE user_id = $1`,
    [user.userId],
  );
  const dbUser = getFirstRow(userResult);
  if (!dbUser) {
    res.status(404).json({ error: errMsg('NOT_FOUND', req) });
    return;
  }

  let tenantInfo: Record<string, any> = {};
  try {
    const tenantResult = await safeQuery(
      `SELECT tenant_id, org_name, tenant_name_en, tenant_name_ar, industry, org_size, country
       FROM tenants WHERE tenant_id = $1`,
      [user.tenantId],
    );
    const tenant = getFirstRow(tenantResult);
    tenantInfo = {
      tenantId: tenant?.tenant_id,
      orgName: tenant?.org_name,
      nameEn: tenant?.tenant_name_en,
      nameAr: tenant?.tenant_name_ar,
      industry: tenant?.industry,
      orgSize: tenant?.org_size,
      country: tenant?.country,
    };
  } catch { /* fallback */ }

  let profile: Record<string, any> | null = null;
  try {
    const profileResult = await safeQuery(
      `SELECT mp.* FROM "${schema}".member_profiles mp WHERE mp.user_id = $1 LIMIT 1`,
      [user.userId],
    );
    profile = getFirstRow(profileResult) || null;
  } catch { /* table may not exist */ }

  let extendedProfile: Record<string, any> | null = null;
  try {
    const extResult = await safeQuery(
      `SELECT full_name, display_name, avatar_url, phone, locale, timezone,
              site_location, job_title_code, reports_to_user_id, direct_reports,
              team_ids, mfa_enabled, last_login_at, account_status,
              password_changed_at, onboarding_completed, profile_completeness_score
       FROM "${schema}".user_profiles_extended WHERE user_id = $1`,
      [user.userId],
    );
    extendedProfile = getFirstRow(extResult) || null;
  } catch { /* table may not exist */ }

  let orgProfile: Record<string, any> | null = null;
  try {
    const orgResult = await safeQuery(
      `SELECT org_size_category, employee_count_range, industry_code,
              industry_name_en, industry_name_ar, regulatory_frameworks,
              country_code, region, default_autonomy_mode, default_ai_delegation_level,
              role_complexity
       FROM "${schema}".org_profile LIMIT 1`,
    );
    orgProfile = getFirstRow(orgResult) || null;
  } catch { /* table may not exist */ }

  let entitlements: Record<string, any> | null = null;
  try {
    const entResult = await safeQuery(
      `SELECT product_code, access_profile_code, functional_role_codes,
              licensed_modules, is_active, valid_from, valid_to
       FROM "${schema}".product_user_entitlements
       WHERE user_id = $1 AND is_active = TRUE`,
      [user.userId],
    );
    entitlements = entResult.rows.length > 0 ? entResult.rows : null;
  } catch { /* table may not exist */ }

  let preferencesV2: Record<string, any> | null = null;
  try {
    const pv2Result = await safeQuery(
      `SELECT language, timezone, locale, date_format, number_format,
              notification_channels, email_digest_frequency, dashboard_layout,
              theme, module_overrides, accessibility
       FROM "${schema}".user_preferences WHERE user_id = $1`,
      [user.userId],
    );
    preferencesV2 = getFirstRow(pv2Result) || null;
  } catch { /* table may not exist */ }

  let preferences: Record<string, any> | null = null;
  try {
    const prefResult = await safeQuery(
      `SELECT * FROM "${schema}".user_preferences WHERE user_id = $1 LIMIT 1`,
      [user.userId],
    );
    preferences = getFirstRow(prefResult) || null;
  } catch { /* table may not exist */ }

  let roleAssignments: any[] = [];
  try {
    const roleResult = await safeQuery(
      `SELECT fra.*, fr.role_name, fr.role_name_ar, fr.role_code
       FROM "${schema}".functional_role_assignments fra
       JOIN "${schema}".functional_roles fr ON fr.role_id = fra.role_id
       WHERE fra.user_id = $1 AND fra.is_active = TRUE`,
      [user.userId],
    );
    roleAssignments = roleResult.rows;
  } catch { /* table may not exist */ }

  let enterpriseAuthz = null;
  try {
    enterpriseAuthz = await accessSnapshotService.getUserAuthzPayload(user.tenantId, user.userId);
  } catch { /* access tables may not exist */ }

  let teamMemberships: any[] = [];
  try {
    const teamResult = await safeQuery(
      `SELECT tm.team_id, t.team_name, t.team_name_ar, t.team_code, tm.team_role
       FROM "${schema}".team_members tm
       JOIN "${schema}".teams t ON t.team_id = tm.team_id
       WHERE tm.user_id = $1 AND t.is_active = TRUE`,
      [user.userId],
    );
    teamMemberships = teamResult.rows;
  } catch { /* table may not exist */ }

  let delegations: any[] = [];
  try {
    const delegResult = await safeQuery(
      `SELECT ad.*, u.name AS delegated_from_name
       FROM "${schema}".authority_delegations ad
       LEFT JOIN users u ON u.user_id = ad.delegator_user_id
       WHERE ad.delegate_user_id = $1 AND ad.is_active = TRUE
       AND (ad.expires_at IS NULL OR ad.expires_at > NOW())`,
      [user.userId],
    );
    delegations = delegResult.rows;
  } catch { /* table may not exist */ }

  res.json({
    userId: dbUser.user_id,
    email: dbUser.email,
    name: dbUser.name,
    fullName: dbUser.full_name || extendedProfile?.full_name,
    displayName: extendedProfile?.display_name,
    role: dbUser.role,
    avatarUrl: extendedProfile?.avatar_url,
    phone: extendedProfile?.phone,
    locale: extendedProfile?.locale || preferencesV2?.locale || preferences?.locale || 'en',
    timezone: extendedProfile?.timezone || preferencesV2?.timezone || preferences?.timezone || 'UTC',
    theme: preferencesV2?.theme || preferences?.theme || 'system',
    siteLocation: extendedProfile?.site_location,
    jobTitleCode: extendedProfile?.job_title_code,
    reportsToUserId: extendedProfile?.reports_to_user_id,
    directReports: extendedProfile?.direct_reports || [],
    teamIds: extendedProfile?.team_ids || [],
    mfaEnabled: extendedProfile?.mfa_enabled ?? false,
    lastLoginAt: extendedProfile?.last_login_at,
    accountStatus: extendedProfile?.account_status || 'active',
    passwordChangedAt: extendedProfile?.password_changed_at,
    onboardingComplete: extendedProfile?.onboarding_completed ?? dbUser.onboarding_complete ?? false, // @deprecated @removal-date Phase 2 (DAuth access core) @owner DAuth @replacement /api/me/access-snapshot canonical profile completeness
    profileCompletenessScore: extendedProfile?.profile_completeness_score ?? 0,
    isSuperAdmin: dbUser.is_super_admin === true,
    tenant: tenantInfo,
    orgProfile,
    profile,
    extendedProfile,
    preferences: preferencesV2 || preferences,
    entitlements,
    roleAssignments,
    teamMemberships,
    delegations,
    enterpriseAuthz,
  });
}));

router.patch('/', auditMiddleware('platform.me.update'), authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const schema = tenantSchema(user.tenantId);
  const allowed = ['name', 'full_name', 'locale', 'timezone', 'theme', 'avatar_url'];
  const updates: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = $${idx}`);
      params.push(req.body[key]);
      idx++;
    }
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  let beforeState: Record<string, any> | null = null;
  try {
    const before = await safeQuery(`SELECT name, full_name, locale, timezone, theme, avatar_url FROM users WHERE user_id = $1`, [user.userId]);
    beforeState = getFirstRow(before);
  } catch { /* ok */ }

  params.push(user.userId);
  await safeQuery(
    `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE user_id = $${idx}`,
    params,
  );

  const extAllowed = ['display_name', 'phone', 'site_location', 'job_title_code'];
  const extUpdates: string[] = [];
  const extParams: unknown[] = [];
  let extIdx = 1;
  for (const key of extAllowed) {
    if (req.body[key] !== undefined) {
      extUpdates.push(`${key} = $${extIdx}`);
      extParams.push(req.body[key]);
      extIdx++;
    }
  }
  if (extUpdates.length > 0) {
    extParams.push(user.userId);
    try {
      await safeQuery(
        `UPDATE "${schema}".user_profiles_extended SET ${extUpdates.join(', ')}, updated_at = NOW() WHERE user_id = $${extIdx}`,
        extParams,
      );
    } catch { /* table may not exist */ }
  }

  const changedFields = Object.fromEntries(
    allowed.filter(k => req.body[k] !== undefined).map(k => [k, req.body[k]])
  );

  try {
    await recordAudit({
      tenantId: user.tenantId,
      userId: user.userId,
      module: 'platform',
      action: 'update',
      entityType: 'user_profile',
      entityId: user.userId,
      beforeState,
      afterState: changedFields,
      ipAddress: req.ip,
    });
  } catch { /* non-blocking */ }

  try {
    await emitEvent({
      tenantId: user.tenantId,
      userId: user.userId,
      module: 'platform',
      event: 'user_profile.updated',
      entityType: 'user_profile',
      entityId: user.userId,
      data: changedFields,
    });
  } catch { /* non-blocking */ }

  res.json({ success: true });
}));

router.put('/preferences', auditMiddleware('platform.me.update'), authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const schema = tenantSchema(user.tenantId);
  const { locale, timezone, theme, notificationEmail, notificationPush, dashboardLayout } = req.body;

  await safeQuery(
    `INSERT INTO "${schema}".user_preferences (user_id, locale, timezone, theme, notification_email, notification_push, dashboard_layout, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       locale = COALESCE($2, user_preferences.locale),
       timezone = COALESCE($3, user_preferences.timezone),
       theme = COALESCE($4, user_preferences.theme),
       notification_email = COALESCE($5, user_preferences.notification_email),
       notification_push = COALESCE($6, user_preferences.notification_push),
       dashboard_layout = COALESCE($7, user_preferences.dashboard_layout),
       updated_at = NOW()`,
    [user.userId, locale, timezone, theme, notificationEmail ?? true, notificationPush ?? true, dashboardLayout ? JSON.stringify(dashboardLayout) : null],
  );

  try {
    const language = locale?.split('-')[0] || locale;
    await safeQuery(
      `INSERT INTO "${schema}".user_preferences (user_id, language, timezone, locale, theme, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         language = COALESCE($2, user_preferences.language),
         timezone = COALESCE($3, user_preferences.timezone),
         locale = COALESCE($4, user_preferences.locale),
         theme = COALESCE($5, user_preferences.theme),
         updated_at = NOW()`,
      [user.userId, language, timezone, locale, theme],
    );
  } catch { /* table may not exist */ }

  try {
    await recordAudit({
      tenantId: user.tenantId,
      userId: user.userId,
      module: 'platform',
      action: 'update',
      entityType: 'user_preferences',
      entityId: user.userId,
      afterState: { locale, timezone, theme, notificationEmail, notificationPush },
      ipAddress: req.ip,
    });
  } catch { /* non-blocking */ }

  try {
    await emitEvent({
      tenantId: user.tenantId,
      userId: user.userId,
      module: 'platform',
      event: 'user_preferences.updated',
      entityType: 'user_preferences',
      entityId: user.userId,
      data: { locale, timezone, theme },
    });
  } catch { /* non-blocking */ }

  res.json({ success: true });
}));

export default router;
