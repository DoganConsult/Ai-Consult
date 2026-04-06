// @ts-nocheck
import { logger } from '../../observability/services/logger.service';
// ============================================
// Shahin — Merkle Witness Service
// Daily Merkle root computation for external
// tamper-evidence of audit trail + event log.
// ============================================

import { createHash } from 'crypto';
import { safeQuery, query, tenantSchema } from '../../../../config/database';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';

export interface MerkleWitnessResult {
  witnessId: string;
  tenantId: string;
  witnessDate: string;
  sourceTable: string;
  merkleRoot: string;
  entryCount: number;
  firstEntryHash: string | null;
  lastEntryHash: string | null;
}

/**
 * Build a binary Merkle tree from leaf hashes and return the root.
 * If no leaves, returns SHA-256 of empty string.
 */
function computeMerkleRoot(leaves: string[]): string {
  if (leaves.length === 0) {
    return createHash('sha256').update('').digest('hex');
  }
  if (leaves.length === 1) {
    return leaves[0];
  }

  let level = [...leaves];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left; // duplicate last if odd
      next.push(createHash('sha256').update(left + right).digest('hex'));
    }
    level = next;
  }
  return level[0];
}

/**
 * Generate and persist a Merkle witness for a tenant's audit data from the past 24h.
 * Called daily by scheduled job.
 */
export async function generateDailyWitness(tenantId: string): Promise<MerkleWitnessResult[]> {
  const schema = tenantSchema(tenantId);
  const witnessDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const results: MerkleWitnessResult[] = [];

  const sources = [
    { table: 'audit_trail', hashCol: 'entry_hash', tsCol: 'timestamp' },
    { table: 'agrc_event_log', hashCol: 'entry_hash', tsCol: 'created_at' },
  ];

  for (const src of sources) {
    try {
      // Collect hashes from past 24h
      const hashResult = await safeQuery(
        `SELECT ${src.hashCol} FROM "${schema}".${src.table}
         WHERE ${src.hashCol} IS NOT NULL
           AND ${src.tsCol} >= (NOW() - INTERVAL '24 hours')
         ORDER BY ${src.tsCol} ASC`,
      );

      const hashes: string[] = hashResult.rows.map((r: GenericRow) => r[src.hashCol]);
      if (hashes.length === 0) continue;

      const merkleRoot = computeMerkleRoot(hashes);

      // Persist witness
      const insertResult = await query(
        `INSERT INTO public.audit_merkle_witnesses
           (tenant_id, witness_date, source_table, merkle_root, entry_count, first_entry_hash, last_entry_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (tenant_id, witness_date, source_table) DO UPDATE SET
           merkle_root = EXCLUDED.merkle_root,
           entry_count = EXCLUDED.entry_count,
           first_entry_hash = EXCLUDED.first_entry_hash,
           last_entry_hash = EXCLUDED.last_entry_hash,
           created_at = NOW()
         RETURNING witness_id`,
        [tenantId, witnessDate, src.table, merkleRoot, hashes.length, hashes[0], hashes[hashes.length - 1]],
      );

      results.push({
        witnessId: getFirstRow(insertResult)?.witness_id,
        tenantId,
        witnessDate,
        sourceTable: src.table,
        merkleRoot,
        entryCount: hashes.length,
        firstEntryHash: hashes[0],
        lastEntryHash: hashes[hashes.length - 1],
      });
    } catch (err: unknown) {
      logger.warn(`[MerkleWitness] ${src.table} for ${tenantId}: ${toErrorMessage(err)}`);
    }
  }

  return results;
}

/**
 * Verify a stored Merkle witness against current data.
 * Re-computes the Merkle root from DB entries and compares.
 */
export async function verifyWitness(
  tenantId: string,
  witnessDate: string,
  sourceTable: string,
): Promise<{ valid: boolean; storedRoot: string; computedRoot: string; entryCount: number }> {
  const schema = tenantSchema(tenantId);

  // Get stored witness
  const witnessResult = await query(
    `SELECT merkle_root, entry_count FROM public.audit_merkle_witnesses
     WHERE tenant_id = $1 AND witness_date = $2 AND source_table = $3`,
    [tenantId, witnessDate, sourceTable],
  );
  if (witnessResult.rows.length === 0) {
    return { valid: false, storedRoot: '', computedRoot: '', entryCount: 0 };
  }

  const stored = getFirstRow(witnessResult);
  const tsCol = sourceTable === 'audit_trail' ? 'timestamp' : 'created_at';

  // Re-collect hashes for that date
  const hashResult = await safeQuery(
    `SELECT entry_hash FROM "${schema}".${sourceTable}
     WHERE entry_hash IS NOT NULL
       AND ${tsCol}::date = $1
     ORDER BY ${tsCol} ASC`,
    [witnessDate],
  );

  const hashes: string[] = hashResult.rows.map((r: GenericRow) => r.entry_hash);
  const computedRoot = computeMerkleRoot(hashes);

  return {
    valid: computedRoot === stored.merkle_root,
    storedRoot: stored.merkle_root,
    computedRoot,
    entryCount: hashes.length,
  };
}

/**
 * Run daily witness generation for all active tenants.
 * Called from job scheduler or Temporal schedule.
 */
export async function runDailyMerkleWitness(): Promise<{ tenantsProcessed: number; witnessesCreated: number }> {
  const tenants = await query(
    `SELECT tenant_id FROM tenants WHERE status = 'active' ORDER BY tenant_id`,
  );

  let witnessesCreated = 0;
  for (const row of tenants.rows) {
    try {
      const results = await generateDailyWitness(row.tenant_id);
      witnessesCreated += results.length;
    } catch (err: unknown) {
      logger.warn(`[MerkleWitness] Tenant ${row.tenant_id}: ${toErrorMessage(err)}`);
    }
  }

  return { tenantsProcessed: tenants.rows.length, witnessesCreated };
}
