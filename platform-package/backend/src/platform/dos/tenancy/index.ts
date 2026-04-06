/**
 * @cross-layer-bridge modules/platform → platform/dos (approved migration path, Phase 3)
 * Tenant services will migrate to platform/dos/tenancy/ when modules/platform/ is decomposed.
 */
export {
  getConfig as getTenantConfig,
  updateConfig as updateTenantConfig,
  validateTenantConfig,
  getConfigHistory as getTenantConfigHistory,
  rollbackConfig as rollbackTenantConfig,
} from './tenant-config.service';

export {
  getProvisionedTenants,
} from '../../../modules/platform/services/tenant/job-scheduler.service';

export {
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  listTenants,
  getTenantBySlug,
  validateTenantAccess,
  TenantService,
} from './tenant.service';
export type {
  TenantRecord,
  CreateTenantInput,
  TenantFilters,
} from './tenant.service';

export {
  getTenantStatus,
  activateTenant,
  suspendTenant,
  reactivateTenant,
  decommissionTenant,
  getTenantStatusHistory,
  canTransitionTo,
  TenantStatusService,
} from './tenant-status.service';
export type {
  TenantStatusRecord,
  StatusTransitionRecord,
} from './tenant-status.service';

export {
  enforceTenantBoundary,
  validateCrossTenantAccess,
  getTenantBoundaryConfig,
  updateTenantBoundaryConfig,
  getTenantResourceCounts,
  validateTenantQuota,
  isTenantIsolationEnforced,
  TenantBoundaryService,
} from './tenant-boundary.service';
export type {
  BoundaryConfig,
  ResourceCounts,
  QuotaValidation,
} from './tenant-boundary.service';
