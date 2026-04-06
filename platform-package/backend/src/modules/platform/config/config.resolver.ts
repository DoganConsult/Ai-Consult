import type {
  ConfigDefinition,
  ConfigLock,
  ConfigScopeType,
  ConfigValueRecord,
  EffectiveConfigResult,
  ScopeNode,
} from './config.types';

const PRECEDENCE: ConfigScopeType[] = [
  'user',
  'organization',
  'tenant',
  'module',
  'product',
  'platform',
  'deployment',
  'environment',
];

export interface ScopeAncestryProvider {
  buildPath(target: ScopeNode): Promise<ScopeNode[]>;
}

export class StaticScopeAncestryProvider implements ScopeAncestryProvider {
  async buildPath(target: ScopeNode): Promise<ScopeNode[]> {
    return [{ scopeType: target.scopeType, scopeId: target.scopeId }];
  }
}

export function findBlockingLock(
  locks: ConfigLock[],
  target: ScopeNode,
): { scopeType: ConfigScopeType; scopeId: string } | null {
  const targetIndex = PRECEDENCE.indexOf(target.scopeType);
  for (const lock of locks) {
    if (!lock.isActive) continue;
    const lockIndex = PRECEDENCE.indexOf(lock.lockedAtScopeType);
    if (lockIndex >= targetIndex) {
      return { scopeType: lock.lockedAtScopeType, scopeId: lock.lockedAtScopeId };
    }
  }
  return null;
}

export function buildResolutionPathFromAncestry(target: ScopeNode, ancestry: ScopeNode[]): ScopeNode[] {
  const byType = new Map<ConfigScopeType, ScopeNode>();
  for (const node of ancestry) byType.set(node.scopeType, node);
  if (!byType.has(target.scopeType)) byType.set(target.scopeType, target);
  return PRECEDENCE.filter(scope => byType.has(scope)).map(scope => byType.get(scope) as ScopeNode);
}

export function resolveFromRecords(input: {
  definition: ConfigDefinition;
  target: ScopeNode;
  resolutionPath: ScopeNode[];
  values: ConfigValueRecord[];
  locks: ConfigLock[];
}): EffectiveConfigResult {
  const { definition, target, resolutionPath, values, locks } = input;
  const hit = resolutionPath.find(pathNode =>
    values.some(v => v.scopeType === pathNode.scopeType && v.scopeId === pathNode.scopeId),
  );

  if (hit) {
    const record = values.find(v => v.scopeType === hit.scopeType && v.scopeId === hit.scopeId)!;
    return {
      key: definition.key,
      effectiveValue: record.value,
      resolvedFromScopeType: record.scopeType,
      resolvedFromScopeId: record.scopeId,
      resolutionPath: resolutionPath.map(p => ({
        scopeType: p.scopeType,
        scopeId: p.scopeId,
        hit: !!values.find(v => v.scopeType === p.scopeType && v.scopeId === p.scopeId),
      })),
      lockedBy: findBlockingLock(locks, target),
    };
  }

  return {
    key: definition.key,
    effectiveValue: definition.defaultValue,
    resolvedFromScopeType: 'default',
    resolvedFromScopeId: 'definition',
    resolutionPath: resolutionPath.map(p => ({
      scopeType: p.scopeType,
      scopeId: p.scopeId,
      hit: false,
    })),
    lockedBy: findBlockingLock(locks, target),
  };
}
