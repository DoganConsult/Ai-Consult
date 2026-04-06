import type { Pool } from 'pg';
import type {
  ConfigDefinition,
  ConfigLock,
  ConfigScopeType,
  ConfigValueRecord,
  ConfigValueSource,
} from './config.types';
import type { ConfigDefinitionCreateInput, ConfigDefinitionUpdateInput } from './config.schemas';

// Mapping helpers to match db snake_case to TS camelCase
function mapDefinition(row: any): ConfigDefinition {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    description: row.description,
    ownerDomain: row.owner_domain,
    category: row.category,
    valueType: row.value_type,
    allowedScopes: row.allowed_scopes,
    defaultValue: row.default_value,
    validationSchema: row.validation_schema,
    enumValues: row.enum_values,
    isSecret: row.is_secret,
    isRequired: row.is_required,
    isOverridable: row.is_overridable,
    isLockable: row.is_lockable,
    requiresRestart: row.requires_restart,
    deploymentOnly: row.deployment_only,
    sdkExposable: row.sdk_exposable,
    uiExposable: row.ui_exposable,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapValue(row: any): ConfigValueRecord {
  return {
    id: row.id,
    definitionId: row.definition_id,
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    value: row.value,
    valueHash: row.value_hash,
    isEncrypted: row.is_encrypted,
    source: row.source,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLock(row: any): ConfigLock {
  return {
    id: row.id,
    definitionId: row.definition_id,
    lockedAtScopeType: row.locked_at_scope_type,
    lockedAtScopeId: row.locked_at_scope_id,
    lockBehavior: row.lock_behavior,
    reason: row.reason,
    isActive: row.is_active,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

function mapAudit(row: any): unknown {
  return {
    id: row.id,
    definitionId: row.definition_id,
    configKey: row.config_key,
    action: row.action,
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    actorUserId: row.actor_user_id,
    actorRoleCode: row.actor_role_code,
    oldValue: row.old_value,
    newValue: row.new_value,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export class ConfigRepository {
  constructor(private readonly db: Pool) {}

  async findDefinitionByKey(key: string): Promise<ConfigDefinition | null> {
    const result = await this.db.query(`select * from config_definitions where key = $1 limit 1`, [key]);
    return result.rows[0] ? mapDefinition(result.rows[0]) : null;
  }

  async listDefinitions(): Promise<ConfigDefinition[]> {
    const result = await this.db.query(`select * from config_definitions order by key asc`);
    return result.rows.map(mapDefinition);
  }

  async createDefinition(input: ConfigDefinitionCreateInput, actorUserId?: string): Promise<ConfigDefinition> {
    const result = await this.db.query(
      `insert into config_definitions
       (key, label, description, owner_domain, category, value_type, allowed_scopes, default_value, validation_schema, enum_values,
        is_secret, is_required, is_overridable, is_lockable, requires_restart, deployment_only, sdk_exposable, ui_exposable,
        created_by, updated_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$19)
       returning *`,
      [
        input.key,
        input.label,
        input.description ?? null,
        input.ownerDomain,
        input.category,
        input.valueType,
        input.allowedScopes,
        input.defaultValue ?? null,
        input.validationSchema ?? null,
        input.enumValues ?? [],
        input.isSecret,
        input.isRequired,
        input.isOverridable,
        input.isLockable,
        input.requiresRestart,
        input.deploymentOnly,
        input.sdkExposable,
        input.uiExposable,
        actorUserId ?? null,
      ],
    );
    return mapDefinition(result.rows[0]);
  }

  async updateDefinition(id: string, input: ConfigDefinitionUpdateInput, actorUserId?: string): Promise<ConfigDefinition> {
    const current = await this.db.query(`select * from config_definitions where id = $1 limit 1`, [id]);
    if (!current.rows[0]) throw new Error(`Definition not found: ${id}`);
    const row = current.rows[0];
    const result = await this.db.query(
      `update config_definitions set
        label = $2,
        description = $3,
        owner_domain = $4,
        category = $5,
        value_type = $6,
        allowed_scopes = $7,
        default_value = $8,
        validation_schema = $9,
        enum_values = $10,
        is_secret = $11,
        is_required = $12,
        is_overridable = $13,
        is_lockable = $14,
        requires_restart = $15,
        deployment_only = $16,
        sdk_exposable = $17,
        ui_exposable = $18,
        updated_by = $19,
        updated_at = now()
       where id = $1
       returning *`,
      [
        id,
        input.label ?? row.label,
        input.description ?? row.description,
        input.ownerDomain ?? row.owner_domain,
        input.category ?? row.category,
        input.valueType ?? row.value_type,
        input.allowedScopes ?? row.allowed_scopes,
        input.defaultValue ?? row.default_value,
        input.validationSchema ?? row.validation_schema,
        input.enumValues ?? row.enum_values,
        input.isSecret ?? row.is_secret,
        input.isRequired ?? row.is_required,
        input.isOverridable ?? row.is_overridable,
        input.isLockable ?? row.is_lockable,
        input.requiresRestart ?? row.requires_restart,
        input.deploymentOnly ?? row.deployment_only,
        input.sdkExposable ?? row.sdk_exposable,
        input.uiExposable ?? row.ui_exposable,
        actorUserId ?? null,
      ],
    );
    return mapDefinition(result.rows[0]);
  }

  async upsertValue(input: {
    definitionId: string;
    scopeType: ConfigScopeType;
    scopeId: string;
    value: unknown;
    source: ConfigValueSource;
    notes?: string;
    isEncrypted?: boolean;
    valueHash?: string | null;
    actorUserId?: string;
  }): Promise<ConfigValueRecord> {
    const result = await this.db.query(
      `insert into config_values
       (definition_id, scope_type, scope_id, value, source, notes, is_encrypted, value_hash, created_by, updated_by)
       values ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$9)
       on conflict (definition_id, scope_type, scope_id)
       do update set
         value = excluded.value,
         source = excluded.source,
         notes = excluded.notes,
         is_encrypted = excluded.is_encrypted,
         value_hash = excluded.value_hash,
         updated_by = excluded.updated_by,
         updated_at = now()
       returning *`,
      [
        input.definitionId,
        input.scopeType,
        input.scopeId,
        JSON.stringify(input.value),
        input.source,
        input.notes ?? null,
        input.isEncrypted ?? false,
        input.valueHash ?? null,
        input.actorUserId ?? null,
      ],
    );
    return mapValue(result.rows[0]);
  }

  async getValue(definitionId: string, scopeType: ConfigScopeType, scopeId: string): Promise<ConfigValueRecord | null> {
    const result = await this.db.query(
      `select * from config_values where definition_id = $1 and scope_type = $2 and scope_id = $3 and is_active = true limit 1`,
      [definitionId, scopeType, scopeId],
    );
    return result.rows[0] ? mapValue(result.rows[0]) : null;
  }

  async getValuesForDefinition(
    definitionId: string,
    scopes: Array<{ scopeType: ConfigScopeType; scopeId: string }>,
  ): Promise<ConfigValueRecord[]> {
    if (scopes.length === 0) return [];
    const params: unknown[] = [definitionId];
    const tuples = scopes.map((scope, idx) => {
      params.push(scope.scopeType, scope.scopeId);
      const base = 2 + idx * 2;
      return `($${base}, $${base + 1})`;
    });
    const result = await this.db.query(
      `select * from config_values
       where definition_id = $1
         and is_active = true
         and (scope_type, scope_id) in (${tuples.join(', ')})`,
      params,
    );
    return result.rows.map(mapValue);
  }

  async createLock(input: {
    definitionId: string;
    lockedAtScopeType: ConfigScopeType;
    lockedAtScopeId: string;
    lockBehavior: 'no_override_below';
    reason?: string;
    actorUserId?: string;
  }): Promise<void> {
    await this.db.query(
      `insert into config_locks
       (definition_id, locked_at_scope_type, locked_at_scope_id, lock_behavior, reason, created_by)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (definition_id, locked_at_scope_type, locked_at_scope_id)
       do update set
         lock_behavior = excluded.lock_behavior,
         reason = excluded.reason,
         is_active = true`,
      [
        input.definitionId,
        input.lockedAtScopeType,
        input.lockedAtScopeId,
        input.lockBehavior,
        input.reason ?? null,
        input.actorUserId ?? null,
      ],
    );
  }

  async getActiveLocks(definitionId: string): Promise<ConfigLock[]> {
    const result = await this.db.query(
      `select * from config_locks where definition_id = $1 and is_active = true`,
      [definitionId],
    );
    return result.rows.map(mapLock);
  }

  async getAuditLogs(configKey: string): Promise<any[]> {
    const result = await this.db.query(
      `select * from config_audit_logs where config_key = $1 order by created_at desc`,
      [configKey]
    );
    return result.rows.map(mapAudit);
  }

  async deleteValue(definitionId: string, scopeType: ConfigScopeType, scopeId: string): Promise<void> {
    await this.db.query(
      `delete from config_values where definition_id = $1 and scope_type = $2 and scope_id = $3`,
      [definitionId, scopeType, scopeId]
    );
  }

  async deleteLock(definitionId: string, lockedAtScopeType: ConfigScopeType, lockedAtScopeId: string): Promise<void> {
    await this.db.query(
      `delete from config_locks where definition_id = $1 and locked_at_scope_type = $2 and locked_at_scope_id = $3`,
      [definitionId, lockedAtScopeType, lockedAtScopeId]
    );
  }

  async writeAudit(input: {
    definitionId?: string | null;
    configKey: string;
    action: string;
    scopeType: string;
    scopeId: string;
    actorUserId?: string | null;
    actorRoleCode?: string | null;
    oldValue?: unknown;
    newValue?: unknown;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.query(
      `insert into config_audit_logs
       (definition_id, config_key, action, scope_type, scope_id, actor_user_id, actor_role_code, old_value, new_value, metadata)
       values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb)`,
      [
        input.definitionId ?? null,
        input.configKey,
        input.action,
        input.scopeType,
        input.scopeId,
        input.actorUserId ?? null,
        input.actorRoleCode ?? null,
        input.oldValue ? JSON.stringify(input.oldValue) : null,
        input.newValue ? JSON.stringify(input.newValue) : null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }
}
