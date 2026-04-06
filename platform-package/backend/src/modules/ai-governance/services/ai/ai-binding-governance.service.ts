import { safeQuery, tenantSchema } from '../../../../config/database';
import { getAssetById, type AIAsset } from './ai-asset-inventory.service';
import { emitRegistryAudit } from '../ai-governance-lifecycle.service';
import { toErrorMessage } from '../../../../errors/http-error.util';
import { SYSTEM_JOB_ACTOR } from '../../../../platform/dos/constants/system-actors';
import { getFirstRow } from '../../../../shared/data/db-utils';

const AUDIT_MODULE = 'ai-binding-governance';

export interface AgentToolBinding {
  binding_id: string;
  tenant_id: string;
  agent_asset_id: string;
  tool_asset_id: string;
  is_enabled: boolean;
  notes: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentToolBindingInput {
  agent_asset_id: string;
  tool_asset_id: string;
  is_enabled?: boolean;
  notes?: string;
  created_by?: string;
}

export interface UpdateAgentToolBindingInput {
  is_enabled?: boolean;
  notes?: string;
  updated_by?: string;
}

export interface AgentToolBindingQuery {
  agent_asset_id?: string;
  tool_asset_id?: string;
  is_enabled?: boolean;
  limit?: number;
  offset?: number;
}

export interface AllowlistEntry {
  allowlist_id: string;
  tenant_id: string;
  asset_id: string;
  asset_type: string;
  provider: string;
  model_id: string;
  is_enabled: boolean;
  max_tokens_limit: number | null;
  temperature_limit: number | null;
  notes: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackfillResult {
  processed: number;
  backfilled: number;
  already_valid: number;
  unresolved: number;
  errors: number;
  unresolved_rows: Array<{
    allowlist_id: string;
    provider: string;
    model_id: string;
    reason: string;
  }>;
}

export async function getEnabledToolAssetIdsForAgent(tenantId: string, agentAssetId: string): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT tool_asset_id FROM "${schema}".ai_agent_tool_bindings
       WHERE agent_asset_id = $1 AND is_enabled = TRUE`,
      [agentAssetId],
    );
    return result.rows.map((r: any) => r.tool_asset_id);
  } catch {
    return [];
  }
}

export async function createAgentToolBinding(tenantId: string, input: CreateAgentToolBindingInput): Promise<AgentToolBinding> {
  const schema = tenantSchema(tenantId);
  const createdBy = input.created_by || SYSTEM_JOB_ACTOR;

  const agentAsset = await getAssetById(tenantId, input.agent_asset_id);
  if (!agentAsset) throw new Error(`Agent asset '${input.agent_asset_id}' not found`);
  const toolAsset = await getAssetById(tenantId, input.tool_asset_id);
  if (!toolAsset) throw new Error(`Tool asset '${input.tool_asset_id}' not found`);

  const result = await safeQuery(
    `INSERT INTO "${schema}".ai_agent_tool_bindings
       (tenant_id, agent_asset_id, tool_asset_id, is_enabled, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tenant_id, agent_asset_id, tool_asset_id) DO UPDATE SET
       is_enabled = EXCLUDED.is_enabled, notes = EXCLUDED.notes, updated_by = EXCLUDED.created_by, updated_at = NOW()
     RETURNING *`,
    [tenantId, input.agent_asset_id, input.tool_asset_id, input.is_enabled !== false, input.notes || null, createdBy],
  );

  const binding = getFirstRow(result) as AgentToolBinding;
  await emitRegistryAudit(tenantId, createdBy, 'tool_binding_created', binding.binding_id, AUDIT_MODULE, 'agent_tool_binding');
  return binding;
}

export async function listAgentToolBindings(tenantId: string, q: AgentToolBindingQuery = {}): Promise<AgentToolBinding[]> {
  const schema = tenantSchema(tenantId);
  const wheres: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (q.agent_asset_id) { wheres.push(`agent_asset_id = $${idx}`); params.push(q.agent_asset_id); idx++; }
  if (q.tool_asset_id) { wheres.push(`tool_asset_id = $${idx}`); params.push(q.tool_asset_id); idx++; }
  if (q.is_enabled !== undefined) { wheres.push(`is_enabled = $${idx}`); params.push(q.is_enabled); idx++; }

  const limit = Math.min(q.limit || 100, 500);
  const offset = q.offset || 0;

  const result = await safeQuery(
    `SELECT * FROM "${schema}".ai_agent_tool_bindings
     WHERE ${wheres.join(' AND ')}
     ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset],
  );
  return result.rows as AgentToolBinding[];
}

export async function deleteAgentToolBinding(tenantId: string, bindingId: string, userId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${schema}".ai_agent_tool_bindings WHERE binding_id = $1 AND tenant_id = $2`,
    [bindingId, tenantId],
  );
  if ((result.rowCount ?? 0) > 0) {
    await emitRegistryAudit(tenantId, userId, 'tool_binding_deleted', bindingId, AUDIT_MODULE, 'agent_tool_binding');
    return true;
  }
  return false;
}

export async function backfillTenantAllowlistAssetRefs(tenantId: string): Promise<BackfillResult> {
  const schema = tenantSchema(tenantId);
  const stats: BackfillResult = {
    processed: 0, backfilled: 0, already_valid: 0, unresolved: 0, errors: 0, unresolved_rows: [],
  };

  try {
    const rows = await safeQuery(
      `SELECT allowlist_id, provider, model_id, asset_id
       FROM "${schema}".ai_model_allowlist
       WHERE tenant_id = $1`,
      [tenantId],
    );

    for (const row of rows.rows) {
      stats.processed++;
      if (row.asset_id) {
        stats.already_valid++;
        continue;
      }

      try {
        const assetResult = await safeQuery(
          `SELECT asset_id FROM "${schema}".ai_asset_inventory
           WHERE asset_type = 'model' AND asset_key = $1 LIMIT 1`,
          [row.model_id],
        );
        const found = getFirstRow(assetResult);
        if (found) {
          await safeQuery(
            `UPDATE "${schema}".ai_model_allowlist SET asset_id = $1, updated_at = NOW() WHERE allowlist_id = $2`,
            [found.asset_id, row.allowlist_id],
          );
          stats.backfilled++;
        } else {
          stats.unresolved++;
          stats.unresolved_rows.push({
            allowlist_id: row.allowlist_id,
            provider: row.provider,
            model_id: row.model_id,
            reason: 'No matching asset found',
          });
        }
      } catch (e) {
        stats.errors++;
      }
    }
  } catch { /* non-fatal */ }

  return stats;
}
