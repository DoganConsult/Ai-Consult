/**
 * Notification Preferences Service
 *
 * Manages per-user notification channel and frequency settings per module.
 * Stored in tenant-scoped `notification_preferences` table.
 */

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

// ─── Default preference modules ──────────────────────────────

const DEFAULT_MODULES = [
  'governance', 'risk', 'compliance', 'audit', 'evidence',
  'vendor', 'incident', 'policy', 'workflow', 'system',
];

const DEFAULT_CHANNEL = 'in_app';
const DEFAULT_FREQUENCY = 'realtime';

// ─── Read Preferences ────────────────────────────────────────

/**
 * Get all notification preferences for a user.
 */
export async function getNotificationPreferences(
  tenantId: string,
  userId: string
): Promise<any[]> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT id, user_id, module, channel, enabled, frequency, created_at, updated_at
       FROM "${schema}".notification_preferences
       WHERE user_id = $1
       ORDER BY module`,
      [userId]
    );
    return result.rows;
  } catch (err) {
    logger.error(`[NotificationPrefs] Failed to get preferences for user=${userId}: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Get notification preferences with defaults filled in for modules without explicit settings.
 * Ensures every default module has at least a default preference entry returned.
 */
export async function getNotificationPreferencesWithDefaults(
  tenantId: string,
  userId: string
): Promise<any[]> {
  const existing = await getNotificationPreferences(tenantId, userId);
  const existingModules = new Set(existing.map((p: any) => p.module));

  const defaults = DEFAULT_MODULES
    .filter(mod => !existingModules.has(mod))
    .map(mod => ({
      id: null,
      user_id: userId,
      module: mod,
      channel: DEFAULT_CHANNEL,
      enabled: true,
      frequency: DEFAULT_FREQUENCY,
      created_at: null,
      updated_at: null,
      is_default: true,
    }));

  return [...existing, ...defaults].sort((a, b) =>
    (a.module || '').localeCompare(b.module || '')
  );
}

// ─── Update Preferences ──────────────────────────────────────

/**
 * Update a specific notification preference by ID.
 */
export async function updateNotificationPreference(
  tenantId: string,
  userId: string,
  preferenceId: string,
  data: { channel?: string; enabled?: boolean; frequency?: string }
): Promise<void> {
  const schema = tenantSchema(tenantId);

  const setClauses: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (data.channel !== undefined) {
    setClauses.push(`channel = $${paramIdx++}`);
    params.push(data.channel);
  }
  if (data.enabled !== undefined) {
    setClauses.push(`enabled = $${paramIdx++}`);
    params.push(data.enabled);
  }
  if (data.frequency !== undefined) {
    setClauses.push(`frequency = $${paramIdx++}`);
    params.push(data.frequency);
  }

  if (setClauses.length === 0) return;

  setClauses.push(`updated_at = NOW()`);
  params.push(preferenceId);
  params.push(userId);

  try {
    await safeQuery(
      `UPDATE "${schema}".notification_preferences
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx++} AND user_id = $${paramIdx}`,
      params
    );
  } catch (err) {
    logger.error(`[NotificationPrefs] Failed to update preference=${preferenceId}: ${(err as Error).message}`);
  }
}

/**
 * Delete a specific notification preference (revert to default behavior).
 */
export async function deleteNotificationPreference(
  tenantId: string,
  userId: string,
  preferenceId: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `DELETE FROM "${schema}".notification_preferences
       WHERE id = $1 AND user_id = $2`,
      [preferenceId, userId]
    );
  } catch (err) {
    logger.error(`[NotificationPrefs] Failed to delete preference=${preferenceId}: ${(err as Error).message}`);
  }
}

// ─── Legacy Compatibility ────────────────────────────────────

/**
 * Legacy format: returns a single object with module keys and nested settings.
 * Example: { governance: { channel: 'email', enabled: true, frequency: 'daily' }, ... }
 */
export async function getNotificationPreferencesLegacy(
  tenantId: string,
  userId: string
): Promise<unknown> {
  const prefs = await getNotificationPreferencesWithDefaults(tenantId, userId);
  const result: Record<string, any> = {};

  for (const pref of prefs) {
    result[pref.module] = {
      channel: pref.channel,
      enabled: pref.enabled,
      frequency: pref.frequency,
    };
  }

  return result;
}

/**
 * Legacy format: accepts an object keyed by module name with nested settings.
 * Upserts each module preference individually.
 */
export async function updateNotificationPreferencesLegacy(
  tenantId: string,
  userId: string,
  prefs: any
): Promise<void> {
  const schema = tenantSchema(tenantId);

  if (!prefs || typeof prefs !== 'object') return;

  try {
    for (const [module, settings] of Object.entries(prefs)) {
      if (!settings || typeof settings !== 'object') continue;
      const s = settings as Record<string, any>;

      const id = uuid();
      await safeQuery(
        `INSERT INTO "${schema}".notification_preferences
           (id, user_id, module, channel, enabled, frequency, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (user_id, module)
         DO UPDATE SET
           channel = COALESCE($4, "${schema}".notification_preferences.channel),
           enabled = COALESCE($5, "${schema}".notification_preferences.enabled),
           frequency = COALESCE($6, "${schema}".notification_preferences.frequency),
           updated_at = NOW()`,
        [
          id,
          userId,
          module,
          s.channel ?? DEFAULT_CHANNEL,
          s.enabled ?? true,
          s.frequency ?? DEFAULT_FREQUENCY,
        ]
      );
    }
  } catch (err) {
    logger.error(`[NotificationPrefs] Failed to update legacy preferences for user=${userId}: ${(err as Error).message}`);
  }
}
