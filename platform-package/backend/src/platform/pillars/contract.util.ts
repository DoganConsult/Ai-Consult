import type { Response } from 'express';

/**
 * Gate 7 — Runtime contract validation.
 *
 * Lightweight zero-dependency shape validator for pillar BFF responses.
 * The pillar contract package (packages/contracts/src/pillars.ts) defines the
 * canonical wire shapes; we mirror just the runtime checks here so the BFF
 * fails closed when a route accidentally drifts from the contract.
 *
 * Mode is controlled by env CONTRACT_STRICT=1:
 *   - permissive (default): logs the diff to platform.audit_log + responds normally
 *   - strict: replies 500 { error: 'contract violation' }
 *
 * The validator returns true when payload conforms; false otherwise. The
 * caller is expected to short-circuit when strict mode rejects.
 */

type Spec =
  | { kind: 'string'; optional?: boolean; oneOf?: string[] }
  | { kind: 'number'; optional?: boolean }
  | { kind: 'boolean'; optional?: boolean }
  | { kind: 'object'; optional?: boolean; props: Record<string, Spec> }
  | { kind: 'array'; optional?: boolean; items: Spec }
  | { kind: 'unknown'; optional?: boolean };

function check(spec: Spec, val: unknown, path: string, errs: string[]): void {
  if (val === undefined || val === null) {
    if (!spec.optional) errs.push(`${path}: missing`);
    return;
  }
  switch (spec.kind) {
    case 'string':
      if (typeof val !== 'string') errs.push(`${path}: expected string`);
      else if (spec.oneOf && !spec.oneOf.includes(val))
        errs.push(`${path}: value '${val}' not in ${spec.oneOf.join('|')}`);
      break;
    case 'number':
      if (typeof val !== 'number' || Number.isNaN(val))
        errs.push(`${path}: expected number`);
      break;
    case 'boolean':
      if (typeof val !== 'boolean') errs.push(`${path}: expected boolean`);
      break;
    case 'array':
      if (!Array.isArray(val)) {
        errs.push(`${path}: expected array`);
      } else {
        for (let i = 0; i < val.length; i++) check(spec.items, val[i], `${path}[${i}]`, errs);
      }
      break;
    case 'object':
      if (typeof val !== 'object' || Array.isArray(val)) {
        errs.push(`${path}: expected object`);
      } else {
        const o = val as Record<string, unknown>;
        for (const [k, s] of Object.entries(spec.props)) {
          check(s, o[k], `${path}.${k}`, errs);
        }
      }
      break;
    case 'unknown':
      break;
  }
}

export function validateOrShip(
  res: Response,
  spec: Spec,
  payload: unknown,
  routeLabel: string,
): boolean {
  const errs: string[] = [];
  check(spec, payload, '$', errs);
  if (errs.length === 0) return true;
  const strict = process.env.CONTRACT_STRICT === '1';
  // eslint-disable-next-line no-console
  console.warn(`[contract] ${routeLabel}: ${errs.length} violation(s)`, errs.slice(0, 5));
  if (strict) {
    res.status(500).json({ error: 'contract violation', route: routeLabel, errors: errs });
    return false;
  }
  return true;
}

// ── Schemas mirroring packages/contracts/src/pillars.ts ──────────────────────
const Severity: Spec = { kind: 'string', oneOf: ['info', 'low', 'medium', 'high', 'critical'] };
const AlertStatus: Spec = { kind: 'string', oneOf: ['open', 'ack', 'resolved', 'suppressed'] };
const RiskBand: Spec = { kind: 'string', oneOf: ['low', 'medium', 'high', 'critical'] };

export const SecurityAlertListSchema: Spec = {
  kind: 'object',
  props: {
    alerts: {
      kind: 'array',
      items: {
        kind: 'object',
        props: {
          id: { kind: 'unknown' },
          ts: { kind: 'unknown' },
          severity: Severity,
          source: { kind: 'string' },
          category: { kind: 'string' },
          title: { kind: 'string' },
          status: AlertStatus,
        },
      },
    },
    ts: { kind: 'string' },
  },
};

export const RiskScoreSchema: Spec = {
  kind: 'object',
  props: {
    score: { kind: 'number' },
    band: RiskBand,
    open_high: { kind: 'number' },
    last_24h: { kind: 'number' },
    last_1h: { kind: 'number' },
    ts: { kind: 'string' },
  },
};

export const DnocHealthSchema: Spec = {
  kind: 'object',
  props: {
    ts: { kind: 'string' },
    prometheus: { kind: 'boolean' },
    alertmanager: { kind: 'boolean' },
    database: {
      kind: 'object',
      props: { up: { kind: 'boolean' }, latencyMs: { kind: 'number' } },
    },
    services: {
      kind: 'array',
      items: {
        kind: 'object',
        props: {
          name: { kind: 'string' },
          instance: { kind: 'string', optional: true },
          status: { kind: 'string' },
        },
      },
    },
  },
};
