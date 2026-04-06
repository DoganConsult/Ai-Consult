import { auditMiddleware } from '../../../platform/dos/http/middleware/audit';
import { asyncHandler } from '../../../platform/dos/http/error-handling/async-handler';
import { Router, Request, Response } from 'express';
import { authenticate } from '../../../platform/dauth';
import { requirePermission } from '../../../platform/dauth';
import { emptyResult, safeQuery, tenantSchema } from '../../../config/database/database';
import { AuthenticatedRequest } from '../../../types/express.types';
import { toErrorMessage } from '../../../errors/http-error.util';
import { swallowDefault, EC } from '../../../platform/dos/resilience/resilient-catch';


const STATEMENT_TIMEOUT_MS = 5000;

async function queryWithTimeout(sql: string, params?: any[]): Promise<{ rows: Record<string, any>[] }> {
  await safeQuery(`SET LOCAL statement_timeout = $1`, [`${STATEMENT_TIMEOUT_MS}`]);
  return safeQuery(sql, params);
}

const router = Router();
router.use(auditMiddleware('platform'));
router.use(authenticate);

interface UiConfigResponse {
  modules: UiModuleEntry[];
  pages: UiPageEntry[];
  actions: UiActionEntry[];
  dashboards: UiDashboardEntry[];
  permissions: string[];
  rbacSource: string;
  generatedAt: string;
}

interface UiModuleEntry {
  moduleCode: string;
  labelEn: string;
  labelAr: string;
  isActive: boolean;
  icon?: string;
  defaultRoute?: string;
  dashboardPresets: string[];
}

interface UiPageEntry {
  pageCode: string;
  moduleCode: string;
  route: string;
  layout: string;
  requiresPermissions: string[];
  requiresModuleActive: boolean;
  navVisibility: string;
}

interface UiActionEntry {
  actionCode: string;
  moduleCode: string;
  labelEn: string;
  labelAr: string;
  requiredPermissions: string[];
  sodSensitive: boolean;
  aiEnabled: boolean;
  dangerLevel: string;
}

interface UiDashboardEntry {
  dashboardCode: string;
  labelEn: string;
  labelAr: string;
  moduleCode?: string;
  roles?: string[];
}

async function loadUserPermissions(schema: string, userId?: string): Promise<Set<string>> {
  if (!userId) return new Set<string>();
  try {
    const { rows } = await safeQuery(
      `SELECT DISTINCT b.permission_code
       FROM "${schema}".user_role_assignments ura
       JOIN "${schema}".module_role_definitions rd
         ON rd.role_code = ura.role_id AND rd.is_active = true
       JOIN "${schema}".module_role_permission_bindings b
         ON b.module_code = rd.module_code AND b.role_code = rd.role_code AND b.is_active = true
       WHERE ura.user_id = $1 AND ura.active = true`,
      [userId],
    );
    if (rows.length > 0) return new Set(rows.map((r: Record<string, any>) => r.permission_code));
  } catch { /* tables may not exist — fall through to legacy */ }

  try {
    const { rows } = await safeQuery(
      `SELECT DISTINCT b.permission_code
       FROM "${schema}".enterprise_user_role_assignments eura
       JOIN "${schema}".module_role_permission_bindings b
         ON b.module_code = eura.module_code AND b.role_code = eura.functional_role_code AND b.is_active = true
       WHERE eura.user_id = $1 AND eura.is_active = true`,
      [userId],
    );
    if (rows.length > 0) return new Set(rows.map((r: Record<string, any>) => r.permission_code));
  } catch { /* tables may not exist */ }

  try {
    const { rows } = await safeQuery(
      `SELECT permission_code, allowed_roles FROM "${schema}".authorization_permissions`,
    );
    return new Set(rows.map((r: Record<string, any>) => r.permission_code));
  } catch { /* table may not exist */ }

  return new Set<string>();
}

async function loadEntitledModuleCodes(schema: string, userId?: string, userRole?: string): Promise<Set<string>> {
  if (!userId) return new Set<string>();
  try {
    const { rows } = await safeQuery(
      `SELECT DISTINCT b.module_code
       FROM "${schema}".user_role_assignments ura
       JOIN "${schema}".module_role_definitions rd
         ON rd.role_code = ura.role_id AND rd.is_active = true
       JOIN "${schema}".module_role_permission_bindings b
         ON b.module_code = rd.module_code AND b.role_code = rd.role_code AND b.is_active = true
       WHERE ura.user_id = $1 AND ura.active = true`,
      [userId],
    );
    if (rows.length > 0) return new Set(rows.map((r: Record<string, any>) => r.module_code));
  } catch { /* tables may not exist */ }

  try {
    const { rows } = await safeQuery(
      `SELECT DISTINCT eura.module_code
       FROM "${schema}".enterprise_user_role_assignments eura
       WHERE eura.user_id = $1 AND eura.is_active = true`,
      [userId],
    );
    if (rows.length > 0) return new Set(rows.map((r: Record<string, any>) => r.module_code));
  } catch { /* tables may not exist */ }

  if (userRole === 'owner' || userRole === 'admin') {
    try {
      const { rows } = await safeQuery(
        `SELECT module_code FROM "${schema}".module_activation_rules WHERE is_active = true`,
      );
      return new Set(rows.map((r: Record<string, any>) => r.module_code));
    } catch { /* table may not exist */ }
  }

  return new Set<string>();
}

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const tenantId = authReq.tenantId;
  const userId = authReq.user?.userId;
  const userRole = authReq.user?.role;
  if (!tenantId) { res.status(401).json({ error: 'No tenant context' }); return; }

  try {
    const schema = tenantSchema(tenantId);

    const userPermissions = await loadUserPermissions(schema, userId);

    const [modulesRes, actionsRes, permsRes, dashRes, pagesRes] = await Promise.all([
      swallowDefault(EC.FALLBACK_QUERY, emptyResult(), queryWithTimeout(`SELECT module_code, module_name AS label_en, module_name_ar AS label_ar, is_active, metadata FROM "${schema}".module_activation_rules WHERE is_active = true ORDER BY priority`), { tenantId: tenantId, operation: 'query module_activation_rules' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult(), queryWithTimeout(`SELECT action_code, module_code, label_en, label_ar, required_permissions, sod_sensitive, ai_enabled, danger_level FROM "${schema}".module_actions WHERE is_active = true ORDER BY module_code, action_code`), { tenantId: tenantId, operation: 'query module_activation_rules' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult(), queryWithTimeout(`SELECT DISTINCT permission_code FROM "${schema}".module_permissions WHERE is_active = true ORDER BY permission_code`), { tenantId: tenantId, operation: 'query module_actions' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult(), queryWithTimeout(`SELECT id, dashboard_code, title AS label_en, title_ar AS label_ar, module_code, role_bindings AS roles FROM "${schema}".dashboard_layouts WHERE is_active = true ORDER BY sort_order`), { tenantId: tenantId, operation: 'query module_actions' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult(), queryWithTimeout(`SELECT id, page_code, module_code, route, layout, requires_permissions, requires_module_active, nav_visibility FROM "${schema}".module_pages WHERE is_active = true ORDER BY module_code, sort_order`), { tenantId: tenantId, operation: 'query dashboard_layouts' }),
    ]);

    const entitledModuleCodes = await loadEntitledModuleCodes(schema, userId, userRole);

    const modules: UiModuleEntry[] = modulesRes.rows
      .filter((r: Record<string, any>) => entitledModuleCodes.has(r.module_code))
      .map((r: Record<string, any>) => ({
        moduleCode: r.module_code,
        labelEn: r.label_en || r.module_code,
        labelAr: r.label_ar || r.module_code,
        isActive: r.is_active,
        icon: r.metadata?.icon,
        defaultRoute: r.metadata?.defaultRoute,
        dashboardPresets: r.metadata?.dashboardPresets || [],
      }));

    const actions: UiActionEntry[] = actionsRes.rows
      .filter((r: Record<string, any>) => {
        const reqPerms: string[] = r.required_permissions || [];
        if (reqPerms.length === 0) return entitledModuleCodes.has(r.module_code);
        return reqPerms.some((p: string) => userPermissions.has(p));
      })
      .map((r: Record<string, any>) => ({
        actionCode: r.action_code,
        moduleCode: r.module_code,
        labelEn: r.label_en,
        labelAr: r.label_ar || r.label_en,
        requiredPermissions: r.required_permissions || [],
        sodSensitive: r.sod_sensitive,
        aiEnabled: r.ai_enabled,
        dangerLevel: r.danger_level,
      }));

    const permissions: string[] = permsRes.rows
      .map((r: Record<string, any>) => r.permission_code)
      .filter((p: string) => userPermissions.has(p));

    const dashboards: UiDashboardEntry[] = dashRes.rows
      .filter((r: Record<string, any>) => {
        const roles: string[] = r.roles || [];
        if (roles.length === 0) return true;
        return userRole && roles.includes(userRole);
      })
      .map((r: Record<string, any>) => ({
        dashboardCode: r.dashboard_code || r.id,
        labelEn: r.label_en || 'Dashboard',
        labelAr: r.label_ar || 'لوحة',
        moduleCode: r.module_code,
        roles: r.roles || [],
      }));

    const pages: UiPageEntry[] = pagesRes.rows
      .filter((r: Record<string, any>) => {
        const reqPerms: string[] = r.requires_permissions || [];
        if (reqPerms.length === 0) return entitledModuleCodes.has(r.module_code);
        return reqPerms.some((p: string) => userPermissions.has(p));
      })
      .map((r: Record<string, any>) => ({
        pageCode: r.page_code,
        moduleCode: r.module_code,
        route: r.route,
        layout: r.layout || 'full',
        requiresPermissions: r.requires_permissions || [],
        requiresModuleActive: r.requires_module_active ?? true,
        navVisibility: r.nav_visibility || 'entitled',
      }));

    const response: UiConfigResponse = {
      modules,
      pages,
      actions,
      dashboards,
      permissions,
      rbacSource: process.env.RBAC_SOURCE || 'dynamic',
      generatedAt: new Date().toISOString(),
    };

    res.json(response);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
}));

router.post('/invalidate', auditMiddleware('platform.ui_config.create'), requirePermission('admin.system.write'), asyncHandler(async (_req: Request, res: Response) => {
  res.json({ invalidated: true });
}));

export default router;
