import { safeQuery, tenantSchema } from '../../../../config/database';
import { getAssetById } from '../ai/ai-asset-inventory.service';
import {
  type ApprovalStatus,
  type DeploymentStatus,
  VALID_APPROVAL,
  VALID_DEPLOYMENT,
  assertNotSeededGlobalMutation,
  assertOneActiveVersion,
  assertParentAssetValid,
  assertSoDCompliance,
  emitRegistryAudit,
  nextRegistryVersionNumber,
  validateSubmitTransition,
  validateApproveTransition,
  validateActivatePreConditions,
  validateDeletePreConditions,
  validateParentForActivation,
} from '../ai-governance-lifecycle.service';
import { getFirstRow } from '../../../../shared/data/db-utils';
import { SYSTEM_JOB_ACTOR } from '../../../../platform/dos/constants/system-actors';

export type { ApprovalStatus, DeploymentStatus };

export interface ModelVersion {
  model_version_id: string;
  asset_id: string;
  version_number: number;
  provider: string;
  provider_model_id: string;
  config: Record<string, any>;
  approval_status: ApprovalStatus;
  deployment_status: DeploymentStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  is_active: boolean;
  rollback_from_version_id: string | null;
  change_summary: string | null;
  notes: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDraftInput {
  asset_id: string;
  provider: string;
  provider_model_id: string;
  config?: Record<string, any>;
  change_summary?: string;
  notes?: string;
  created_by?: string;
}

const AUDIT_MODULE = 'ai-model-registry';
const TABLE_NAME = 'ai_model_registry';
const VERSION_ID_COL = 'model_version_id';
const ASSET_TYPE_LABEL = 'model';

export async function getActiveModelVersionForAsset(tenantId: string, assetId: string): Promise<ModelVersion | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".${TABLE_NAME}
     WHERE asset_id = $1 AND is_active = TRUE
     ORDER BY version_number DESC LIMIT 1`,
    [assetId],
  );
  return (getFirstRow(result) as ModelVersion) || null;
}

export async function getModelVersionById(tenantId: string, versionId: string): Promise<ModelVersion | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".${TABLE_NAME} WHERE ${VERSION_ID_COL} = $1`,
    [versionId],
  );
  return (getFirstRow(result) as ModelVersion) || null;
}

export async function listModelVersions(tenantId: string, assetId?: string): Promise<ModelVersion[]> {
  const schema = tenantSchema(tenantId);
  if (assetId) {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".${TABLE_NAME} WHERE asset_id = $1 ORDER BY version_number DESC`,
      [assetId],
    );
    return result.rows as ModelVersion[];
  }
  const result = await safeQuery(
    `SELECT * FROM "${schema}".${TABLE_NAME} ORDER BY version_number DESC LIMIT 200`,
    [],
  );
  return result.rows as ModelVersion[];
}

export async function createModelDraft(tenantId: string, input: CreateDraftInput): Promise<ModelVersion> {
  const schema = tenantSchema(tenantId);
  const createdBy = input.created_by || SYSTEM_JOB_ACTOR;

  await assertParentAssetValid(tenantId, input.asset_id, ASSET_TYPE_LABEL);

  const versionNumber = await nextRegistryVersionNumber(schema, TABLE_NAME, input.asset_id);

  const result = await safeQuery(
    `INSERT INTO "${schema}".${TABLE_NAME}
       (asset_id, version_number, provider, provider_model_id, config,
        approval_status, deployment_status, is_active,
        change_summary, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,'draft','not_deployed',FALSE,$6,$7,$8)
     RETURNING *`,
    [
      input.asset_id, versionNumber,
      input.provider,
      input.provider_model_id,
      JSON.stringify(input.config || {}),
      input.change_summary || null,
      input.notes || null,
      createdBy,
    ],
  );

  const draft = getFirstRow(result) as ModelVersion;
  await emitRegistryAudit(tenantId, createdBy, 'draft_created', draft.model_version_id, AUDIT_MODULE, 'model_version');
  return draft;
}

export async function activateModelVersion(tenantId: string, versionId: string, userId: string): Promise<ModelVersion> {
  const version = await getModelVersionById(tenantId, versionId);
  if (!version) throw new Error('Model version not found');

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

  const updated = getFirstRow(result) as ModelVersion;
  await emitRegistryAudit(tenantId, userId, 'activated', versionId, AUDIT_MODULE, 'model_version');
  return updated;
}
