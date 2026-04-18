import jsep from 'jsep';
import { ForbiddenError } from '@dogan/contracts';

export interface AbacContext {
  user: Record<string, unknown>;
  resource: Record<string, unknown>;
  env: Record<string, unknown>;
}

export interface AbacPolicy {
  id: string;
  code: string;
  effect: 'permit' | 'deny';
  resource: string;
  action: string;
  expression: string;
  priority: number;
  enabled: boolean;
}

export interface AbacDecision {
  allow: boolean;
  matched: Array<{ policyId: string; effect: 'permit' | 'deny'; code: string }>;
  reason: string;
}

type Ast = jsep.Expression;

const MAX_EXPR_LEN = 4_096;

jsep.addBinaryOp('in', 7);
jsep.addBinaryOp('contains', 7);
jsep.addBinaryOp('startsWith', 7);
jsep.addBinaryOp('endsWith', 7);

/**
 * AbacEvaluator evaluates a whitelisted subset of CEL-like expressions
 * against an {user, resource, env} context. No function calls other than
 * a small pure builtin set; no property access outside the three roots.
 */
export class AbacEvaluator {
  evaluate(policies: AbacPolicy[], ctx: AbacContext, resource: string, action: string): AbacDecision {
    const applicable = policies
      .filter((p) => p.enabled && subjectMatches(p.resource, resource) && subjectMatches(p.action, action))
      .sort((a, b) => a.priority - b.priority);

    const matched: AbacDecision['matched'] = [];
    let deny = false;
    let permit = false;
    let reason = 'no-matching-policy';

    for (const p of applicable) {
      let ok = false;
      try {
        ok = this.evalExpr(p.expression, ctx);
      } catch (err) {
        reason = `policy ${p.code} error: ${(err as Error).message}`;
        continue;
      }
      if (!ok) continue;
      matched.push({ policyId: p.id, effect: p.effect, code: p.code });
      if (p.effect === 'deny') {
        deny = true;
        reason = `deny-by:${p.code}`;
        break;
      }
      permit = true;
      reason = `permit-by:${p.code}`;
    }

    return { allow: !deny && permit, matched, reason };
  }

  evalExpr(expression: string, ctx: AbacContext): boolean {
    if (!expression) return false;
    if (expression.length > MAX_EXPR_LEN) throw new Error('expression too long');
    const ast = jsep(expression);
    const val = evalNode(ast, ctx);
    return Boolean(val);
  }

  assert(policies: AbacPolicy[], ctx: AbacContext, resource: string, action: string): AbacDecision {
    const d = this.evaluate(policies, ctx, resource, action);
    if (!d.allow) throw new ForbiddenError(`abac: ${d.reason}`);
    return d;
  }
}

function subjectMatches(pattern: string, value: string): boolean {
  if (pattern === '*' || pattern === value) return true;
  if (pattern.endsWith('.*') && value.startsWith(pattern.slice(0, -2) + '.')) return true;
  return false;
}

function evalNode(node: Ast, ctx: AbacContext): unknown {
  switch (node.type) {
    case 'Literal':
      return (node as jsep.Literal).value;
    case 'Identifier': {
      const name = (node as jsep.Identifier).name;
      if (name === 'true') return true;
      if (name === 'false') return false;
      if (name === 'null') return null;
      if (name === 'user' || name === 'resource' || name === 'env') return ctx[name];
      throw new Error(`identifier not allowed: ${name}`);
    }
    case 'MemberExpression': {
      const me = node as jsep.MemberExpression;
      const obj = evalNode(me.object, ctx) as Record<string, unknown> | unknown[] | undefined;
      if (obj == null) return undefined;
      if (me.computed) {
        const key = evalNode(me.property, ctx);
        return (obj as Record<string, unknown>)[String(key)];
      }
      const prop = (me.property as jsep.Identifier).name;
      return (obj as Record<string, unknown>)[prop];
    }
    case 'ArrayExpression':
      return (node as jsep.ArrayExpression).elements.map((e) => evalNode(e as Ast, ctx));
    case 'UnaryExpression': {
      const u = node as jsep.UnaryExpression;
      const v = evalNode(u.argument, ctx);
      if (u.operator === '!') return !v;
      if (u.operator === '-') return -Number(v);
      if (u.operator === '+') return Number(v);
      throw new Error(`unary op not allowed: ${u.operator}`);
    }
    case 'BinaryExpression':
    case 'LogicalExpression': {
      const b = node as jsep.BinaryExpression;
      const l = evalNode(b.left, ctx);
      const r = evalNode(b.right, ctx);
      return applyBinary(b.operator, l, r);
    }
    case 'ConditionalExpression': {
      const c = node as jsep.ConditionalExpression;
      return evalNode(c.test, ctx) ? evalNode(c.consequent, ctx) : evalNode(c.alternate, ctx);
    }
    default:
      throw new Error(`node type not allowed: ${node.type}`);
  }
}

function applyBinary(op: string, l: unknown, r: unknown): unknown {
  switch (op) {
    case '==': return l === r;
    case '!=': return l !== r;
    case '<': return Number(l) < Number(r);
    case '<=': return Number(l) <= Number(r);
    case '>': return Number(l) > Number(r);
    case '>=': return Number(l) >= Number(r);
    case '&&': return Boolean(l) && Boolean(r);
    case '||': return Boolean(l) || Boolean(r);
    case '+': return typeof l === 'string' || typeof r === 'string' ? String(l) + String(r) : Number(l) + Number(r);
    case '-': return Number(l) - Number(r);
    case '*': return Number(l) * Number(r);
    case '/': return Number(l) / Number(r);
    case '%': return Number(l) % Number(r);
    case 'in':
      if (Array.isArray(r)) return r.includes(l);
      if (typeof r === 'string' && typeof l === 'string') return r.includes(l);
      return false;
    case 'contains':
      if (Array.isArray(l)) return l.includes(r);
      if (typeof l === 'string') return l.includes(String(r));
      return false;
    case 'startsWith':
      return typeof l === 'string' && typeof r === 'string' && l.startsWith(r);
    case 'endsWith':
      return typeof l === 'string' && typeof r === 'string' && l.endsWith(r);
    default:
      throw new Error(`operator not allowed: ${op}`);
  }
}
