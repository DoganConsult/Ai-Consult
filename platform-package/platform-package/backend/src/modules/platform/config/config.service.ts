// @ts-nocheck
import type {
  AuthActor,
  ConfigDefinition,
  ConfigScopeType,
  EffectiveConfigResult,
  ScopeNode,
  ConfigValueRecord,
} from './config.types';
import type {
  ConfigDefinitionCreateInput,
  ConfigDefinitionUpdateInput,
  ConfigLockInput,
  ConfigValueUpsertInput,
  ConfigBulkResolveInput,
} from './config.schemas';
import { ConfigRepository } from './config.repository';
import type { SecretProvider } from './config.secret-provider';
import {
  buildResolutionPathFromAncestry,
  findBlockingLock,
  resolveFromRecords,
  type ScopeAncestryProvider,
} from './config.resolver';

const PLATFORM_ONLY_SCOPES: ConfigScopeType[] = ['environment', 'deployment', 'platform'];

export class ConfigService {
  constructor(
    private readonly repository: ConfigRepository,
    private readonly ancestryProvider: ScopeAncestryProvider,
    private readonly secretProvider: SecretProvider,
  ) {}

  async listDefinitions(): Promise<ConfigDefinition[]> {
    return this.repository.listDefinitions();
  }

  async getDefinitionByKey(key: string): Promise<ConfigDefinition | null> {
    return this.repository.findDefinitionByKey(key);
  }

  async getValue(key: string, scopeType: ConfigScopeType, scopeId: string) {
    const definition = await this.repository.findDefinitionByKey(key);
    if (!definition) throw new Error(`Unknown config key: ${key}`);
    const record = await this.repository.getValue(definition.id, scopeType, scopeId);
    if (!record) return null;
    if (record.isEncrypted && typeof record.value === 'object' && record.value !== null && 'ref' in record.value) {
      if (!definition.isSecret) return record; // Edge case
      return this.redactIfNeeded(definition, record);
    }
    return this.redactIfNeeded(definition, record);
  }

  async getAuditLogByKey(_actor: AuthActor | undefined, key: string): Promise<any[]> {
    const definition = await this.repository.findDefinitionByKey(key);
    if (!definition) throw new Error(`Unknown config key: ${key}`);
    return this.repository.getAuditLogs(key);
  }

  async createDefinition(actor: AuthActor | undefined, input: ConfigDefinitionCreateInput): Promise<ConfigDefinition> {
    return this.repository.createDefinition(input, actor?.userId);
  }

  async updateDefinition(actor: AuthActor | undefined, id: string, input: ConfigDefinitionUpdateInput): Promise<ConfigDefinition> {
    return this.repository.updateDefinition(id, input, actor?.userId);
  }

  async upsertValue(actor: AuthActor | undefined, input: ConfigValueUpsertInput) {
    const definition = await this.repository.findDefinitionByKey(input.key);
    if (!definition) throw new Error(`Unknown config key: ${input.key}`);

    this.assertScopeAllowed(definition, input.scopeType);
    this.assertDeploymentOnlyRule(definition, input.scopeType);
    this.assertOverridableRule(definition, input.scopeType);
    this.assertValueType(definition, input.value);

    const locks = await this.repository.getActiveLocks(definition.id);
    const blocking = findBlockingLock(locks, { scopeType: input.scopeType, scopeId: input.scopeId });
    if (blocking) throw new Error(`Config key is locked at ${blocking.scopeType}:${blocking.scopeId}`);

    let persistValue = input.value;
    let isEncrypted = false;
    let valueHash: string | null = null;

    if (definition.isSecret) {
      const raw = typeof input.value === 'string' ? input.value : JSON.stringify(input.value);
      const secret = await this.secretProvider.putSecret({
        key: input.key,
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        value: raw,
      });
      persistValue = { ref: secret.ref };
      isEncrypted = true;
      valueHash = secret.hash;
    }

    const previous = await this.repository.getValue(definition.id, input.scopeType, input.scopeId);

    const value = await this.repository.upsertValue({
      definitionId: definition.id,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      value: persistValue,
      source: input.source,
      notes: input.notes,
      isEncrypted,
      valueHash,
      actorUserId: actor?.userId,
    });

    await this.repository.writeAudit({
      definitionId: definition.id,
      configKey: definition.key,
      action: previous ? 'update' : 'create',
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      actorUserId: actor?.userId,
      actorRoleCode: actor?.roleCodes?.[0] ?? null,
      oldValue: previous?.value,
      newValue: value.value,
    });

    return this.redactIfNeeded(definition, value);
  }

  async resolve(key: string, target: ScopeNode): Promise<EffectiveConfigResult> {
    const definition = await this.repository.findDefinitionByKey(key);
    if (!definition) throw new Error(`Unknown config key: ${key}`);

    const ancestry = await this.ancestryProvider.buildPath(target);
    const resolutionPath = buildResolutionPathFromAncestry(target, ancestry);
    const values = await this.repository.getValuesForDefinition(definition.id, resolutionPath);
    const locks = await this.repository.getActiveLocks(definition.id);

    return resolveFromRecords({
      definition,
      target,
      resolutionPath,
      values,
      locks,
    });
  }

  async createLock(actor: AuthActor | undefined, input: ConfigLockInput): Promise<void> {
    const definition = await this.repository.findDefinitionByKey(input.key);
    if (!definition) throw new Error(`Unknown config key: ${input.key}`);
    if (!definition.isLockable) throw new Error(`Config key is not lockable: ${input.key}`);

    await this.repository.createLock({
      definitionId: definition.id,
      lockedAtScopeType: input.lockedAtScopeType,
      lockedAtScopeId: input.lockedAtScopeId,
      lockBehavior: input.lockBehavior,
      reason: input.reason,
      actorUserId: actor?.userId,
    });

    await this.repository.writeAudit({
      definitionId: definition.id,
      configKey: definition.key,
      action: 'lock',
      scopeType: input.lockedAtScopeType,
      scopeId: input.lockedAtScopeId,
      actorUserId: actor?.userId,
      actorRoleCode: actor?.roleCodes?.[0] ?? null,
      metadata: { reason: input.reason ?? null },
    });
  }

  async deleteValue(actor: AuthActor | undefined, key: string, scopeType: ConfigScopeType, scopeId: string): Promise<void> {
    const definition = await this.repository.findDefinitionByKey(key);
    if (!definition) throw new Error(`Unknown config key: ${key}`);

    const previous = await this.repository.getValue(definition.id, scopeType, scopeId);
    if (!previous) return;

    const locks = await this.repository.getActiveLocks(definition.id);
    const blocking = locks.find(lock => lock.lockedAtScopeType === scopeType && lock.lockedAtScopeId === scopeId);
    if (blocking) throw new Error(`Config key is locked and cannot be deleted at ${scopeType}:${scopeId}`);

    if (previous.isEncrypted && typeof previous.value === 'object' && previous.value !== null && 'ref' in previous.value) {
      await this.secretProvider.deleteSecret((previous.value).ref);
    }

    await this.repository.deleteValue(definition.id, scopeType, scopeId);

    await this.repository.writeAudit({
      definitionId: definition.id,
      configKey: definition.key,
      action: 'delete_value',
      scopeType,
      scopeId,
      actorUserId: actor?.userId,
      actorRoleCode: actor?.roleCodes?.[0] ?? null,
      oldValue: previous.value,
    });
  }

  async deleteLock(actor: AuthActor | undefined, key: string, scopeType: ConfigScopeType, scopeId: string): Promise<void> {
    const definition = await this.repository.findDefinitionByKey(key);
    if (!definition) throw new Error(`Unknown config key: ${key}`);

    await this.repository.deleteLock(definition.id, scopeType, scopeId);

    await this.repository.writeAudit({
      definitionId: definition.id,
      configKey: definition.key,
      action: 'delete_lock',
      scopeType,
      scopeId,
      actorUserId: actor?.userId,
      actorRoleCode: actor?.roleCodes?.[0] ?? null,
    });
  }

  private assertScopeAllowed(definition: ConfigDefinition, scopeType: ConfigScopeType): void {
    if (!definition.allowedScopes.includes(scopeType)) {
      throw new Error(`Scope ${scopeType} is not allowed for key ${definition.key}`);
    }
  }

  async bulkResolve(input: ConfigBulkResolveInput): Promise<EffectiveConfigResult[]> {
    const results: EffectiveConfigResult[] = [];
    for (const key of input.keys) {
      try {
        const result = await this.resolve(key, { scopeType: input.scopeType, scopeId: input.scopeId });
        results.push(result);
      } catch {
        results.push({
          key,
          effectiveValue: null,
          resolvedFromScopeType: 'default',
          resolvedFromScopeId: 'definition',
          resolutionPath: [],
          lockedBy: null,
        });
      }
    }
    return results;
  }

  private assertOverridableRule(definition: ConfigDefinition, scopeType: ConfigScopeType): void {
    if (!definition.isOverridable && !PLATFORM_ONLY_SCOPES.includes(scopeType)) {
      throw new Error(`Key ${definition.key} is not overridable and cannot be set at ${scopeType} scope`);
    }
  }

  private assertDeploymentOnlyRule(definition: ConfigDefinition, scopeType: ConfigScopeType): void {
    if (definition.deploymentOnly && !PLATFORM_ONLY_SCOPES.includes(scopeType)) {
      throw new Error(`Key ${definition.key} is deployment-only and cannot be set at ${scopeType} scope`);
    }
  }

  private assertValueType(definition: ConfigDefinition, value: unknown): void {
    switch (definition.valueType) {
      case 'boolean':
        if (typeof value !== 'boolean') throw new Error(`Key ${definition.key} requires boolean value`);
        break;
      case 'number':
        if (typeof value !== 'number') throw new Error(`Key ${definition.key} requires number value`);
        break;
      case 'string':
      case 'secret':
      case 'enum':
        if (typeof value !== 'string') throw new Error(`Key ${definition.key} requires string value`);
        break;
      case 'string_array':
        if (!Array.isArray(value) || value.some(v => typeof v !== 'string')) {
          throw new Error(`Key ${definition.key} requires string array value`);
        }
        break;
      case 'number_array':
        if (!Array.isArray(value) || value.some(v => typeof v !== 'number')) {
          throw new Error(`Key ${definition.key} requires number array value`);
        }
        break;
      case 'json':
        break;
      default:
        throw new Error(`Unhandled config value type: ${definition.valueType satisfies never}`);
    }

    if (definition.enumValues?.length && typeof value === 'string' && !definition.enumValues.includes(value)) {
      throw new Error(`Key ${definition.key} must be one of: ${definition.enumValues.join(', ')}`);
    }
  }

  private redactIfNeeded(definition: ConfigDefinition, record: ConfigValueRecord) {
    if (!definition.isSecret) return record;
    return {
      ...record,
      value: '***REDACTED***',
      isSecret: true,
    };
  }
}
