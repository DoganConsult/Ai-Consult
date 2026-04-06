// ============================================
// Shahin — Auto-CRUD Service
// AI-driven: returns available CRUD operations
// per module based on the user's role + permissions.
// No manual page design needed — the frontend
// auto-renders create/edit/delete buttons based
// on what this service returns.
// ============================================

import { getAllModuleCruds } from '../../../../platform/dos/modules/registry/module-crud-registry';
export type { FieldDef, FilterDef } from '../../../../platform/dos/modules/registry/module-crud-registry';

/** User role string type — maps to functional roles in the platform. */
export type UserRole = string;

/** Check if a role has a given permission — presentation hint only (Law 6). */
function canRole(_role: string, _perm: string): boolean {
  // Actual enforcement is at the API layer; this is a presentation hint.
  return true;
}

export interface CrudCapability {
  module: string;
  moduleEn: string;
  moduleAr: string;
  icon: string;
  route: string;
  apiBase: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  canBulk: boolean;
  fields: Array<{
    key: string;
    labelEn: string;
    labelAr: string;
    type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'email' | 'toggle';
    required: boolean;
    options?: { value: string; labelEn: string; labelAr: string }[];
    showInList: boolean;
    showInForm: boolean;
    editable: boolean;
  }>;
  filters: Array<{
    key: string;
    labelEn: string;
    labelAr: string;
    type: 'text' | 'select' | 'date-range';
    options?: { value: string; labelEn: string; labelAr: string }[];
  }>;
}

// Auto-CRUD visibility is a presentation hint (Law 6: frontend never owns permission truth).
// Actual permission enforcement happens at the API layer via requirePermission middleware.
// All CRUD capabilities are returned; the route layer enforces access.

// ── Main function: compute CRUD capabilities for a role ──

export function getAutoCrudForRole(role: string): CrudCapability[] {
  return getAllModuleCruds()
    .map(m => ({
      module: m.module,
      moduleEn: m.moduleEn,
      moduleAr: m.moduleAr,
      icon: m.icon,
      route: m.route,
      apiBase: m.apiBase,
      canCreate: canRole(role, m.writePerm),
      canRead: true,
      canUpdate: canRole(role, m.writePerm),
      canDelete: canRole(role, m.deletePerm),
      canExport: m.exportable && canRole(role, m.readPerm),
      canBulk: m.bulkable && canRole(role, m.writePerm),
      fields: m.fields.map(f => ({
        ...f,
        editable: f.editable && canRole(role, m.writePerm),
      })),
      filters: m.filters,
    }));
}

// ── Summary for dashboard display ──

export interface CrudSummary {
  role: UserRole;
  totalModules: number;
  canCreateCount: number;
  canUpdateCount: number;
  canDeleteCount: number;
  readOnlyCount: number;
  modules: Array<{
    module: string;
    moduleEn: string;
    moduleAr: string;
    icon: string;
    crud: string; // e.g. "CRUD", "CR--", "R---"
  }>;
}

export function getCrudSummary(role: UserRole): CrudSummary {
  const caps = getAutoCrudForRole(role);
  return {
    role,
    totalModules: caps.length,
    canCreateCount: caps.filter(c => c.canCreate).length,
    canUpdateCount: caps.filter(c => c.canUpdate).length,
    canDeleteCount: caps.filter(c => c.canDelete).length,
    readOnlyCount: caps.filter(c => !c.canCreate && !c.canUpdate && !c.canDelete).length,
    modules: caps.map(c => ({
      module: c.module,
      moduleEn: c.moduleEn,
      moduleAr: c.moduleAr,
      icon: c.icon,
      crud: `${c.canCreate ? 'C' : '-'}${c.canRead ? 'R' : '-'}${c.canUpdate ? 'U' : '-'}${c.canDelete ? 'D' : '-'}`,
    })),
  };
}
