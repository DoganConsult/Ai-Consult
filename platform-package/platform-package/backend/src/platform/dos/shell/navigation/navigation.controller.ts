// @ts-nocheck
// ============================================
// DOS Navigation — Platform Controller
// Serves the public navigation API endpoints.
// Uses the composition engine via cached service.
// ============================================

import { Router, Request, Response } from 'express';
import { authenticate } from '../../../dauth';
import { NavigationCacheService } from './navigation-cache.service';
import { NavigationMenuService } from './navigation.service';
// Legacy BootstrapService removed (Phase 6/7 boundary cleanup)
import { getFullRegistry } from '../../modules/lifecycle/module-workflow-registry.service';
import { getProductsModulesConfigForTenant, getTenantModuleOperatingStates } from '../../http/guards/module-guard';
import { resolveAccessSnapshot } from '../../../../modules/platform/services/misc/canonical-access.service';
import { query } from '../../../../config/database/database';
import { AuthenticatedRequest } from '../../../../types/express.types';
import { getDefaultProductKey } from '../../../deployment-profile';
import { NavigationCompositionContext } from './navigation.types';
import { getDefaultProductKey } from '../../../deployment-profile';
import { NavigationCompositionContext } from './navigation.types';

const router: Router = Router();
const cacheService = new NavigationCacheService();
const navigationService = new NavigationMenuService();

const DEFAULT_PRODUCT_KEY = getDefaultProductKey();

/** Helper: extract auth context from request */
function extractAuth(req: Request): { userId: string; tenantId: string } | null {
  const ar = req as AuthenticatedRequest;
  const userId = ar.user?.userId || req.headers['x-user-id'];
  const tenantId = ar.tenantId || ar.user?.tenantId || req.headers['x-tenant-id'];
  if (!userId || !tenantId) return null;
  return { userId: String(userId), tenantId: String(tenantId) };
}

/** Helper: resolve FULL access context from DAuth — all layers */
async function resolveContext(auth: { userId: string; tenantId: string }): Promise<{
  visibleModules: string[];
  roleCode: string | null;
  functionalRoles: string[];
  accessProfiles: string[];
  permissions: string[];
  canonicalLanding: string | null;
}> {
  try {
    const snapshot = await resolveAccessSnapshot(auth.userId, auth.tenantId);
    return {
      visibleModules: snapshot.products.visibleModules,
      roleCode: snapshot.access.tenantRoles[0] ?? snapshot.access.platformRoles[0] ?? null,
      functionalRoles: snapshot.access.functionalRoles ?? [],
      accessProfiles: snapshot.access.accessProfiles ?? [],
      permissions: snapshot.access.permissions ?? [],
      canonicalLanding: snapshot.nav.landingPage,
    };
  } catch {
    console.warn('[NavigationController] resolveAccessSnapshot failed, falling back to empty context', { userId: auth.userId, tenantId: auth.tenantId });
    return {
      visibleModules: [],
      roleCode: null,
      functionalRoles: [],
      accessProfiles: [],
      permissions: [],
      canonicalLanding: null,
    };
  }
}

/** Helper: resolve user preferences for navigation personalization */
async function resolveUserPrefs(tenantId: string, userId: string): Promise<import('./navigation.types').UserNavPreferences | null> {
  try {
    const schema = (await query(`SELECT schema_name FROM public.tenants WHERE tenant_id = $1`, [tenantId])).rows[0]?.schema_name;
    if (!schema) return null;
    const { rows } = await query(
      `SELECT language, sidebar_collapsed, recent_pages, pinned_entities, dashboard_layout
       FROM "${schema}".user_preferences WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    if (rows.length === 0) return null;
    const p = rows[0];
    return {
      sidebarCollapsed: p.sidebar_collapsed ?? false,
      pinnedNavKeys: p.pinned_entities ?? [],
      recentPages: p.recent_pages ?? [],
      dashboardLayout: p.dashboard_layout ?? 'standard',
    };
  } catch { return null; }
}

/** Helper: resolve tenant settings for navigation rules */
async function resolveTenantSettings(tenantId: string): Promise<import('./navigation.types').TenantNavSettings | null> {
  try {
    const { rows } = await query(
      `SELECT t.tenant_id, wp.enforcement_mode, wp.sectors,
              te.default_operation_mode AS subscription_plan
       FROM public.tenants t
       LEFT JOIN "${(await query('SELECT schema_name FROM public.tenants WHERE tenant_id = $1', [tenantId])).rows[0]?.schema_name ?? `tenant_${tenantId}`}".workspace_profile wp ON true
       LEFT JOIN public.tenant_module_entitlements te ON te.tenant_id = t.tenant_id
       WHERE t.tenant_id = $1 LIMIT 1`,
      [tenantId],
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      industry: r.sectors?.[0] ?? null,
      orgType: null,
      subscriptionPlan: r.subscription_plan ?? null,
      enforcementMode: r.enforcement_mode ?? null,
    };
  } catch { return null; }
}

// GET /api/navigation/menu — multi-layer composition: platform→product→module→tenant→role→user→scope
router.get('/navigation/menu', authenticate, async (req: Request, res: Response) => {
  try {
    const auth = extractAuth(req);
    if (!auth) return res.status(401).json({ error: 'Missing auth context' });

    // Resolve all 7 layers in parallel
    const [accessCtx, userPrefs, tenantSettings] = await Promise.all([
      resolveContext(auth),
      resolveUserPrefs(auth.tenantId, auth.userId),
      resolveTenantSettings(auth.tenantId),
    ]);

    // Detect locale from user preferences or Accept-Language header
    const userLocale = (req.headers['accept-language']?.startsWith('ar') ? 'ar' : 'en') as 'en' | 'ar';

    const ctx: NavigationCompositionContext = {
      // L1: Platform
      productKey: DEFAULT_PRODUCT_KEY,
      includeSystemItems: false,
      // L2: Module entitlements
      modules: accessCtx.visibleModules,
      // L3: Tenant
      tenantId: auth.tenantId,
      tenantSettings,
      // L4: Role (full profile)
      roleCode: accessCtx.roleCode,
      functionalRoles: accessCtx.functionalRoles,
      accessProfiles: accessCtx.accessProfiles,
      permissions: accessCtx.permissions,
      // L5: User
      userId: auth.userId,
      locale: userLocale,
      userPreferences: userPrefs,
    };

    const menu = await cacheService.getMenu(ctx);
    return res.json(menu);
  } catch (err: unknown) {
    return res.status(500).json({ error: (err as Error)?.message ?? 'Failed to load navigation menu' });
  }
});

// GET /api/navigation/breadcrumbs — breadcrumb chain for current route
router.get('/navigation/breadcrumbs', authenticate, async (req: Request, res: Response) => {
  try {
    const auth = extractAuth(req);
    if (!auth) return res.status(401).json({ error: 'Missing auth context' });

    const route = req.query.route as string;
    if (!route) return res.status(400).json({ error: 'route query parameter is required' });

    const crumbs = await cacheService.getBreadcrumbs(auth.tenantId, route, DEFAULT_PRODUCT_KEY);
    return res.json({ success: true, data: crumbs });
  } catch (err: unknown) {
    return res.status(500).json({ error: (err as Error)?.message ?? 'Failed to load breadcrumbs' });
  }
});

// GET /api/navigation/command-palette — flattened items for command palette
router.get('/navigation/command-palette', authenticate, async (req: Request, res: Response) => {
  try {
    const auth = extractAuth(req);
    if (!auth) return res.status(401).json({ error: 'Missing auth context' });

    const { visibleModules, roleCode } = await resolveContext(auth);

    const ctx: NavigationCompositionContext = {
      tenantId: auth.tenantId,
      roleCode,
      modules: visibleModules,
      productKey: DEFAULT_PRODUCT_KEY,
      locale: 'en',
      includeSystemItems: false,
    };

    const items = await cacheService.getCommandPaletteItems(ctx);
    return res.json({ success: true, data: items, count: items.length });
  } catch (err: unknown) {
    return res.status(500).json({ error: (err as Error)?.message ?? 'Failed to load command palette items' });
  }
});

/** @deprecated
 * @removal-date Phase 6 (frontend)
 * @owner DOS
 * @replacement GET /api/navigation/menu (composition engine) */
router.get('/navigation/route-catalog', authenticate, async (req: Request, res: Response) => {
  try {
    const auth = extractAuth(req);
    if (!auth) return res.status(401).json({ error: 'Missing auth context' });

    const { visibleModules, roleCode, canonicalLanding } = await resolveContext(auth);
    // Legacy placeholders since BootstrapService is removed
    const dashboardWidgets: string[] = [];
    const defaultLandingPage = canonicalLanding || '/dashboard';

    // Navigation menu (DB-driven via composition engine)
    const menu = await navigationService.getMenu({
      tenantId: auth.tenantId,
      roleCode,
      modules: visibleModules,
    });

    // Module workflow registry
    let moduleRegistry: unknown[] = [];
    try { moduleRegistry = await getFullRegistry(auth.tenantId); } catch {}

    // Tenant entitlements
    let entitlements: unknown = null;
    try {
      const entResult = await query(
        `SELECT licensed_modules, default_operation_mode, modules_config
         FROM public.tenant_module_entitlements WHERE tenant_id = $1 LIMIT 1`,
        [auth.tenantId],
      );
      if (entResult.rows.length) entitlements = entResult.rows[0];
    } catch {}

    // Flat route list
    const extractRoutes = (items: unknown[]): Array<{ route: string; navKey: string; moduleCode: string | null; labelEn: string }> => {
      const routes: Array<{ route: string; navKey: string; moduleCode: string | null; labelEn: string }> = [];
      for (const item of items) {
        if (item.route) routes.push({ route: item.route, navKey: item.navKey, moduleCode: item.moduleCode ?? null, labelEn: item.labelEn });
        if (item.children?.length) routes.push(...extractRoutes(item.children));
      }
      return routes;
    };
    const allowedRoutes = extractRoutes([...menu.primary, ...menu.secondary, ...(menu.utility ?? [])]);

    // Module operating states
    let moduleOperatingStates: Record<string, { state: string; activationSource: string; trialExpiryAt: string | null }> = {};
    try {
      const opStates = await getTenantModuleOperatingStates(auth.tenantId);
      for (const [code, entry] of opStates) {
        moduleOperatingStates[code] = {
          state: entry.state,
          activationSource: entry.activation_source,
          trialExpiryAt: entry.trial_expiry_at,
        };
      }
    } catch {}

    // Module map
    const moduleMap: Record<string, any> = {};
    for (const mod of moduleRegistry) {
      const opState = moduleOperatingStates[mod.moduleCode];
      moduleMap[mod.moduleCode] = {
        displayNameEn: mod.displayNameEn, moduleCategory: mod.moduleCategory,
        automationLevel: mod.automationLevel, licensed: mod.licensed, isActive: mod.isActive,
        hasLifecycle: mod.hasLifecycle, icon: mod.icon, color: mod.color,
        permissionPrefix: mod.permissionPrefix, slaDefaultHours: mod.slaDefaultHours,
        operatingState: opState?.state ?? null, activationSource: opState?.activationSource ?? null,
        trialExpiryAt: opState?.trialExpiryAt ?? null,
      };
    }

    return res.json({
      roleCode, modules: visibleModules, dashboardWidgets,
      defaultLandingPage,
      navigation: { primary: menu.primary, secondary: menu.secondary, utility: menu.utility ?? [] },
      allowedRoutes, routeCount: allowedRoutes.length,
      moduleRegistry: moduleMap, moduleCount: Object.keys(moduleMap).length,
      entitlements: entitlements ? {
        licensedModules: entitlements.licensed_modules,
        operationMode: entitlements.default_operation_mode,
        modulesConfig: entitlements.modules_config,
      } : null,
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: (err as Error)?.message ?? 'Failed to load route catalog' });
  }
});

/** @deprecated
 * @removal-date Phase 6 (frontend)
 * @owner DOS
 * @replacement GET /me/access-snapshot */
router.get('/config/products-modules', authenticate, async (req: Request, res: Response) => {
  try {
    const auth = extractAuth(req);
    if (!auth) return res.status(401).json({ error: 'Missing auth context' });

    const config = await getProductsModulesConfigForTenant(auth.tenantId);
    const { visibleModules } = await resolveContext(auth);
    config.visibleModules = visibleModules;

    return res.json(config);
  } catch (err: unknown) {
    return res.status(500).json({ error: (err as Error)?.message ?? 'Failed to load products-modules config' });
  }
});

// GET /api/navigation/module-registry — module workflow registry
router.get('/navigation/module-registry', authenticate, async (req: Request, res: Response) => {
  try {
    const auth = extractAuth(req);
    if (!auth) return res.status(401).json({ error: 'Missing auth context' });

    const registry = await getFullRegistry(auth.tenantId);
    return res.json({
      modules: registry.map(mod => ({
        moduleCode: mod.moduleCode, displayNameEn: mod.displayNameEn,
        displayNameAr: mod.displayNameAr, moduleCategory: mod.moduleCategory,
        hasLifecycle: mod.hasLifecycle, automationLevel: mod.automationLevel,
        licensed: mod.licensed, isActive: mod.isActive, icon: mod.icon, color: mod.color,
        permissionPrefix: mod.permissionPrefix, primaryRoles: mod.primaryRoles,
        slaDefaultHours: mod.slaDefaultHours, sortOrder: mod.sortOrder,
      })),
      count: registry.length,
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: (err as Error)?.message ?? 'Failed to load module registry' });
  }
});

export default router;