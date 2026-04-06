export type AliasClass =
  | 'canonical'
  | 'route_ui'
  | 'compatibility'
  | 'topology'
  | 'content_tag'
  | 'deprecated';

export interface AliasEntry {
  canonical: string;
  alias: string;
  classification: AliasClass;
  location: string;
  justification: string;
}

export const ALIAS_POLICY: AliasEntry[] = [
  {
    canonical: 'reporting',
    alias: 'reports',
    classification: 'route_ui',
    location: 'frontend/component-registry route group key + Angular route paths',
    justification: 'Route slug /reports/* is a UI path alias; moduleCode correctly maps to reporting',
  },
  {
    canonical: 'reporting',
    alias: 'reports',
    classification: 'route_ui',
    location: 'frontend/navigation.config.ts nav item id + route paths',
    justification: 'Nav item id and route paths use /reports/; module field is canonical reporting',
  },
  {
    canonical: 'reporting',
    alias: 'report',
    classification: 'compatibility',
    location: 'frontend/component-registry MODULE_ROUTE_GUARDS requiredPermission',
    justification: 'Permission token report:read is the stored RBAC permission; not a module code',
  },
  {
    canonical: 'reporting',
    alias: 'reports',
    classification: 'compatibility',
    location: 'frontend/module-ui.registry.ts permissionPrefix',
    justification: 'Permission prefix reports matches stored RBAC permission tokens; not module identity',
  },
];

export const FORBIDDEN_ALIAS_CONTEXTS = [
  'moduleCode',
  'module_code',
  'CANONICAL_MODULES',
  'PLATFORM_MODULES',
  'KNOWN_PERMISSION_PREFIXES',
  'GRC_CORE_MODULES',
  'moduleGuard',
  'tenant_module_entitlements.licensed_modules',
] as const;

export const CANONICAL_MODULE_IDENTITY = 'reporting';
export const ALLOWED_ROUTE_ALIASES = ['reports', '/reports/'] as const;

export function isCanonicalModuleCode(code: string): boolean {
  return code === CANONICAL_MODULE_IDENTITY;
}

export function isAllowedRouteAlias(value: string): boolean {
  return (ALLOWED_ROUTE_ALIASES as readonly string[]).includes(value);
}
