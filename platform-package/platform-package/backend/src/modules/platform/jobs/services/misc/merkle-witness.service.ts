/**
 * Merkle Witness Service — Tamper-evident audit trail.
 *
 * Computes a daily Merkle root over audit_trail entries, producing
 * a cryptographic witness that can detect post-hoc tampering.
 *
 * Storage: `merkle_witnesses` table in tenant schema.
 */

import { createHash } from 'crypto';
import { safeQuery, tenantSchema } from '../../../../../config/database';
import { logger } from '../../../../../platform/dos/observability/logger.service';

export interface MerkleWitnessResult {
  entriesWitnessed: number;
  rootHash: string;
}

/**
 * Run the daily Merkle witness for a tenant.
 * Hashes all audit_trail entries from today, builds a Merkle tree,
 * and stores the root in the merkle_witnesses table.
 */
export async function runDailyMerkleWitness(
  tenantId: string,
): Promise<MerkleWitnessResult> {
  const schema = tenantSchema(tenantId);

  try {
    // Fetch today's audit entries ordered by id for deterministic hashing
    const { rows: entries } = await safeQuery(
      `SELECT id, action, actor_id, entity_type, entity_id, detail, created_at
       FROM "${schema}".audit_trail
       WHERE created_at::date = CURRENT_DATE
       ORDER BY id ASC`,
    ).catch(() => ({ rows: [] }));

    if (entries.length === 0) {
      logger.info('[MerkleWitness] No audit entries for today', { tenantId });
      return { entriesWitnessed: 0, rootHash: hashLeaf('empty') };
    }

    // Hash each entry into a leaf
    const leaves: string[] = entries.map((entry: any) =>
      hashLeaf(
        JSON.stringify({
          id: entry.id,
          action: entry.action,
          actor_id: entry.actor_id,
          entity_type: entry.entity_type,
          entity_id: entry.entity_id,
          detail: entry.detail,
          created_at: entry.created_at,
        }),
      ),
    );

    // Build Merkle tree and get root
    const rootHash = computeMerkleRoot(leaves);

    // Store the witness
    await safeQuery(
      `INSERT INTO "${schema}".merkle_witnesses
         (witness_date, entry_count, root_hash, leaf_hashes, created_at)
       VALUES (CURRENT_DATE, $1, $2, $3, NOW())
       ON CONFLICT (witness_date)
       DO UPDATE SET entry_count = $1, root_hash = $2, leaf_hashes = $3, created_at = NOW()`,
      [entries.length, rootHash, JSON.stringify(leaves)],
    );

    logger.info('[MerkleWitness] Daily witness computed', {
      tenantId,
      entriesWitnessed: entries.length,
      rootHash,
    });

    return { entriesWitnessed: entries.length, rootHash };
  } catch (err) {
    logger.error('[MerkleWitness] Failed to compute daily witness', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { entriesWitnessed: 0, rootHash: '' };
  }
}

/**
 * SHA-256 hash of a single data string.
 */
function hashLeaf(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Combine two hashes into a parent node.
 */
function hashPair(left: string, right: string): string {
  return createHash('sha256').update(left + right, 'utf8').digest('hex');
}

/**
 * Build a Merkle tree from an array of leaf hashes and return the root.
 * If the number of leaves is odd, the last leaf is duplicated.
 */
function computeMerkleRoot(leaves: string[]): string {
  if (leaves.length === 0) return hashLeaf('empty');
  if (leaves.length === 1) return leaves[0];

  let level = [...leaves];

  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left; // duplicate last if odd
      next.push(hashPair(left, right));
    }
    level = next;
  }

  return level[0];
}
