import { v4 as uuid } from 'uuid';
import { safeQuery } from '../../../../config/database/database';
import { logger } from '../../logger';
import type { AsBuiltEntry, UnresolvedRisk } from '../contracts/operations.types';

const ledger = new Map<string, AsBuiltEntry>();
const riskRegister = new Map<string, UnresolvedRisk>();

export function recordAsBuiltEntry(input: Omit<AsBuiltEntry, 'entryId' | 'updatedAt'>): AsBuiltEntry {
  const existing = Array.from(ledger.values()).find(
    (e) => e.name === input.name && e.ownerLayer === input.ownerLayer && e.category === input.category,
  );

  const entry: AsBuiltEntry = {
    entryId: existing?.entryId ?? uuid(),
    ...input,
    updatedAt: new Date().toISOString(),
  };

  ledger.set(entry.entryId, entry);
  void persistEntry(entry);
  return entry;
}

export function updateAsBuiltEntry(entryId: string, updates: Partial<Omit<AsBuiltEntry, 'entryId'>>): void {
  const entry = ledger.get(entryId);
  if (!entry) return;
  Object.assign(entry, updates, { updatedAt: new Date().toISOString() });
  void persistEntry(entry);
}

export function getAsBuiltEntries(filter?: {
  ownerLayer?: AsBuiltEntry['ownerLayer'];
  category?: AsBuiltEntry['category'];
}): AsBuiltEntry[] {
  const entries = Array.from(ledger.values());
  if (!filter) return entries;
  return entries.filter((e) => {
    if (filter.ownerLayer && e.ownerLayer !== filter.ownerLayer) return false;
    if (filter.category && e.category !== filter.category) return false;
    return true;
  });
}

export function registerUnresolvedRisk(input: Omit<UnresolvedRisk, 'riskId' | 'identifiedAt'>): UnresolvedRisk {
  const risk: UnresolvedRisk = {
    riskId: uuid(),
    ...input,
    identifiedAt: new Date().toISOString(),
  };
  riskRegister.set(risk.riskId, risk);
  void persistRisk(risk);
  logger.warn('[Handover] Unresolved risk registered', { riskId: risk.riskId, title: risk.title, severity: risk.severity });
  return risk;
}

export function resolveRisk(riskId: string): void {
  riskRegister.delete(riskId);
  logger.info('[Handover] Risk resolved', { riskId });
}

export function getUnresolvedRisks(severity?: UnresolvedRisk['severity']): UnresolvedRisk[] {
  const risks = Array.from(riskRegister.values());
  return severity ? risks.filter((r) => r.severity === severity) : risks;
}

export function getCriticalUnresolvedRisks(): UnresolvedRisk[] {
  return getUnresolvedRisks('critical');
}

async function persistEntry(entry: AsBuiltEntry): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO public.as_built_ledger
         (entry_id, category, name, owner, owner_layer, description, runtime_dependencies,
          known_limitations, handover_notes, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (entry_id) DO UPDATE SET
         description = EXCLUDED.description,
         runtime_dependencies = EXCLUDED.runtime_dependencies,
         known_limitations = EXCLUDED.known_limitations,
         handover_notes = EXCLUDED.handover_notes,
         updated_at = EXCLUDED.updated_at`,
      [
        entry.entryId,
        entry.category,
        entry.name,
        entry.owner,
        entry.ownerLayer,
        entry.description,
        JSON.stringify(entry.runtimeDependencies),
        JSON.stringify(entry.knownLimitations),
        entry.handoverNotes ?? null,
        entry.updatedAt,
      ],
    );
  } catch (err) {
    logger.warn('[Handover] Failed to persist as-built entry', { entryId: entry.entryId, error: (err as Error).message });
  }
}

async function persistRisk(risk: UnresolvedRisk): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO public.unresolved_risks
         (risk_id, title, description, severity, area, owner, mitigation_plan,
          target_resolution_date, identified_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (risk_id) DO UPDATE SET
         mitigation_plan = EXCLUDED.mitigation_plan,
         target_resolution_date = EXCLUDED.target_resolution_date`,
      [
        risk.riskId,
        risk.title,
        risk.description,
        risk.severity,
        risk.area,
        risk.owner ?? null,
        risk.mitigationPlan ?? null,
        risk.targetResolutionDate ?? null,
        risk.identifiedAt,
      ],
    );
  } catch (err) {
    logger.warn('[Handover] Failed to persist risk', { riskId: risk.riskId, error: (err as Error).message });
  }
}

export function bootstrapPlatformAsBuilt(): void {
  recordAsBuiltEntry({
    category: 'service',
    name: 'dos-platform-core',
    owner: 'platform-ops',
    ownerLayer: 'DOS',
    description: 'Dogan-AI-OS platform core: tenancy, modules, events, lifecycle, provisioning, observability, operations',
    runtimeDependencies: ['postgresql', 'event-bus', 'cache'],
    knownLimitations: ['In-memory circuit breaker state — not replicated across instances'],
    handoverNotes: 'See runbook: dos-core-unhealthy for recovery procedures',
  });

  recordAsBuiltEntry({
    category: 'service',
    name: 'dauth-core',
    owner: 'platform-ops',
    ownerLayer: 'DAuth',
    description: 'Dogan-Auth: identity, sessions, access profiles, roles, permissions, scope, delegation, SoD',
    runtimeDependencies: ['postgresql', 'dos-platform-core'],
    knownLimitations: [],
    handoverNotes: 'Auth is the only source of identity truth. See DAuth section of AGENTS.md.',
  });

  recordAsBuiltEntry({
    category: 'service',
    name: 'operations-stack',
    owner: 'platform-ops',
    ownerLayer: 'DOS',
    description: 'Platform operations: health, telemetry, metrics, tracing, reliability, alerts, incidents, recovery, runbooks, handover',
    runtimeDependencies: ['dos-platform-core', 'postgresql'],
    knownLimitations: [
      'Incident records stored in-memory and persisted to DB — restart may lose unresisted in-flight state',
      'Dead letter queue is in-memory — capped at 1000 entries',
      'Span records are in-memory ring buffer — capped at 500 entries',
    ],
    handoverNotes: 'See /admin/operations routes for operator access to all diagnostics',
  });

  logger.info('[Handover] Platform as-built entries bootstrapped');
}

export const asBuiltLedgerService = {
  recordAsBuiltEntry,
  updateAsBuiltEntry,
  getAsBuiltEntries,
  registerUnresolvedRisk,
  resolveRisk,
  getUnresolvedRisks,
  getCriticalUnresolvedRisks,
  bootstrapPlatformAsBuilt,
};
