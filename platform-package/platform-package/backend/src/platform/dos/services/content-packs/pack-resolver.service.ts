import { readFileSync } from 'fs';
import { join } from 'path';
import { safeQuery } from '../../../../config/database';
import type { ContentPackManifest } from '../../../../types/grc-os.types';
import { getDefaultProductKey } from '../../../deployment-profile';

const PACK_DIR = join(__dirname, '..', 'data', 'packs');

const BUILT_IN_PACKS: Record<string, string> = {
  shared_base_pack: 'shared_base_pack.json',
  agrc_base_pack: 'agrc_base_pack.json',
  qiyas_base_pack: 'qiyas_base_pack.json',
  trial_pack: 'trial_pack.json',
  demo_pack: 'demo_pack.json',
  nic_reference_pack: 'nic_reference_pack.json',
};

export function loadBuiltInPack(packId: string): ContentPackManifest | null {
  const filename = BUILT_IN_PACKS[packId];
  if (!filename) return null;
  try {
    const raw = readFileSync(join(PACK_DIR, filename), 'utf-8');
    return JSON.parse(raw) as ContentPackManifest;
  } catch {
    return null;
  }
}

export function listBuiltInPacks(): ContentPackManifest[] {
  const packs: ContentPackManifest[] = [];
  for (const packId of Object.keys(BUILT_IN_PACKS)) {
    const p = loadBuiltInPack(packId);
    if (p) packs.push(p);
  }
  return packs;
}

export async function resolvePacksForTier(subscriptionTier: string): Promise<ContentPackManifest[]> {
  const selected: ContentPackManifest[] = [];

  // Always include shared base
  const sharedBase = loadBuiltInPack('shared_base_pack');
  if (sharedBase) selected.push(sharedBase);

  // Always include AGRC base
  const agrcBase = loadBuiltInPack('agrc_base_pack');
  if (agrcBase) selected.push(agrcBase);

  // Trial-specific pack
  const tierLower = subscriptionTier.toLowerCase();
  if (tierLower.includes('trial') || tierLower === 'starter') {
    const trialPack = loadBuiltInPack('trial_pack');
    if (trialPack) selected.push(trialPack);
  }

  // Demo/sandbox tenants get the full demo pack
  if (tierLower === 'demo' || tierLower === 'sandbox') {
    const demoPack = loadBuiltInPack('demo_pack');
    if (demoPack) selected.push(demoPack);
  }

  // Professional/enterprise get Qiyas
  if (tierLower === 'professional' || tierLower === 'enterprise' || tierLower === 'continuous') {
    const qiyasPack = loadBuiltInPack('qiyas_base_pack');
    if (qiyasPack) selected.push(qiyasPack);
  }

  // Also load any DB-stored packs
  try {
    const dbPacks = await safeQuery(
      `SELECT pack_id, manifest FROM public.content_packs WHERE manifest IS NOT NULL`
    );
    for (const row of dbPacks.rows) {
      const manifest = typeof row.manifest === 'string' ? JSON.parse(row.manifest) : row.manifest;
      if (manifest?.packId && !selected.find(s => s.packId === manifest.packId)) {
        selected.push(manifest);
      }
    }
  } catch {
    // DB packs table may not have data yet
  }

  return selected;
}

export function getEnabledModulesFromPacks(packs: ContentPackManifest[]): string[] {
  const modules = new Set<string>();
  modules.add(getDefaultProductKey());
  for (const pack of packs) {
    if (pack.modules) {
      for (const [mod, enabled] of Object.entries(pack.modules)) {
        if (enabled) modules.add(mod);
      }
    }
  }
  return [...modules];
}

export async function getInstalledPackVersions(tenantId: string): Promise<Map<string, string>> {
  const versions = new Map<string, string>();
  try {
    const schema = `tenant_${tenantId}`;
    const result = await safeQuery(
      `SELECT pack_id, version FROM "${schema}".content_pack_installations WHERE status = 'active'`
    );
    for (const row of result.rows) {
      versions.set(row.pack_id, row.version);
    }
  } catch {
    // Table may not exist yet
  }
  return versions;
}

export function getUpgradeablePacks(
  installed: Map<string, string>,
  available: ContentPackManifest[]
): ContentPackManifest[] {
  return available.filter(pack => {
    const currentVersion = installed.get(pack.packId);
    if (!currentVersion) return false; // Not installed — not an upgrade
    return currentVersion !== pack.version; // Different version available
  });
}
