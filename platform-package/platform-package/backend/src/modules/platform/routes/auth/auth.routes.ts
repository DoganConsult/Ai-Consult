// @ts-nocheck
/**
 * @deprecated This file's canonical home is platform/dauth/routes/auth.routes.ts (Law 2).
 * @owner DAuth
 * @removal-date 2026-09-30
 * @replacement platform/dauth/routes/auth.routes.ts
 * Import from 'platform/dauth/routes/auth.routes' instead.
 * Physical move blocked by 30+ test file path references — see DAuth routes JSDoc.
 */
import { Router, Request, Response } from "express";
import { asyncHandler } from '../../../../platform/dos/http/error-handling/async-handler';
import bcrypt from "bcryptjs";

import { query, safeQuery } from "../../../../config/database/database";
import { authenticate, generateAccessToken, generateRefreshToken, verifyRefreshToken, decodeTokenUnsafe, getAccessTokenExpirySeconds, setRefreshTokenCookie, clearRefreshTokenCookie, blacklistToken, registerActiveJtiForUser, removeActiveJtiForUser } from '../../../../platform/dauth';
import { authRateLimiter, rateLimiter } from "../../../../platform/dos/http/rate-limiting/rate-limiter";
import { validate } from '../../../../platform/dos/http/validation/validate';
import {
  checkLoginThrottle,
  recordFailedLogin,
  clearLoginFailures,
  recordSuccessfulLoginByEmail as recordSuccessfulLogin,
} from '../../../../platform/dauth/identity/login-protection.service';
import {
  requestPasswordReset as dauthRequestPasswordReset,
  completePasswordReset as dauthCompletePasswordReset,
  validateResetToken,
} from '../../../../platform/dauth/identity/credential-recovery.service';
import {
  createEmailChallenge,
  verifyEmailChallenge,
  verifyTotp,
  enableTotp,
} from '../../../../platform/dauth/mfa/mfa.service';
// Session persistence uses inline safeQuery to INSERT into sessions table
// because DAuth createSession() generates its own tokens (we already have ours).
// See platform/dauth/session/session.service.ts for the canonical session model.
import { getSecurityConfig } from "../../../admin/services/security-config.service";
import { errMsg } from "../../../../i18n/error-messages";
import { emitEvent } from '../../../../platform/dos/events/event-bus';
import { getProductName, getProductUrl } from '../../../../platform/dos/branding/product-identity';
import { recordAudit } from "../../../audit/services/audit/core/audit-trail.service";
import { accessSnapshotService } from '../../../../platform/dauth';
import { resolveUserRoles, resolveUserRole, emitLoginSuccess, emitLoginFailure, buildLoginResponse, completeMfaLogin, resolveLoginBootstrapData, issueLoginTokens, checkAccountStatus } from '../../../../platform/dauth/identity/auth-orchestrator.service';
import { logger } from '../../../../platform/dos/observability/services/logger.service';
import { toErrorMessage } from '../../../../errors/http-error.util';
import { getFirstRow } from '../../../../shared/data/db-utils';
import { swallow, EC  } from '../../../../platform/dos/resilience/resilient-catch';
import { detectReplayAttack, revokeRefreshFamily } from '../../../../platform/dauth/session/refresh.service';
import type { RoleLandingConfig } from '../../../../platform/products/product-registry';
import { generateCaptcha, verifyCaptcha } from '../../../../platform/dos/security/services/captcha.service';
import { registerBody, joinRegisterBody, loginBody, forgotPasswordBody, resetPasswordBody, mfaLoginVerifyBody, mfaEnableBody, mfaVerifyBody, changePasswordBody, refreshBody } from "../../schemas/platform.schemas";
import { SYSTEM_JOB_ACTOR, SYSTEM_TENANT } from '../../../../platform/dos/constants/system-actors';

const ROLE_LANDING_MAP: Record<string, string> = {};
const ROLE_MODULES_MAP: Record<string, string[]> = {};
const ROLE_WIDGETS_MAP: Record<string, string[]> = {};

export function registerRoleLandings(config: RoleLandingConfig): void {
  Object.assign(ROLE_LANDING_MAP, config.landingMap);
  Object.assign(ROLE_MODULES_MAP, config.modulesMap);
  Object.assign(ROLE_WIDGETS_MAP, config.widgetsMap);
}

// --- Zod Schemas ---
// Password policy: canonical definition from DAuth (single source of truth)
// const PASSWORD_RE = CANONICAL_PASSWORD_RE;
const router: Router = Router();

function __validateEmail(email: string): string | null {
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
const _registerRateLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 5, keyGenerator: (req) => (typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0].trim() : '') || req.ip || 'unknown', namespace: 'register' });
const _mfaLoginVerifyRateLimiter = rateLimiter({ windowMs: 10 * 60_000, maxRequests: 5, keyGenerator: (req) => String(req.body?.userId || req.ip || 'unknown'), namespace: 'mfa-login-verify' });
router.use((req, res, next) => {
  if (req.path === '/userinfo' && req.method === 'GET') return next();
  if (req.path === '/captcha' && req.method === 'GET') return next();
  if (req.path === '/member-onboarded') return next();
  if (req.path === '/register' && req.method === 'POST') return _registerRateLimiter(req, res, next);
  if (req.path === '/register/join' && req.method === 'POST') return _registerRateLimiter(req, res, next);
  return _authRateLimiterMiddleware(req, res, next);
});

/** @deprecated
 * @removal-date 2026-09-30
 * @owner DAuth
 * @replacement POST /api/onboarding/register (canonical registration endpoint)
 *
 * Thin proxy: rewrites body shape and delegates to the canonical onboarding register.
 * New integrations must use POST /api/onboarding/register directly.
 *
 * @swagger
 * /auth/register:
 *   post:
 *     summary: "[DEPRECATED] Register — delegates to POST /onboarding/register"
 *     deprecated: true
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
 *               password: { type: string, minLength: 8 }
 *               name: { type: string, minLength: 2 }
 *     responses:
 *       201:
 *         description: Registration successful
 *       400:
 *         description: Missing or invalid fields
 *       409:
 *         description: Email already registered
 */
router.post("/register", validate({ body: registerBody }), asyncHandler(async (req: Request, res: Response) => {
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', 'Wed, 30 Sep 2026 00:00:00 GMT');
  res.setHeader('Link', '</api/onboarding/register>; rel="successor-version"');
  const { email, password, name, companyName, consent } = req.body || {};
  req.body = {
    companyNameEn: companyName || `${name}'s Organization`,
    email,
    password,
    userName: name,
    consent,
  };
  const { onboardingRegister } = await import('../../../onboarding/controllers/onboarding-register.controller');
  return onboardingRegister(req, res);
}));

router.post("/register/join", validate({ body: joinRegisterBody }), asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name } = req.body || {};
  req.body = { email, password, userName: name };
  const { registerIdentityOnly } = await import('../../../onboarding/controllers/onboarding-register.controller');
  return registerIdentityOnly(req, res);
}));

router.get("/captcha", (_req: Request, res: Response) => {
  const { captchaId, svg } = generateCaptcha();
  res.json({ captchaId, svg });
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
 *         description: Account locked
 *       429:
 *         description: Rate limited
 */
router.post("/login", validate({ body: loginBody }), async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe = true } = req.body;

    // Check login throttle before attempting authentication
    const throttle = await checkLoginThrottle(email);
    if (!throttle.allowed) {
      const statusCode = throttle.locked ? 423 : 429;
      res.setHeader('Retry-After', String(throttle.retryAfterSeconds || 60));
      res.status(statusCode).json({
        error: throttle.locked
          ? errMsg('ACCOUNT_LOCKED', req)
          : errMsg('RATE_LIMIT_EXCEEDED', req),
        retryAfterSeconds: throttle.retryAfterSeconds,
        requireCaptcha: throttle.requireCaptcha,
        locked: throttle.locked,
      });
      return;
    }

    if (throttle.requireCaptcha) {
      const { captchaId, captchaCode } = req.body;
      if (!captchaId || !captchaCode) {
        res.status(400).json({ error: 'CAPTCHA verification required', requireCaptcha: true });
        return;
      }
      if (!verifyCaptcha(captchaId, captchaCode)) {
        res.status(400).json({ error: 'Invalid CAPTCHA code', requireCaptcha: true });
        return;
      }
    }

    const result = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1) ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC LIMIT 1", [email]);
    const user = getFirstRow(result);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      // Record failed login attempt only when user exists (anti-enumeration: never reveal whether account exists)
      if (user) {
        await recordFailedLogin(email, req.ip || undefined);
      }
      // Log 401 for debugging (request id only, no PII)
      const requestId = req.headers?.["x-correlation-id"] ?? "no-request-id";
      logger.warn("Login 401", { requestId });
      if (user) {
        recordAudit({ tenantId: user.tenant_id, userId: user.user_id, module: 'auth', action: 'login_failed', entityType: 'session', entityId: '', ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1', afterState: { reason: 'invalid_credentials' } }).catch(err => logger.error('[Audit] auth login_failed:', toErrorMessage(err)));
        emitLoginFailure(user.tenant_id, email, req.ip || '127.0.0.1', 'invalid_credentials').catch(() => {});
      }
      const postFailThrottle = await checkLoginThrottle(email).catch(() => null);
      res.status(401).json({ error: errMsg('INVALID_CREDENTIALS', req), requireCaptcha: postFailThrottle?.requireCaptcha ?? false });
      return;
    }

    const userStatus = (user.status || 'active').toLowerCase();
    if (userStatus === 'suspended') {
      res.status(403).json({ error: errMsg('ACCOUNT_SUSPENDED', req) || 'Account suspended. Contact your administrator.' });
      return;
    }
    if (userStatus === 'inactive' || userStatus === 'deactivated') {
      res.status(403).json({ error: errMsg('ACCOUNT_INACTIVE', req) || 'Account is no longer active.' });
      return;
    }

    if (user.must_change_password) {
      const tempToken = generateAccessToken({ userId: user.user_id, email, tenantId: user.tenant_id, role: user.role || 'user', role_code: user.role || 'user', mustChangePassword: true });
      const tempRefreshToken = generateRefreshToken(user.user_id, user.tenant_id);
      setRefreshTokenCookie(res, tempRefreshToken);
      res.status(200).json({
        mustChangePassword: true,
        token: tempToken,
        userId: user.user_id,
        tenantId: user.tenant_id,
        role: user.role || 'user',
        message: 'Password change required before access is granted.',
      });
      return;
    }

    try {
      await recordSuccessfulLogin(email, req.ip || undefined);
      await safeQuery("UPDATE users SET last_login_at = NOW(), login_count = COALESCE(login_count, 0) + 1 WHERE LOWER(email) = LOWER($1)", [email]);
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
        const { code } = await createEmailChallenge(user.user_id, user.tenant_id);
        // Send MFA code via email
        try {
          const { sendTemplatedEmail } = await import('../../../../platform/dos/notifications/email.service');
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
      swallow(EC.EVENT_BUS, emitEvent({ tenantId: user.tenant_id, userId: user.user_id, module: 'auth', event: 'created', entityType: 'mfa_challenge', entityId: '' }), { tenantId: user.tenant_id, operation: 'grcEvent:auth.mfa_challenge.created' });
      recordAudit({ tenantId: user.tenant_id, userId: user.user_id, module: 'auth', action: 'login', entityType: 'mfa_challenge', entityId: user.user_id, ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1', afterState: { mfaRequired: true, mfaType: mfaRecord.mfa_type } }).catch(err => logger.error('[Audit] auth login+mfa:', toErrorMessage(err)));
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

    await clearLoginFailures(email);

    const allRoles = await resolveUserRoles(user.user_id, user.tenant_id, user.role);
    const effectiveRole = allRoles[0] || user.role;
    const { orgName, tenantMemberships, enterpriseAuthz, sessionId } =
      await resolveLoginBootstrapData(user.tenant_id, user.user_id, user.onboarding_complete);
    const tokens = await issueLoginTokens(user, effectiveRole, rememberMe !== false, req.ip || req.socket.remoteAddress || '127.0.0.1', req.headers['user-agent'] || '');
    const sessionIdleTimeoutMinutes = await getSecurityConfig<number>(user.tenant_id, 'session_idle_timeout_minutes', 30);
    recordAudit({ tenantId: user.tenant_id, userId: user.user_id, module: 'auth', action: 'login', entityType: 'session', entityId: user.user_id, ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1', afterState: { role: effectiveRole, roles: allRoles } }).catch(err => logger.error('[Audit] auth login:', toErrorMessage(err)));
    emitLoginSuccess(user.tenant_id, user.user_id, req.ip || '127.0.0.1', false).catch(() => {});
    setRefreshTokenCookie(res, tokens.refreshToken, rememberMe !== false);
    res.json(buildLoginResponse(user, tokens.accessToken, allRoles, effectiveRole, enterpriseAuthz, sessionId, orgName, tenantMemberships, sessionIdleTimeoutMinutes));
  } catch (err) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

/** @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Reset email sent
 */
const forgotPwdLimiter = rateLimiter({ namespace: 'forgot-pwd', maxRequests: 5, windowMs: 15 * 60_000, keyGenerator: (req) => { const ip = (req.headers['cf-connecting-ip'] as string) || (typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0].trim() : '') || req.ip || 'any'; return ip; } });
router.post("/forgot-password", forgotPwdLimiter, validate({ body: forgotPasswordBody }), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: errMsg('REQUIRED_FIELD', req) });
      return;
    }

    // Check if user exists — always return same response to prevent email enumeration
    const userResult = await safeQuery("SELECT user_id, name, tenant_id FROM users WHERE LOWER(email) = LOWER($1)", [email]);
    if (userResult.rows.length === 0) {
      res.json({
        sent: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      });
      return;
    }
    const userRow = getFirstRow(userResult);
    const userName = userRow?.name || 'User';
    const userTenantId = userRow?.tenant_id ;

    // Use canonical DAuth credential-recovery service (Law 1)
    const resetResult = await dauthRequestPasswordReset(email, userTenantId);
    if (!resetResult) {
      // Anti-enumeration: same response regardless
      res.json({ sent: true, message: "If an account with that email exists, a password reset link has been sent." });
      return;
    }
    const { token, __expiresAt } = resetResult;

    // Import email service
    const { sendTemplatedEmail } = await import('../../../../platform/dos/notifications/email.service');

    // Prepare reset link
    const resetLink = `${getProductUrl()}/reset-password?token=${token}`;

    // Send email with reset link
    const emailResult = await sendTemplatedEmail(
      email,
      'notification',
      {
        recipientName: userName,
        title: 'Password Reset Request',
        body: `You requested a password reset for your ${getProductName()} account.<br><br>Click the button below to reset your password. This link will expire in 30 minutes.`,
        ctaLabel: 'Reset Password',
        ctaUrl: resetLink,
        footerNote: 'If you did not request this reset, please ignore this email. Your password will remain unchanged.',
        language: 'en'
      }
    );

    if (emailResult.success) {
      swallow(EC.EVENT_BUS, emitEvent({ tenantId: SYSTEM_TENANT, userId: SYSTEM_JOB_ACTOR, module: 'auth', event: 'created', entityType: 'password_reset', entityId: '' }), { tenantId: SYSTEM_TENANT, operation: 'grcEvent:auth.password_reset.created' });
      // Audit: user found, so we have tenant context
      const forgotUser = await safeQuery("SELECT user_id, tenant_id FROM users WHERE LOWER(email) = LOWER($1)", [email]);
      if (getFirstRow(forgotUser)) {
        recordAudit({ tenantId: getFirstRow(forgotUser)?.tenant_id, userId: getFirstRow(forgotUser)?.user_id, module: 'auth', action: 'forgot_password', entityType: 'password_reset', entityId: '', ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1', afterState: { sent: true } }).catch(err => logger.error('[Audit] auth forgot_password:', toErrorMessage(err)));
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

/** @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Complete password reset with token
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
const resetPwdLimiter = rateLimiter({ namespace: 'reset-pwd', maxRequests: 10, windowMs: 15 * 60_000, keyGenerator: (req) => { const ip = (req.headers['cf-connecting-ip'] as string) || (typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0].trim() : '') || req.ip || 'any'; return ip; } });
router.post("/reset-password", resetPwdLimiter, validate({ body: resetPasswordBody }), async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
      return;
    }

    // Validate token first to get user context for audit
    const tokenInfo = await validateResetToken(token);
    if (!tokenInfo) {
      res.status(400).json({ error: errMsg('INVALID_TOKEN', req) || 'Invalid or expired reset token' });
      return;
    }

    // Hash password before passing to DAuth (Law 3: canonical service expects hash)
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    const success = await dauthCompletePasswordReset(token, newPasswordHash);
    if (!success) {
      res.status(400).json({ error: errMsg('PASSWORD_RESET_EXPIRED', req) || 'Reset token expired or already used' });
      return;
    }

    swallow(EC.EVENT_BUS, emitEvent({ tenantId: tokenInfo.tenantId, userId: tokenInfo.userId, module: 'auth', event: 'created', entityType: 'password_reset', entityId: tokenInfo.userId }), { tenantId: tokenInfo.tenantId, operation: 'grcEvent:auth.password_reset.created' });
    recordAudit({ tenantId: tokenInfo.tenantId, userId: tokenInfo.userId, module: 'auth', action: 'reset_password', entityType: 'password_reset', entityId: tokenInfo.userId, ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1' }).catch(err => logger.error('[Audit] auth reset_password:', toErrorMessage(err)));
    res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    logger.error('[Reset Password] Error:', toErrorMessage(err));
    const msg: string = (err as Error)?.message || '';
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

/** @swagger
 * /auth/mfa/login-verify:
 *   post:
 *     summary: Verify MFA code to complete login
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: MFA verified, JWT token returned
 *       401:
 *         description: Invalid MFA code
 */
router.post("/mfa/login-verify", _mfaLoginVerifyRateLimiter, validate({ body: mfaLoginVerifyBody }), async (req: Request, res: Response) => {
  try {
    const { userId, code, mfaType, rememberMe = true } = req.body;
    if (!userId || !code) {
      res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
      return;
    }

    let valid: boolean | { error: string };
    if (mfaType === 'email') {
      valid = await verifyEmailChallenge(userId, code);
    } else {
      valid = await verifyTotp(userId, code);
    }

    if (typeof valid === 'object' && valid.error) {
      res.status(429).json({ error: valid.error });
      return;
    }
    if (!valid) {
      res.status(401).json({ error: errMsg('INVALID_MFA_CODE', req) });
      return;
    }

    const mfaResult = await completeMfaLogin(userId, rememberMe !== false, req.ip || req.socket.remoteAddress || '127.0.0.1', req.headers['user-agent'] || '');
    if (!mfaResult) {
      res.status(404).json({ error: errMsg('NOT_FOUND', req) });
      return;
    }
    const { user, tokens, allRoles, effectiveRole, orgName, tenantMemberships, enterpriseAuthz, sessionId } = mfaResult;
    const blocked = checkAccountStatus(user.status);
    if (blocked === 'suspended') {
      res.status(403).json({ error: errMsg('ACCOUNT_SUSPENDED', req) || 'Account suspended. Contact your administrator.' });
      return;
    }
    if (blocked === 'inactive') {
      res.status(403).json({ error: errMsg('ACCOUNT_INACTIVE', req) || 'Account is no longer active.' });
      return;
    }
    await clearLoginFailures(user.email).catch(() => {});
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: user.tenant_id, userId: user.user_id, module: 'auth', event: 'created', entityType: 'mfa_challenge', entityId: '' }), { tenantId: user.tenant_id, operation: 'grcEvent:auth.mfa_challenge.created' });
    recordAudit({ tenantId: user.tenant_id, userId: user.user_id, module: 'auth', action: 'mfa_verify', entityType: 'mfa_challenge', entityId: user.user_id, ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1', afterState: { mfaType: mfaType || 'totp', role: effectiveRole } }).catch(err => logger.error('[Audit] auth mfa_verify:', toErrorMessage(err)));
    emitLoginSuccess(user.tenant_id, user.user_id, req.ip || '127.0.0.1', true).catch(() => {});
    setRefreshTokenCookie(res, tokens.refreshToken, rememberMe !== false);
    res.json(buildLoginResponse(user, tokens.accessToken, allRoles, effectiveRole, enterpriseAuthz, sessionId, orgName, tenantMemberships));
  } catch (err) {
    res.status(403).json({ error: toErrorMessage(err) });
  }
});

/** @swagger
 * /auth/mfa/resend:
 *   post:
 *     summary: Resend MFA code without re-authenticating
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: MFA code resent
 *       429:
 *         description: Rate limited
 */
router.post("/mfa/resend", _mfaLoginVerifyRateLimiter, async (req: Request, res: Response) => {
  try {
    const { userId, mfaType } = req.body;
    if (!userId) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
    if (mfaType !== 'email') { res.json({ resent: true }); return; }
    const { code } = await createEmailChallenge(userId, req.tenantId || '');
    const userRow = getFirstRow(await safeQuery("SELECT email, name FROM users WHERE user_id = $1", [userId]));
    if (userRow?.email) {
      try {
        const { sendTemplatedEmail } = await import('../../../../platform/dos/notifications/email.service');
        await sendTemplatedEmail(userRow.email, 'notification', {
          recipientName: userRow.name || 'User',
          title: 'Login Verification Code',
          body: `Your login verification code is: <strong style="font-size:24px;letter-spacing:4px">${code}</strong><br><br>This code expires in 10 minutes.`,
          language: 'en'
        });
      } catch (emailErr: unknown) {
        logger.error('[MFA Resend] Failed to send email:', toErrorMessage(emailErr));
      }
    }
    res.json({ resent: true });
  } catch (err) {
    logger.error('[MFA Resend] Error:', toErrorMessage(err));
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

/** @swagger
 * /auth/mfa/enable:
 *   post:
 *     summary: Enable MFA for the authenticated user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: MFA setup initiated
 */
router.post("/mfa/enable", authenticate, validate({ body: mfaEnableBody }), async (req: Request, res: Response) => {
  try {
    const userId = req.user.userId!;
    const tenantId = req.user.tenantId!;
    const { type } = req.body; // 'totp' or 'email'

    if (type === "email") {
      const { code } = await createEmailChallenge(userId!, tenantId);

      // Look up user email to send the MFA code
      const userRow = getFirstRow(await safeQuery("SELECT email, name FROM users WHERE user_id = $1", [userId]));
      if (userRow?.email) {
        try {
          const { sendTemplatedEmail } = await import('../../../../platform/dos/notifications/email.service');
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

      swallow(EC.EVENT_BUS, emitEvent({ tenantId: tenantId!, userId: userId!, module: 'auth', event: 'created', entityType: 'mfa_challenge', entityId: '' }), { tenantId: tenantId, operation: 'grcEvent:auth.mfa_challenge.created' });
      recordAudit({ tenantId: tenantId!, userId: userId!, module: 'auth', action: 'mfa_enable', entityType: 'security', entityId: userId!, ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1', afterState: { mfaType: 'email' } }).catch(err => logger.error('[Audit] auth mfa_enable:', toErrorMessage(err)));
      res.json({ message: "Email MFA code sent. Please check your inbox." });
    } else {
      // Default to TOTP — NEVER store secret or qrCodeUri in audit
      const { __secret, qrCodeUrl } = await enableTotp(userId!, tenantId);
      recordAudit({ tenantId: tenantId!, userId: userId!, module: 'auth', action: 'mfa_enable', entityType: 'security', entityId: userId!, ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1', afterState: { mfaType: 'totp' } }).catch(err => logger.error('[Audit] auth mfa_enable:', toErrorMessage(err)));
      res.json({ qrCodeUri: qrCodeUrl });
    }
  } catch (err) {
    logger.error('[MFA Enable] Error:', toErrorMessage(err));
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

/** @swagger
 * /auth/mfa/verify:
 *   post:
 *     summary: Verify MFA code to confirm enrollment
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: MFA verified and enabled
 */
router.post("/mfa/verify", authenticate, validate({ body: mfaVerifyBody }), async (req: Request, res: Response) => {
  try {
    const userId = req.user.userId!;
    const tenantId = req.user.tenantId!;
    const { code, type } = req.body;

    if (!code) {
      res.status(400).json({ error: errMsg('REQUIRED_FIELD', req) });
      return;
    }

    let valid: boolean | { error: string };
    if (type === "email") {
      valid = await verifyEmailChallenge(userId!, code);
    } else {
      valid = await verifyTotp(userId!, code, tenantId);
    }

    if (typeof valid === 'object' && valid.error) {
      res.status(429).json({ error: valid.error });
      return;
    }
    if (valid) {
      swallow(EC.EVENT_BUS, emitEvent({ tenantId: tenantId!, userId: userId!, module: 'auth', event: 'created', entityType: 'mfa_challenge', entityId: '' }), { tenantId: tenantId, operation: 'grcEvent:auth.mfa_challenge.created' });
      recordAudit({ tenantId: tenantId!, userId: userId!, module: 'auth', action: 'mfa_confirm', entityType: 'security', entityId: userId!, ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1', afterState: { mfaType: type || 'totp', verified: true } }).catch(err => logger.error('[Audit] auth mfa_confirm:', toErrorMessage(err)));
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

/** @swagger
 * /auth/mfa/disable:
 *   post:
 *     summary: Disable MFA for the authenticated user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: MFA disabled
 */
router.post("/mfa/disable", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user.userId!;
    const tenantId = req.user.tenantId!;

    await safeQuery(`DELETE FROM user_mfa WHERE user_id = $1`, [userId]);

    recordAudit({
      tenantId, userId, module: 'auth', action: 'mfa_disable',
      entityType: 'security', entityId: userId,
      ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
      afterState: { mfaDisabled: true },
    }).catch(err => logger.error('[Audit] auth mfa_disable:', toErrorMessage(err)));

    res.json({ disabled: true });
  } catch (err) {
    logger.error('[MFA Disable] Error:', toErrorMessage(err));
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

/** @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change the authenticated user's password
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Password changed
 *       401:
 *         description: Current password incorrect
 */
router.post("/change-password", authenticate, validate({ body: changePasswordBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;
    const userId = req.user?.userId || req.userId;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
    const minLen = await getSecurityConfig<number>(tenantId!, 'password_min_length', 8);
    if (newPassword.length < minLen) return res.status(400).json({ error: errMsg('WEAK_PASSWORD', req) });
    if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword)) {
      return res.status(400).json({ error: errMsg('WEAK_PASSWORD', req) });
    }
    const { query: dbQuery } = await import("../../../config/database/database");
    const userRes = await dbQuery(`SELECT password_hash FROM users WHERE user_id = $1`, [userId]);
    if (!userRes.rows.length) return res.status(404).json({ error: errMsg('NOT_FOUND', req) });
    const bcrypt = await import("bcryptjs");
    const valid = await bcrypt.compare(currentPassword, getFirstRow(userRes)?.password_hash);
    if (!valid) return res.status(401).json({ error: errMsg('INVALID_CREDENTIALS', req) });
    const rounds = await getSecurityConfig<number>(tenantId!, 'bcrypt_rounds', 12);
    const hash = await bcrypt.hash(newPassword, rounds);
    await dbQuery(`UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE user_id = $2`, [hash, userId]);
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: tenantId , userId: userId, module: 'auth', event: 'created', entityType: 'password_reset', entityId: '' }), { tenantId: tenantId, operation: 'grcEvent:auth.password_reset.created' });
    recordAudit({ tenantId: tenantId!, userId: userId!, module: 'auth', action: 'change_password', entityType: 'security', entityId: userId!, ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1' }).catch(err => logger.error('[Audit] auth change_password:', toErrorMessage(err)));
    const userRow = await dbQuery(`SELECT role, email FROM users WHERE user_id = $1`, [userId]);
    const u = getFirstRow(userRow);
    const newToken = generateAccessToken({ userId: userId!, email: u?.email || req.user?.email || '', tenantId: tenantId!, role: u?.role || req.user?.role || 'user', role_code: u?.role || req.user?.role_code || 'user' });
    const newRefreshToken = generateRefreshToken(userId!, tenantId!);
    setRefreshTokenCookie(res, newRefreshToken);
    res.json({ success: true, token: newToken });
  } catch (err) {
    logger.error('[Change Password] Error:', toErrorMessage(err));
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

/** @swagger
 * /auth/userinfo:
 *   get:
 *     summary: Get authenticated user profile and workspace context
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User profile with role, tenant info, onboarding status
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/userinfo", authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user;

    // Check if user exists in GRC DB
    let result = await safeQuery(
      "SELECT onboarding_complete, name, is_super_admin, tenant_id FROM users WHERE user_id = $1",
      [user.userId!]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Identity not found. Complete registration or contact your administrator.' });
      return;
    }

    const dbUser = getFirstRow(result);

    const userinfoStatus = await safeQuery("SELECT status FROM users WHERE user_id = $1", [user.userId!]);
    const uiStatus = (getFirstRow(userinfoStatus)?.status || 'active').toLowerCase();
    if (uiStatus === 'suspended') {
      res.status(403).json({ error: errMsg('ACCOUNT_SUSPENDED', req) || 'Account suspended.' });
      return;
    }
    if (uiStatus === 'inactive' || uiStatus === 'deactivated') {
      res.status(403).json({ error: errMsg('ACCOUNT_INACTIVE', req) || 'Account is no longer active.' });
      return;
    }

    let orgName = '';
    try {
      const tenantResult = await safeQuery("SELECT org_name FROM tenants WHERE tenant_id = $1", [user.tenantId!]);
      orgName = getFirstRow(tenantResult)?.org_name || '';
    } catch { /* fallback */ }

    const allRoles = await resolveUserRoles(user.userId!, user.tenantId!, user.role!);
    const effectiveRole = allRoles[0] || user.role!;

    let enterpriseAuthz = null;
    try {
      enterpriseAuthz = await accessSnapshotService.getUserAuthzPayload(user.tenantId!, user.userId!);
      if (!enterpriseAuthz || (!enterpriseAuthz.permissions.length && !enterpriseAuthz.accessProfiles.length)) {
        await accessSnapshotService.provisionFromLegacyRole(user.tenantId!, user.userId!, effectiveRole, user.userId!);
        enterpriseAuthz = await accessSnapshotService.getUserAuthzPayload(user.tenantId!, user.userId!);
      }
    } catch { /* enterprise tables may not exist yet */ }

    let mfaEnabled = false;
    try {
      const mfaCheck = await safeQuery(`SELECT 1 FROM user_mfa WHERE user_id = $1 AND enabled = TRUE LIMIT 1`, [user.userId!]);
      mfaEnabled = (mfaCheck?.rows?.length ?? 0) > 0;
    } catch { /* user_mfa table may not exist */ }

    res.json({
      ...user,
      role: effectiveRole,
      roles: allRoles,
      /** @deprecated @removal-date Phase 2 (DAuth access core) @owner DAuth */
      onboardingComplete: dbUser?.onboarding_complete ?? false,
      userName: dbUser?.name || '',
      orgName,
      isSuperAdmin: dbUser?.is_super_admin === true,
      mfaEnabled,
      enterpriseAuthz,
    });
  } catch (err) {
    logger.error('[UserInfo] Error:', toErrorMessage(err));
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.get("/member-onboarded", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || req.userId;
    if (!userId) { res.status(401).json({ error: errMsg('UNAUTHORIZED', req) }); return; }
    const result = await safeQuery("SELECT member_onboarded FROM users WHERE user_id = $1", [userId]);
    res.json({ onboarded: getFirstRow(result)?.member_onboarded ?? false });
  } catch (err) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.post("/member-onboarded", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || req.userId;
    if (!userId) { res.status(401).json({ error: errMsg('UNAUTHORIZED', req) }); return; }
    await safeQuery("UPDATE users SET member_onboarded = TRUE WHERE user_id = $1", [userId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

/** @swagger
 * /auth/refresh:
 *   post:
 *     summary: Exchange refresh token for new access and refresh tokens
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: New token pair issued
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post("/refresh", validate({ body: refreshBody }), async (req: Request, res: Response) => {
  try {
    // Prefer httpOnly cookie; fall back to body for mobile clients
    const refreshToken = req.cookies?.dauth_rt || req.body.refreshToken;
    if (!refreshToken) {
      res.status(400).json({ error: errMsg('REQUIRED_FIELD', req) });
      return;
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      res.status(401).json({ error: errMsg('INVALID_REFRESH_TOKEN', req) });
      return;
    }

    // Refresh token replay detection (token family rotation)
    if (payload.jti) {
      try {
        const familyRow = await safeQuery(
          `SELECT family_id FROM refresh_token_families
           WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
           ORDER BY created_at DESC LIMIT 1`,
          [payload.userId],
        );
        if (familyRow.rows.length > 0) {
          const familyId = familyRow.rows[0].family_id as string;
          const isReplay = await detectReplayAttack(familyId, payload.jti);
          if (isReplay) {
            logger.warn('[Auth] Refresh token replay detected — revoking family', { familyId, userId: payload.userId });
            await revokeRefreshFamily(familyId);
            clearRefreshTokenCookie(res);
            res.status(401).json({ error: 'Refresh token replay detected. Please log in again.' });
            return;
          }
        }
      } catch (e) {
        logger.warn('[Auth] Refresh replay detection check failed (non-blocking)', { error: toErrorMessage(e) });
      }
    }

    if (payload.jti) {
      // Blacklist the old refresh token JTI
      await blacklistToken(payload.jti, 7 * 24 * 60 * 60).catch((e) =>
        logger.warn('[Auth] Failed to blacklist old refresh token jti', { error: toErrorMessage(e) })
      );
      // Also blacklist the associated access token JTI via session table (P1-4: prevent access token replay)
      try {
        const sessionRow = await safeQuery(
          'SELECT jti FROM sessions WHERE refresh_jti = $1 AND revoked_at IS NULL LIMIT 1',
          [payload.jti]
        );
        if (sessionRow.rows.length > 0) {
          const oldAccessJti = sessionRow.rows[0].jti as string;
          await blacklistToken(oldAccessJti, getAccessTokenExpirySeconds()).catch((e) =>
            logger.warn('[Auth] Failed to blacklist old access token jti on refresh', { error: toErrorMessage(e) })
          );
        }
      } catch (e) {
        logger.warn('[Auth] Could not look up session to blacklist old access JTI', { error: toErrorMessage(e) });
      }
    }

    // Re-fetch user from DB to get current role/status (may have changed)
    const result = await safeQuery(
      "SELECT user_id, email, tenant_id, role, name, status, onboarding_complete, is_super_admin FROM users WHERE user_id = $1",
      [payload.userId]
    );
    if (result.rows.length === 0) {
      res.status(401).json({ error: errMsg('NOT_FOUND', req) });
      return;
    }

    const user = getFirstRow(result);

    const refreshUserStatus = (user.status || 'active').toLowerCase();
    if (refreshUserStatus === 'suspended') {
      res.status(403).json({ error: errMsg('ACCOUNT_SUSPENDED', req) || 'Account suspended. Contact your administrator.' });
      return;
    }
    if (refreshUserStatus === 'inactive' || refreshUserStatus === 'deactivated') {
      res.status(403).json({ error: errMsg('ACCOUNT_INACTIVE', req) || 'Account is no longer active.' });
      return;
    }

    const allRoles = await resolveUserRoles(user.user_id, user.tenant_id, user.role);
    const effectiveRole = allRoles[0] || user.role;
    let orgName = '';
    try {
      const tenantResult = await safeQuery("SELECT org_name, status FROM tenants WHERE tenant_id = $1", [user.tenant_id]);
      const tenant = getFirstRow(tenantResult);
      orgName = tenant?.org_name || '';
      const tenantStatus = (tenant?.status || '').toLowerCase();
      if (tenantStatus === 'suspended' || tenantStatus === 'deprovisioned') {
        clearRefreshTokenCookie(res);
        res.status(403).json({ error: 'Tenant is ' + tenantStatus + '. Contact your administrator.' });
        return;
      }
    } catch { /* fallback */ }

    let enterpriseAuthz = null;
    try {
      enterpriseAuthz = await accessSnapshotService.getUserAuthzPayload(user.tenant_id, user.user_id);
    } catch { /* enterprise tables may not exist yet */ }

    const newToken = generateAccessToken({
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

    const sessionIdleTimeoutMinutes = await getSecurityConfig<number>(user.tenant_id, 'session_idle_timeout_minutes', 30);
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: user.tenant_id, userId: user.user_id, module: 'auth', event: 'created', entityType: 'session', entityId: '' }), { tenantId: user.tenant_id, operation: 'grcEvent:auth.session.created' });
    recordAudit({ tenantId: user.tenant_id, userId: user.user_id, module: 'auth', action: 'token_refresh', entityType: 'session', entityId: user.user_id, ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1' }).catch(err => logger.error('[Audit] auth token_refresh:', toErrorMessage(err)));
    setRefreshTokenCookie(res, newRefreshToken);
    res.json({
      token: newToken,
      userId: user.user_id,
      tenantId: user.tenant_id,
      role: effectiveRole,
      roles: allRoles,
      onboardingComplete: user.onboarding_complete, // @deprecated @removal-date Phase 2 (DAuth access core) @owner DAuth @replacement /api/me/access-snapshot canonical profile completeness
      orgName,
      userName: user.name || '',
      isSuperAdmin: user.is_super_admin === true,
      enterpriseAuthz,
      sessionIdleTimeoutMinutes,
    });
  } catch (err) {
    logger.error('[Refresh] Error:', toErrorMessage(err));
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.get("/context", authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const result = await safeQuery(
      "SELECT user_id, email, name, tenant_id, role, onboarding_complete, is_super_admin, department FROM users WHERE user_id = $1",
      [user.userId!]
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

    let teams: unknown[] = [];
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

    // Law 2: Permissions are DB-driven. Static PERMS map removed.
    const permMap: Record<string, string[]> = {};
    const permissions = Object.entries(permMap)
      .filter(([, roles]) => (roles as string[]).includes(effectiveRole))
      .map(([perm]) => perm);

    let enterpriseAuthz = null;
    try {
      enterpriseAuthz = await accessSnapshotService.getUserAuthzPayload(dbUser.tenant_id, dbUser.user_id);
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
      modules: [], // @deprecated @removal-date Phase 2 (DAuth access core) @owner DAuth @replacement /api/me/bootstrap navigation.visibleModules
      defaultLandingPage: '/workspace-home', // @deprecated @removal-date Phase 2 (DAuth access core) @owner DAuth @replacement /api/me/bootstrap landing page
      dashboardWidgets: [], // @deprecated @removal-date Phase 2 (DAuth access core) @owner DAuth @replacement /api/me/bootstrap navigation.dashboardWidgets
      _moduleAuthority: 'bootstrap',
      department: dbUser.department || '',
      onboardingComplete: dbUser.onboarding_complete ?? false, // @deprecated @removal-date Phase 2 (DAuth access core) @owner DAuth @replacement /api/me/access-snapshot canonical profile completeness
      isSuperAdmin: dbUser.is_super_admin === true,
      enterpriseAuthz,
    });
  } catch (err) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

/** @swagger
 * /auth/logout:
 *   post:
 *     summary: Revoke current JWT and clear refresh token
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
