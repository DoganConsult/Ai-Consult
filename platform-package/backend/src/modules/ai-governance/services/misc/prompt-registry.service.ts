import { safeQuery, tenantSchema } from '../../../../config/database';
import { getAssetById, getAssetByKey } from '../ai/ai-asset-inventory.service';
import {
  type ApprovalStatus,
  type DeploymentStatus,
  VALID_APPROVAL,
  VALID_DEPLOYMENT,
  assertNotSeededGlobalMutation,
  assertOneActiveVersion,
  assertLinkedAssetValid,
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

export interface PromptVersion {
  prompt_version_id: string;
  asset_id: string;
  version_number: number;
  template_text: string;
  variables: any[];
  linked_model_asset_id: string | null;
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

export interface CreatePromptDraftInput {
  asset_id: string;
  template_text: string;
  variables?: any[];
  linked_model_asset_id?: string;
  change_summary?: string;
  notes?: string;
  created_by?: string;
}

const AUDIT_MODULE = 'ai-prompt-registry';
const TABLE_NAME = 'ai_prompt_registry';
const VERSION_ID_COL = 'prompt_version_id';
const ASSET_TYPE_LABEL = 'prompt';

export async function getActivePromptVersionForAsset(tenantId: string, assetId: string): Promise<PromptVersion | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".${TABLE_NAME}
     WHERE asset_id = $1 AND is_active = TRUE
     ORDER BY version_number DESC LIMIT 1`,
    [assetId],
  );
  return (getFirstRow(result) as PromptVersion) || null;
}

export async function getPromptVersionById(tenantId: string, versionId: string): Promise<PromptVersion | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".${TABLE_NAME} WHERE ${VERSION_ID_COL} = $1`,
    [versionId],
  );
  return (getFirstRow(result) as PromptVersion) || null;
}

export async function listPromptVersions(tenantId: string, assetId?: string): Promise<PromptVersion[]> {
  const schema = tenantSchema(tenantId);
  if (assetId) {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".${TABLE_NAME} WHERE asset_id = $1 ORDER BY version_number DESC`,
      [assetId],
    );
    return result.rows as PromptVersion[];
  }
  const result = await safeQuery(
    `SELECT * FROM "${schema}".${TABLE_NAME} ORDER BY version_number DESC LIMIT 200`,
    [],
  );
  return result.rows as PromptVersion[];
}

export async function createPromptDraft(tenantId: string, input: CreatePromptDraftInput): Promise<PromptVersion> {
  const schema = tenantSchema(tenantId);
  const createdBy = input.created_by || SYSTEM_JOB_ACTOR;

  await assertParentAssetValid(tenantId, input.asset_id, ASSET_TYPE_LABEL);

  if (input.linked_model_asset_id) {
    await assertLinkedAssetValid(tenantId, input.linked_model_asset_id, 'model', 'linked_model');
  }

  const versionNumber = await nextRegistryVersionNumber(schema, TABLE_NAME, input.asset_id);

  const result = await safeQuery(
    `INSERT INTO "${schema}".${TABLE_NAME}
       (asset_id, version_number, template_text, variables, linked_model_asset_id,
        approval_status, deployment_status, is_active,
        change_summary, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,'draft','not_deployed',FALSE,$6,$7,$8)
     RETURNING *`,
    [
      input.asset_id, versionNumber,
      input.template_text,
      JSON.stringify(input.variables || []),
      input.linked_model_asset_id || null,
      input.change_summary || null,
      input.notes || null,
      createdBy,
    ],
  );

  const draft = getFirstRow(result) as PromptVersion;
  await emitRegistryAudit(tenantId, createdBy, 'draft_created', draft.prompt_version_id, AUDIT_MODULE, 'prompt_version');
  return draft;
}

export async function activatePromptVersion(tenantId: string, versionId: string, userId: string): Promise<PromptVersion> {
  const version = await getPromptVersionById(tenantId, versionId);
  if (!version) throw new Error('Prompt version not found');

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

  const updated = getFirstRow(result) as PromptVersion;
  await emitRegistryAudit(tenantId, userId, 'activated', versionId, AUDIT_MODULE, 'prompt_version');
  return updated;
}
