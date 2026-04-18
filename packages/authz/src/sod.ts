import { ForbiddenError } from '@dogan/contracts';

export interface SodRule {
  id: string;
  code: string;
  kind: 'static' | 'dynamic';
  conflictSet: string[];
  enforce: 'block' | 'warn';
  enabled: boolean;
}

export interface SodViolation {
  ruleId: string;
  code: string;
  conflicting: string[];
  decision: 'blocked' | 'warned';
}

export interface SodCheckInput {
  currentRoles: string[];
  pendingRole: string;
  runtimeRoles?: string[];
}

/**
 * SoD evaluator. The authoritative static-grant check runs inside Postgres
 * (trigger installed by migration 0005). This class is the runtime evaluator
 * used for dynamic SoD — e.g. an approver must not be the requester — and
 * for pre-flight UI/API checks that explain why a grant would be blocked.
 */
export class SodEvaluator {
  evaluateGrant(rules: SodRule[], input: SodCheckInput): SodViolation[] {
    const out: SodViolation[] = [];
    for (const r of rules) {
      if (!r.enabled || r.kind !== 'static') continue;
      if (!r.conflictSet.includes(input.pendingRole)) continue;
      const conflicting = input.currentRoles.filter(
        (role) => role !== input.pendingRole && r.conflictSet.includes(role),
      );
      if (conflicting.length === 0) continue;
      out.push({
        ruleId: r.id,
        code: r.code,
        conflicting,
        decision: r.enforce === 'block' ? 'blocked' : 'warned',
      });
    }
    return out;
  }

  evaluateRuntime(
    rules: SodRule[],
    runtimeRoles: string[],
  ): SodViolation[] {
    const out: SodViolation[] = [];
    for (const r of rules) {
      if (!r.enabled || r.kind !== 'dynamic') continue;
      const held = runtimeRoles.filter((role) => r.conflictSet.includes(role));
      if (held.length >= 2) {
        out.push({
          ruleId: r.id,
          code: r.code,
          conflicting: held,
          decision: r.enforce === 'block' ? 'blocked' : 'warned',
        });
      }
    }
    return out;
  }

  assertNoBlocking(violations: SodViolation[]): void {
    const blocking = violations.filter((v) => v.decision === 'blocked');
    if (blocking.length > 0) {
      throw new ForbiddenError(`sod_violation:${blocking.map((v) => v.code).join(',')}`);
    }
  }
}
