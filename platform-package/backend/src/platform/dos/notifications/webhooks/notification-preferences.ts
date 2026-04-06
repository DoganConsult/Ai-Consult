// @ts-nocheck
// Activity Feed - Notification Preferences CRUD
// Database operations for managing user notification preferences
// Validates: Requirement 2.6 - Users can configure notification preferences per activity type

import { safeQuery, tenantSchema } from '../../../../config/database';
import { assertValidTenantId } from '../../../../modules/platform/services/tenant/tenant-isolation';
import {
  ActivityAction,
  NotificationPreference,
  NotificationPreferences,
} from '../../../../modules/platform/services/activity/activity-feed.types';
import type { GenericRow } from '../../../../types/db-rows.types';

export async function getNotificationPreferencesLegacy(tenantId: string, userId: string): Promise<NotificationPreferences | null> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".notification_preferences WHERE user_id = $1`,
    [userId]
  );
  return res.rows[0] || null;
}

export async function updateNotificationPreferencesLegacy(tenantId: string, userId: string, preferences: Record<string, { in_app: boolean; email: boolean }>): Promise<void> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".notification_preferences (user_id, preferences, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id) DO UPDATE SET preferences = $2::jsonb, updated_at = NOW()`,
    [userId, JSON.stringify(preferences)]
  );
}

/**
 * Get notification preferences for a user
 * Validates: Requirement 2.6 - Users can configure notification preferences per activity type
 *
 * Fetches all notification preferences for a user from the notification_preferences table.
 * Returns an array of NotificationPreference objects with the enhanced interface.
 */
export async function getNotificationPreferences(tenantId: string, userId: string): Promise<NotificationPreference[]> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT preference_id, user_id, activity_type, module, enabled, channels, created_at, updated_at
     FROM "${schema}".notification_preferences
     WHERE user_id = $1
     ORDER BY module, activity_type`,
    [userId]
  );

  return res.rows.map((row: GenericRow) => ({
    preferenceId: row.preference_id,
    userId: row.user_id,
    activityType: row.activity_type as ActivityAction,
    module: row.module,
    enabled: row.enabled,
    channels: row.channels || ['in_app'],
  }));
}

/**
 * Update a notification preference for a user
 * Validates: Requirement 2.6 - Users can configure notification preferences per activity type
 *
 * Creates or updates a notification preference for a specific activity type and module.
 * Uses UPSERT to handle both create and update cases atomically.
 *
 * @param tenantId - The tenant ID for schema isolation
 * @param userId - The user ID whose preference is being updated
 * @param pref - Partial NotificationPreference with at least activityType and module
 * @returns The updated NotificationPreference
 */
export async function updateNotificationPreference(
  tenantId: string,
  userId: string,
  pref: Partial<NotificationPreference> & { activityType: ActivityAction; module: string }
): Promise<NotificationPreference> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);

  // Default values for optional fields
  const enabled = pref.enabled ?? true;
  const channels = pref.channels ?? ['in_app'];

  const res = await safeQuery(
    `INSERT INTO "${schema}".notification_preferences
       (user_id, activity_type, module, enabled, channels, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5::text[], NOW(), NOW())
     ON CONFLICT (user_id, activity_type, module)
     DO UPDATE SET
       enabled = EXCLUDED.enabled,
       channels = EXCLUDED.channels,
       updated_at = NOW()
     RETURNING preference_id, user_id, activity_type, module, enabled, channels`,
    [userId, pref.activityType, pref.module, enabled, channels]
  );

  const row = res.rows[0];
  return {
    preferenceId: row.preference_id,
    userId: row.user_id,
    activityType: row.activity_type as ActivityAction,
    module: row.module,
    enabled: row.enabled,
    channels: row.channels || ['in_app'],
  };
}

/**
 * Delete a notification preference
 * Validates: Requirement 2.6 - Users can configure notification preferences per activity type
 *
 * Removes a specific notification preference, reverting to default behavior (notify enabled).
 */
export async function deleteNotificationPreference(
  tenantId: string,
  preferenceId: string
): Promise<boolean> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `DELETE FROM "${schema}".notification_preferences WHERE preference_id = $1`,
    [preferenceId]
  );
  return (res.rowCount ?? 0) > 0;
}

/**
 * Get all default notification preferences for a user
 * Validates: Requirement 2.6 - Users can configure notification preferences per activity type
 *
 * Returns a complete set of notification preferences for all activity types and modules,
 * using stored preferences where available and defaults where not.
 */
export async function getNotificationPreferencesWithDefaults(
  tenantId: string,
  userId: string
): Promise<NotificationPreference[]> {
  const storedPrefs = await getNotificationPreferences(tenantId, userId);
  const storedMap = new Map<string, NotificationPreference>();

  // Index stored preferences by activity_type:module key
  for (const pref of storedPrefs) {
    storedMap.set(`${pref.activityType}:${pref.module}`, pref);
  }

  const allPrefs: NotificationPreference[] = [];
  let modules: string[] = [];
  try {
    const { rows } = await safeQuery(
      `SELECT module_code FROM public.module_enablement_rules WHERE is_active = TRUE ORDER BY module_code`
    );
    modules = rows.map((r: any) => r.module_code);
  } catch { /* table may not exist — empty list, no notifications seeded */ }
  const actions: ActivityAction[] = ['created', 'updated', 'deleted', 'approved', 'rejected', 'assigned', 'commented', 'linked'];

  // Generate preferences for all combinations
  for (const module of modules) {
    for (const action of actions) {
      const key = `${action}:${module}`;
      const stored = storedMap.get(key);

      if (stored) {
        allPrefs.push(stored);
      } else {
        // Default preference: enabled with in_app channel
        allPrefs.push({
          preferenceId: '', // No ID for default preferences
          userId,
          activityType: action,
          module,
          enabled: true,
          channels: ['in_app'],
        });
      }
    }
  }

  return allPrefs;
}
