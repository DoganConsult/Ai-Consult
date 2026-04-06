import { diff } from 'deep-diff';
import * as jsonpatch from 'fast-json-patch';

export interface AuditChange {
  path: string;
  kind: 'added' | 'edited' | 'deleted' | 'array';
  oldValue?: unknown;
  newValue?: unknown;
}

export function computeDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): AuditChange[] {
  const diffs = diff(before, after);
  if (!diffs) return [];

  return diffs.map((d: any) => {
    const path = (d.path || []).join('.');
    switch (d.kind) {
      case 'N': return { path, kind: 'added' as const, newValue: d.rhs };
      case 'D': return { path, kind: 'deleted' as const, oldValue: d.lhs };
      case 'E': return { path, kind: 'edited' as const, oldValue: d.lhs, newValue: d.rhs };
      case 'A': return { path: `${path}[${d.index}]`, kind: 'array' as const, oldValue: d.item?.lhs, newValue: d.item?.rhs };
      default: return { path, kind: 'edited' as const };
    }
  });
}

export function createJsonPatch(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): jsonpatch.Operation[] {
  return jsonpatch.compare(before, after);
}

export function applyJsonPatch<T extends Record<string, unknown>>(
  document: T,
  patch: jsonpatch.Operation[],
): T {
  const result = jsonpatch.applyPatch(JSON.parse(JSON.stringify(document)), patch);
  return result.newDocument as T;
}

export function hasMeaningfulChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  ignoreFields: string[] = ['updated_at', 'updated_by', 'version'],
): boolean {
  const changes = computeDiff(before, after);
  return changes.some(c => !ignoreFields.includes(c.path));
}
