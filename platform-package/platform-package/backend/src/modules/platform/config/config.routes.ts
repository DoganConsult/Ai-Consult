// @ts-nocheck
import { Router, type Request, type Response } from 'express';
import {
  ConfigBulkResolveSchema,
  ConfigDefinitionCreateSchema,
  ConfigDefinitionUpdateSchema,
  ConfigLockSchema,
  ConfigResolveQuerySchema,
  ConfigValueUpsertSchema,
} from './config.schemas';
import { CONFIG_PERMISSIONS, assertPermission, assertScopeAccess } from './config.permissions';
import type { ConfigService } from './config.service';
import { bootstrapDeploymentProfile } from './config.bootstrap';
import { hasConfigBridge, getConfigBridge } from './config.bridge';
import { getEnvSyncMap } from './config.env-sync';

// Helper to provide typing to custom auth properties injected by prior middleware
interface AuthenticatedRequest extends Request {
  user?: {
    userId?: string;
    roleCodes?: string[];
    permissions?: string[];
    tenantId?: string;
    organizationId?: string;
  };
}

export function createConfigRouter(configService: ConfigService): Router {
  const router: Router = Router();

  router.get('/definitions', async (_req: Request, res: Response) => {
    const definitions = await configService.listDefinitions();
    res.json({ ok: true, data: definitions });
  });

  router.post('/definitions', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.definitionCreate);
    const parsed = ConfigDefinitionCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_payload', details: parsed.error.flatten() });
      return;
    }
    const created = await configService.createDefinition(req.user, parsed.data);
    res.status(201).json({ ok: true, data: created });
  });

  router.patch('/definitions/:id', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.definitionUpdate);
    const parsed = ConfigDefinitionUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_payload', details: parsed.error.flatten() });
      return;
    }
    const updated = await configService.updateDefinition(req.user, req.params.id as string, parsed.data);
    res.status(200).json({ ok: true, data: updated });
  });

  router.put('/values', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.valueWrite);
    const parsed = ConfigValueUpsertSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_payload', details: parsed.error.flatten() });
      return;
    }
    assertScopeAccess(req.user, { scopeType: parsed.data.scopeType, scopeId: parsed.data.scopeId });
    const result = await configService.upsertValue(req.user, parsed.data);
    res.status(200).json({ ok: true, data: result });
  });

  router.get('/resolve', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.resolveRead);
    const parsed = ConfigResolveQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_query', details: parsed.error.flatten() });
      return;
    }
    assertScopeAccess(req.user, { scopeType: parsed.data.scopeType, scopeId: parsed.data.scopeId });
    const result = await configService.resolve(parsed.data.key, {
      scopeType: parsed.data.scopeType,
      scopeId: parsed.data.scopeId,
    });
    res.status(200).json({ ok: true, data: result });
  });

  router.post('/resolve/bulk', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.resolveRead);
    const parsed = ConfigBulkResolveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_payload', details: parsed.error.flatten() });
      return;
    }
    assertScopeAccess(req.user, { scopeType: parsed.data.scopeType, scopeId: parsed.data.scopeId });
    const results = await configService.bulkResolve(parsed.data);
    res.status(200).json({ ok: true, data: results });
  });

  router.post('/locks', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.lockWrite);
    const parsed = ConfigLockSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_payload', details: parsed.error.flatten() });
      return;
    }
    assertScopeAccess(req.user, { scopeType: parsed.data.lockedAtScopeType, scopeId: parsed.data.lockedAtScopeId });
    await configService.createLock(req.user, parsed.data);
    res.status(201).json({ ok: true });
  });

  router.delete('/values/:key/:scopeType/:scopeId', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.valueDelete);
    const { key, scopeType, scopeId } = req.params as Record<string, string>;
    assertScopeAccess(req.user, { scopeType: scopeType, scopeId });
    await configService.deleteValue(req.user, key, scopeType, scopeId);
    res.status(200).json({ ok: true });
  });

  router.get('/values/:key/:scopeType/:scopeId', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.valueRead);
    const { key, scopeType, scopeId } = req.params as Record<string, string>;
    assertScopeAccess(req.user, { scopeType: scopeType, scopeId });
    const result = await configService.getValue(key, scopeType, scopeId);
    res.status(200).json({ ok: true, data: result });
  });

  router.delete('/locks/:key/:scopeType/:scopeId', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.lockWrite);
    const { key, scopeType, scopeId } = req.params as Record<string, string>;
    assertScopeAccess(req.user, { scopeType: scopeType, scopeId });
    await configService.deleteLock(req.user, key, scopeType, scopeId);
    res.status(200).json({ ok: true });
  });

  router.get('/definitions/:key', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.definitionRead);
    const def = await configService.getDefinitionByKey(req.params.key as string);
    if (!def) return res.status(404).json({ error: 'not_found' });
    res.status(200).json({ ok: true, data: def });
  });

  router.get('/audit/:key', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.auditRead);
    const auditLogs = await configService.getAuditLogByKey(req.user, req.params.key as string);
    res.status(200).json({ ok: true, data: auditLogs });
  });

  router.post('/bootstrap/profile/:profileCode', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.bootstrapExecute);
    await bootstrapDeploymentProfile(configService, req.user ?? {}, (req.params.profileCode as string) as any);
    res.status(200).json({ ok: true, profileCode: req.params.profileCode });
  });

  router.get('/bridge/feature-flags', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.definitionRead);
    if (!hasConfigBridge()) return res.status(503).json({ error: 'config_bridge_not_initialized' });
    const bridge = getConfigBridge();
    res.status(200).json({ ok: true, data: bridge.getAllFeatureFlags() });
  });

  router.get('/bridge/snapshot', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.definitionRead);
    if (!hasConfigBridge()) return res.status(503).json({ error: 'config_bridge_not_initialized' });
    const bridge = getConfigBridge();
    res.status(200).json({ ok: true, data: bridge.toSnapshot() });
  });

  router.get('/bridge/category/:category', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.definitionRead);
    if (!hasConfigBridge()) return res.status(503).json({ error: 'config_bridge_not_initialized' });
    const bridge = getConfigBridge();
    const category = req.params.category as string;
    res.status(200).json({ ok: true, data: bridge.getAllByCategory(category) });
  });

  router.get('/bridge/domain/:domain', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.definitionRead);
    if (!hasConfigBridge()) return res.status(503).json({ error: 'config_bridge_not_initialized' });
    const bridge = getConfigBridge();
    const domain = req.params.domain as string;
    res.status(200).json({ ok: true, data: bridge.listDefinitionsByDomain(domain) });
  });

  router.post('/bridge/refresh', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.bootstrapExecute);
    if (!hasConfigBridge()) return res.status(503).json({ error: 'config_bridge_not_initialized' });
    const bridge = getConfigBridge();
    await bridge.refreshCache();
    res.status(200).json({ ok: true, loaded: Object.keys(bridge.toSnapshot()).length });
  });

  router.get('/bridge/env-mapping', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.definitionRead);
    res.status(200).json({ ok: true, data: getEnvSyncMap() });
  });

  router.get('/bridge/resolve-flag/:envKey', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.resolveRead);
    if (!hasConfigBridge()) return res.status(503).json({ error: 'config_bridge_not_initialized' });
    const bridge = getConfigBridge();
    const envKey = req.params.envKey as string;
    const enabled = bridge.resolveEnvFlag(envKey);
    res.status(200).json({ ok: true, envKey, enabled });
  });

  router.get('/definitions/search/:term', async (req: AuthenticatedRequest, res: Response) => {
    assertPermission(req.user, CONFIG_PERMISSIONS.definitionRead);
    const definitions = await configService.listDefinitions();
    const term = (req.params.term as string).toLowerCase();
    const filtered = definitions.filter(d =>
      d.key.toLowerCase().includes(term) ||
      d.label.toLowerCase().includes(term) ||
      d.category.toLowerCase().includes(term) ||
      d.ownerDomain.toLowerCase().includes(term)
    );
    res.status(200).json({ ok: true, data: filtered });
  });

  return router;
}