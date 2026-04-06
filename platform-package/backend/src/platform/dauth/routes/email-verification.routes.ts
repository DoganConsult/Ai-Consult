// @ts-nocheck
import { recordAudit } from '../../../modules/audit/services/audit/core/audit-trail.service';
import { logger } from '../../dos/observability/logger.service';
import { Router, Request, Response } from 'express';
import { verifyEmail, resendVerification } from '../../../modules/platform/services/email/email-verification.service';
import { authenticate } from '..';
import { emitEvent } from '../../dos/events/event-bus';
import { auditMiddleware } from '../../dos/http/middleware/audit';
import { safeQuery } from '../../../config/database/database';
import { getFirstRow } from '../../../shared/data/db-utils';
import { sendTemplatedEmail } from '../../dos/notifications/email.service';
import { toErrorMessage } from '../../../errors/http-error.util';
import { swallow, EC } from '../../dos/resilience/resilient-catch';
import { getProductUrl, getProductName } from '../../dos/branding/product-identity';

const router = Router();
router.use(auditMiddleware('admin'));

/**
 * Sends a verification email with a link containing the token.
 * If SMTP is not configured (SMTP_HOST unset and no OAuth2), logs the token
 * to the console for development/testing but never exposes it in the API response.
 */
async function sendVerificationEmail(
  email: string,
  userName: string,
  token: string
): Promise<void> {
  const verifyUrl = `${getProductUrl()}/verify-email?token=${token}`;

  const result = await sendTemplatedEmail(
    email,
    'welcome',
    {
      recipientName: userName || 'User',
      title: 'Verify Your Email Address',
      body: `Please verify your email address to activate your ${getProductName()} account.<br><br>Click the button below to verify. This link expires in 24 hours.`,
      ctaLabel: 'Verify Email',
      ctaUrl: verifyUrl,
      footerNote: 'If you did not create an account, please ignore this email.',
      language: 'en'
    }
  );

  if (!result.success) {
    logger.error('[EmailVerification] Failed to send verification email:', result.error);
    // In dev/test without SMTP, log the verification URL so developers can proceed
    if (!process.env.SMTP_HOST) {
      logger.info('[EmailVerification][DEV] Verification URL:', verifyUrl);
    }
  }
}

// GET /api/auth/verify-email?token=xxx — verify email address (public, no auth)
router.get('/verify-email', async (req: Request, res: Response) => {
  try {
    const token = String(req.query.token || '');
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const result = await verifyEmail(token);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Audit: email verified
    if (result.userId) {
      const userRow = getFirstRow(await safeQuery('SELECT tenant_id FROM users WHERE user_id = $1', [result.userId]));
      if (userRow?.tenant_id) recordAudit({
        tenantId: userRow.tenant_id,
        userId: result.userId,
        module: 'auth',
        action: 'email_verified',
        entityType: 'email_verification',
        entityId: result.userId,
        ipAddress: req.ip || req.socket?.remoteAddress || '127.0.0.1',
      }).catch(err => logger.error('[Audit] email_verified:', toErrorMessage(err)));
    }

    return res.json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
      userId: result.userId,
    });
  } catch (err) {
    logger.error('[EmailVerification] verify-email error:', err);
    return res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /api/auth/resend-verification — resend verification email (auth required)
router.post('/resend-verification', auditMiddleware('platform.email_verification.create'), authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || '';
    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    const token = await resendVerification(userId);

    // Look up user email and name to send the verification email
    const userRow = getFirstRow(
      await safeQuery("SELECT email, name FROM users WHERE user_id = $1", [userId])
    );

    if (userRow?.email) {
      try {
        await sendVerificationEmail(userRow.email, userRow.name || 'User', token);
      } catch (emailErr: unknown) {
        logger.error('[EmailVerification] Send failed:', toErrorMessage(emailErr));
      }
    } else {
      logger.error('[EmailVerification] No email found for user:', userId);
    }

    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'admin', event: 'created', entityType: 'email_verification', entityId: req.params?.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.email_verification.created' });

    // Never expose the token in the response — the user must check their inbox
    return res.json({
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    });
  } catch (err) {
    logger.error('[EmailVerification] resend-verification error:', err);
    return res.status(500).json({ error: 'Failed to resend verification' });
  }
});

export default router;
