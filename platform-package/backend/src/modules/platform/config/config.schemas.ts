import { z } from 'zod';

export const ConfigScopeTypeSchema = z.enum([
  'environment',
  'deployment',
  'platform',
  'product',
  'module',
  'tenant',
  'organization',
  'user',
]);

export const ConfigValueTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'json',
  'string_array',
  'number_array',
  'enum',
  'secret',
]);

export const JsonValueSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ])
);

export const ConfigDefinitionCreateSchema = z.object({
  key: z.string().min(3).max(255).regex(/^[a-z0-9_.-]+$/),
  label: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  ownerDomain: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  valueType: ConfigValueTypeSchema,
  allowedScopes: z.array(ConfigScopeTypeSchema).min(1),
  defaultValue: JsonValueSchema.optional(),
  validationSchema: z.record(z.string(), JsonValueSchema).optional(),
  enumValues: z.array(z.string()).optional(),
  isSecret: z.boolean().default(false),
  isRequired: z.boolean().default(false),
  isOverridable: z.boolean().default(true),
  isLockable: z.boolean().default(true),
  requiresRestart: z.boolean().default(false),
  deploymentOnly: z.boolean().default(false),
  sdkExposable: z.boolean().default(false),
  uiExposable: z.boolean().default(true),
});

export const ConfigDefinitionUpdateSchema = ConfigDefinitionCreateSchema.partial();

export const ConfigValueUpsertSchema = z.object({
  key: z.string().min(3).max(255),
  scopeType: ConfigScopeTypeSchema,
  scopeId: z.string().min(1).max(255),
  value: JsonValueSchema,
  source: z.enum(['manual', 'bootstrap', 'seed', 'system', 'sdk']).default('manual'),
  notes: z.string().max(2000).optional(),
});

export const ConfigResolveQuerySchema = z.object({
  key: z.string().min(3).max(255),
  scopeType: ConfigScopeTypeSchema,
  scopeId: z.string().min(1).max(255),
  includePath: z.coerce.boolean().optional().default(true),
});

export const ConfigLockSchema = z.object({
  key: z.string().min(3).max(255),
  lockedAtScopeType: ConfigScopeTypeSchema,
  lockedAtScopeId: z.string().min(1).max(255),
  lockBehavior: z.enum(['no_override_below']).default('no_override_below'),
  reason: z.string().max(2000).optional(),
});

export const ConfigBulkResolveSchema = z.object({
  keys: z.array(z.string().min(3).max(255)).min(1).max(100),
  scopeType: ConfigScopeTypeSchema,
  scopeId: z.string().min(1).max(255),
  includePath: z.boolean().optional().default(true),
});

export type ConfigBulkResolveInput = z.infer<typeof ConfigBulkResolveSchema>;
export type ConfigDefinitionCreateInput = z.infer<typeof ConfigDefinitionCreateSchema>;
export type ConfigDefinitionUpdateInput = z.infer<typeof ConfigDefinitionUpdateSchema>;
export type ConfigValueUpsertInput = z.infer<typeof ConfigValueUpsertSchema>;
export type ConfigResolveQueryInput = z.infer<typeof ConfigResolveQuerySchema>;
export type ConfigLockInput = z.infer<typeof ConfigLockSchema>;
