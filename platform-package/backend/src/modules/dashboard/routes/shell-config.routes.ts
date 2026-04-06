import { auditMiddleware } from '../../../platform/dos/http/middleware/audit';
import { Router } from 'express';
import { authenticate } from '../../../platform/dauth';
import { requirePermission } from '../../../platform/dauth';
import { asyncHandler } from '../../../platform/dos/http/error-handling/async-handler';

import {
  getModuleShellConfig,
  saveUserShellPreference,
  saveTenantShellOverride,
  saveRoleShellOverride,
  removeShellOverride,
  listUserPreferences,
  listTenantConfig,
} from '../../platform/controllers/shell-config.controller';

const router = Router();
router.use(auditMiddleware('platform'));

router.use(authenticate);

router.get('/config/:moduleCode', requirePermission('shell.ui.read'), asyncHandler(getModuleShellConfig as any));

router.put('/preferences/:moduleCode', auditMiddleware('platform.shell_config.update'), requirePermission('shell.ui.write'), asyncHandler(saveUserShellPreference as any));

router.get('/preferences', requirePermission('shell.ui.read'), asyncHandler(listUserPreferences as any));

router.put('/tenant/:moduleCode', auditMiddleware('platform.shell_config.update'), requirePermission('admin.system.shell'), asyncHandler(saveTenantShellOverride as any));

router.put('/role/:moduleCode/:roleCode', auditMiddleware('platform.shell_config.update'), requirePermission('admin.system.shell'), asyncHandler(saveRoleShellOverride as any));

router.delete('/override/:moduleCode/:scopeKey', auditMiddleware('platform.shell_config.delete'), requirePermission('admin.system.shell'), asyncHandler(removeShellOverride as any));

router.get('/tenant', requirePermission('shell.ui.read'), asyncHandler(listTenantConfig as any));

export default router;
