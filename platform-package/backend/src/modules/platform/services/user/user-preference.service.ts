import { safeQuery, tenantSchema, emptyResult } from '../../../../config/database';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

export interface UserPreferences {
  userId: string;
  language: string;
  timezone: string;
  locale: string;
  dateFormat: string;
  numberFormat: string;
  notificationChannels: Record<string, boolean>;
  emailDigestFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'off';
  dashboardLayout: string;
  theme: 'light' | 'dark' | 'auto';
  moduleOverrides: Record<string, Record<string, unknown>>;
}

type PreferenceSubscriber = (tenantId: string, userId: string, prefs: UserPreferences) => Promise<void>;

const subscribers: Map<string, PreferenceSubscriber> = new Map();

export function subscribeToPreferenceChanges(subscriberId: string, handler: PreferenceSubscriber): void {
  subscribers.set(subscriberId, handler);
}

export function unsubscribeFromPreferenceChanges(subscriberId: string): void {
  subscribers.delete(subscriberId);
}

async function notifySubscribers(tenantId: string, userId: string, prefs: UserPreferences): Promise<void> {
  for (const [id, handler] of subscribers) {
    try {
      await handler(tenantId, userId, prefs);
    } catch (err) {
      logger.warn(`[UserPreference] subscriber ${id} failed: ${err instanceof Error ? err.message : err}`);
    }
  }
}

export async function getUserPreferences(tenantId: string, userId: string): Promise<UserPreferences> {
  const schema = tenantSchema(tenantId);
  const { rows } = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".user_preferences WHERE user_id = $1 LIMIT 1`,
    [userId],
  ), { tenantId, operation: 'get_user_prefs' });

  if (rows.length === 0) {
    return defaultPreferences(userId);
  }

  return mapPrefsRow(rows[0]);
}

export async function setUserPreferences(
  tenantId: string,
  userId: string,
  update: Partial<Omit<UserPreferences, 'userId'>>,
): Promise<UserPreferences> {
  const schema = tenantSchema(tenantId);
  const current = await getUserPreferences(tenantId, userId);
  const merged: UserPreferences = {
    ...current,
    ...update,
    userId,
    moduleOverrides: {
      ...current.moduleOverrides,
      ...(update.moduleOverrides || {}),
    },
    notificationChannels: {
      ...current.notificationChannels,
      ...(update.notificationChannels || {}),
    },
  };

  await safeQuery(
    `INSERT INTO "${schema}".user_preferences
       (user_id, language, timezone, locale, date_format, number_format,
        notification_channels, email_digest_frequency, dashboard_layout,
        theme, module_overrides)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (user_id) DO UPDATE SET
       language = EXCLUDED.language,
       timezone = EXCLUDED.timezone,
       locale = EXCLUDED.locale,
       date_format = EXCLUDED.date_format,
       number_format = EXCLUDED.number_format,
       notification_channels = EXCLUDED.notification_channels,
       email_digest_frequency = EXCLUDED.email_digest_frequency,
       dashboard_layout = EXCLUDED.dashboard_layout,
       theme = EXCLUDED.theme,
       module_overrides = EXCLUDED.module_overrides,
       updated_at = NOW()`,
    [
      userId, merged.language, merged.timezone, merged.locale,
      merged.dateFormat, merged.numberFormat,
      JSON.stringify(merged.notificationChannels), merged.emailDigestFrequency,
      merged.dashboardLayout, merged.theme,
      JSON.stringify(merged.moduleOverrides),
    ],
  );

  await notifySubscribers(tenantId, userId, merged);

  return merged;
}

export async function getModulePreferences(
  tenantId: string,
  userId: string,
  moduleCode: string,
): Promise<Record<string, unknown>> {
  const prefs = await getUserPreferences(tenantId, userId);
  const base = {
    language: prefs.language,
    timezone: prefs.timezone,
    locale: prefs.locale,
    dateFormat: prefs.dateFormat,
    numberFormat: prefs.numberFormat,
    theme: prefs.theme,
  };
  const moduleOverride = prefs.moduleOverrides[moduleCode] || {};
  return { ...base, ...moduleOverride };
}

function defaultPreferences(userId: string): UserPreferences {
  return {
    userId,
    language: 'en',
    timezone: 'Asia/Riyadh',
    locale: 'en-US',
    dateFormat: 'YYYY-MM-DD',
    numberFormat: 'en-US',
    notificationChannels: { email: true, inApp: true, sms: false },
    emailDigestFrequency: 'daily',
    dashboardLayout: 'standard',
    theme: 'light',
    moduleOverrides: {},
  };
}

function mapPrefsRow(row: any): UserPreferences {
  return {
    userId: row.user_id,
    language: row.language || 'en',
    timezone: row.timezone || 'Asia/Riyadh',
    locale: row.locale || 'en-US',
    dateFormat: row.date_format || 'YYYY-MM-DD',
    numberFormat: row.number_format || 'en-US',
    notificationChannels: row.notification_channels || { email: true, inApp: true, sms: false },
    emailDigestFrequency: row.email_digest_frequency || 'daily',
    dashboardLayout: row.dashboard_layout || 'standard',
    theme: row.theme || 'light',
    moduleOverrides: row.module_overrides || {},
  };
}
