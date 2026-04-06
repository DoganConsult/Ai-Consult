// @ts-nocheck
/**
 * DOS Observability — manages metrics, telemetry, caching, monitoring, and GRC mappings.
 * Tables: cache_dependencies, cache_invalidation_log, performance_cache,
 *         metadata_records, metric_snapshots, milestone_definitions, milestone_instances,
 *         telemetry_signals, signal_detector_registry, enforcement_gate_log,
 *         severity_escalation_thresholds, seeding_depth_config, input_validation_rules,
 *         co_draft_sessions, command_palette_history, shadow_comparisons, websocket_event_queue,
 *         dogan_guardian_config, profile_completeness_rules, profile_completeness_scores,
 *         grc_control_sector_mapping, grc_entity_profile_mapping, grc_evidence_action_mapping,
 *         grc_evidence_sector_mapping, grc_qiyas_control_feedback, grc_risk_sector_mapping,
 *         grc_sector_lookup
 */
import { safeQuery, tenantSchema } from '../../../config/database/database';
import type { GenericRow } from '../../../types/db-rows.types';
import { getFirstRow } from '../../../shared/data/db-utils';

// ── cache_dependencies + cache_invalidation_log ──

export async function getCacheDependencies(tenantId: string, cacheKey: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".cache_dependencies WHERE cache_key = $1`, [cacheKey]);
  return result.rows;
}

export async function logCacheInvalidation(tenantId: string, cacheKey: string, reason: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".cache_invalidation_log (cache_key, reason) VALUES ($1, $2)`,
    [cacheKey, reason],
  );
}

// ── performance_cache ──

export async function getPerformanceCache(tenantId: string, cacheKey: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".performance_cache WHERE cache_key = $1 AND expires_at > NOW()`, [cacheKey]);
  return getFirstRow(result);
}

export async function setPerformanceCache(tenantId: string, cacheKey: string, data: unknown, ttlSeconds: number): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".performance_cache (cache_key, data, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 second' * $3)
     ON CONFLICT (cache_key) DO UPDATE SET data = $2, expires_at = NOW() + INTERVAL '1 second' * $3, updated_at = NOW()`,
    [cacheKey, JSON.stringify(data), ttlSeconds],
  );
}

// ── metadata_records ──

export async function getMetadataRecord(tenantId: string, entityType: string, entityId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".metadata_records WHERE entity_type = $1 AND entity_id = $2`, [entityType, entityId]);
  return getFirstRow(result);
}

export async function upsertMetadataRecord(tenantId: string, entityType: string, entityId: string, metadata: Record<string, unknown>): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".metadata_records (entity_type, entity_id, metadata) VALUES ($1, $2, $3)
     ON CONFLICT (entity_type, entity_id) DO UPDATE SET metadata = $3, updated_at = NOW()`,
    [entityType, entityId, JSON.stringify(metadata)],
  );
}

// ── metric_snapshots ──

export async function createMetricSnapshot(tenantId: string, metricCode: string, value: number, dimensions: Record<string, unknown> = {}): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".metric_snapshots (metric_code, value, dimensions, snapshot_date) VALUES ($1, $2, $3, CURRENT_DATE)`,
    [metricCode, value, JSON.stringify(dimensions)],
  );
}

export async function getMetricSnapshots(tenantId: string, metricCode: string, days = 30): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".metric_snapshots WHERE metric_code = $1 AND snapshot_date >= CURRENT_DATE - $2 ORDER BY snapshot_date`, [metricCode, days]);
  return result.rows;
}

// ── milestone_definitions + milestone_instances ──

export async function listMilestoneDefinitions(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".milestone_definitions WHERE is_active = TRUE ORDER BY sort_order`, []);
  return result.rows;
}

export async function getMilestoneInstances(tenantId: string, entityType: string, entityId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".milestone_instances WHERE entity_type = $1 AND entity_id = $2 ORDER BY completed_at`, [entityType, entityId]);
  return result.rows;
}

// ── telemetry_signals ──

export async function recordTelemetrySignal(tenantId: string, signalType: string, source: string, value: unknown): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".telemetry_signals (signal_type, source, value) VALUES ($1, $2, $3)`,
    [signalType, source, JSON.stringify(value)],
  );
}

// ── signal_detector_registry ──

export async function listSignalDetectors(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".signal_detector_registry WHERE is_active = TRUE`, []);
  return result.rows;
}

// ── enforcement_gate_log ──

export async function logEnforcementGate(tenantId: string, gateName: string, entityType: string, entityId: string, passed: boolean, details: Record<string, unknown> = {}): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".enforcement_gate_log (gate_name, entity_type, entity_id, passed, details) VALUES ($1, $2, $3, $4, $5)`,
    [gateName, entityType, entityId, passed, JSON.stringify(details)],
  );
}

// ── severity_escalation_thresholds ──

export async function getSeverityEscalationThresholds(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".severity_escalation_thresholds WHERE is_active = TRUE ORDER BY severity_level`, []);
  return result.rows;
}

// ── seeding_depth_config ──

export async function getSeedingDepthConfig(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".seeding_depth_config ORDER BY entity_type`, []);
  return result.rows;
}

// ── input_validation_rules ──

export async function getInputValidationRules(tenantId: string, entityType: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".input_validation_rules WHERE entity_type = $1 AND is_active = TRUE`, [entityType]);
  return result.rows;
}

// ── co_draft_sessions ──

export async function getActiveDraftSessions(tenantId: string, userId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".co_draft_sessions WHERE user_id = $1 AND is_active = TRUE ORDER BY updated_at DESC`, [userId]);
  return result.rows;
}

// ── command_palette_history ──

export async function getCommandPaletteHistory(tenantId: string, userId: string, limit = 20): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".command_palette_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, [userId, limit]);
  return result.rows;
}

// ── shadow_comparisons ──

export async function getShadowComparisons(tenantId: string, limit = 20): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".shadow_comparisons ORDER BY created_at DESC LIMIT $1`, [limit]);
  return result.rows;
}

// ── websocket_event_queue ──

export async function getWebsocketEventQueue(tenantId: string, limit = 100): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".websocket_event_queue WHERE delivered = FALSE ORDER BY created_at LIMIT $1`, [limit]);
  return result.rows;
}

// ── dogan_guardian_config ──

export async function getDoganGuardianConfig(tenantId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".dogan_guardian_config WHERE is_active = TRUE LIMIT 1`, []);
  return getFirstRow(result);
}

// ── profile_completeness_rules + profile_completeness_scores ──

export async function getProfileCompletenessRules(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".profile_completeness_rules WHERE is_active = TRUE ORDER BY weight DESC`, []);
  return result.rows;
}

export async function getProfileCompletenessScore(tenantId: string, userId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".profile_completeness_scores WHERE user_id = $1`, [userId]);
  return getFirstRow(result);
}

// ── GRC Sector Mappings ──

export async function getGrcControlSectorMapping(tenantId: string, sectorCode?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const where = sectorCode ? 'WHERE sector_code = $1' : '';
  const params = sectorCode ? [sectorCode] : [];
  const result = await safeQuery(`SELECT * FROM "${schema}".grc_control_sector_mapping ${where}`, params);
  return result.rows;
}

export async function getGrcEntityProfileMapping(tenantId: string, entityType: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".grc_entity_profile_mapping WHERE entity_type = $1`, [entityType]);
  return result.rows;
}

export async function getGrcEvidenceActionMapping(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".grc_evidence_action_mapping`, []);
  return result.rows;
}

export async function getGrcEvidenceSectorMapping(tenantId: string, sectorCode?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const where = sectorCode ? 'WHERE sector_code = $1' : '';
  const params = sectorCode ? [sectorCode] : [];
  const result = await safeQuery(`SELECT * FROM "${schema}".grc_evidence_sector_mapping ${where}`, params);
  return result.rows;
}

export async function logGrcQiyasControlFeedback(tenantId: string, controlId: string, feedback: Record<string, unknown>): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".grc_qiyas_control_feedback (control_id, feedback) VALUES ($1, $2)`,
    [controlId, JSON.stringify(feedback)],
  );
}

export async function getGrcRiskSectorMapping(tenantId: string, sectorCode?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const where = sectorCode ? 'WHERE sector_code = $1' : '';
  const params = sectorCode ? [sectorCode] : [];
  const result = await safeQuery(`SELECT * FROM "${schema}".grc_risk_sector_mapping ${where}`, params);
  return result.rows;
}

export async function getGrcSectorLookup(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".grc_sector_lookup ORDER BY sector_name`, []);
  return result.rows;
}
