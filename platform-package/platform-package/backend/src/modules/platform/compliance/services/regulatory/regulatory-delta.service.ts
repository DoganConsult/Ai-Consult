import { v4 as uuid } from 'uuid';
import { safeQuery } from '../../../../../config/database';

import { logger } from '../../../../../platform/dos/observability/services/logger.service';

/**
 * Regulatory Delta Scanner.
 * Compares the current adopted framework versions against the canonical
 * regulatory_instruments table to detect version mismatches, new
 * requirements, or withdrawn instruments.
 */
export async function scanAllInstruments(
  tenantId: string,
): Promise<{ instrumentsScanned: number; deltasFound: number }> {
  const schema = `tenant_${tenantId}`;
  let instrumentsScanned = 0;
  let deltasFound = 0;

  try {
    // ── 1. Fetch canonical regulatory instruments ────────────────────
    const instrumentsResult = await safeQuery(
      `SELECT id, code, title, current_version, status, effective_date
         FROM ${schema}.regulatory_instruments
        WHERE status IN ('active', 'amended', 'withdrawn')
        ORDER BY code`,
    );
    const instruments: Array<{
      id: string;
      code: string;
      title: string;
      current_version: string;
      status: string;
      effective_date: string;
    }> = instrumentsResult.rows ?? [];

    instrumentsScanned = instruments.length;

    if (instrumentsScanned === 0) {
      return { instrumentsScanned: 0, deltasFound: 0 };
    }

    // ── 2. Fetch adopted framework versions ──────────────────────────
    const adoptedResult = await safeQuery(
      `SELECT instrument_id, adopted_version, adoption_date
         FROM ${schema}.adopted_frameworks
        ORDER BY instrument_id`,
    );
    const adoptedMap = new Map<string, { adopted_version: string; adoption_date: string }>();
    for (const row of adoptedResult.rows ?? []) {
      adoptedMap.set(row.instrument_id, {
        adopted_version: row.adopted_version,
        adoption_date: row.adoption_date,
      });
    }

    // ── 3. Compare and detect deltas ─────────────────────────────────
    for (const instrument of instruments) {
      const adopted = adoptedMap.get(instrument.id);

      let deltaType: string | null = null;
      let deltaDescription!: string;

      if (!adopted) {
        // New instrument not yet adopted
        deltaType = 'new_instrument';
        deltaDescription = `Regulatory instrument "${instrument.title}" (${instrument.code}) is active but not yet adopted by this tenant.`;
      } else if (instrument.current_version !== adopted.adopted_version) {
        // Version mismatch
        deltaType = 'version_mismatch';
        deltaDescription = `Instrument "${instrument.code}" has version ${instrument.current_version} but tenant adopted version ${adopted.adopted_version}.`;
      } else if (instrument.status === 'withdrawn') {
        // Instrument has been withdrawn
        deltaType = 'instrument_withdrawn';
        deltaDescription = `Instrument "${instrument.code}" has been withdrawn. Review adopted framework alignment.`;
      }

      if (deltaType) {
        // Upsert delta record — avoid duplicates for the same instrument+type
        await safeQuery(
          `INSERT INTO ${schema}.regulatory_deltas
             (id, instrument_id, delta_type, description, status, detected_at, created_at)
           VALUES ($1, $2, $3, $4, 'open', NOW(), NOW())
           ON CONFLICT (instrument_id, delta_type)
             WHERE status = 'open'
           DO UPDATE SET description = $4, detected_at = NOW()`,
          [uuid(), instrument.id, deltaType, deltaDescription],
        );
        deltasFound++;
      }
    }

    return { instrumentsScanned, deltasFound };
  } catch (err) {
    logger.error(
      `[REGULATORY_DELTA] scan failed for tenant ${tenantId}:`,
      err,
    );
    return { instrumentsScanned, deltasFound };
  }
}
