import { Type, type Static } from '@sinclair/typebox';

/**
 * Shared contract for the NOC + SOC operator console.
 * Both composer pillars (src/DNOC, src/DSOC, src/DAuth, src/DOS) and the
 * platform-package BFF (backend/src/platform/pillars) expose these shapes.
 */

export const Severity = Type.Union([
  Type.Literal('info'),
  Type.Literal('low'),
  Type.Literal('medium'),
  Type.Literal('high'),
  Type.Literal('critical'),
]);
export type Severity = Static<typeof Severity>;

export const AlertStatus = Type.Union([
  Type.Literal('open'),
  Type.Literal('ack'),
  Type.Literal('resolved'),
  Type.Literal('suppressed'),
]);
export type AlertStatus = Static<typeof AlertStatus>;

// ── DNOC ─────────────────────────────────────────────────────────────────────
export const DnocService = Type.Object({
  name: Type.String(),
  instance: Type.Optional(Type.String()),
  status: Type.String(),
});
export type DnocService = Static<typeof DnocService>;

export const DnocHealth = Type.Object({
  ts: Type.String({ format: 'date-time' }),
  prometheus: Type.Boolean(),
  alertmanager: Type.Boolean(),
  database: Type.Object({ up: Type.Boolean(), latencyMs: Type.Number() }),
  services: Type.Array(DnocService),
});
export type DnocHealth = Static<typeof DnocHealth>;

// ── DSOC ─────────────────────────────────────────────────────────────────────
export const SecurityAlert = Type.Object({
  id: Type.Union([Type.String(), Type.Number()]),
  ts: Type.String({ format: 'date-time' }),
  tenant_id: Type.Optional(Type.String()),
  user_id: Type.Optional(Type.String()),
  severity: Severity,
  source: Type.String(),
  category: Type.String(),
  title: Type.String(),
  detail: Type.Record(Type.String(), Type.Unknown()),
  event_id: Type.Optional(Type.String()),
  status: AlertStatus,
  acked_by: Type.Optional(Type.String()),
  acked_at: Type.Optional(Type.String({ format: 'date-time' })),
});
export type SecurityAlert = Static<typeof SecurityAlert>;

export const AuditEvent = Type.Object({
  id: Type.Union([Type.String(), Type.Number()]),
  ts: Type.String({ format: 'date-time' }),
  tenant_id: Type.Optional(Type.String()),
  user_id: Type.Optional(Type.String()),
  action: Type.String(),
  target: Type.String(),
  status_code: Type.Optional(Type.Number()),
  client_ip: Type.Optional(Type.String()),
  request_id: Type.Optional(Type.String()),
  meta: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});
export type AuditEvent = Static<typeof AuditEvent>;

// ── DAuth ────────────────────────────────────────────────────────────────────
export const RiskBand = Type.Union([
  Type.Literal('low'),
  Type.Literal('medium'),
  Type.Literal('high'),
  Type.Literal('critical'),
]);
export type RiskBand = Static<typeof RiskBand>;

export const RiskScore = Type.Object({
  score: Type.Number({ minimum: 0, maximum: 100 }),
  band: RiskBand,
  open_high: Type.Number(),
  last_1h: Type.Number(),
  last_24h: Type.Number(),
  ts: Type.String({ format: 'date-time' }),
});
export type RiskScore = Static<typeof RiskScore>;

// ── DOS ──────────────────────────────────────────────────────────────────────
export const DosOverview = Type.Object({
  tenants: Type.Object({
    total: Type.Number(),
    active: Type.Number(),
    suspended: Type.Number(),
  }),
  auditPartitions: Type.Number(),
  rlsPolicies: Type.Number(),
  ts: Type.String({ format: 'date-time' }),
});
export type DosOverview = Static<typeof DosOverview>;

// ── Permissions (DB-driven wiring) ───────────────────────────────────────────
export const PILLAR_PERMISSIONS = [
  'platform.noc.read',
  'platform.noc.operate',
  'platform.soc.read',
  'platform.soc.triage',
  'platform.soc.resolve',
  'platform.dauth.operate',
  'platform.dauth.jit.revoke',
  'platform.dos.read',
  'platform.dos.operate',
] as const;
export type PillarPermission = (typeof PILLAR_PERMISSIONS)[number];
