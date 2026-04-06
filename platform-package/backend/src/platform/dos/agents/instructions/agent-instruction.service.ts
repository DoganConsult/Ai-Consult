import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { getAgentDefinition } from '../registry/agent-registry.service';

export interface AgentInstruction {
  agentCode: string;
  version: string;
  source: 'static' | 'registry' | 'prompt-template' | 'dynamic';
  systemPrompt: string;
  contextInstructions: string[];
  safetyInstructions: string[];
  outputFormat?: string;
  locale?: string;
  updatedAt: string;
}

const _staticInstructions = new Map<string, AgentInstruction>();

export function registerStaticInstruction(instruction: AgentInstruction): void {
  _staticInstructions.set(instruction.agentCode, instruction);
}

export async function resolveInstruction(
  tenantId: string,
  agentCode: string,
  locale?: string,
): Promise<AgentInstruction | null> {
  const def = getAgentDefinition(agentCode);
  if (!def) return null;

  const source = def.instructionSource;

  if (source === 'static') {
    return _staticInstructions.get(agentCode) || null;
  }

  if (source === 'registry' || source === 'prompt-template') {
    return resolveFromRegistry(tenantId, agentCode, locale);
  }

  if (source === 'dynamic') {
    const registryResult = await resolveFromRegistry(tenantId, agentCode, locale);
    if (registryResult) return registryResult;
    return _staticInstructions.get(agentCode) || null;
  }

  return null;
}

async function resolveFromRegistry(
  tenantId: string,
  agentCode: string,
  locale?: string,
): Promise<AgentInstruction | null> {
  const schema = tenantSchema(tenantId);
  const localeClause = locale ? ` AND (locale = $2 OR locale IS NULL) ORDER BY CASE WHEN locale = $2 THEN 0 ELSE 1 END` : ' ORDER BY updated_at DESC';
  const params: unknown[] = [agentCode];
  if (locale) params.push(locale);

  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".dos_agent_instructions WHERE agent_code = $1${localeClause} LIMIT 1`,
    params,
  );

  if (!rows[0]) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    agentCode: r.agent_code as string,
    version: (r.version as string) || '1.0.0',
    source: (r.source as AgentInstruction['source']) || 'registry',
    systemPrompt: (r.system_prompt as string) || '',
    contextInstructions: parseJsonArray(r.context_instructions),
    safetyInstructions: parseJsonArray(r.safety_instructions),
    outputFormat: (r.output_format as string) || undefined,
    locale: (r.locale as string) || undefined,
    updatedAt: (r.updated_at as Date)?.toISOString?.() || '',
  };
}

export async function saveInstruction(
  tenantId: string,
  instruction: AgentInstruction,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".dos_agent_instructions
       (agent_code, version, source, system_prompt, context_instructions, safety_instructions, output_format, locale, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
     ON CONFLICT (agent_code, COALESCE(locale, '')) DO UPDATE SET
       version=$2, source=$3, system_prompt=$4, context_instructions=$5, safety_instructions=$6, output_format=$7, updated_at=NOW()`,
    [
      instruction.agentCode, instruction.version, instruction.source,
      instruction.systemPrompt, JSON.stringify(instruction.contextInstructions),
      JSON.stringify(instruction.safetyInstructions), instruction.outputFormat || null,
      instruction.locale || null,
    ],
  );
}

export async function listInstructions(
  tenantId: string,
  agentCode?: string,
): Promise<AgentInstruction[]> {
  const schema = tenantSchema(tenantId);
  const params: unknown[] = [];
  let where = '';
  if (agentCode) {
    params.push(agentCode);
    where = ` WHERE agent_code = $1`;
  }
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".dos_agent_instructions${where} ORDER BY agent_code, locale`,
    params,
  );
  return rows.map((r: Record<string, unknown>) => ({
    agentCode: r.agent_code as string,
    version: (r.version as string) || '1.0.0',
    source: (r.source as AgentInstruction['source']) || 'registry',
    systemPrompt: (r.system_prompt as string) || '',
    contextInstructions: parseJsonArray(r.context_instructions),
    safetyInstructions: parseJsonArray(r.safety_instructions),
    outputFormat: (r.output_format as string) || undefined,
    locale: (r.locale as string) || undefined,
    updatedAt: (r.updated_at as Date)?.toISOString?.() || '',
  }));
}

function parseJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [];
}

export function resetStaticInstructions(): void {
  _staticInstructions.clear();
}

export const agentInstructionService = {
  registerStaticInstruction,
  resolveInstruction,
  saveInstruction,
  listInstructions,
  resetStaticInstructions,
};
