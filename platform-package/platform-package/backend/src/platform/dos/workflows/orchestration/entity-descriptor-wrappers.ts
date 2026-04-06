// ============================================
// Process Orchestration — Entity Descriptor Wrappers
// Try ModuleDescriptor (DB-driven) first, fall back
// to legacy entity-routing-registry.
// ============================================

import { getEntityModule as _legacyGetEntityModule, getEntityTable as _legacyGetEntityTable, getFallbackDomain as _legacyGetFallbackDomain } from './legacy-routing-registry';
import { resolveByEntity as resolveDescriptorByEntity } from '../../modules/lifecycle/module-workflow-registry.service';

export function getEntityModule(entityType: string): string | undefined {
  const d = resolveDescriptorByEntity(entityType);
  return d?.moduleCode || _legacyGetEntityModule(entityType);
}

export function getEntityTable(entityType: string) {
  const d = resolveDescriptorByEntity(entityType);
  if (d?.entityTableName && d?.entityIdColumn) {
    return { table: d.entityTableName, pk: d.entityIdColumn, ownerCol: 'owner_user_id' };
  }
  return _legacyGetEntityTable(entityType);
}

export function getFallbackDomain(entityType: string) {
  const d = resolveDescriptorByEntity(entityType);
  if (d?.raciScopeType) {
    return { scopeType: 'process', scopeId: d.raciScopeType, fallbackTeamCode: 'SVC_OPS' };
  }
  return _legacyGetFallbackDomain(entityType);
}
