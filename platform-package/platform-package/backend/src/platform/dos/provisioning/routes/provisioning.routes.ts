// @ts-nocheck
import { SYSTEM_JOB_ACTOR } from '../../constants/system-actors';
import { logger } from '../../observability/logger.service';
import { validate } from '../../http/validation/validate';
import { Router, Request, Response } from "express";
import { asyncHandler } from '../../http/error-handling/async-handler';
import { authenticate } from '../../../dauth';
import { requirePermission } from '../../../dauth';
import { listJobsForTenant } from '../provisioning.service';
import { safeQuery } from "../../../../config/database/database";
import { getFirstRow } from '../../../../shared/data/db-utils';
import { ProvisioningService } from "../../../../modules/platform/provisioning/provisioning.service";
import { OnboardingSessionRepo } from "../../../../modules/onboarding/repositories/onboarding-session.repo";
import { OnboardingAnswerRepo } from "../../../../modules/onboarding/repositories/onboarding-answer.repo";
import { OnboardingScoreRepo } from "../../../../modules/onboarding/repositories/onboarding-score.repo";
import { errMsg } from "../../../../i18n/error-messages";
import { emitEvent } from '../../events/event-bus';
import { auditMiddleware } from '../../http/middleware/audit';
import { swallow, EC } from '../../resilience/resilient-catch';
import { jobsIdRetryStagePostBody, seedBaselinePostBody, jobsIdRetryPostBody } from '../../../../modules/platform/schemas/platform.schemas';
import { SYSTEM_JOB_ACTOR } from '../../constants/system-actors';
import { jobsIdRetryPostBody, seedBaselinePostBody, jobsIdRetryStagePostBody } from '../../../../modules/platform/schemas/platform.schemas';

// ── Zod Schemas ──────────────────────────────────────────────────────────
const router: Router = Router();
router.use(auditMiddleware('onboarding'));
const canonicalService = new ProvisioningService();

router.get("/jobs", authenticate, requirePermission('admin.system.write'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
    return;
  }
  try {
    const jobs = await listJobsForTenant(tenantId);
    res.json({ jobs });
  } catch (err: unknown) {
    res.status(500).json({
      error: errMsg('INTERNAL_ERROR', req),
    });
  }
}));

router.post("/seed-baseline", auditMiddleware('platform.provisioning.create'), authenticate, requirePermission('admin.system.write'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const userId = req.user?.userId ?? req.userId ?? SYSTEM_JOB_ACTOR;
  if (!tenantId) {
    res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
    return;
  }

  try {
    const sectorCode = req.body.sectorCode || 'K';
    const orgName = req.body.orgName || 'Enterprise Organization';

    const sessionRepo = new OnboardingSessionRepo();
    const answerRepo = new OnboardingAnswerRepo();
    const scoreRepo = new OnboardingScoreRepo();

    let userRow: unknown = null;
    try {
      const uRes = await safeQuery(`SELECT email, COALESCE(full_name, name) AS name FROM public.users WHERE user_id = $1`, [userId]);
      userRow = getFirstRow(uRes);
    } catch { /* ignore */ }

    const session = await sessionRepo.create({
      sessionKey: `baseline-${tenantId}-${Date.now()}`,
      startedByUserId: userId,
      organizationName: orgName,
      displayName: orgName,
      languageCode: 'ar',
      metadata: { source: 'seed-baseline', tenantId, sectorCode },
    });
    const sessionId = session.id;

    const baselineAnswers = [
      { questionCode: 'org.legal_name', answerText: orgName },
      { questionCode: 'org.display_name', answerText: orgName },
      { questionCode: 'org.arabic_name', answerText: orgName },
      { questionCode: 'org.country', answerText: 'SA' },
      { questionCode: 'org.city', answerText: 'Riyadh' },
      { questionCode: 'org.industry', answerText: sectorCode === 'K' ? 'banking' : 'general' },
      { questionCode: 'org.employee_band', answerText: req.body.employeeBand || '51-200' },
      { questionCode: 'org.language_code', answerText: 'ar' },
      { questionCode: 'org.timezone', answerText: 'Asia/Riyadh' },
      { questionCode: 'gov.primary_sector', answerText: sectorCode },
      { questionCode: 'reg.regulated_sector', answerBool: true },
      { questionCode: 'reg.frameworks_confirmed', answerJson: ['nca-ecc', 'iso-27001'] },
      { questionCode: 'reg.audit_cadence', answerText: 'annual' },
      { questionCode: 'gov.has_risk_committee', answerBool: true },
      { questionCode: 'gov.approval_model', answerText: 'standard' },
      { questionCode: 'people.tenant_admin_email', answerText: userRow?.email || '' },
    ];

    await answerRepo.upsertAnswers(
      sessionId,
      { tenantId, userId, email: userRow?.email, role: 'admin' },
      baselineAnswers as any
    );

    await scoreRepo.replaceScores(sessionId, [
      { scoreType: 'readiness', scoreDomain: 'overall', scoreValue: 50, maxScore: 100, ratingLabel: 'developing' },
      { scoreType: 'readiness', scoreDomain: 'governance', scoreValue: 40, maxScore: 100, ratingLabel: 'foundational' },
      { scoreType: 'readiness', scoreDomain: 'technology', scoreValue: 30, maxScore: 100, ratingLabel: 'foundational' },
    ]);

    await sessionRepo.updateProgress(sessionId, 100, 50, 0);
    await sessionRepo.markApproved(sessionId);

    const result = await canonicalService.startProvisioning({
      tenantId,
      tenantSlug: tenantId,
      actorUserId: userId,
      sessionId,
    });

    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'admin', event: 'created', entityType: 'provisioning', entityId: req.params?.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:admin.provisioning.created' });
    res.status(202).json({
      accepted: true,
      jobId: result.jobId,
      sessionId,
      tenantId,
      sectorCode,
      message: 'Baseline provisioning started via canonical orchestrator',
    });
  } catch (err: unknown) {
    logger.error('[seed-baseline] Error:', err);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
}));

router.get("/jobs/:id/status", authenticate, requirePermission('admin.system.write'), validate({ body: seedBaselinePostBody }), asyncHandler(async (req, res) => {
  const result = await canonicalService.getProvisioningStatus(req.params.id);
  const steps = result.steps || [];
  const completed = steps.filter((s: unknown) => s.status === 'completed').length;
  const failed = steps.filter((s: unknown) => s.status === 'failed').length;
  res.json({
  jobId: result.job?.id,
  status: result.job?.job_status,
  progress: steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0,
  totalSteps: steps.length,
  completedSteps: completed,
  failedSteps: failed,
  steps,
  });
}));

router.post("/jobs/:id/retry", auditMiddleware('platform.provisioning.create'), authenticate, requirePermission('admin.system.write'), validate({ body: jobsIdRetryPostBody }), asyncHandler(async (req, res) => {
  const result = await canonicalService.getProvisioningStatus(req.params.id);
  if (!result.job) { res.status(404).json({ error: 'Job not found' }); return; }
  const tenantId = result.job.tenant_id;
  const actorUserId = req.user!.userId;
  const retryResult = await canonicalService.startProvisioning({
  tenantId,
  tenantSlug: tenantId,
  actorUserId,
  sessionId: result.job.session_id,
  });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: actorUserId, module: 'admin', event: 'updated', entityType: 'provisioning', entityId: req.params.id }), { tenantId: req.tenantId, operation: 'grcEvent:admin.provisioning.updated' });
  res.json({ retrying: true, jobId: retryResult.jobId });
}));

router.post("/jobs/:id/retry-stage", auditMiddleware('platform.provisioning.create'), authenticate, requirePermission('admin.system.write'), validate({ body: jobsIdRetryStagePostBody }), asyncHandler(async (req, res) => {
  const result = await canonicalService.getProvisioningStatus(req.params.id);
  if (!result.job) { res.status(404).json({ error: 'Job not found' }); return; }
  const tenantId = result.job.tenant_id;
  const actorUserId = req.user!.userId;
  const retryResult = await canonicalService.startProvisioning({
  tenantId,
  tenantSlug: tenantId,
  actorUserId,
  sessionId: result.job.session_id,
  });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: actorUserId, module: 'admin', event: 'updated', entityType: 'provisioning', entityId: req.params.id }), { tenantId: req.tenantId, operation: 'grcEvent:admin.provisioning.updated' });
  res.json({ retrying: true, jobId: retryResult.jobId, stageIndex: req.body.stageIndex });
}));

export default router;