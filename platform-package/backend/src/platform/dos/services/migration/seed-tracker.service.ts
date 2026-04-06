import { safeQuery } from '../../../../config/database';

/**
 * Check if a seed version has already been applied.
 */
export async function isSeedApplied(seedId: string, version: string): Promise<boolean> {
  const result = await safeQuery(
    'SELECT seed_id FROM seed_history WHERE seed_id = $1 AND version = $2',
    [seedId, version]
  );
  return result.rows.length > 0;
}

/**
 * Record a seed execution in the history.
 */
export async function recordSeedExecution(seedId: string, version: string, status: string = 'success'): Promise<void> {
  await safeQuery(
    'INSERT INTO seed_history (seed_id, version, status) VALUES ($1, $2, $3) ON CONFLICT (seed_id) DO UPDATE SET version = $2, status = $3, executed_at = NOW()',
    [seedId, version, status]
  );
}

/**
 * Execute a seed function idempotently.
 * If the seed version has already been applied, skip it and return false.
 * Otherwise, execute the seed function and record it, returning true.
 */
export async function executeSeedIdempotent(
  seedId: string,
  version: string,
  seedFn: () => Promise<void>
): Promise<boolean> {
  const applied = await isSeedApplied(seedId, version);
  if (applied) return false; // Already applied, skip

  await seedFn();
  await recordSeedExecution(seedId, version);
  return true;
}

// Pure function for testing: checks if a seed should be applied
export function shouldApplySeed(existingSeeds: { seed_id: string; version: string }[], seedId: string, version: string): boolean {
  return !existingSeeds.some(s => s.seed_id === seedId && s.version === version);
}
