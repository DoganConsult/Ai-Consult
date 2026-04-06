// @ts-nocheck
import { Router, Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { safeQuery, createTenantSchema } from "../../../config/database";
import { seedWorkflowTemplates } from "../../../modules/workflow/services/workflow-templates.service";
import { authenticate, generateToken, generateRefreshToken, verifyRefreshToken, decodeTokenUnsafe, getAccessTokenExpirySeconds, setRefreshTokenCookie, clearRefreshTokenCookie } from "../../../middleware/auth";
import { blacklistToken, registerActiveJtiForUser, removeActiveJtiForUser } from "../../../modules/platform/services/token-blacklist.service";
import { authRateLimiter, rateLimiter } from "../../../middleware/rate-limiter.middleware";
import { validate } from "../../../middleware/validate";
import {
  requestPasswordReset,
  completePasswordReset,
  enableTOTP,
  verifyTOTP,
  sendEmailMFA,
  verifyEmailMFA,
  checkLoginThrottle,
  recordFailedLogin,
  clearLoginFailures,
  recordSuccessfulLogin,
} from "../../../modules/platform/services/auth-enhanced.service";
import { getSecurityConfig } from "../../../modules/admin/services/security-config.service";
import { errMsg } from "../../../i18n/error-messages";
import { emitGrcEvent } from "../../../modules/platform/services/grc-event-bus.service";
import { recordAudit } from "../../../modules/audit/services/audit-trail.service";
import { enterpriseAuthzService } from "../../../modules/admin/services/enterprise-authz.service";
import { logger } from "../../../modules/platform/services/logger.service";
import { AGRC_ROLE_LANDINGS } from "../../../products/agrc/agrc-rbac";
import { toErrorMessage } from '../../../utils/http-error.util';
import { getFirstRow } from '../../../utils/db-utils';

const ROLE_LANDING_MAP: Record<string, string> = { ...AGRC_ROLE_LANDINGS.landingMap };
const ROLE_MODULES_MAP: Record<string, string[]> = { ...AGRC_ROLE_LANDINGS.modulesMap };
const ROLE_WIDGETS_MAP: Record<string, string[]> = { ...AGRC_ROLE_LANDINGS.widgetsMap };

// --- Zod Schemas ---

/** Body for POST /register */
const registerBody = z.object({
  email: z.string().min(1, "email is required"),
  password: z.string().min(1, "password is required"),
  name: z.string().min(1, "name is required"),
}).passthrough();

/** Body for POST /login */
const loginBody = z.object({
  email: z.string().min(1, "email is required"),
  password: z.string().min(1, "password is required"),
}).passthrough();

/** Body for POST /forgot-password */
const forgotPasswordBody = z.object({
  email: z.string().min(1, "email is required"),
}).passthrough();

/** Body for POST /reset-password */
const resetPasswordBody = z.object({
  token: z.string().min(1, "token is required"),
  newPassword: z.string().min(1, "newPassword is required"),
}).passthrough();

/** Body for POST /mfa/login-verify */
const mfaLoginVerifyBody = z.object({
  userId: z.string().min(1, "userId is required"),
  code: z.string().min(1, "code is required"),
  mfaType: z.string().optional(),
}).passthrough();

/** Body for POST /mfa/enable */
const mfaEnableBody = z.object({
  type: z.string().optional(),
}).passthrough();

/** Body for POST /mfa/verify */
const mfaVerifyBody = z.object({
  code: z.string().min(1, "code is required"),
  type: z.string().optional(),
}).passthrough();

/** Body for POST /change-password */
const changePasswordBody = z.object({
  currentPassword: z.string().min(1, "currentPassword is required"),
  newPassword: z.string().min(1, "newPassword is required"),
}).passthrough();

/** Body for POST /refresh — refreshToken is optional (prefer httpOnly cookie) */
const refreshBody = z.object({
  refreshToken: z.string().optional(),
}).passthrough();

const router: Router = Router();

/**
 * Resolve the user's effective role from the new authorization system.
 * Falls back to users.role if no assignment exists.
 */
async function resolveUserRole(userId: string, tenantId: string, fallbackRole: string): Promise<string> {
  try {
    const schema = `tenant_${tenantId}`;
    const result = await safeQuery(
      `SELECT r.role_code FROM "${schema}".user_role_assignments ura
       JOIN "${schema}".roles r ON r.role_id = ura.role_id
       WHERE ura.user_id = $1 AND ura.active = TRUE AND r.active = TRUE
       ORDER BY r.hierarchy_level DESC NULLS LAST LIMIT 1`,
      [userId]
    );
    return getFirstRow(result)?.role_code || fallbackRole;
  } catch (err) {
    logger.error(`[resolveUserRole] Error resolving role for user=${userId} tenant=${tenantId}:`, err?.message);
    return fallbackRole;
  }
}

function validateEmail(email: string): string | null {
  if (email.length > 254) return 'Email address too long (max 254 characters)';
  const [localPart, ...domainParts] = email.split('@');
  if (!localPart || domainParts.length !== 1) return 'Invalid email format';
  const domain = domainParts[0];
  if (localPart.length > 64) return 'Email local part too long (max 64 characters)';
  if (localPart.includes('..') || domain.includes('..')) return 'Invalid email format: consecutive dots not allowed';
  const tld = domain.split('.').pop() || '';
  if (tld.length < 2) return 'Invalid email format: TLD must be at least 2 characters';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Invalid email format';
  return null;
}

// Apply rate limiter to auth routes — but skip lightweight read-only endpoints
// to prevent redirect-loop 429 storms when guards check onboarding status
// IMPORTANT: create the limiter once (not per-request) so PgRateLimiterStore
// has time to initialize its dbQuery before the first hit() call.
const _authRateLimiterMiddleware = authRateLimiter();
router.use((req, res, next) => {
  // /userinfo is a lightweight authenticated read — exempt from aggressive rate limit
  if (req.path === '/userinfo' && req.method === 'GET') return next();
  // /register is exempt from route-level rate limit (server-level auth limiter still applies)
  if (req.path === '/register' && req.method === 'POST') return next();
  return _authRateLimiterMiddleware(req, res, next);
});

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user and create tenant
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 1 }
 *               name: { type: string, minLength: 1 }
 *     responses:
 *       201:
 *         description: Registration successful — returns JWT token, userId, tenantId
 *       400:
 *         description: Missing or invalid fields
 *       409:
 *         description: Email already registered
 */
router.post("/register", validate({ body: registerBody }), async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body || {};
    const missing: string[] = [];
    if (!email?.trim()) missing.push('email');
    if (!password) missing.push('password');
    if (!name?.trim()) missing.push('name');
    if (missing.length > 0) {
      res.status(400).json({ error: `${errMsg('MISSING_FIELDS', req)}: ${missing.join(', ')}` });
      return;
    }

    const trimmedEmail = email.trim();
    const emailError = validateEmail(trimmedEmail);
    if (emailError) {
      res.status(400).json({ error: emailError });
      return;
    }

    const existing = await safeQuery("SELECT user_id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: errMsg('EMAIL_REGISTERED', req) });
      return;
    }

    const tenantId = uuid().slice(0, 8);
    const tenantCode = `org_${tenantId}`;
    const schemaName = `tenant_${tenantId}`;
    const orgName = name + "'s Organization";
    await safeQuery(
      `INSERT INTO tenants (tenant_id, tenant_code, org_name, tenant_name_en, schema_name, industry, org_size, status) VALUES ($1, $2, $3, $4, $5, 'other', '1-50', 'active')`,
      [tenantId, tenantCode, orgName, orgName, schemaName]
    );
    await createTenantSchema(tenantId);
    await seedWorkflowTemplates(tenantId, "system").catch(() => {}); // non-blocking seed

    const userId = uuid();
    const rounds = await getSecurityConfig<number>(tenantId, 'bcrypt_rounds', 12);
    const passwordHash = await bcrypt.hash(password, rounds);
    await safeQuery(
      `INSERT INTO users (user_id, email, password_hash, name, full_name, tenant_id, role) VALUES ($1, $2, $3, $4, $5, $6, 'admin')`,
      [userId, email, passwordHash, name, name, tenantId]
    );

    try {
      const schema = `tenant_${tenantId}`;
      const adminRole = await safeQuery(`SELECT role_id FROM "${schema}".roles WHERE role_code = 'admin' AND active = TRUE`);
      if (adminRole.rows.length > 0) {
        await safeQuery(
          `INSERT INTO "${schema}".user_role_assignments (tenant_id, user_id, role_id, scope_type, assigned_by, active)
           VALUES ($3, $1, $2, 'workspace', $1, TRUE)`,
          [userId, getFirstRow(adminRole)?.role_id, tenantId]
        );
      }
    } catch (roleErr: unknown) {
      logger.warn('[Register] Could not assign admin role:', toErrorMessage(roleErr));
    }

    let enterpriseAuthz = null;
    try {
      await enterpriseAuthzService.provisionFromLegacyRole(tenantId, userId, 'admin', userId);
      enterpriseAuthz = await enterpriseAuthzService.getUserAuthzPayload(tenantId, userId);
    } catch (eaErr: unknown) {
      logger.warn('[Register] Enterprise authz provisioning warning:', toErrorMessage(eaErr));
    }

    const token = generateToken({ userId, email, tenantId, role: "admin", role_code: "admin" });
    const refreshToken = generateRefreshToken(userId, tenantId);
    {
      const dec = decodeTokenUnsafe(token);
      if (dec?.jti) {
        await registerActiveJtiForUser(userId, dec.jti, getAccessTokenExpirySeconds()).catch((e) =>
          logger.warn('[Auth] registerActiveJtiForUser failed', { error: toErrorMessage(e), userId }),
        );
      }
    }
    emitGrcEvent({ tenantId, userId, module: 'admin', event: 'created', entityType: 'auth', entityId: '' }).catch(() => {});
    recordAudit({ tenantId, userId, module: 'auth', action: 'register', entityType: 'user', entityId: userId, ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1', afterState: { role: 'admin' } }).catch(err => logger.error('[Audit] auth register:', toErrorMessage(err)));
    setRefreshTokenCookie(res, refreshToken);
    res.status(201).json({
      token,
      userId,
      tenantId,
      role: 'admin',
      onboardingComplete: false,
      orgName,
      userName: name,
      isSuperAdmin: false,
      enterpriseAuthz,
    });
  } catch (err) {
    logger.error('[Register] Error:', toErrorMessage(err));
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user and obtain JWT token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful (or MFA challenge returned)
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account locked due to repeated failures
 *       429:
 *         description: Rate limited — too many login attempts
 */
router.post("/login", validate({ body: loginBody }), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check login throttle before attempting authentication
    const throttle = await checkLoginThrottle(email);
    if (!throttle.allowed) {
      const statusCode = throttle.locked ? 423 : 429;
      res.status(statusCode).json({
        error: throttle.locked
          ? errMsg('ACCOUNT_LOCKED', req)
          : errMsg('RATE_LIMIT_EXCEEDED', req),
        retryAfterMs: throttle.delayMs,
        retryAfterSeconds: throttle.retryAfterSeconds,
        requireCaptcha: throttle.requireCaptcha,
        locked: throttle.locked,
      });
      return;
    }

    const result = await safeQuery("SELECT * FROM users WHERE email = $1", [email]);
    const user = getFirstRow(result);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      // Record failed login attempt
      await recordFailedLogin(email, req.ip || undefined);
      // Log 401 for debugging (request id only, no PII)
      const requestId = req.headers?.["x-correlation-id"] ?? "no-request-id";
      logger.warn("Login 401", { requestId });
      // Audit: login failure (only if user exists — anti-enumeration)
      if (user) {
        recordAudit({ tenantId: user.tenant_id, userId: user.user_id, module: 'auth', action: 'login_failed', entityType: 'session', entityId: '', ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1', afterState: { reason: 'invalid_credentials' } }).catch(err => logger.error('[Audit] auth login_failed:', toErrorMessage(err)));
      }
      res.status(401).json({ error: errMsg('INVALID_CREDENTIALS', req) });
      return;
    }

    // Clear failures on successful login
    await clearLoginFailures(email);

    // Best-effort observability: record successful login + update last_login_at
    try {
      await recordSuccessfulLogin(email, req.ip || undefined);
      await safeQuery("UPDATE users SET last_login_at = NOW() WHERE email = $1", [email]);
    } catch (obsErr: unknown) {
      logger.warn('[Login] Observability write failed (non-blocking):', toErrorMessage(obsErr));
    }

    // Check if MFA is enabled for this user
    const mfaResult = await safeQuery(
      `SELECT mfa_type, enabled FROM user_mfa WHERE user_id = $1 AND enabled = TRUE`,
      [user.user_id]
    );
    const mfaRecord = getFirstRow(mfaResult);

    if (mfaRecord) {
      // MFA is enabled — send code and return challenge
      if (mfaRecord.mfa_type === 'email') {
        const code = await sendEmailMFA(user.user_id, user.tenant_id);
        // Send MFA code via email
        try {
          const { sendTemplatedEmail } = await import('../services/email.service');
          await sendTemplatedEmail(
            email,
            'notification',
            {
              recipientName: user.name || 'User',
              title: 'Login Verification Code',
              body: `Your login verification code is: <strong style="font-size:24px;letter-spacing:4px">${code}</strong><br><br>This code expires in 10 minutes. If you did not request this, please ignore this email.`,
              language: 'en'
            }
          );
        } catch (emailErr: unknown) {
          logger.error('[MFA] Failed to send email code:', toErrorMessage(emailErr));
        }
      }
      // Return MFA challenge (no token issued yet)
      emitGrcEvent({ tenantId: user.tenant_id, userId: user.user_id, module: 'admin', event: 'created', entityType: 'auth', entityId: '' }).catch(() => {});
      recordAudit({ tenantId: user.tenant_id, userId: user.user_id, module: 'auth', action: 'login', entityType: 'session', entityId: user.user_id, ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1', afterState: { mfaRequired: true, mfaType: mfaRecord.mfa_type } }).catch(err => logger.error('[Audit] auth login+mfa:', toErrorMessage(err)));
      res.json({
        mfaRequired: true,
        mfaType: mfaRecord.mfa_type,
        userId: user.user_id,
        message: mfaRecord.mfa_type === 'email'
          ? 'A verification code has been sent to your email.'
          : 'Enter the code from your authenticator app.',
      });
      return;
    }

    const effectiveRole = await resolveUserRole(user.user_id, user.tenant_id, user.role);

    let orgName = '';
    try {
      const tenantResult = await safeQuery("SELECT org_name FROM tenants WHERE tenant_id = $1", [user.tenant_id]);
      orgName = getFirstRow(tenantResult)?.org_name || '';
    } catch { /* fallback to empty */ }

    let enterpriseAuthz = null;
    try {
      enterpriseAuthz = await enterpriseAuthzService.getUserAuthzPayload(user.tenant_id, user.user_id);
    } catch { /* enterprise tables may not exist yet */ }

    let sessionId: string | null = null;
    if (!user.onboarding_complete) {
      try {
        const sessionResult = await safeQuery(
          `SELECT id FROM public.onboarding_sessions
           WHERE started_by_user_id = $1 AND status NOT IN ('completed','cancelled')
           ORDER BY created_at DESC LIMIT 1`,
          [user.user_id]
        );
        sessionId = getFirstRow(sessionResult)?.id ?? null;
      } catch { /* onboarding_sessions may not exist */ }
    }

    const token = generateToken({
      userId: user.user_id,
      email,
      tenantId: user.tenant_id,
      role: effectiveRole,
      role_code: effectiveRole,
      is_super_admin: user.is_super_admin === true,
    });
    const refreshToken = generateRefreshToken(user.user_id, user.tenant_id);
    {
      const dec = decodeTokenUnsafe(token);
      if (dec?.jti) {
        await registerActiveJtiForUser(user.user_id, dec.jti, getAccessTokenExpirySeconds()).catch((e) =>
          logger.warn('[Auth] registerActiveJtiForUser failed', { error: toErrorMessage(e), userId: user.user_id }),
        );
      }
    }
    recordAudit({ tenantId: user.tenant_id, userId: user.user_id, module: 'auth', action: 'login', entityType: 'session', entityId: user.user_id, ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1', afterState: { role: effectiveRole } }).catch(err => logger.error('[Audit] auth login:', toErrorMessage(err)));
    setRefreshTokenCookie(res, refreshToken);
    res.json({
      token,
      userId: user.user_id,
      tenantId: user.tenant_id,
      role: effectiveRole,
      onboardingComplete: user.onboarding_complete,
      orgName,
      userName: user.name || '',
      isSuperAdmin: user.is_super_admin === true,
      defaultLandingPage: ROLE_LANDING_MAP[effectiveRole] || '/dashboard',
      roleModules: ROLE_MODULES_MAP[effectiveRole] || ['dashboard'],
      dashboardWidgets: ROLE_WIDGETS_MAP[effectiveRole] || [],
      enterpriseAuthz,
      sessionId,
    });
  } catch (err) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Reset email sent (always returns 200 to prevent enumeration)
 *       429:
 *         description: Rate limited
 */
const forgotPwdLimiter = rateLimiter({ namespace: 'forgot-pwd', maxRequests: 5, windowMs: 15 * 60_000, keyGenerator: (req) => { const ip = (req.headers['cf-connecting-ip'] as string) || (typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0].trim() : '') || req.ip || 'unknown'; return ip; } });
router.post("/forgot-password", forgotPwdLimiter, validate({ body: forgotPasswordBody }), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: errMsg('REQUIRED_FIELD', req) });
      return;
    }

    // Check if user exists — always return same response to prevent email enumeration
    const userResult = await safeQuery("SELECT user_id, name FROM users WHERE email = $1", [email]);
    if (userResult.rows.length === 0) {
      res.json({
        sent: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      });
      return;
    }
    const userName = getFirstRow(userResult)?.name || 'User';

    const { token, _expiresAt } = await requestPasswordReset(email);

    // Import email service
    const { sendTemplatedEmail } = await import('../services/email.service');

    // Prepare reset link
    const resetLink = `${process.env.APP_URL || 'http://localhost:4200'}/reset-password?token=${token}`;

    // Send email with reset link
    const emailResult = await sendTemplatedEmail(
      email,
      'notification',
      {
        recipientName: userName,
        title: 'Password Reset Request',
        body: `You requested a password reset for your DOS Platform account.<br><br>Click the button below to reset your password. This link will expire in 30 minutes.`,
        ctaLabel: 'Reset Password',
        ctaUrl: resetLink,
        footerNote: 'If you did not request this reset, please ignore this email. Your password will remain unchanged.',
        language: 'en'
      }
    );

    if (emailResult.success) {
      emitGrcEvent({ tenantId: 'system', userId: 'system', module: 'admin', event: 'created', entityType: 'auth', entityId: '' }).catch(() => {});
      // Audit: user found, so we have tenant context
      const forgotUser = await safeQuery("SELECT user_id, tenant_id FROM users WHERE email = $1", [email]);
      if (getFirstRow(forgotUser)) {
        recordAudit({ tenantId: getFirstRow(forgotUser)?.tenant_id, userId: getFirstRow(forgotUser)?.user_id, module: 'auth', action: 'forgot_password', entityType: 'auth', entityId: '', ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1', afterState: { sent: true } }).catch(err => logger.error('[Audit] auth forgot_password:', toErrorMessage(err)));
      }
      res.json({
        sent: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    } else {
      logger.error('Email send failed:', emailResult.error);
      res.status(502).json({
        sent: false,
        error: errMsg('SERVICE_UNAVAILABLE', req),
      });
    }
  } catch (err) {
    logger.error('[forgot-password] Error:', toErrorMessage(err));
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Complete password reset with token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
const resetPwdLimiter = rateLimiter({ namespace: 'reset-pwd', maxRequests: 10, windowMs: 15 * 60_000, keyGenerator: (req) => { const ip = (req.headers['cf-connecting-ip'] as string) || (typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0].trim() : '') || req.ip || 'unknown'; return ip; } });
router.post("/reset-password", resetPwdLimiter, validate({ body: resetPasswordBody }), async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
      return;
    }
    const resetResult = await completePasswordReset(token, newPassword);
    emitGrcEvent({ tenantId: 'system', userId: 'system', module: 'admin', event: 'created', entityType: 'auth', entityId: '' }).catch(() => {});
    // Audit: best-effort — completePasswordReset may not return user context
    const resetUserId = (resetResult as any)?.userId || '';
    const resetTenantId = (resetResult as any)?.tenantId || '';
    if (resetTenantId) {
      recordAudit({ tenantId: resetTenantId, userId: resetUserId, module: 'auth', action: 'reset_password', entityType: 'auth', entityId: '', ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1' }).catch(err => logger.error('[Audit] auth reset_password:', toErrorMessage(err)));
    }
    res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    logger.error('[Reset Password] Error:', toErrorMessage(err));
    const msg: string = err?.message || '';
    if (msg.includes('expired')) {
      res.status(400).json({ error: errMsg('PASSWORD_RESET_EXPIRED', req) });
    } else if (msg.includes('already been used')) {
      res.status(400).json({ error: errMsg('PASSWORD_RESET_EXPIRED', req) });
    } else if (msg.includes('Invalid')) {
      res.status(400).json({ error: errMsg('INVALID_TOKEN', req) });
    } else {
      res.status(400).json({ error: errMsg('INTERNAL_ERROR', req) });
    }
  }
});

/**
 * @swagger
 * /auth/mfa/login-verify:
 *   post:
 *     summary: Verify MFA code to complete login
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, code]
 *             properties:
 *               userId: { type: string }
 *               code: { type: string }
 *               mfaType: { type: string }
 *     responses:
 *       200:
 *         description: MFA verified — JWT token returned
 *       401:
 *         description: Invalid or expired MFA code
 */
router.post("/mfa/login-verify", validate({ body: mfaLoginVerifyBody }), async (req: Request, res: Response) => {
  try {
    const { userId, code, mfaType } = req.body;
    if (!userId || !code) {
      res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
      return;
    }

    let valid: boolean;
    if (mfaType === 'email') {
      valid = await verifyEmailMFA(userId, code);
    } else {
      valid = await verifyTOTP(userId, code);
    }

    if (!valid) {
      res.status(401).json({ error: errMsg('INVALID_MFA_CODE', req) });
      return;
    }

    // MFA verified — issue tokens
    const userResult = await safeQuery(
      "SELECT user_id, email, tenant_id, role, name, onboarding_complete, is_super_admin FROM users WHERE user_id = $1",
      [userId]
    );
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: errMsg('NOT_FOUND', req) });
      return;
    }
    const user = getFirstRow(userResult);
    const effectiveRole = await resolveUserRole(user.user_id, user.tenant_id, user.role);

    let orgName = '';
    try {
      const tenantResult = await safeQuery("SELECT org_name FROM tenants WHERE tenant_id = $1", [user.tenant_id]);
      orgName = getFirstRow(tenantResult)?.org_name || '';
    } catch { /* fallback */ }

    let enterpriseAuthz = null;
    try {
      enterpriseAuthz = await enterpriseAuthzService.getUserAuthzPayload(user.tenant_id, user.user_id);
    } catch { /* enterprise tables may not exist yet */ }

    let mfaSessionId: string | null = null;
    if (!user.onboarding_complete) {
      try {
        const sessionResult = await safeQuery(
          `SELECT id FROM public.onboarding_sessions
           WHERE started_by_user_id = $1 AND status NOT IN ('completed','cancelled')
           ORDER BY created_at DESC LIMIT 1`,
          [user.user_id]
        );
        mfaSessionId = getFirstRow(sessionResult)?.id ?? null;
      } catch { /* onboarding_sessions may not exist */ }
    }

    const token = generateToken({
      userId: user.user_id,
      email: user.email,
      tenantId: user.tenant_id,
      role: effectiveRole,
      role_code: effectiveRole,
      is_super_admin: user.is_super_admin === true,
    });
    const refreshToken = generateRefreshToken(user.user_id, user.tenant_id);
    {
      const dec = decodeTokenUnsafe(token);
      if (dec?.jti) {
        await registerActiveJtiForUser(user.user_id, dec.jti, getAccessTokenExpirySeconds()).catch((e) =>
          logger.warn('[Auth] registerActiveJtiForUser failed', { error: toErrorMessage(e), userId: user.user_id }),
        );
      }
    }
    emitGrcEvent({ tenantId: user.tenant_id, userId: user.user_id, module: 'admin', event: 'created', entityType: 'auth', entityId: '' }).catch(() => {});
    recordAudit({ tenantId: user.tenant_id, userId: user.user_id, module: 'auth', action: 'mfa_verify', entityType: 'session', entityId: user.user_id, ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1', afterState: { mfaType: mfaType || 'totp', role: effectiveRole } }).catch(err => logger.error('[Audit] auth mfa_verify:', toErrorMessage(err)));
    setRefreshTokenCookie(res, refreshToken);
    res.json({
      token,
      userId: user.user_id,
      tenantId: user.tenant_id,
      role: effectiveRole,
      onboardingComplete: user.onboarding_complete,
      orgName,
      userName: user.name || '',
      isSuperAdmin: user.is_super_admin === true,
      enterpriseAuthz,
      sessionId: mfaSessionId,
    });
  } catch (err) {
    res.status(403).json({ error: toErrorMessage(err) });
  }
});

/**
 * @swagger
 * /auth/mfa/enable:
 *   post:
 *     summary: Enable MFA for the authenticated user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: MFA setup initiated — returns TOTP secret or sends email code
 */
router.post("/mfa/enable", authenticate, validate({ body: mfaEnableBody }), async (req: Request, res: Response) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const { type } = req.body; // 'totp' or 'email'

    if (type === "email") {
      const code = await sendEmailMFA(userId, tenantId);

      // Look up user email to send the MFA code
      const userRow = getFirstRow(await safeQuery("SELECT email, name FROM users WHERE user_id = $1", [userId]));
      if (userRow?.email) {
        try {
          const { sendTemplatedEmail } = await import('../services/email.service');
          await sendTemplatedEmail(
            userRow.email,
            'notification',
            {
              recipientName: userRow.name || 'User',
              title: 'Email MFA Verification Code',
              body: `Your MFA verification code is: <strong style="font-size:24px;letter-spacing:4px">${code}</strong><br><br>This code expires in 10 minutes. Enter it in the application to enable email-based MFA.`,
              language: 'en'
            }
          );
        } catch (emailErr: unknown) {
          logger.error('[MFA Enable] Failed to send email code:', toErrorMessage(emailErr));
        }
      } else {
        logger.error('[MFA Enable] No email found for user:', userId);
      }

      emitGrcEvent({ tenantId, userId, module: 'admin', event: 'created', entityType: 'auth', entityId: '' }).catch(() => {});
      recordAudit({ tenantId, userId, module: 'auth', action: 'mfa_enable', entityType: 'security', entityId: userId, ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1', afterState: { mfaType: 'email' } }).catch(err => logger.error('[Audit] auth mfa_enable:', toErrorMessage(err)));
      res.json({ message: "Email MFA code sent. Please check your inbox." });
    } else {
      // Default to TOTP — NEVER store secret or qrCodeUri in audit
      const { _secret, qrCodeUri } = await enableTOTP(userId, tenantId);
      recordAudit({ tenantId, userId, module: 'auth', action: 'mfa_enable', entityType: 'security', entityId: userId, ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1', afterState: { mfaType: 'totp' } }).catch(err => logger.error('[Audit] auth mfa_enable:', toErrorMessage(err)));
      res.json({ qrCodeUri });
    }
  } catch (err) {
    logger.error('[MFA Enable] Error:', toErrorMessage(err));
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

/**
 * @swagger
 * /auth/mfa/verify:
 *   post:
 *     summary: Verify MFA code to confirm MFA enrollment
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: MFA verified and enabled
 *       401:
 *         description: Invalid verification code
 */
router.post("/mfa/verify", authenticate, validate({ body: mfaVerifyBody }), async (req: Request, res: Response) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const { code, type } = req.body;

    if (!code) {
      res.status(400).json({ error: errMsg('REQUIRED_FIELD', req) });
      return;
    }

    let valid: boolean;
    if (type === "email") {
      valid = await verifyEmailMFA(userId, code, tenantId);
    } else {
      valid = await verifyTOTP(userId, code, tenantId);
    }

    if (valid) {
      emitGrcEvent({ tenantId, userId, module: 'admin', event: 'created', entityType: 'auth', entityId: '' }).catch(() => {});
      recordAudit({ tenantId, userId, module: 'auth', action: 'mfa_confirm', entityType: 'security', entityId: userId, ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1', afterState: { mfaType: type || 'totp', verified: true } }).catch(err => logger.error('[Audit] auth mfa_confirm:', toErrorMessage(err)));
      res.json({ verified: true });
    } else {
      res.status(401).json({ verified: false, error: errMsg('INVALID_MFA_CODE', req) });
    }
  } catch (err) {
    // Lockout or other MFA errors
    logger.error('[MFA Verify] Error:', toErrorMessage(err));
    res.status(403).json({ error: errMsg('INVALID_MFA_CODE', req) });
  }
});

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change the authenticated user's password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password incorrect
 */
router.post("/change-password", authenticate, validate({ body: changePasswordBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;
    const userId = req.user?.userId || req.userId;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
    const minLen = await getSecurityConfig<number>(tenantId, 'password_min_length', 8);
    if (newPassword.length < minLen) return res.status(400).json({ error: errMsg('WEAK_PASSWORD', req) });
    const { query: dbQuery } = await import("../../../config/database");
    const userRes = await dbQuery(`SELECT password_hash FROM users WHERE user_id = $1`, [userId]);
    if (!userRes.rows.length) return res.status(404).json({ error: errMsg('NOT_FOUND', req) });
    const bcrypt = await import("bcryptjs");
    const valid = await bcrypt.compare(currentPassword, getFirstRow(userRes)?.password_hash);
    if (!valid) return res.status(401).json({ error: errMsg('INVALID_CREDENTIALS', req) });
    const rounds = await getSecurityConfig<number>(tenantId, 'bcrypt_rounds', 12);
    const hash = await bcrypt.hash(newPassword, rounds);
    await dbQuery(`UPDATE users SET password_hash = $1 WHERE user_id = $2`, [hash, userId]);
    emitGrcEvent({ tenantId: tenantId || 'system', userId: userId || 'system', module: 'admin', event: 'created', entityType: 'auth', entityId: '' }).catch(() => {});
    recordAudit({ tenantId, userId, module: 'auth', action: 'change_password', entityType: 'security', entityId: userId, ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1' }).catch(err => logger.error('[Audit] auth change_password:', toErrorMessage(err)));
    res.json({ success: true });
  } catch (err) {
    logger.error('[Change Password] Error:', toErrorMessage(err));
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

/**
 * @swagger
 * /auth/userinfo:
 *   get:
 *     summary: Get authenticated user profile and workspace context
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User profile with role, tenant info, onboarding status, enterprise authz
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/userinfo", authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user;

    // Check if user exists in GRC DB
    let result = await safeQuery(
      "SELECT onboarding_complete, name, is_super_admin, tenant_id FROM users WHERE user_id = $1",
      [user.userId]
    );

    // Auto-provision for users who don't exist in GRC DB yet
    if (result.rows.length === 0 && user.tenantId) {
      // Check if tenant exists
      const tenantCheck = await safeQuery("SELECT tenant_id FROM tenants WHERE tenant_id = $1", [user.tenantId]);
      if (tenantCheck.rows.length === 0) {
        // Create tenant with all required fields
        const tenantCode = `tenant_${user.tenantId}`;
        const orgName = user.email?.split('@')[1] || 'Organization';
        const schemaName = `tenant_${user.tenantId}`;
        await safeQuery(
          `INSERT INTO tenants (tenant_id, tenant_code, org_name, tenant_name_en, schema_name, industry, org_size)
           VALUES ($1, $2, $3, $4, $5, 'other', '1-50')
           ON CONFLICT DO NOTHING`,
          [user.tenantId, tenantCode, orgName, orgName, schemaName]
        );
        // Create tenant schema
        try {
          await createTenantSchema(user.tenantId);
        } catch (schemaErr: unknown) {
          logger.warn(`[Auth] Tenant schema creation warning for ${user.tenantId}:`, toErrorMessage(schemaErr));
        }
      }
      // Create user record
      const autoName = user.email?.split('@')[0] || 'User';
      await safeQuery(
        `INSERT INTO users (user_id, email, password_hash, name, full_name, tenant_id, role) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (user_id) DO NOTHING`,
        [user.userId, user.email, 'auto-provisioned', autoName, autoName, user.tenantId, user.role || 'owner']
      );
      // Re-fetch
      result = await safeQuery(
        "SELECT onboarding_complete, name, is_super_admin, tenant_id FROM users WHERE user_id = $1",
        [user.userId]
      );
    }

    const dbUser = getFirstRow(result);
    let orgName = '';
    try {
      const tenantResult = await safeQuery("SELECT org_name FROM tenants WHERE tenant_id = $1", [user.tenantId]);
      orgName = getFirstRow(tenantResult)?.org_name || '';
    } catch { /* fallback */ }

    const effectiveRole = await resolveUserRole(user.userId, user.tenantId, user.role);

    let enterpriseAuthz = null;
    try {
      enterpriseAuthz = await enterpriseAuthzService.getUserAuthzPayload(user.tenantId, user.userId);
      if (!enterpriseAuthz || (!enterpriseAuthz.permissions.length && !enterpriseAuthz.accessProfiles.length)) {
        await enterpriseAuthzService.provisionFromLegacyRole(user.tenantId, user.userId, effectiveRole, user.userId);
        enterpriseAuthz = await enterpriseAuthzService.getUserAuthzPayload(user.tenantId, user.userId);
      }
    } catch { /* enterprise tables may not exist yet */ }

    res.json({
      ...user,
      role: effectiveRole,
      onboardingComplete: dbUser?.onboarding_complete ?? false,
      userName: dbUser?.name || '',
      orgName,
      isSuperAdmin: dbUser?.is_super_admin === true,
      enterpriseAuthz,
    });
  } catch (err) {
    logger.error('[UserInfo] Error:', toErrorMessage(err));
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Exchange refresh token for new access and refresh tokens
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string, description: 'Optional — prefers httpOnly cookie' }
 *     responses:
 *       200:
 *         description: New access token and refresh token
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post("/refresh", validate({ body: refreshBody }), async (req: Request, res: Response) => {
  try {
    // Prefer httpOnly cookie; fall back to body for mobile clients
    const refreshToken = req.cookies?.grc_rt || req.body.refreshToken;
    if (!refreshToken) {
      res.status(400).json({ error: errMsg('REQUIRED_FIELD', req) });
      return;
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      res.status(401).json({ error: errMsg('INVALID_REFRESH_TOKEN', req) });
      return;
    }

    // Re-fetch user from DB to get current role (may have changed)
    const result = await safeQuery(
      "SELECT user_id, email, tenant_id, role, name, onboarding_complete, is_super_admin FROM users WHERE user_id = $1",
      [payload.userId]
    );
    if (result.rows.length === 0) {
      res.status(401).json({ error: errMsg('NOT_FOUND', req) });
      return;
    }

    const user = getFirstRow(result);
    const effectiveRole = await resolveUserRole(user.user_id, user.tenant_id, user.role);
    let orgName = '';
    try {
      const tenantResult = await safeQuery("SELECT org_name FROM tenants WHERE tenant_id = $1", [user.tenant_id]);
      orgName = getFirstRow(tenantResult)?.org_name || '';
    } catch { /* fallback */ }

    let enterpriseAuthz = null;
    try {
      enterpriseAuthz = await enterpriseAuthzService.getUserAuthzPayload(user.tenant_id, user.user_id);
    } catch { /* enterprise tables may not exist yet */ }

    const newToken = generateToken({
      userId: user.user_id,
      email: user.email,
      tenantId: user.tenant_id,
      role: effectiveRole,
      role_code: effectiveRole,
      is_super_admin: user.is_super_admin === true,
    });
    const newRefreshToken = generateRefreshToken(user.user_id, user.tenant_id);
    {
      const dec = decodeTokenUnsafe(newToken);
      if (dec?.jti) {
        await registerActiveJtiForUser(user.user_id, dec.jti, getAccessTokenExpirySeconds()).catch((e) =>
          logger.warn('[Auth] registerActiveJtiForUser failed', { error: toErrorMessage(e), userId: user.user_id }),
        );
      }
    }

    emitGrcEvent({ tenantId: user.tenant_id, userId: user.user_id, module: 'admin', event: 'created', entityType: 'auth', entityId: '' }).catch(() => {});
    recordAudit({ tenantId: user.tenant_id, userId: user.user_id, module: 'auth', action: 'token_refresh', entityType: 'session', entityId: user.user_id, ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1' }).catch(err => logger.error('[Audit] auth token_refresh:', toErrorMessage(err)));
    setRefreshTokenCookie(res, newRefreshToken);
    res.json({
      token: newToken,
      userId: user.user_id,
      tenantId: user.tenant_id,
      role: effectiveRole,
      onboardingComplete: user.onboarding_complete,
      orgName,
      userName: user.name || '',
      isSuperAdmin: user.is_super_admin === true,
      enterpriseAuthz,
    });
  } catch (err) {
    logger.error('[Refresh] Error:', toErrorMessage(err));
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

/**
 * @swagger
 * /auth/context:
 *   get:
 *     summary: Get full authentication context including modules, widgets, and landing page
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Authentication context with role-based module access
 */
router.get("/context", authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const result = await safeQuery(
      "SELECT user_id, email, name, tenant_id, role, onboarding_complete, is_super_admin, department FROM users WHERE user_id = $1",
      [user.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const dbUser = getFirstRow(result);
    const effectiveRole = await resolveUserRole(dbUser.user_id, dbUser.tenant_id, dbUser.role);

    let orgName = '';
    try {
      const tenantResult = await safeQuery("SELECT org_name FROM tenants WHERE tenant_id = $1", [dbUser.tenant_id]);
      orgName = getFirstRow(tenantResult)?.org_name || '';
    } catch (err) {
      logger.warn('[Auth] Failed to fetch org name for login', { 
        tenantId: dbUser.tenant_id, 
        error: toErrorMessage(err) 
      });
    }

    let teams: any[] = [];
    try {
      const schema = `tenant_${dbUser.tenant_id}`;
      const teamRes = await safeQuery(
        `SELECT tm.team_id, t.name, t.team_code, tm.team_role
         FROM "${schema}".team_members tm
         JOIN "${schema}".teams t ON t.team_id = tm.team_id
         WHERE tm.user_id = $1 AND tm.active = true`,
        [dbUser.user_id]
      );
      teams = teamRes.rows;
    } catch (err) {
      logger.warn('[Auth] Failed to fetch teams for login', { 
        userId: dbUser.user_id, 
        tenantId: dbUser.tenant_id,
        error: toErrorMessage(err) 
      });
    }

    const { PERMS: permMap } = await import('../middleware/rbac');
    const permissions = Object.entries(permMap)
      .filter(([, roles]) => (roles as string[]).includes(effectiveRole))
      .map(([perm]) => perm);

    let enterpriseAuthz = null;
    try {
      enterpriseAuthz = await enterpriseAuthzService.getUserAuthzPayload(dbUser.tenant_id, dbUser.user_id);
    } catch { /* enterprise tables may not exist yet */ }

    res.json({
      userId: dbUser.user_id,
      email: dbUser.email,
      name: dbUser.name || '',
      role: effectiveRole,
      tenantId: dbUser.tenant_id,
      orgName,
      permissions,
      teams,
      modules: ROLE_MODULES_MAP[effectiveRole] || ['dashboard'],
      defaultLandingPage: ROLE_LANDING_MAP[effectiveRole] || '/dashboard',
      dashboardWidgets: ROLE_WIDGETS_MAP[effectiveRole] || [],
      department: dbUser.department || '',
      onboardingComplete: dbUser.onboarding_complete ?? false,
      isSuperAdmin: dbUser.is_super_admin === true,
      enterpriseAuthz,
    });
  } catch (err) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Revoke current JWT and clear refresh token cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post("/logout", authenticate, async (req: Request, res: Response) => {
  try {
    clearRefreshTokenCookie(res);
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing token" });
      return;
    }

    const token = header.slice(7);
    const decoded = decodeTokenUnsafe(token);
    
    if (decoded?.jti) {
      // Calculate remaining TTL (exp - now)
      let ttlSeconds = 3600; // Default 1 hour if exp not available
      if (decoded.exp) {
        const now = Math.floor(Date.now() / 1000);
        ttlSeconds = Math.max(0, decoded.exp - now);
      }
      
      // Blacklist the token
      await blacklistToken(decoded.jti, ttlSeconds);

      const userId = req.user?.userId;
      if (userId) {
        await removeActiveJtiForUser(userId, decoded.jti).catch((e) =>
          logger.warn('[Auth] removeActiveJtiForUser failed', { error: toErrorMessage(e), userId }),
        );
      }

      // Audit logout
      const tenantId = req.user?.tenantId;
      if (userId && tenantId) {
        recordAudit({
          tenantId,
          userId,
          module: 'auth',
          action: 'logout',
          entityType: 'session',
          entityId: userId,
          ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
          afterState: { tokenRevoked: true }
        }).catch(err => logger.error('[Audit] auth logout:', toErrorMessage(err)));
      }
      
      res.json({ message: "Logged out successfully", tokenRevoked: true });
    } else {
      // Token doesn't have jti (old token format) — still return success
      res.json({ message: "Logged out successfully", tokenRevoked: false, note: "Token format does not support revocation" });
    }
  } catch (err) {
    logger.error('[Logout] Error during logout', { error: toErrorMessage(err) });
    // Still return success to avoid exposing errors
    res.json({ message: "Logged out successfully" });
  }
});

export default router;