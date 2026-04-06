// @ts-nocheck
import { safeQuery } from '../../../config/database/database';
import type { GenericRow } from '../../../types/db-rows.types';

export interface ModuleState {
  moduleCode: string;
  isActive: boolean;
  state: string;
  activationSource: string;
  priority: number;
  updatedAt: string;
}

export async function isModuleActive(tenantId: string, moduleCode: string): Promise<boolean> {
  const { rows } = await safeQuery(
    `SELECT is_active FROM public.module_operating_states WHERE tenant_id = $1 AND module_code = $2 LIMIT 1`,
    [tenantId, moduleCode],
  );
  return rows.length > 0 ? Boolean((rows[0] as GenericRow).is_active) : true;
}

export async function getModuleStates(tenantId: string): Promise<ModuleState[]> {
  const { rows } = await safeQuery(
    `SELECT module_code, is_active, state, activation_source, priority, updated_at
     FROM public.module_operating_states
     WHERE tenant_id = $1
     ORDER BY priority, module_code`,
    [tenantId],
  );
  return rows.map((r: GenericRow) => ({
    moduleCode: r.module_code,
    isActive: r.is_active ?? (r.state === 'on'),
    state: r.state ?? 'on',
    activationSource: r.activation_source ?? 'auto_inferred',
    priority: r.priority ?? 5,
    updatedAt: r.updated_at ?? new Date().toISOString(),
  }));
}

export async function evaluateModuleStatesFromContext(tenantId: string): Promise<ModuleState[]> {
  return getModuleStates(tenantId);
}

export async function getAllModuleStates(tenantId: string): Promise<ModuleState[]> {
  return getModuleStates(tenantId);
}

export async function getModuleState(tenantId: string, moduleCode: string): Promise<ModuleState | null> {
  const { rows } = await safeQuery(
    `SELECT module_code, is_active, state, activation_source, priority, updated_at
     FROM public.module_operating_states
     WHERE tenant_id = $1 AND module_code = $2 LIMIT 1`,
    [tenantId, moduleCode],
  );
  if (rows.length === 0) return null;
  const r = rows[0] as GenericRow;
  return {
    moduleCode: r.module_code,
    isActive: r.is_active ?? (r.state === 'on'),
    state: r.state ?? 'on',
    activationSource: r.activation_source ?? 'auto_inferred',
    priority: r.priority ?? 5,
    updatedAt: r.updated_at ?? new Date().toISOString(),
  };
}

export async function updateModuleState(
  tenantId: string,
  moduleCode: string,
  patch: Partial<{ isActive: boolean; state: 'on' | 'off' | 'trial' }>,
): Promise<ModuleState | null> {
  const sets: string[] = [];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (patch.isActive !== undefined) {
    sets.push(`is_active = $${idx++}`);
    params.push(patch.isActive);
  }
  if (patch.state !== undefined) {
    sets.push(`state = $${idx++}`);
    params.push(patch.state);
  }
  if (sets.length === 0) return getModuleState(tenantId, moduleCode);

  sets.push(`updated_at = NOW()`);
  params.push(moduleCode);
  await safeQuery(
    `UPDATE public.module_operating_states SET ${sets.join(', ')} WHERE tenant_id = $1 AND module_code = $${idx}`,
    params,
  );
  return getModuleState(tenantId, moduleCode);
}

export async function getActiveModules(tenantId: string): Promise<string[]> {
  const states = await getModuleStates(tenantId);
  return states.filter((s) => s.isActive).map((s) => s.moduleCode);
}
