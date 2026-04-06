// @ts-nocheck
import { validate } from '../../http/validation/validate';
import { Router, Request, Response } from 'express';
import { authenticate } from '../../../dauth';
import { requirePermission } from '../../../dauth';
import { auditMiddleware, setAuditData } from '../../http/middleware/audit';
import { automationMiddleware } from '../../http/middleware/automation';
import { packIdUpgradePostBody, packIdInstallPostBody } from '../../../../modules/platform/schemas/platform.schemas';
import {
  listBuiltInPacks,
  loadBuiltInPack,
  getInstalledPackVersions,
  getUpgradeablePacks,
} from '../../services/content-packs/pack-resolver.service';
import { installPack, upgradePack } from '../../services/content-packs/content-pack.service';
import { emitEvent } from '../../events/event-bus';
import { toErrorMessage } from '../../../../errors/http-error.util';
import { swallow, EC } from '../../resilience/resilient-catch';

// ── Zod Schemas ──────────────────────────────────────────────────────────
const router = Router();
router.use(auditMiddleware("governance"));
router.use(automationMiddleware("governance"));

// GET /api/packs — list all available built-in packs
router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const packs = listBuiltInPacks();
    res.json(packs.map(p => ({
      packId: p.packId,
      version: p.version,
      frameworkRefs: p.frameworkRefs,
      publisher: p.metadata.publisher,
      changelog: p.metadata.changelog,
      hasRoles: !!p.role_pack?.roles?.length,
      hasDashboards: !!p.dashboard_pack?.layouts?.length,
      hasWorkflows: !!p.workflow_pack?.templates?.length,
      modules: p.modules,
    })));
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/packs/:packId — get a specific pack manifest
router.get('/:packId', authenticate, async (req: Request, res: Response) => {
  try {
    const pack = loadBuiltInPack(req.params.packId);
    if (!pack) return res.status(404).json({ error: 'Pack not found' });
    res.json(pack);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/packs/upgrades/check — check for available upgrades for current tenant
router.get('/upgrades/check', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || '';
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

    const installed = await getInstalledPackVersions(tenantId);
    const available = listBuiltInPacks();
    const upgradeable = getUpgradeablePacks(installed, available);

    res.json({
      installed: Object.fromEntries(installed),
      upgradeable: upgradeable.map(p => ({
        packId: p.packId,
        currentVersion: installed.get(p.packId),
        availableVersion: p.version,
        changelog: p.metadata.changelog,
      })),
    });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/packs/:packId/install — install a pack for the current tenant
router.post('/:packId/install', auditMiddleware('platform.pack_management.create'), authenticate, requirePermission('admin.pack.write'), validate({ body: packIdInstallPostBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || '';
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

    const pack = loadBuiltInPack(req.params.packId);
    if (!pack) return res.status(404).json({ error: 'Pack not found' });

    const result = await installPack(tenantId, pack, { skipMasterUpsert: true });
    setAuditData(res, { action: "create", entityType: "pack", entityId: req.params.packId, afterState: result });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'pack_management', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.pack_management.created' });
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/packs/:packId/upgrade — upgrade a pack to the latest built-in version
router.post('/:packId/upgrade', auditMiddleware('platform.pack_management.create'), authenticate, requirePermission('admin.pack.write'), validate({ body: packIdUpgradePostBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || '';
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

    const pack = loadBuiltInPack(req.params.packId);
    if (!pack) return res.status(404).json({ error: 'Pack not found' });

    const result = await upgradePack(tenantId, req.params.packId, pack, { skipMasterUpsert: true });
    setAuditData(res, { action: "update", entityType: "pack", entityId: req.params.packId, afterState: result });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'pack_management', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.pack_management.created' });
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;
