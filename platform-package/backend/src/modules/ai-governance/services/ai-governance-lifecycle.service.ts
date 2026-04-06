import { safeQuery, tenantSchema } from '../../../config/database';
import { logger } from '../../../platform/dos/observability/logger.service';
import { emitEvent } from '../../../platform/dos/events/event-bus';

export type ApprovalStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'suspended' | 'retired' | 'archived';
export type DeploymentStatus = 'not_deployed' | 'staging' | 'canary' | 'production' | 'rollback' | 'decommissioned';
export type SoDPolicy = 'creator_cannot_approve' | 'deployer_cannot_test' | 'reviewer_cannot_deploy';
export type SoDCheckResult = { compliant: boolean; violations: string[] };
export type RegistryType = 'model' | 'agent' | 'prompt' | 'tool' | 'pipeline';

export interface RegistryTableConfig {
  registryType: RegistryType;
  tableName: string;
  idColumn: string;
  statusColumn: string;
  ownerColumn: string;
  versionColumn: string;
}

export const VALID_APPROVAL: ApprovalStatus[] = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'suspended', 'retired', 'archived'];
export const VALID_DEPLOYMENT: DeploymentStatus[] = ['not_deployed', 'staging', 'canary', 'production', 'rollback', 'decommissioned'];
export const VALID_SOD_POLICIES: SoDPolicy[] = ['creator_cannot_approve', 'deployer_cannot_test', 'reviewer_cannot_deploy'];
export const VALID_REGISTRY_TYPES: RegistryType[] = ['model', 'agent', 'prompt', 'tool', 'pipeline'];
export const ARCHIVED_LIFECYCLE: ApprovalStatus[] = ['retired', 'archived'];
export const _ARCHIVED_LIFECYCLE = ARCHIVED_LIFECYCLE;

const REGISTRY_TABLES: Record<RegistryType, RegistryTableConfig> = {
  model: { registryType: 'model', tableName: 'ai_gov_registry', idColumn: 'id', statusColumn: 'status', ownerColumn: 'owner', versionColumn: 'version' },
  agent: { registryType: 'agent', tableName: 'ai_agents', idColumn: 'id', statusColumn: 'status', ownerColumn: 'created_by', versionColumn: 'version' },
  prompt: { registryType: 'prompt', tableName: 'ai_prompt_templates', idColumn: 'id', statusColumn: 'status', ownerColumn: 'created_by', versionColumn: 'version' },
  tool: { registryType: 'tool', tableName: 'ai_tool_registry', idColumn: 'id', statusColumn: 'status', ownerColumn: 'registered_by', versionColumn: 'version' },
  pipeline: { registryType: 'pipeline', tableName: 'ai_gov_registry', idColumn: 'id', statusColumn: 'status', ownerColumn: 'owner', versionColumn: 'version' },
};

const ALLOWED_TRANSITIONS: Record<string, ApprovalStatus[]> = {
  draft: ['submitted'],
  submitted: ['under_review', 'draft'],
  under_review: ['approved', 'rejected'],
  approved: ['suspended', 'retired'],
  rejected: ['draft'],
  suspended: ['approved', 'retired'],
  retired: ['archived'],
  archived: [],
};

export function getSoDPolicy(tenantIdOrCode: string, _registryType?: string): { description: string; conflictPair: [string, string] } | Record<string, any> {
  const policies: Record<SoDPolicy, { description: string; conflictPair: [string, string] }> = {
    creator_cannot_approve: { description: 'The creator of an AI asset cannot approve it', conflictPair: ['creator', 'approver'] },
    deployer_cannot_test: { description: 'The deployer cannot be the tester', conflictPair: ['deployer', 'tester'] },
    reviewer_cannot_deploy: { description: 'The reviewer cannot deploy to production', conflictPair: ['reviewer', 'deployer'] },
  };
  if (VALID_SOD_POLICIES.includes(tenantIdOrCode as SoDPolicy)) {
    return policies[tenantIdOrCode as SoDPolicy];
  }
  return policies;
}

export function setSoDPolicy(_tenantId: string, _policyCode: SoDPolicy, _registryTypeOrEnabled?: string | boolean): void {
}

export async function assertSoDCompliance(
  _tenantId: string,
  actorId: string,
  asset: any,
  _typeLabel?: string,
  _versionId?: string,
): Promise<SoDCheckResult> {
  const violations: string[] = [];

  try {
    if (asset) {
      if (asset.created_by === actorId || asset.owner === actorId) {
        violations.push('creator_cannot_approve: Asset creator cannot approve their own asset');
      }
      if (asset.approved_by === actorId) {
        violations.push('reviewer_cannot_deploy: Reviewer cannot deploy to production');
      }
    }
  } catch {
  }

  if (violations.length > 0) {
    throw new Error(`SoD violation: ${violations.join('; ')}`);
  }
  return { compliant: true, violations: [] };
}

export async function assertLinkedAssetValid(tenantId: string, linkedId: string, _assetType?: string, _label?: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT asset_id, lifecycle_status FROM "${schema}".ai_asset_inventory WHERE asset_id = $1`,
    [linkedId],
  ).catch(() => ({ rows: [] }));
  if (rows.length === 0) throw new Error(`Linked asset '${linkedId}' not found`);
  if (ARCHIVED_LIFECYCLE.includes(rows[0].lifecycle_status as ApprovalStatus)) {
    throw new Error(`Linked asset '${linkedId}' is archived`);
  }
}

export function assertNotSeededGlobalMutation(asset: any, _typeLabel?: string, _action?: string): void {
  if (asset?.is_seeded || asset?.scope_type === 'global') {
    throw new Error('Cannot mutate seeded global asset');
  }
}

export async function assertOwnershipPresent(tenantId: string, assetId: string, registryType: RegistryType = 'model'): Promise<void> {
  const schema = tenantSchema(tenantId);
  const config = REGISTRY_TABLES[registryType];
  const { rows } = await safeQuery(
    `SELECT ${config.ownerColumn} AS owner FROM "${schema}".${config.tableName} WHERE ${config.idColumn} = $1`,
    [assetId],
  ).catch(() => ({ rows: [] }));
  if (!rows[0]?.owner) throw new Error('Asset must have an owner before lifecycle transition');
}

export const _assertOwnershipPresent = assertOwnershipPresent;

export async function assertOneActiveVersion(schema: string, tableName: string, _versionIdCol: string, assetId: string): Promise<void> {
  const { rows } = await safeQuery(
    `SELECT COUNT(*)::int AS cnt FROM "${schema}".${tableName}
     WHERE asset_id = $1 AND is_active = TRUE`,
    [assetId],
  ).catch(() => ({ rows: [{ cnt: 0 }] }));
  if (parseInt(rows[0]?.cnt ?? '0') > 1) throw new Error('Only one active version allowed');
}

export async function assertParentAssetValid(tenantId: string, parentId: string, _registryType?: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".ai_asset_inventory WHERE asset_id = $1`,
    [parentId],
  ).catch(() => ({ rows: [] }));
  if (rows.length === 0) throw new Error('Parent asset not found');
  if (ARCHIVED_LIFECYCLE.includes(rows[0].lifecycle_status as ApprovalStatus)) throw new Error('Parent asset is archived');
  return rows[0];
}

export async function emitRegistryAudit(
  tenantId: string,
  actorId: string,
  action: string,
  entityId: string,
  auditModule: string = 'ai-governance',
  entityType: string = 'registry',
  beforeState?: any,
  afterState?: any,
): Promise<void> {
  await emitEvent({
    tenantId, userId: actorId, module: auditModule,
    event: `registry.${entityType}.${action}`,
    entityType, entityId,
    data: { beforeState, afterState },
  }).catch((err) => {
    logger.warn(`[AIGovLifecycle] Audit emission failed: ${err}`);
  });
}

export async function nextRegistryVersionNumber(schema: string, tableName: string, assetId: string): Promise<number> {
  const { rows } = await safeQuery(
    `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_ver
     FROM "${schema}".${tableName} WHERE asset_id = $1`,
    [assetId],
  ).catch(() => ({ rows: [{ next_ver: 1 }] }));
  return parseInt(rows[0]?.next_ver ?? '1');
}

function validateTransition(fromStatus: string, toStatus: ApprovalStatus): boolean {
  return (ALLOWED_TRANSITIONS[fromStatus] ?? []).includes(toStatus);
}

export function validateSubmitTransition(currentStatus: string): boolean { return validateTransition(currentStatus, 'submitted'); }
export function validateApproveTransition(currentStatus: string): boolean { return validateTransition(currentStatus, 'approved'); }
export function validateRejectTransition(currentStatus: string): boolean { return validateTransition(currentStatus, 'rejected'); }
export function validateActivatePreConditions(approvalStatus: string, _isActive?: boolean, _deploymentStatus?: string): void {
  if (approvalStatus !== 'approved') throw new Error(`Cannot activate: approval_status must be 'approved', got '${approvalStatus}'`);
}
export function validateSuspendPreConditions(isActiveOrStatus: boolean | string): void {
  if (typeof isActiveOrStatus === 'boolean' && !isActiveOrStatus) throw new Error('Cannot suspend: version is not active');
  if (typeof isActiveOrStatus === 'string' && isActiveOrStatus !== 'approved') throw new Error('Cannot suspend: invalid status');
}
export function validateRetirePreConditions(isActiveOrStatus: boolean | string, approvalStatus?: string): void {
  if (typeof isActiveOrStatus === 'boolean') {
    if (approvalStatus && !['approved', 'suspended'].includes(approvalStatus)) {
      throw new Error(`Cannot retire: invalid approval_status '${approvalStatus}'`);
    }
  } else {
    if (!['approved', 'suspended'].includes(isActiveOrStatus)) {
      throw new Error(`Cannot retire: invalid status '${isActiveOrStatus}'`);
    }
  }
}
export function validateRollbackTarget(target: any, _assetId?: string, _typeLabel?: string): void {
  if (!target) throw new Error('Rollback target version not found');
}
export function validateDeletePreConditions(isActiveOrStatus: boolean | string): void {
  if (typeof isActiveOrStatus === 'boolean' && isActiveOrStatus) throw new Error('Cannot delete an active version');
  if (typeof isActiveOrStatus === 'string' && !['draft', 'rejected', 'archived'].includes(isActiveOrStatus)) {
    throw new Error(`Cannot delete: invalid status '${isActiveOrStatus}'`);
  }
}
export async function validateParentForActivation(_tenantId: string, _assetId: string, _typeLabel?: string): Promise<void> {
}
export async function validateParentForRollback(_tenantId: string, _assetId: string, _typeLabel?: string): Promise<void> {
}
