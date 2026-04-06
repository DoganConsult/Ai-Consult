import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { publish } from '../../events/event-bus';
import type {
  AgentDefinition,
  AgentState,
  AgentType,
  AgentExecutionMode,
} from '../contracts/agent.types';

const _registry = new Map<string, AgentDefinition>();

export function registerAgent(def: AgentDefinition): void {
  if (_registry.has(def.agentCode)) {
    throw new Error(`Agent '${def.agentCode}' already registered`);
  }
  _registry.set(def.agentCode, Object.freeze(def));
}

export function registerAgentBatch(defs: AgentDefinition[]): void {
  for (const d of defs) registerAgent(d);
}

export function getAgentDefinition(agentCode: string): AgentDefinition | undefined {
  return _registry.get(agentCode);
}

export function getAllAgentDefinitions(): AgentDefinition[] {
  return Array.from(_registry.values());
}

export function getAgentsByType(agentType: AgentType): AgentDefinition[] {
  return getAllAgentDefinitions().filter(a => a.agentType === agentType);
}

export function getAgentsByOwner(ownerLayer: string, ownerCode: string): AgentDefinition[] {
  return getAllAgentDefinitions().filter(a => a.ownerLayer === ownerLayer && a.ownerCode === ownerCode);
}

export function getAgentsByMode(mode: AgentExecutionMode): AgentDefinition[] {
  return getAllAgentDefinitions().filter(a => a.executionMode === mode);
}

export function validateAgentDefinition(def: AgentDefinition): string[] {
  const errors: string[] = [];
  if (!def.agentCode) errors.push('agentCode is required');
  if (!def.name) errors.push('name is required');
  if (!def.version) errors.push('version is required');
  if (!def.agentType) errors.push('agentType is required');
  if (!def.ownerLayer) errors.push('ownerLayer is required');
  if (!def.ownerCode) errors.push('ownerCode is required');
  if (!def.executionMode) errors.push('executionMode is required');
  if (!def.approvalPolicy) errors.push('approvalPolicy is required');
  if (!def.replacementPolicy) errors.push('replacementPolicy is required');
  if (!def.healthPolicy) errors.push('healthPolicy is required');
  if (def.executionMode === 'bounded-autonomous' && !def.approvalPolicy?.requiresApprovalForWrite) {
    errors.push('bounded-autonomous agents must require approval for writes');
  }
  return errors;
}

export async function getAgentState(tenantId: string, agentCode: string): Promise<AgentState> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT state FROM "${schema}".dos_agent_states WHERE agent_code = $1 LIMIT 1`,
    [agentCode],
  );
  if (!result.rows[0]) return 'registered';
  return result.rows[0].state;
}

export async function setAgentState(
  tenantId: string,
  agentCode: string,
  state: AgentState,
  performedBy: string,
  reason: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const previousState = await getAgentState(tenantId, agentCode);
  await safeQuery(
    `INSERT INTO "${schema}".dos_agent_states (agent_code, state, updated_by, reason, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (agent_code) DO UPDATE SET state = $2, updated_by = $3, reason = $4, updated_at = NOW()`,
    [agentCode, state, performedBy, reason],
  );
  await safeQuery(
    `INSERT INTO "${schema}".dos_agent_state_log (agent_code, previous_state, new_state, performed_by, reason, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [agentCode, previousState, state, performedBy, reason],
  );
  await publish(state === 'active' ? 'agent.enabled' : 'agent.disabled', tenantId, {
    agentCode,
    previousState,
    newState: state,
    performedBy,
    reason,
  });
}

export async function isAgentActive(tenantId: string, agentCode: string): Promise<boolean> {
  const state = await getAgentState(tenantId, agentCode);
  return state === 'active' || state === 'canary';
}

export async function persistAgentRegistration(tenantId: string, def: AgentDefinition): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".dos_agent_registry
       (agent_code, name, version, agent_type, owner_layer, owner_code,
        execution_mode, default_state, allowed_tools, allowed_contexts,
        required_capabilities, ui_exposure_policy, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
     ON CONFLICT (agent_code) DO UPDATE SET
       name=$2, version=$3, agent_type=$4, owner_layer=$5, owner_code=$6,
       execution_mode=$7, allowed_tools=$9, allowed_contexts=$10,
       required_capabilities=$11, ui_exposure_policy=$12, updated_at=NOW()`,
    [
      def.agentCode, def.name, def.version, def.agentType,
      def.ownerLayer, def.ownerCode, def.executionMode, def.defaultState,
      JSON.stringify(def.allowedTools), JSON.stringify(def.allowedContexts),
      JSON.stringify(def.requiredCapabilities), def.uiExposurePolicy,
    ],
  );
  await publish('agent.registered', tenantId, { agentCode: def.agentCode, name: def.name, version: def.version });
}

export function resetRegistry(): void {
  _registry.clear();
}

export const agentRegistryService = {
  registerAgent,
  registerAgentBatch,
  getAgentDefinition,
  getAllAgentDefinitions,
  getAgentsByType,
  getAgentsByOwner,
  getAgentsByMode,
  validateAgentDefinition,
  getAgentState,
  setAgentState,
  isAgentActive,
  persistAgentRegistration,
  resetRegistry,
};
