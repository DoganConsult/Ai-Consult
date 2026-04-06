// ============================================
// DOS Navigation — Type System
// Enterprise-grade types for DB-driven navigation
// composition, versioning, admin, diagnostics
// ============================================

// --------------- Enums / Literals ---------------

export type NavigationItemType = 'link' | 'group' | 'divider';
export type NavigationSection = 'primary' | 'secondary' | 'utility';
export type NavigationAudience = 'all' | 'internal' | 'external' | 'admin';

export type NavigationEntryStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'published'
  | 'suspended'
  | 'archived';

export type NavigationAuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'publish'
  | 'rollback'
  | 'bulk_reorder'
  | 'bulk_toggle'
  | 'suspend'
  | 'archive';

export type NavigationAuditEntityType = 'registry' | 'override' | 'binding';

// --------------- DB Row Interfaces ---------------

export interface NavigationRegistryRow {
  nav_key: string;
  parent_nav_key: string | null;
  label_en: string;
  label_ar: string;
  route: string | null;
  icon: string | null;
  module_code: string | null;
  item_type: NavigationItemType;
  audience: NavigationAudience;
  sort_order: number;
  section: NavigationSection;
  is_system: boolean;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  page_code: string | null;
  permission_code: string | null;
  product_key: string | null;
  // Versioning columns
  version: number;
  schema_version: string;
  status: NavigationEntryStatus;
  published_at: Date | null;
  published_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface NavigationOverrideRow {
  override_id: string;
  nav_key: string;
  enabled: boolean;
  label_en: string | null;
  label_ar: string | null;
  route: string | null;
  icon: string | null;
  module_code: string | null;
  sort_order: number | null;
  metadata_patch: Record<string, unknown> | null;
  applies_to_role: string | null;
  applies_to_dashboard: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NavigationRoleBindingRow {
  binding_id: string;
  nav_key: string;
  role_code: string;
  is_allowed: boolean;
  created_at: Date;
}

export interface NavigationVersionHistoryRow {
  history_id: string;
  nav_key: string;
  version: number;
  snapshot: Record<string, unknown>;
  action: NavigationAuditAction;
  actor_id: string;
  created_at: Date;
}

// --------------- DTO Interfaces ---------------

export interface NavigationMenuItemDto {
  navKey: string;
  parentNavKey: string | null;
  labelEn: string;
  labelAr: string;
  route: string | null;
  icon: string | null;
  moduleCode: string | null;
  itemType: NavigationItemType;
  sortOrder: number;
  section: NavigationSection;
  permissionCode: string | null;
  pageCode: string | null;
  metadata: Record<string, unknown> | null;
  status: NavigationEntryStatus;
  isSystem: boolean;
  children?: NavigationMenuItemDto[];
}

export interface NavigationMenuResponseDto {
  primary: NavigationMenuItemDto[];
  secondary: NavigationMenuItemDto[];
  utility: NavigationMenuItemDto[];
  meta: {
    tenantId: string;
    roleCode: string | null;
    moduleCount: number;
    itemCount: number;
    resolvedAt: string;
    fromCache: boolean;
  };
}

export interface NavigationBreadcrumbDto {
  navKey: string;
  labelEn: string;
  labelAr: string;
  route: string | null;
  icon: string | null;
}

export interface NavigationCommandPaletteItemDto {
  navKey: string;
  labelEn: string;
  labelAr: string;
  route: string;
  icon: string | null;
  moduleCode: string | null;
  section: NavigationSection;
  keywords: string[];
}

// --------------- Composition Context (Multi-Layer) ---------------

/**
 * Full composition context spanning all 7 layers:
 *   1. Platform — productKey, includeSystemItems
 *   2. Product — productKey determines product nav bundle
 *   3. Module — modules[] from effective-modules (module entitlements)
 *   4. Tenant — tenantId, tenantSettings (industry/plan/org_type)
 *   5. Role — roleCode, functionalRoles[], accessProfiles[], permissions[]
 *   6. User — locale, userPreferences (pinned, recent, sidebar state)
 *   7. Scope — scopes[] (region, department, business_unit filtering)
 */
export interface NavigationCompositionContext {
  // Layer 1: Platform
  productKey: string;
  includeSystemItems: boolean;

  // Layer 2: Module (entitlement-filtered)
  modules: string[];

  // Layer 3: Tenant
  tenantId: string;
  tenantSettings?: TenantNavSettings | null;

  // Layer 4: Role (multi-role, not just single roleCode)
  roleCode: string | null;
  functionalRoles?: string[];
  accessProfiles?: string[];
  permissions?: string[];

  // Layer 5: User profile
  userId?: string;
  locale: 'en' | 'ar';
  userPreferences?: UserNavPreferences | null;

  // Layer 6: Scope (data isolation)
  scopes?: NavigationScope[];
}

/** Tenant-level settings that affect navigation composition */
export interface TenantNavSettings {
  industry?: string | null;
  orgType?: string | null;
  subscriptionPlan?: string | null;
  enforcementMode?: string | null;
  customNavRules?: Record<string, boolean>;
}

/** User-level preferences that affect navigation personalization */
export interface UserNavPreferences {
  sidebarCollapsed?: boolean;
  pinnedNavKeys?: string[];
  recentPages?: string[];
  dashboardLayout?: 'standard' | 'compact' | 'expanded';
  favoriteModules?: string[];
  hiddenNavKeys?: string[];
}

/** Scope binding for data-isolated navigation */
export interface NavigationScope {
  moduleCode: string;
  scopeType: string;
  scopeId: string;
}

// --------------- Admin DTOs ---------------

export interface CreateNavRegistryDto {
  navKey: string;
  parentNavKey?: string | null;
  labelEn: string;
  labelAr: string;
  route?: string | null;
  icon?: string | null;
  moduleCode?: string | null;
  itemType: NavigationItemType;
  section?: NavigationSection;
  audience?: NavigationAudience;
  sortOrder?: number;
  permissionCode?: string | null;
  pageCode?: string | null;
  productKey?: string | null;
  metadata?: Record<string, unknown> | null;
  isSystem?: boolean;
}

export interface UpdateNavRegistryDto {
  parentNavKey?: string | null;
  labelEn?: string;
  labelAr?: string;
  route?: string | null;
  icon?: string | null;
  moduleCode?: string | null;
  itemType?: NavigationItemType;
  section?: NavigationSection;
  audience?: NavigationAudience;
  sortOrder?: number;
  permissionCode?: string | null;
  pageCode?: string | null;
  productKey?: string | null;
  metadata?: Record<string, unknown> | null;
  isSystem?: boolean;
}

export interface CreateNavOverrideDto {
  navKey: string;
  appliesToRole?: string | null;
  appliesToDashboard?: string | null;
  enabled?: boolean;
  labelEn?: string | null;
  labelAr?: string | null;
  route?: string | null;
  icon?: string | null;
  moduleCode?: string | null;
  sortOrder?: number | null;
  metadataPatch?: Record<string, unknown> | null;
}

export interface UpdateNavOverrideDto {
  enabled?: boolean;
  labelEn?: string | null;
  labelAr?: string | null;
  route?: string | null;
  icon?: string | null;
  moduleCode?: string | null;
  sortOrder?: number | null;
  metadataPatch?: Record<string, unknown> | null;
}

export interface CreateNavBindingDto {
  navKey: string;
  roleCode: string;
  isAllowed: boolean;
}

export interface BulkReorderItem {
  navKey: string;
  sortOrder: number;
}

// --------------- Diagnostics ---------------

export interface NavigationDiagnosticsReport {
  moduleCode: 'navigation';
  healthy: boolean;
  checks: DiagnosticsCheck[];
  orphans: OrphanReport[];
  circularRefs: CircularRefReport[];
  brokenRoutes: BrokenRouteReport[];
  missingPermissions: MissingPermReport[];
  staleDrafts: string[];
  checkedAt: string;
}

export interface DiagnosticsCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface OrphanReport {
  navKey: string;
  parentNavKey: string;
  reason: string;
}

export interface CircularRefReport {
  cycle: string[];
}

export interface BrokenRouteReport {
  navKey: string;
  route: string;
  reason: string;
}

export interface MissingPermReport {
  navKey: string;
  permissionCode: string;
}

// --------------- Impact Analysis ---------------

export interface NavigationImpactReport {
  navKey: string;
  affectedRoles: string[];
  affectedModules: string[];
  childCount: number;
  overrideCount: number;
  bindingCount: number;
  brokenReferences: string[];
  validationErrors: string[];
  safe: boolean;
}

// --------------- Audit ---------------

export interface NavigationAuditEntry {
  tenantId: string;
  actorId: string;
  action: NavigationAuditAction;
  entityType: NavigationAuditEntityType;
  entityId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
}

// --------------- Seed / Registration ---------------

export interface NavigationSeedItem {
  navKey: string;
  parentNavKey?: string | null;
  labelEn: string;
  labelAr: string;
  route?: string | null;
  icon?: string | null;
  moduleCode?: string | null;
  itemType: NavigationItemType;
  section: NavigationSection;
  audience?: NavigationAudience;
  sortOrder: number;
  permissionCode?: string | null;
  pageCode?: string | null;
  productKey: string;
  metadata?: Record<string, unknown> | null;
  isSystem?: boolean;
}

export interface NavigationSyncReport {
  inserted: number;
  updated: number;
  skipped: number;
  drift: Array<{ navKey: string; field: string; dbValue: unknown; codeValue: unknown }>;
}
