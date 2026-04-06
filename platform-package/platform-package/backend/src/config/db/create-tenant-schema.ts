// ============================================
// Platform — Tenant Schema DDL
// Orchestrator that delegates table creation
// to domain-specific schema modules.
// ============================================

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { query } from "./query";
import { pool } from "./pool";
import { toErrorMessage } from '../../errors/http-error.util';
import { logger } from '../../platform/dos/observability/logger.service';

import { createFoundationTables } from './schemas/foundation';
import { createTeamsGovernanceTables } from './schemas/teams-governance';
import { createAiAgentsTables } from './schemas/ai-agents';
import { createProvisioningTables } from './schemas/provisioning-onboarding';
import { createEvidenceConnectorTables } from './schemas/evidence-connectors';
import { createPlatformTables, seedPlatformData } from './schemas/platform-dashboard';

const PROVISIONING_GATE = {
  minTableCount: 500,
  requiredTables: [
    'users', 'roles', 'permissions', 'frameworks',
    'controls', 'risks', 'schema_migrations',
  ],
  maxMigrationLagVersions: 0,
};

export async function createTenantSchema(tenantId: string, sectorIds?: string[]): Promise<void> {
  if (process.env.PROVISIONING_LOCKED === 'true') {
    throw new Error(
      '[Provisioning] Tenant provisioning temporarily locked for schema migration. ' +
      'Unset PROVISIONING_LOCKED to resume. Contact platform team.'
    );
  }

  const t0 = Date.now();
  const schema = `tenant_${tenantId}`;
  await query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

  await createSchemaMigrationsTable(schema);

  // === Phase 1: Core GRC tables (frameworks, risks, policies, controls, evidence, etc.) ===
  await createFoundationTables(schema);

  // === Phase 2: Teams, governance, RACI, risk workspace, KRIs ===
  await createTeamsGovernanceTables(schema);

  // === Phase 3: Platform tables (assessments, reports, notifications, workspaces, etc.) ===
  await createPlatformTables(schema);

  // === Phase 4: AI agents, role profiles, authorization, AI governance registry ===
  await createAiAgentsTables(schema);

  // === Phase 5: Provisioning pipeline, workspace seeds, onboarding assessments ===
  await createProvisioningTables(schema);

  // === Phase 6: Evidence connectors (SIEM, CMDB, IAM, ITSM, M365, Vuln Scanner) ===
  await createEvidenceConnectorTables(schema);

  // === Phase 7: Apply tenant migrations (032-061) ===
  try {
    await applyTenantMigrations(schema);
  } catch (err: unknown) {
    logger.warn(`[DB] Tenant migration files warning for ${schema}`, { error: err instanceof Error ? err.message : String(err) });
  }

  // === Phase 7.5: Apply file-based migrations (062+) ===
  await applyHigherMigrations(schema);

  // === Phase 8: Seed data (modules, navigation, dashboards, frameworks, automation rules) ===
  await seedPlatformData(schema, tenantId, sectorIds);

  // === Phase 9: Seed dynamic RBAC engine (roles, permissions, role→permission map) ===
  const { seedDynamicRbacData } = await import('../../platform/dauth/access/rbac/seed-rbac-data');
  await seedDynamicRbacData(tenantId);

  const { runProductBootstrapHooks } = await import('../../modules/platform/provisioning/product-bootstrap-hooks');
  await runProductBootstrapHooks(tenantId);

  const durationMs = Date.now() - t0;

  // === Phase 10: Post-provisioning health gate ===
  await verifyProvisioningHealth(schema, tenantId, durationMs);

  logger.info(`[DB] Tenant schema "${schema}" provisioned in ${durationMs}ms (all migrations + seeds applied)`);
}

async function createSchemaMigrationsTable(schema: string): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".schema_migrations (
      version     INTEGER      PRIMARY KEY,
      filename    TEXT         NOT NULL,
      checksum    TEXT         NOT NULL,
      applied_at  TIMESTAMPTZ  DEFAULT NOW(),
      duration_ms INTEGER,
      applied_by  TEXT         DEFAULT 'system'
    )
  `);
  await query(`
    ALTER TABLE "${schema}".schema_migrations
    ADD COLUMN IF NOT EXISTS duration_ms INTEGER
  `).catch(() => {});
  await query(`
    ALTER TABLE "${schema}".schema_migrations
    ADD COLUMN IF NOT EXISTS applied_by TEXT DEFAULT 'system'
  `).catch(() => {});
}

async function verifyProvisioningHealth(schema: string, tenantId: string, durationMs: number): Promise<void> {
  const { rows: countRows } = await query(
    `SELECT count(*)::int AS tc FROM information_schema.tables
     WHERE table_schema = $1 AND table_type = 'BASE TABLE'`, [schema]
  );
  const tableCount = countRows[0]?.tc ?? 0;

  if (tableCount < PROVISIONING_GATE.minTableCount) {
    logger.error(`[Provisioning] HEALTH GATE FAILED for ${tenantId}: ${tableCount} tables < ${PROVISIONING_GATE.minTableCount} minimum`, { tenantId, tableCount, durationMs });
    throw new Error(
      `[Provisioning] Health gate failed: ${tableCount} tables created, minimum is ${PROVISIONING_GATE.minTableCount}. ` +
      `Tenant ${tenantId} may be in a degraded state.`
    );
  }

  const missingRequired: string[] = [];
  for (const tableName of PROVISIONING_GATE.requiredTables) {
    const { rows } = await query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`, [schema, tableName]
    );
    if (rows.length === 0) missingRequired.push(tableName);
  }

  if (missingRequired.length > 0) {
    logger.error(`[Provisioning] Required tables missing for ${tenantId}: ${missingRequired.join(', ')}`, { tenantId, missingRequired });
    throw new Error(
      `[Provisioning] Required tables missing: ${missingRequired.join(', ')}. Tenant ${tenantId} cannot operate safely.`
    );
  }

  logger.info(`[Provisioning] Health gate PASSED for ${tenantId}: ${tableCount} tables, ${durationMs}ms`);
}

/**
 * Apply AGRC-OS + Qiyas tenant migration SQL files (032-061) to a schema.
 * Uses SET search_path so migration SQL runs unmodified against the tenant schema.
 * All statements use IF NOT EXISTS / IF EXISTS so this is fully idempotent.
 */
async function applyTenantMigrations(schema: string): Promise<void> {
  const candidates = [
    join(__dirname, '..', '..', 'migrations', 'tenant'),
    join(__dirname, '..', 'migrations', 'tenant'),
    join(__dirname, '..', '..', 'src', 'migrations', 'tenant'),
    join(__dirname, '..', '..', '..', 'src', 'migrations', 'tenant'),
  ];
  let migrationDir = '';
  let bestCount = 0;
  for (const c of candidates) {
    if (existsSync(c)) {
      const count = readdirSync(c).filter(f => f.endsWith('.sql')).length;
      if (count > bestCount) { migrationDir = c; bestCount = count; }
    }
  }
  if (!migrationDir) {
    logger.warn(`[DB] No tenant migration directory found — skipping file-based migrations for ${schema}`);
    return;
  }

  // Collect migration files 032-061
  const allFiles = readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();
  const targetFiles = allFiles.filter(f => {
    const num = parseInt(f.substring(0, 3), 10);
    return num >= 32 && num <= 61;
  });

  if (targetFiles.length === 0) {
    logger.warn(`[DB] No migration files found (032–061) in ${migrationDir}`);
    return;
  }

  // Use a dedicated client so SET search_path is session-scoped
  const client = await pool.connect();
  let applied = 0;
  let skipped = 0;
  try {
    // Set search_path so all unqualified names resolve to the tenant schema
    await client.query(`SET search_path TO "${schema}", public`);

    await client.query(`ALTER TABLE IF EXISTS dashboard_role_bindings ADD COLUMN IF NOT EXISTS is_allowed boolean NOT NULL DEFAULT true`).catch((err: unknown) => {
      logger.warn('[DB] ALTER dashboard_role_bindings failed (non-fatal)', { error: toErrorMessage(err), schema });
    });

    for (const file of targetFiles) {
      try {
        let sql = readFileSync(join(migrationDir, file), 'utf8');
        sql = sql.replace(/^\s*BEGIN\s*;/gim, '').replace(/^\s*COMMIT\s*;/gim, '');
        await client.query(sql);
        applied++;
      } catch (err: unknown) {
        const msg = toErrorMessage(err) || '';
        if (!msg.includes('already exists') && !msg.includes('duplicate key') && !msg.includes('does not exist')) {
          logger.warn(`[DB] Migration ${file} warning for ${schema}: ${msg}`);
        }
        skipped++;
      }
    }
  } finally {
    // Always reset search_path and release the client
    await client.query('RESET search_path').catch((err: unknown) => {
      logger.warn('[DB] RESET search_path failed on tenant schema client release', { error: toErrorMessage(err), schema });
    });
    client.release();
  }
  if (skipped > 0) {
    logger.info(`[DB] Applied ${applied}/${targetFiles.length} migration files (032–061) to ${schema} (${skipped} skipped/already-applied)`);
  } else {
    logger.info(`[DB] Applied ${applied} migration files (032–061) to ${schema}`);
  }
}

async function applyHigherMigrations(schema: string): Promise<void> {
  const { readMigrationFiles, runMigrations: runFileMigrations } = await import('../../migrations/runner');

  const migCandidates = [
    join(__dirname, '..', '..', 'migrations', 'tenant'),
    join(__dirname, '..', 'migrations', 'tenant'),
    join(__dirname, '..', '..', 'src', 'migrations', 'tenant'),
    join(__dirname, '..', '..', '..', 'src', 'migrations', 'tenant'),
  ];
  let resolvedMigDir = '';
  let bestCount = 0;
  for (const c of migCandidates) {
    if (existsSync(c)) {
      const count = readdirSync(c).filter(f => f.endsWith('.sql')).length;
      if (count > bestCount) { resolvedMigDir = c; bestCount = count; }
    }
  }
  if (!resolvedMigDir) {
    logger.warn(`[DB] No tenant migration directory found for applyHigherMigrations on ${schema}`);
    return;
  }

  const allMigFiles = readMigrationFiles(resolvedMigDir);

  await createSchemaMigrationsTable(schema);

  for (const mig of allMigFiles) {
    if (mig.version > 61) continue;
    await query(`
      INSERT INTO "${schema}".schema_migrations (version, filename, checksum, applied_by)
      VALUES ($1, $2, $3, 'provisioning')
      ON CONFLICT (version) DO UPDATE SET checksum = EXCLUDED.checksum, filename = EXCLUDED.filename
    `, [mig.version, mig.filename, mig.checksum]);
  }

  const result = await runFileMigrations(query, 'tenant', schema);
  if (result.applied.length > 0) {
    logger.info(`[DB] Applied ${result.applied.length} file-based migrations (062+) to ${schema}: ${result.applied.join(', ')}`);
  }
  if (result.failed) {
    logger.error(`[DB] File migration FAILED for ${schema}: ${result.failed}`);
    throw new Error(result.failed);
  }
}
