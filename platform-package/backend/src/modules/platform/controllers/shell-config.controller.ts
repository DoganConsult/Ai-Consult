// @ts-nocheck
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../../types/express.types';
import { ok } from '../../../errors/api-response';
import {
  getShellOverrides,
  upsertShellOverride,
  deleteShellOverride,
  getUserShellPreferences,
  getTenantShellConfig,
} from '../../../platform/dos/config/registry/shell-config.service';
import { getDefaultProductKey } from '../../../platform/deployment-profile';

export async function getModuleShellConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const moduleCode = req.params.moduleCode;
  const __product = (req.query.product as string) || getDefaultProductKey();
  const role = (req.query.role as string) || undefined;
  const userId = req.user?.userId;

  const rows = await getShellOverrides(req.tenantId!, moduleCode, role, userId);

  const overrides = rows.map(row => ({
    source: row.source,
    priority: row.priority,
    ...row.config_json,
  }));

  res.json(ok({ overrides }, req));
}

export async function saveUserShellPreference(req: AuthenticatedRequest, res: Response): Promise<void> {
  const moduleCode = req.params.moduleCode;
  const userId = req.user!.userId;

  const result = await upsertShellOverride(
    req.tenantId!,
    moduleCode,
    'user-preference',
    `user:${userId}`,
    50,
    req.body,
  );

  res.json(ok(result, req));
}

export async function saveTenantShellOverride(req: AuthenticatedRequest, res: Response): Promise<void> {
  const moduleCode = req.params.moduleCode;

  const result = await upsertShellOverride(
    req.tenantId!,
    moduleCode,
    'tenant-override',
    `tenant:${req.tenantId}`,
    20,
    req.body,
  );

  res.json(ok(result, req));
}

export async function saveRoleShellOverride(req: AuthenticatedRequest, res: Response): Promise<void> {
  const moduleCode = req.params.moduleCode;
  const roleCode = req.params.roleCode;

  const result = await upsertShellOverride(
    req.tenantId!,
    moduleCode,
    'role-override',
    `role:${roleCode}`,
    30,
    req.body,
  );

  res.json(ok(result, req));
}

export async function removeShellOverride(req: AuthenticatedRequest, res: Response): Promise<void> {
  const moduleCode = req.params.moduleCode;
  const scopeKey = req.params.scopeKey;

  await deleteShellOverride(req.tenantId!, moduleCode, scopeKey);
  res.json(ok({ deleted: true }, req));
}

export async function listUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const prefs = await getUserShellPreferences(req.tenantId!, userId);
  res.json(ok(prefs, req));
}

export async function listTenantConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const configs = await getTenantShellConfig(req.tenantId!);
  res.json(ok(configs, req));
}
