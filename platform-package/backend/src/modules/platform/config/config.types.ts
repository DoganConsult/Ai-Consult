export const CONFIG_SCOPE_ORDER = [
  'environment',
  'deployment',
  'platform',
  'product',
  'module',
  'tenant',
  'organization',
  'user',
] as const;

export type ConfigScopeType = typeof CONFIG_SCOPE_ORDER[number];

export const CONFIG_VALUE_TYPES = [
  'string',
  'number',
  'boolean',
  'json',
  'string_array',
  'number_array',
  'enum',
  'secret',
] as const;

export type ConfigValueType = typeof CONFIG_VALUE_TYPES[number];

export type ConfigValueSource = 'manual' | 'bootstrap' | 'seed' | 'system' | 'sdk';

export interface AuthActor {
  userId?: string;
  roleCodes?: string[];
  permissions?: string[];
  tenantId?: string;
  organizationId?: string;
}

export interface ConfigDefinition {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  ownerDomain: string;
  category: string;
  valueType: ConfigValueType;
  allowedScopes: ConfigScopeType[];
  defaultValue?: unknown;
  validationSchema?: Record<string, unknown> | null;
  enumValues?: string[];
  isSecret: boolean;
  isRequired: boolean;
  isOverridable: boolean;
  isLockable: boolean;
  requiresRestart: boolean;
  deploymentOnly: boolean;
  sdkExposable: boolean;
  uiExposable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigValueRecord {
  id: string;
  definitionId: string;
  scopeType: ConfigScopeType;
  scopeId: string;
  value: unknown;
  valueHash?: string | null;
  isEncrypted: boolean;
  source: ConfigValueSource;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigLock {
  id: string;
  definitionId: string;
  lockedAtScopeType: ConfigScopeType;
  lockedAtScopeId: string;
  lockBehavior: 'no_override_below';
  reason?: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy?: string | null;
}

export interface EffectiveConfigResult {
  key: string;
  effectiveValue: unknown;
  resolvedFromScopeType: ConfigScopeType | 'default';
  resolvedFromScopeId: string | 'definition';
  resolutionPath: Array<{
    scopeType: ConfigScopeType | 'default';
    scopeId: string;
    hit: boolean;
  }>;
  lockedBy?: {
    scopeType: ConfigScopeType;
    scopeId: string;
  } | null;
}

export interface ScopeNode {
  scopeType: ConfigScopeType;
  scopeId: string;
}
