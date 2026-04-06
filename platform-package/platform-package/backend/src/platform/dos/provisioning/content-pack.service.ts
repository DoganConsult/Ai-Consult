/**
 * Content Pack Service — Resolves industry-specific GRC content packs.
 *
 * Content packs bundle pre-configured policies, controls, risk templates,
 * and framework mappings for specific industry sectors (e.g., banking,
 * healthcare, government).
 *
 * Storage: `content_packs` table in public schema (shared across tenants).
 */

import { safeQuery } from '../../../config/database';
import { logger } from '../observability/logger.service';

export interface ContentPack {
  packCode: string;
  packName: string;
  sector: string;
  modules: string[];
}

/**
 * Resolve applicable content packs for given industry sectors.
 * Each sector may match multiple packs (e.g., "banking" matches
 * PCI-DSS pack, Basel III pack, AML pack).
 *
 * Accepts either (sectorIds) or (tenantId, sectorIds) for backward
 * compatibility with callers that pass only sector arrays.
 */
export async function resolvePacksForSectors(
  tenantIdOrSectors: string | string[],
  maybeSectors?: string[],
): Promise<ContentPack[]> {
  // Support both call signatures: (sectorIds[]) and (tenantId, sectorIds[])
  let tenantId: string | undefined;
  let sectors: string[];

  if (Array.isArray(tenantIdOrSectors)) {
    // Called as resolvePacksForSectors(sectorIds)
    sectors = tenantIdOrSectors;
    tenantId = undefined;
  } else {
    // Called as resolvePacksForSectors(tenantId, sectorIds)
    tenantId = tenantIdOrSectors;
    sectors = maybeSectors ?? [];
  }

  if (!sectors || sectors.length === 0) {
    return [];
  }

  try {
    // Query packs matching any of the given sectors
    const { rows } = await safeQuery(
      `SELECT pack_code, pack_name, sector, modules, description
       FROM public.content_packs
       WHERE sector = ANY($1)
         AND is_active = TRUE
       ORDER BY sector, pack_name`,
      [sectors],
    );

    const packs: ContentPack[] = rows.map((row: any) => ({
      packCode: row.pack_code as string,
      packName: row.pack_name as string,
      sector: row.sector as string,
      modules: Array.isArray(row.modules)
        ? row.modules
        : typeof row.modules === 'string'
          ? JSON.parse(row.modules)
          : [],
    }));

    // Also check for universal packs applicable to all sectors
    const { rows: universalRows } = await safeQuery(
      `SELECT pack_code, pack_name, sector, modules
       FROM public.content_packs
       WHERE sector = 'universal'
         AND is_active = TRUE
       ORDER BY pack_name`,
    ).catch(() => ({ rows: [] }));

    for (const row of universalRows) {
      // Avoid duplicates
      if (!packs.find(p => p.packCode === row.pack_code)) {
        packs.push({
          packCode: row.pack_code as string,
          packName: row.pack_name as string,
          sector: row.sector as string,
          modules: Array.isArray(row.modules)
            ? row.modules
            : typeof row.modules === 'string'
              ? JSON.parse(row.modules)
              : [],
        });
      }
    }

    // Log resolution for tenant audit trail
    if (packs.length > 0) {
      logger.info('[ContentPack] Resolved packs', {
        ...(tenantId ? { tenantId } : {}),
        sectors,
        packCount: packs.length,
        packCodes: packs.map(p => p.packCode),
      });
    }

    return packs;
  } catch (err) {
    logger.error('[ContentPack] Failed to resolve packs', {
      ...(tenantId ? { tenantId } : {}),
      sectors,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
