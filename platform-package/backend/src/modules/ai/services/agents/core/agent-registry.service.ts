import { safeQuery, tenantSchema } from '../../../../../config/database';
import { getAssetById, getAssetByKey } from '../../../../ai-governance/services/ai/ai-asset-inventory.service';
import { SYSTEM_JOB_ACTOR } from '../../../../../platform/dos/constants/system-actors';
import {
  type ApprovalStatus,
  type DeploymentStatus,
  VALID_APPROVAL,
  VALID_DEPLOYMENT,
  _ARCHIVED_LIFECYCLE,
  assertNotSeededGlobalMutation,
  _assertOwnershipPresent,
  assertOneActiveVersion,
  assertLinkedAssetValid,
  assertParentAssetValid,
  assertSoDCompliance,
  emitRegistryAudit,
  nextRegistryVersionNumber,
  validateSubmitTransition,
  validateApproveTransition,
  validateRejectTransition,
  validateActivatePreConditions,
  validateSuspendPreConditions,
  validateRetirePreConditions,
  validateRollbackTarget,
  validateDeletePreConditions,
  validateParentForActivation,
  validateParentForRollback,
} from '../../../../ai-governance/services/ai-governance-lifecycle.service';
import { getFirstRow } from '../../../../../shared/data/db-utils';

export type { ApprovalStatus, DeploymentStatus };

export interface AgentVersion {
  agent_version_id: string;
  asset_id: string;
  version_number: number;
  agent_config: Record<string, any>;
  linked_prompt_asset_id: string | null;
  linked_model_asset_id: string | null;
  capabilities: any[];
  approval_status: ApprovalStatus;
  deployment_status: DeploymentStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  is_active: boolean;
  rollback_from_version_id: string | null;
  diff_summary: string | null;
  change_summary: string | null;
  notes: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentDraftInput {
  asset_id: string;
  agent_config: Record<string, any>;
  linked_prompt_asset_id?: string;
  linked_model_asset_id?: string;
  capabilities?: any[];
  change_summary?: string;
  notes?: string;
  created_by?: string;
}

export interface UpdateAgentDraftInput {
  agent_config?: Record<string, any>;
  linked_prompt_asset_id?: string | null;
  linked_model_asset_id?: string | null;
  capabilities?: any[];
  change_summary?: string;
  notes?: string;
  updated_by?: string;
}

export interface AgentVersionQuery {
  asset_id?: string;
  approval_status?: ApprovalStatus;
  deployment_status?: DeploymentStatus;
  is_active?: boolean;
  linked_prompt_asset_id?: string;
  linked_model_asset_id?: string;
  limit?: number;
  offset?: number;
}

const AUDIT_MODULE = 'ai-agent-registry';
const AUDIT_ENTITY_TYPE = 'agent_version';
const TABLE_NAME = 'ai_agent_registry';
const VERSION_ID_COL = 'agent_version_id';
const ASSET_TYPE_LABEL = 'agent';

async function emitAudit(
  tenantId: string,
  userId: string,
  action: string,
  entityId: string,
  before?: any,
  after?: any,
): Promise<void> {
  await emitRegistryAudit(tenantId, userId, action, entityId, AUDIT_MODULE, AUDIT_ENTITY_TYPE, before, after);
}

export async function getActiveAgentVersionForAsset(tenantId: string, assetId: string): Promise<AgentVersion | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".${TABLE_NAME}
     WHERE asset_id = $1 AND is_active = TRUE
     ORDER BY version_number DESC LIMIT 1`,
    [assetId],
  );
  return (getFirstRow(result) as AgentVersion) || null;
}

export async function getAgentVersionById(tenantId: string, versionId: string): Promise<AgentVersion | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".${TABLE_NAME} WHERE ${VERSION_ID_COL} = $1`,
    [versionId],
  );
  return (getFirstRow(result) as AgentVersion) || null;
}

export async function listAgentVersions(tenantId: string, q: AgentVersionQuery = {}): Promise<{ versions: AgentVersion[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const wheres: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (q.asset_id) { wheres.push(`asset_id = $${idx}`); params.push(q.asset_id); idx++; }
  if (q.approval_status) { wheres.push(`approval_status = $${idx}`); params.push(q.approval_status); idx++; }
  if (q.deployment_status) { wheres.push(`deployment_status = $${idx}`); params.push(q.deployment_status); idx++; }
  if (q.is_active !== undefined) { wheres.push(`is_active = $${idx}`); params.push(q.is_active); idx++; }

  const where = wheres.length > 0 ? `WHERE ${wheres.join(' AND ')}` : '';
  const limit = Math.min(q.limit || 50, 200);
  const offset = q.offset || 0;

  const [dataResult, countResult] = await Promise.all([
    safeQuery(
      `SELECT * FROM "${schema}".${TABLE_NAME} ${where} ORDER BY version_number DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    ),
    safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${schema}".${TABLE_NAME} ${where}`,
      params,
    ),
  ]);

  return {
    versions: dataResult.rows as AgentVersion[],
    total: getFirstRow(countResult)?.total || 0,
  };
}

export async function createAgentDraft(tenantId: string, input: CreateAgentDraftInput): Promise<AgentVersion> {
  const schema = tenantSchema(tenantId);
  const createdBy = input.created_by || SYSTEM_JOB_ACTOR;

  const parent = await assertParentAssetValid(tenantId, input.asset_id, ASSET_TYPE_LABEL);
  assertNotSeededGlobalMutation(parent, ASSET_TYPE_LABEL, 'create_draft');

  if (input.linked_prompt_asset_id) {
    await assertLinkedAssetValid(tenantId, input.linked_prompt_asset_id, 'prompt', 'linked_prompt');
  }
  if (input.linked_model_asset_id) {
    await assertLinkedAssetValid(tenantId, input.linked_model_asset_id, 'model', 'linked_model');
  }

  const versionNumber = await nextRegistryVersionNumber(schema, TABLE_NAME, input.asset_id);

  const result = await safeQuery(
    `INSERT INTO "${schema}".${TABLE_NAME}
       (asset_id, version_number, agent_config, linked_prompt_asset_id, linked_model_asset_id,
        capabilities, approval_status, deployment_status, is_active,
        change_summary, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,'draft','not_deployed',FALSE,$7,$8,$9)
     RETURNING *`,
    [
      input.asset_id, versionNumber,
      JSON.stringify(input.agent_config),
      input.linked_prompt_asset_id || null,
      input.linked_model_asset_id || null,
      JSON.stringify(input.capabilities || []),
      input.change_summary || null,
      input.notes || null,
      createdBy,
    ],
  );

  const draft = getFirstRow(result) as AgentVersion;
  await emitAudit(tenantId, createdBy, 'draft_created', draft.agent_version_id, null, draft);
  return draft;
}

export async function submitAgentVersion(tenantId: string, versionId: string, userId: string): Promise<AgentVersion> {
  const version = await getAgentVersionById(tenantId, versionId);
  if (!version) throw new Error('Agent version not found');

  if (!validateSubmitTransition(version.approval_status)) {
    throw new Error(`Cannot submit: current status is '${version.approval_status}'`);
  }

  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".${TABLE_NAME}
     SET approval_status = 'submitted', submitted_by = $1, submitted_at = NOW(), updated_by = $1, updated_at = NOW()
     WHERE ${VERSION_ID_COL} = $2 RETURNING *`,
    [userId, versionId],
  );

  const updated = getFirstRow(result) as AgentVersion;
  await emitAudit(tenantId, userId, 'submitted', versionId, version, updated);
  return updated;
}

export async function approveAgentVersion(tenantId: string, versionId: string, userId: string): Promise<AgentVersion> {
  const version = await getAgentVersionById(tenantId, versionId);
  if (!version) throw new Error('Agent version not found');

  if (!validateApproveTransition(version.approval_status)) {
    throw new Error(`Cannot approve: current status is '${version.approval_status}'`);
  }

  await assertSoDCompliance(tenantId, userId, version, ASSET_TYPE_LABEL, versionId);

  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".${TABLE_NAME}
     SET approval_status = 'approved', approved_by = $1, approved_at = NOW(), updated_by = $1, updated_at = NOW()
     WHERE ${VERSION_ID_COL} = $2 RETURNING *`,
    [userId, versionId],
  );

  const updated = getFirstRow(result) as AgentVersion;
  await emitAudit(tenantId, userId, 'approved', versionId, version, updated);
  return updated;
}

export async function activateAgentVersion(tenantId: string, versionId: string, userId: string): Promise<AgentVersion> {
  const version = await getAgentVersionById(tenantId, versionId);
  if (!version) throw new Error('Agent version not found');

  validateActivatePreConditions(version.approval_status);
  await validateParentForActivation(tenantId, version.asset_id, ASSET_TYPE_LABEL);

  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".${TABLE_NAME} SET is_active = FALSE, updated_at = NOW()
     WHERE asset_id = $1 AND is_active = TRUE`,
    [version.asset_id],
  );

  const result = await safeQuery(
    `UPDATE "${schema}".${TABLE_NAME}
     SET is_active = TRUE, deployment_status = 'production', updated_by = $1, updated_at = NOW()
     WHERE ${VERSION_ID_COL} = $2 RETURNING *`,
    [userId, versionId],
  );

  const updated = getFirstRow(result) as AgentVersion;
  await emitAudit(tenantId, userId, 'activated', versionId, version, updated);
  return updated;
}

export async function deleteAgentVersion(tenantId: string, versionId: string, userId: string): Promise<boolean> {
  const version = await getAgentVersionById(tenantId, versionId);
  if (!version) return false;

  validateDeletePreConditions(version.approval_status);

  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${schema}".${TABLE_NAME} WHERE ${VERSION_ID_COL} = $1`,
    [versionId],
  );

  await emitAudit(tenantId, userId, 'deleted', versionId, version, null);
  return (result.rowCount ?? 0) > 0;
}
