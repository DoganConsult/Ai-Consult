/**
 * Platform Mode Gate — Controls operating mode for AI/autonomous features.
 *
 * Modes: manual (human-only), hybrid (AI-assisted), autonomous (AI-driven).
 * Routes and agents check mode before allowing automated actions.
 */

import { safeQuery } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/logger.service';

export type PlatformMode = 'manual' | 'hybrid' | 'autonomous';

const VALID_TRANSITIONS: Record<PlatformMode, PlatformMode[]> = {
  manual: ['hybrid'],
  hybrid: ['manual', 'autonomous'],
  autonomous: ['hybrid'],
};

const modeCache = new Map<string, { mode: PlatformMode; cachedAt: number }>();
const CACHE_TTL_MS = 60_000;

/**
 * Get the current platform mode for a tenant.
 */
export async function getTenantPlatformMode(tenantId: string): Promise<PlatformMode> {
  const cached = modeCache.get(tenantId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.mode;
  }

  try {
    const { rows } = await safeQuery(
      `SELECT value FROM public.tenant_settings WHERE tenant_id = $1 AND key = 'platform_mode' LIMIT 1`,
      [tenantId],
    );
    const mode = (rows[0]?.value as PlatformMode) || 'manual';
    modeCache.set(tenantId, { mode, cachedAt: Date.now() });
    return mode;
  } catch {
    return 'manual'; // deny by default (Law 11)
  }
}

/**
 * Set the platform mode for a tenant. Validates transition rules.
 */
export async function setTenantPlatformMode(
  tenantId: string,
  newMode: PlatformMode,
  actorId: string,
): Promise<{ success: boolean; error?: string }> {
  const currentMode = await getTenantPlatformMode(tenantId);

  if (!validateModeTransition(currentMode, newMode)) {
    return { success: false, error: `Invalid transition: ${currentMode} -> ${newMode}` };
  }

  try {
    await safeQuery(
      `INSERT INTO public.tenant_settings (tenant_id, key, value, updated_by, updated_at)
       VALUES ($1, 'platform_mode', $2, $3, NOW())
       ON CONFLICT (tenant_id, key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
      [tenantId, newMode, actorId],
    );

    modeCache.set(tenantId, { mode: newMode, cachedAt: Date.now() });
    logger.info('[PlatformMode] Mode changed', { tenantId, from: currentMode, to: newMode, actorId });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Validate whether a mode transition is allowed.
 */
export function validateModeTransition(from: PlatformMode, to: PlatformMode): boolean {
  if (from === to) return true;
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Check if a specific capability is enabled in the current mode.
 */
export async function isModeCapabilityEnabled(
  tenantId: string,
  capability: 'ai_suggestions' | 'ai_actions' | 'autonomous_decisions',
): Promise<boolean> {
  const mode = await getTenantPlatformMode(tenantId);
  switch (capability) {
    case 'ai_suggestions': return mode !== 'manual';
    case 'ai_actions': return mode === 'hybrid' || mode === 'autonomous';
    case 'autonomous_decisions': return mode === 'autonomous';
    default: return false;
  }
}
