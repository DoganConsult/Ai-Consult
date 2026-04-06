/**
 * Packaged ownership model: module + tasks + roles with keywords (KW) per entity.
 * Used for discovery, nav, guards, and consistency checks. One package per module.
 */

export interface ModuleTask {
  /** Task key (e.g. nav key or page code). */
  key: string;
  labelEn: string;
  labelAr: string;
  /** Permission required to access (e.g. foundation:read, admin:read). */
  permission?: string;
  /** Frontend route path if applicable. */
  route?: string;
  /** Keywords for search and tagging. */
  keywords: string[];
}

export interface ModuleRole {
  /** Role code (e.g. tenant_admin, grc_manager). */
  roleCode: string;
  labelEn?: string;
  labelAr?: string;
  /** Keywords for search and tagging. */
  keywords: string[];
}

export interface ModulePackage {
  /** Module code (must match guards.module and nav module_code). */
  moduleCode: string;
  labelEn: string;
  labelAr: string;
  /** Keywords for the module (discovery, search). */
  keywords: string[];
  /** Backend API mount path prefix(es) for this module. */
  apiPrefixes?: string[];
  /** Tasks (pages/capabilities) in this module. */
  tasks: ModuleTask[];
  /** Roles that can access this module (allowed set). */
  roles: ModuleRole[];
}
