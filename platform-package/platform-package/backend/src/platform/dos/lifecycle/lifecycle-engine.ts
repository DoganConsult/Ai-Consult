import { safeQuery, tenantSchema } from '../../../config/database/database';
import { publish } from '../events/event-bus';
import { logger } from '../../../utils/logger';

export class InvalidTransitionError extends Error {
  constructor(
    public readonly entityType: string,
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Invalid transition for '${entityType}': '${from}' → '${to}'`);
    this.name = 'InvalidTransitionError';
  }
}

export interface LifecycleDefinition<S extends string = string> {
  entityType: string;
  moduleCode: string;
  transitions: Record<S, S[]>;
  terminalStates?: S[];
}

export interface TransitionContext {
  actor: string;
  tenantId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionResult {
  success: boolean;
  from: string;
  to: string;
  entityType: string;
  entityId: string;
  error?: string;
  pendingApproval?: boolean;
  approvalId?: string;
  handled?: boolean;
  denied?: boolean;
  result?: unknown;
}

const definitions = new Map<string, LifecycleDefinition>();

export function registerLifecycleDefinition(def: LifecycleDefinition): void {
  definitions.set(`${def.moduleCode}:${def.entityType}`, def);
}

export function getLifecycleDefinition(moduleCode: string, entityType: string): LifecycleDefinition | null {
  return definitions.get(`${moduleCode}:${entityType}`) || null;
}

export function getAllDefinitions(): LifecycleDefinition[] {
  return Array.from(definitions.values());
}

export function canTransition(moduleCode: string, entityType: string, from: string, to: string): boolean {
  const def = getLifecycleDefinition(moduleCode, entityType);
  if (!def) return false;
  const allowed = def.transitions[from as keyof typeof def.transitions];
  return Array.isArray(allowed) && allowed.includes(to as any);
}

export function getAllowedTransitions(moduleCode: string, entityType: string, from: string): string[] {
  const def = getLifecycleDefinition(moduleCode, entityType);
  if (!def) return [];
  return (def.transitions[from as keyof typeof def.transitions] as string[]) || [];
}

export function isTerminalState(moduleCode: string, entityType: string, state: string): boolean {
  const def = getLifecycleDefinition(moduleCode, entityType);
  if (!def) return false;
  if (def.terminalStates) return def.terminalStates.includes(state as any);
  const allowed = def.transitions[state as keyof typeof def.transitions];
  return Array.isArray(allowed) && allowed.length === 0;
}

export async function performTransition(
  entityId: string,
  from: string,
  to: string,
  moduleCode: string,
  entityType: string,
  ctx: TransitionContext,
): Promise<TransitionResult> {
  if (!canTransition(moduleCode, entityType, from, to)) {
    return {
      success: false,
      from,
      to,
      entityType,
      entityId,
      error: `Transition ${from} → ${to} not allowed for ${moduleCode}:${entityType}`,
    };
  }

  try {
    const schema = tenantSchema(ctx.tenantId);
    await safeQuery(
      `INSERT INTO "${schema}".entity_lifecycle_log
       (entity_type, entity_id, module_code, from_state, to_state, actor_id, reason, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [entityType, entityId, moduleCode, from, to, ctx.actor, ctx.reason || null, JSON.stringify(ctx.metadata || {})],
    );
  } catch (err) {
    logger.debug(`[Lifecycle] Audit log insert skipped for ${entityType}/${entityId}:`, err instanceof Error ? err.message : String(err));
  }

  await publish(
    'lifecycle.state_changed',
    ctx.tenantId,
    {
      entityType,
      entityId,
      moduleCode,
      fromState: from,
      toState: to,
      actor: ctx.actor,
      reason: ctx.reason,
      ...(ctx.metadata || {}),
    },
    {
      userId: ctx.actor,
      moduleCode,
      entityType,
      entityId,
      category: 'lifecycle',
    },
  );

  return { success: true, from, to, entityType, entityId };
}

export async function loadDefinitionsFromDb(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  let count = 0;
  try {
    const { rows } = await safeQuery(
      `SELECT module_code, from_status, to_status
       FROM "${schema}".module_lifecycle_transitions
       ORDER BY module_code, from_status`,
      [],
    );

    const grouped = new Map<string, Record<string, string[]>>();
    for (const r of rows) {
      const key = r.module_code;
      if (!grouped.has(key)) grouped.set(key, {});
      const transitions = grouped.get(key)!;
      if (!transitions[r.from_status]) transitions[r.from_status] = [];
      transitions[r.from_status].push(r.to_status);
    }

    for (const [moduleCode, transitions] of grouped) {
      registerLifecycleDefinition({ entityType: moduleCode, moduleCode, transitions });
      count++;
    }
  } catch (err) {
    logger.debug('[Lifecycle] DB definitions unavailable, using in-code definitions:', err instanceof Error ? err.message : String(err));
  }
  return count;
}

export const lifecycleEngine = {
  registerLifecycleDefinition,
  getLifecycleDefinition,
  getAllDefinitions,
  canTransition,
  getAllowedTransitions,
  isTerminalState,
  performTransition,
  loadDefinitionsFromDb,
};
