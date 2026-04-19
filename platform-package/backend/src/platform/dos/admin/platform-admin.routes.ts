import { Router, Request, Response } from 'express';
import { authenticate } from '../../dauth';
import { asyncHandler } from '../http/error-handling/async-handler';
import { safeQuery } from '../../../config/database/database';

const router = Router();

router.get('/overview', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const [tenants, workspaces, actors, profiles, roles, permissions] = await Promise.all([
    safeQuery(`SELECT count(*)::int AS count FROM tenants`).catch(() => ({ rows: [{ count: 0 }] })),
    safeQuery(`SELECT count(*)::int AS count FROM workspaces`).catch(() => ({ rows: [{ count: 0 }] })),
    safeQuery(`SELECT count(*)::int AS count FROM actors`).catch(() => ({ rows: [{ count: 0 }] })),
    safeQuery(`SELECT count(*)::int AS count FROM access_profiles`).catch(() => ({ rows: [{ count: 0 }] })),
    safeQuery(`SELECT count(*)::int AS count FROM functional_roles`).catch(() => ({ rows: [{ count: 0 }] })),
    safeQuery(`SELECT count(*)::int AS count FROM permissions`).catch(() => ({ rows: [{ count: 0 }] })),
  ]);
  res.json({
    tenants: tenants.rows[0]?.count ?? 0,
    workspaces: workspaces.rows[0]?.count ?? 0,
    actors: actors.rows[0]?.count ?? 0,
    accessProfiles: profiles.rows[0]?.count ?? 0,
    functionalRoles: roles.rows[0]?.count ?? 0,
    permissions: permissions.rows[0]?.count ?? 0,
    timestamp: new Date().toISOString(),
  });
}));

router.get('/access-profiles', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const result = await safeQuery(
    `SELECT ap.*, (SELECT count(*)::int FROM user_access_profiles uap WHERE uap.access_profile_id = ap.id) AS assigned_count
     FROM access_profiles ap ORDER BY ap.code`
  );
  res.json(result.rows);
}));

router.post('/access-profiles', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { code, name, description } = req.body;
  if (!code || !name) { res.status(400).json({ error: 'code and name required' }); return; }
  const result = await safeQuery(
    `INSERT INTO access_profiles (code, name, description) VALUES ($1, $2, $3) RETURNING *`,
    [code, name, description || null]
  );
  res.status(201).json(result.rows[0]);
}));

router.get('/functional-roles', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const result = await safeQuery(
    `SELECT fr.*, (SELECT count(*)::int FROM user_role_assignments ura WHERE ura.functional_role_id = fr.id) AS assigned_count
     FROM functional_roles fr ORDER BY fr.module_code, fr.code`
  );
  res.json(result.rows);
}));

router.post('/functional-roles', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { code, module_code, name, category } = req.body;
  if (!code || !name) { res.status(400).json({ error: 'code and name required' }); return; }
  const result = await safeQuery(
    `INSERT INTO functional_roles (code, module_code, name, category) VALUES ($1, $2, $3, $4) RETURNING *`,
    [code, module_code || 'platform', name, category || 'platform']
  );
  res.status(201).json(result.rows[0]);
}));

router.get('/permissions', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const result = await safeQuery( `SELECT * FROM permissions ORDER BY code`);
  res.json(result.rows);
}));

router.post('/permissions', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { code, description, module_code, resource, action } = req.body;
  if (!code) { res.status(400).json({ error: 'code required' }); return; }
  const result = await safeQuery(
    `INSERT INTO permissions (code, description, module_code, resource, action) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [code, description || null, module_code || null, resource || null, action || null]
  );
  res.status(201).json(result.rows[0]);
}));

router.get('/role-permissions', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const result = await safeQuery(
    `SELECT rp.*, fr.code AS role_code, fr.name AS role_name, p.code AS permission_code
     FROM role_permissions rp
     LEFT JOIN functional_roles fr ON fr.id = rp.functional_role_id
     LEFT JOIN permissions p ON p.id = rp.permission_id
     ORDER BY fr.code, p.code`
  );
  res.json(result.rows);
}));

router.post('/role-permissions', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { functional_role_id, permission_id } = req.body;
  if (!functional_role_id || !permission_id) { res.status(400).json({ error: 'functional_role_id and permission_id required' }); return; }
  const result = await safeQuery(
    `INSERT INTO role_permissions (functional_role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *`,
    [functional_role_id, permission_id]
  );
  res.status(201).json(result.rows[0] || { message: 'already exists' });
}));

router.get('/user-access/me', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) { res.status(401).json({ error: 'unauthenticated' }); return; }
  const [profiles, roles, delegations, permissions] = await Promise.all([
    safeQuery(
      `SELECT ap.* FROM user_access_profiles uap JOIN access_profiles ap ON ap.id = uap.access_profile_id WHERE uap.user_id = $1`, [userId]).catch(() => ({ rows: [] })),
    safeQuery(
      `SELECT fr.*, ura.scope, ura.authority_level FROM user_role_assignments ura JOIN functional_roles fr ON fr.id = ura.functional_role_id WHERE ura.user_id = $1`, [userId]).catch(() => ({ rows: [] })),
    safeQuery(
      `SELECT * FROM delegations WHERE delegate_id = $1 AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())`, [userId]).catch(() => ({ rows: [] })),
    safeQuery(
      `SELECT DISTINCT p.code FROM user_role_assignments ura
       JOIN role_permissions rp ON rp.functional_role_id = ura.functional_role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE ura.user_id = $1`, [userId]).catch(() => ({ rows: [] })),
  ]);
  const isSuperAdmin = profiles.rows.some((p: any) => p.code === 'platform_super_admin');
  res.json({
    userId,
    profiles: profiles.rows,
    roles: roles.rows,
    delegations: delegations.rows,
    permissions: permissions.rows.map((r: any) => r.code),
    isSuperAdmin,
  });
}));

router.get('/user-access/:userId', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const [profiles, roles, delegations] = await Promise.all([
    safeQuery(
      `SELECT ap.* FROM user_access_profiles uap JOIN access_profiles ap ON ap.id = uap.access_profile_id WHERE uap.user_id = $1`, [userId]),
    safeQuery(
      `SELECT fr.*, ura.scope, ura.authority_level FROM user_role_assignments ura JOIN functional_roles fr ON fr.id = ura.functional_role_id WHERE ura.user_id = $1`, [userId]),
    safeQuery(
      `SELECT * FROM delegations WHERE delegate_id = $1 AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())`, [userId]),
  ]);
  res.json({ userId, profiles: profiles.rows, roles: roles.rows, delegations: delegations.rows });
}));

router.post('/user-access/:userId/profiles', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { access_profile_id } = req.body;
  if (!access_profile_id) { res.status(400).json({ error: 'access_profile_id required' }); return; }
  await safeQuery(
    `INSERT INTO user_access_profiles (user_id, access_profile_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, access_profile_id]
  );
  res.status(201).json({ message: 'profile assigned' });
}));

router.post('/user-access/:userId/roles', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { functional_role_id, scope, authority_level } = req.body;
  if (!functional_role_id) { res.status(400).json({ error: 'functional_role_id required' }); return; }
  await safeQuery(
    `INSERT INTO user_role_assignments (user_id, functional_role_id, scope, authority_level) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
    [userId, functional_role_id, scope || null, authority_level || null]
  );
  res.status(201).json({ message: 'role assigned' });
}));

router.get('/delegations', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const result = await safeQuery( `SELECT * FROM delegations ORDER BY created_at DESC`);
  res.json(result.rows);
}));

router.post('/delegations', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { delegator_id, delegate_id, permission_scope, reason, expires_at } = req.body;
  if (!delegator_id || !delegate_id) { res.status(400).json({ error: 'delegator_id and delegate_id required' }); return; }
  const result = await safeQuery(
    `INSERT INTO delegations (delegator_id, delegate_id, permission_scope, reason, expires_at, status)
     VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *`,
    [delegator_id, delegate_id, permission_scope || null, reason || null, expires_at || null]
  );
  res.status(201).json(result.rows[0]);
}));

router.get('/sod-rules', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const result = await safeQuery( `SELECT * FROM sod_rules ORDER BY created_at DESC`);
  res.json(result.rows);
}));

router.post('/sod-rules', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { rule_code, conflicting_role_a, conflicting_role_b, description, severity } = req.body;
  if (!rule_code) { res.status(400).json({ error: 'rule_code required' }); return; }
  const result = await safeQuery(
    `INSERT INTO sod_rules (rule_code, conflicting_role_a, conflicting_role_b, description, severity)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [rule_code, conflicting_role_a || null, conflicting_role_b || null, description || null, severity || 'high']
  );
  res.status(201).json(result.rows[0]);
}));

router.get('/products', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const result = await safeQuery( `SELECT * FROM product_registry ORDER BY code`).catch(() => ({ rows: [] }));
  res.json(result.rows);
}));

router.post('/products/:productCode/enable', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { productCode } = req.params;
  await safeQuery(
    `UPDATE product_registry SET status = 'enabled', updated_at = NOW() WHERE code = $1`, [productCode]
  ).catch(() => {});
  res.json({ message: `product ${productCode} enabled` });
}));

router.post('/products/:productCode/disable', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { productCode } = req.params;
  await safeQuery(
    `UPDATE product_registry SET status = 'disabled', updated_at = NOW() WHERE code = $1`, [productCode]
  ).catch(() => {});
  res.json({ message: `product ${productCode} disabled` });
}));

router.get('/modules', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const result = await safeQuery( `SELECT * FROM module_registry ORDER BY code`).catch(() => ({ rows: [] }));
  res.json(result.rows);
}));

router.post('/modules/:moduleCode/enable', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { moduleCode } = req.params;
  await safeQuery(
    `UPDATE module_registry SET status = 'enabled', updated_at = NOW() WHERE code = $1`, [moduleCode]
  ).catch(() => {});
  res.json({ message: `module ${moduleCode} enabled` });
}));

router.post('/modules/:moduleCode/disable', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { moduleCode } = req.params;
  await safeQuery(
    `UPDATE module_registry SET status = 'disabled', updated_at = NOW() WHERE code = $1`, [moduleCode]
  ).catch(() => {});
  res.json({ message: `module ${moduleCode} disabled` });
}));

router.get('/feature-flags', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const result = await safeQuery( `SELECT * FROM feature_flags ORDER BY flag_code`).catch(() => ({ rows: [] }));
  res.json(result.rows);
}));

router.patch('/feature-flags/:flagCode', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { flagCode } = req.params;
  const { enabled, owner_layer } = req.body;
  await safeQuery(
    `UPDATE feature_flags SET enabled = $2, owner_layer = COALESCE($3, owner_layer), updated_at = NOW() WHERE flag_code = $1`,
    [flagCode, enabled ?? true, owner_layer || null]
  ).catch(() => {});
  res.json({ message: `flag ${flagCode} updated` });
}));

router.get('/platform-config', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const result = await safeQuery( `SELECT * FROM platform_operation_config ORDER BY config_key`).catch(() => ({ rows: [] }));
  res.json(result.rows);
}));

router.patch('/platform-config', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { config_key, config_value } = req.body;
  if (!config_key) { res.status(400).json({ error: 'config_key required' }); return; }
  await safeQuery(
    `INSERT INTO platform_operation_config (config_key, config_value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (config_key) DO UPDATE SET config_value = $2, updated_at = NOW()`,
    [config_key, JSON.stringify(config_value)]
  ).catch(() => {});
  res.json({ message: `config ${config_key} updated` });
}));

router.get('/audit-logs', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const result = await safeQuery(
    `SELECT * FROM platform_audit_logs ORDER BY created_at DESC LIMIT $1`, [limit]
  ).catch(() => ({ rows: [] }));
  res.json(result.rows);
}));

router.get('/system-events', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const result = await safeQuery(
    `SELECT * FROM system_events ORDER BY occurred_at DESC LIMIT $1`, [limit]
  ).catch(() => ({ rows: [] }));
  res.json(result.rows);
}));

router.get('/login-attempts', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const result = await safeQuery(
    `SELECT * FROM login_attempts ORDER BY attempted_at DESC LIMIT $1`, [limit]
  ).catch(() => ({ rows: [] }));
  res.json(result.rows);
}));

router.get('/governance-matrix', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    levels: [
      { level: 'platform', governor: 'platform_super_admin', controls: ['global settings', 'product registry', 'module registry', 'global features', 'environment/deployment profiles', 'tenant creation/suspension', 'cross-tenant observability', 'security policy baseline', 'AI governance core'] },
      { level: 'product', governor: 'product_admin', controls: ['product defaults', 'product settings', 'product nav exposure', 'product module bundles', 'product policies', 'product dashboards', 'product seed activation'] },
      { level: 'module', governor: 'module_admin', controls: ['module enable/disable', 'module config', 'module workflow settings', 'module queues/jobs', 'module user-role assignments', 'module reports'] },
      { level: 'tenant', governor: 'tenant_admin', controls: ['tenant config', 'workspace config', 'tenant users', 'tenant feature flags', 'enabled products/modules', 'branding', 'AI/provider settings', 'onboarding mode'] },
      { level: 'user', governor: 'standard_user', controls: ['actions per functional role', 'scoped actions', 'authority-gated actions', 'delegated actions'] },
      { level: 'feature', governor: 'feature_flag_admin', controls: ['feature flags', 'permission-gated actions', 'menu visibility', 'route visibility', 'workflow actions', 'AI/provider capabilities'] },
    ],
    authorizationChain: ['access_profile', 'functional_role', 'permission', 'scope', 'authority_level', 'sod_check', 'delegation'],
    accessProfiles: ['platform_super_admin', 'tenant_admin', 'security_admin', 'module_admin', 'standard_user', 'viewer', 'external_auditor'],
  });
}));

router.get('/tenant-activations', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const result = await safeQuery(
    `SELECT * FROM tenant_product_activation ORDER BY tenant_id, product_code`
  ).catch(() => ({ rows: [] }));
  res.json(result.rows);
}));

router.get('/ai/models', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const result = await safeQuery( `SELECT * FROM ai_model_registry ORDER BY provider, model_code`).catch(() => ({ rows: [] }));
  res.json(result.rows);
}));

router.get('/ai/agents', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const result = await safeQuery( `SELECT * FROM ai_agent_registry ORDER BY agent_code`).catch(() => ({ rows: [] }));
  res.json(result.rows);
}));

router.get('/ai/prompts', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const result = await safeQuery( `SELECT * FROM ai_prompt_registry ORDER BY prompt_code`).catch(() => ({ rows: [] }));
  res.json(result.rows);
}));

export default router;
