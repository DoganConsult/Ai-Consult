
export interface ConditionNode {
  type: 'and' | 'or' | 'not' | 'leaf';
  children?: ConditionNode[];
  child?: ConditionNode;
  field?: string;
  operator?: string;
  value?: unknown;
}

export interface TemporalWindow {
  daysOfWeek?: number[];
  startHour?: number;
  endHour?: number;
  timezone?: string;
  rateLimit?: { count: number; windowSeconds: number };
}

export function evaluateConditionTree(
  tree: ConditionNode | null | undefined,
  facts: Record<string, any>,
): boolean {
  if (!tree) return true;

  switch (tree.type) {
    case 'and':
      return (tree.children ?? []).every(c => evaluateConditionTree(c, facts));

    case 'or':
      return (tree.children ?? []).some(c => evaluateConditionTree(c, facts));

    case 'not':
      return tree.child ? !evaluateConditionTree(tree.child, facts) : true;

    case 'leaf':
      return evaluateLeaf(tree, facts);

    default:
      return true;
  }
}

function evaluateLeaf(node: ConditionNode, facts: Record<string, any>): boolean {
  const { field, operator, value } = node;
  if (!field || !operator) return true;

  const actual = resolveField(field, facts);

  switch (operator) {
    case 'eq': return actual === value;
    case 'neq': return actual !== value;
    case 'gt': return typeof actual === 'number' && actual > (value as number);
    case 'gte': return typeof actual === 'number' && actual >= (value as number);
    case 'lt': return typeof actual === 'number' && actual < (value as number);
    case 'lte': return typeof actual === 'number' && actual <= (value as number);
    case 'in': return Array.isArray(value) && value.includes(actual);
    case 'not_in': return Array.isArray(value) && !value.includes(actual);
    case 'contains': return typeof actual === 'string' && actual.includes(value as string);
    case 'starts_with': return typeof actual === 'string' && actual.startsWith(value as string);
    case 'exists': return actual !== undefined && actual !== null;
    case 'is_empty': return actual === '' || actual === null || actual === undefined || (Array.isArray(actual) && actual.length === 0);
    case 'regex': {
      try { return typeof actual === 'string' && new RegExp(value as string).test(actual); } catch { return false; }
    }
    default: return true;
  }
}

function resolveField(path: string, obj: Record<string, any>): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

export function evaluateTemporalWindow(
  window: TemporalWindow | null | undefined,
): boolean {
  if (!window) return true;

  const now = new Date();

  if (window.timezone) {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: window.timezone,
        hour: 'numeric',
        hour12: false,
        weekday: 'short',
      });
      const parts = formatter.formatToParts(now);
      const hourPart = parts.find(p => p.type === 'hour');
      const dayPart = parts.find(p => p.type === 'weekday');
      const hour = hourPart ? parseInt(hourPart.value) : now.getHours();
      const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const day = dayPart ? (dayMap[dayPart.value] ?? now.getDay()) : now.getDay();

      if (window.daysOfWeek?.length && !window.daysOfWeek.includes(day)) return false;
      if (window.startHour !== undefined && hour < window.startHour) return false;
      if (window.endHour !== undefined && hour >= window.endHour) return false;
    } catch {
      // fall through to local time
    }
  } else {
    if (window.daysOfWeek?.length && !window.daysOfWeek.includes(now.getDay())) return false;
    if (window.startHour !== undefined && now.getHours() < window.startHour) return false;
    if (window.endHour !== undefined && now.getHours() >= window.endHour) return false;
  }

  return true;
}

const _rateCounters = new Map<string, number[]>();

export function checkRateLimit(key: string, limit: { count: number; windowSeconds: number }): boolean {
  const now = Date.now();
  const entries = _rateCounters.get(key) ?? [];
  const cutoff = now - limit.windowSeconds * 1000;
  const recent = entries.filter(t => t > cutoff);

  if (recent.length >= limit.count) return false;

  recent.push(now);
  _rateCounters.set(key, recent);
  return true;
}
