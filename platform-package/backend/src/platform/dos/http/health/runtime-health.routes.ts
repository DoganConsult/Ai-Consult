// @ts-nocheck
import { auditMiddleware } from '../middleware/audit';
import { Router, Request, Response } from 'express';
import { authenticate } from '../../../dauth';
import { requirePermission } from '../../../dauth';
import { auditMiddleware } from '../middleware/audit';
import { toErrorMessage } from '../../../../errors/http-error.util';
import {
  getAllRuntimeHealth, getModuleRuntimeHealth,
  getModuleMaturity, getPackCertifications,
  checkRuntimeAccessGate, computePackCertification, certifyAllPacks,
  computeJourneyCertification, getReadinessThresholds,
} from '../../../../modules/platform/services/module/module-runtime-health.service';

const router = Router();
router.use(auditMiddleware('admin'));

router.get('/health', authenticate, requirePermission('workspace.config.read'), async (req: Request, res: Response) => {
  try {
    const reports = await getAllRuntimeHealth(req.tenantId);
    const healthy = reports.filter(r => r.healthStatus === 'healthy').length;
    const degraded = reports.filter(r => r.healthStatus === 'degraded').length;
    const unhealthy = reports.filter(r => r.healthStatus === 'unhealthy').length;
    res.json({ summary: { total: reports.length, healthy, degraded, unhealthy }, modules: reports });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/health/:moduleCode', authenticate, async (req: Request, res: Response) => {
  try {
    const report = await getModuleRuntimeHealth(req.tenantId, req.params.moduleCode);
    if (!report) { res.status(404).json({ error: 'Module health not found' }); return; }
    res.json(report);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/maturity', authenticate, requirePermission('workspace.config.read'), async (req: Request, res: Response) => {
  try {
    const reports = await getModuleMaturity(req.tenantId);
    res.json({ modules: reports });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/pack-certifications', authenticate, async (req: Request, res: Response) => {
  try {
    const packs = await getPackCertifications(req.tenantId);
    res.json({ packs });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/access-gate/:moduleCode', authenticate, async (req: Request, res: Response) => {
  try {
    const gate = await checkRuntimeAccessGate(req.tenantId, req.params.moduleCode);
    const httpStatus = gate.allowed ? 200 : 403;
    res.status(httpStatus).json(gate);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.post('/pack-certifications/compute-all', authenticate, requirePermission('workspace.config.write'), async (req: Request, res: Response) => {
  try {
    const results = await certifyAllPacks(req.tenantId);
    const certified = results.filter(r => r.certificationState === 'CERTIFIED_A_PLUS_PLUS').length;
    res.json({ summary: { total: results.length, certified }, packs: results });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.post('/pack-certifications/:packCode/compute', authenticate, requirePermission('workspace.config.write'), async (req: Request, res: Response) => {
  try {
    const result = await computePackCertification(req.tenantId, req.params.packCode);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.post('/journey-certification/compute', authenticate, requirePermission('workspace.config.write'), async (req: Request, res: Response) => {
  try {
    const result = await computeJourneyCertification(req.tenantId);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/readiness-thresholds/:moduleCode', authenticate, async (req: Request, res: Response) => {
  try {
    const thresholds = await getReadinessThresholds(req.tenantId, req.params.moduleCode);
    res.json({ thresholds });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/ai-pulse/:moduleCode', authenticate, async (req: Request, res: Response) => {
  try {
    const { getModuleAiPulse } = await import('../../services/module/module-ai-pulse.service');
    const pulse = await getModuleAiPulse(req.tenantId, req.params.moduleCode);
    res.json(pulse);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get('/ai-pulse', authenticate, async (req: Request, res: Response) => {
  try {
    const { getAllModuleAiPulses } = await import('../../services/module/module-ai-pulse.service');
    const pulses = await getAllModuleAiPulses(req.tenantId);
    res.json({ modules: pulses });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;
