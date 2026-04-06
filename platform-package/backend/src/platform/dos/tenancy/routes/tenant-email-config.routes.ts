// @ts-nocheck
import { validate } from '../../http/validation/validate';
import { Router, Request, Response } from 'express';
import { authenticate } from '../../../dauth';
import { requirePermission } from '../../../dauth';
import { auditMiddleware, setAuditData } from '../../http/middleware/audit';
import { automationMiddleware } from '../../http/middleware/automation';
import { platformApprovalRequestPostBody, testPostBody, rootPutBody, sendTestPostBody, platformApprovalReviewPostBody } from '../../../../modules/platform/schemas/platform.schemas';
import { getProductName } from '../../branding/product-identity';
import { testPostBody, platformApprovalRequestPostBody, sendTestPostBody, rootPutBody, platformApprovalReviewPostBody } from '../../../../modules/platform/schemas/platform.schemas';
import { getProductName } from '../../branding/product-identity';
import {
  getTenantEmailConfig,
  upsertTenantEmailConfig,
  testTenantEmailConfig,
  sendTenantEmail,
  getPlatformEmailApproval,
  requestPlatformEmail,
  listPlatformEmailApprovals,
  reviewPlatformEmailApproval,
} from '../../../../modules/platform/services/tenant/tenant-email-config.service';
import { renderEmailTemplate } from '../../notifications/email.service';
import { emitEvent } from '../../events/event-bus';
import { toErrorMessage } from '../../../../errors/http-error.util';
import { swallow, EC } from '../../resilience/resilient-catch';

// ── Zod Schemas ──────────────────────────────────────────────────────────
const router = Router();
router.use(auditMiddleware('tenant-email-config'));
router.use(automationMiddleware('tenant-email-config'));

router.get('/', authenticate, requirePermission('tenant.config.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const config = await getTenantEmailConfig(tenantId);
    res.json({ config, configured: !!config?.enabled });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.put('/', auditMiddleware('platform.tenant_email_config.update'), authenticate, requirePermission('tenant.config.write'), validate({ body: rootPutBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user!.userId;
    const config = await upsertTenantEmailConfig(tenantId, {
      ...req.body,
      configuredBy: userId,
    });
    setAuditData(res, { action: 'update', entityType: 'tenant_email_config', entityId: config.configId, afterState: { provider: config.provider, enabled: config.enabled } });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'admin', event: 'updated', entityType: 'tenant_email_config', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.tenant_email_config.updated' });
    res.json(config);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.post('/test', auditMiddleware('platform.tenant_email_config.create'), authenticate, requirePermission('tenant.config.write'), validate({ body: testPostBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const result = await testTenantEmailConfig(tenantId);
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'admin', event: 'created', entityType: 'tenant_email_config', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.tenant_email_config.created' });
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.post('/send-test', auditMiddleware('platform.tenant_email_config.create'), authenticate, requirePermission('tenant.config.write'), validate({ body: sendTestPostBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const { to } = req.body;
    if (!to) {
      res.status(400).json({ error: 'to (email) is required' });
      return;
    }
    const html = renderEmailTemplate('notification', {
      title: `Test Email from ${getProductName()}`,
      body: 'This is a test email to verify your tenant email configuration is working correctly.',
      language: 'en',
    });
    const result = await sendTenantEmail(tenantId, to, `[${getProductName()}] Test Email`, html);
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'admin', event: 'created', entityType: 'tenant_email_config', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.tenant_email_config.created' });
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/platform-approval', authenticate, requirePermission('tenant.config.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const approval = await getPlatformEmailApproval(tenantId);
    res.json({ approval });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.post('/platform-approval/request', auditMiddleware('platform.tenant_email_config.create'), authenticate, requirePermission('tenant.config.write'), validate({ body: platformApprovalRequestPostBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user!.userId as string;
    const approval = await requestPlatformEmail(tenantId, userId);
    setAuditData(res, { action: 'create', entityType: 'platform_email_approval', entityId: approval.approvalId, afterState: { status: approval.status } });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'admin', event: 'created', entityType: 'tenant_email_config', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.tenant_email_config.created' });
    res.json(approval);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/platform-approval/list', authenticate, requirePermission('platform.system.admin'), async (req: Request, res: Response) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const approvals = await listPlatformEmailApprovals(statusFilter);
    res.json({ approvals, count: approvals.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.post('/platform-approval/review', auditMiddleware('platform.tenant_email_config.create'), authenticate, requirePermission('platform.system.admin'), validate({ body: platformApprovalReviewPostBody }), async (req: Request, res: Response) => {
  try {
    const { tenantId, decision, note } = req.body;
    if (!tenantId || !decision || !['approved', 'denied', 'revoked'].includes(decision)) {
      res.status(400).json({ error: 'tenantId and decision (approved|denied|revoked) are required' });
      return;
    }
    const userId = req.user!.userId as string;
    const approval = await reviewPlatformEmailApproval(tenantId, decision, userId, note);
    setAuditData(res, { action: 'update', entityType: 'platform_email_approval', entityId: approval.approvalId, afterState: { status: approval.status, reviewNote: note } });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'admin', event: 'created', entityType: 'tenant_email_config', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.tenant_email_config.created' });
    res.json(approval);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;
