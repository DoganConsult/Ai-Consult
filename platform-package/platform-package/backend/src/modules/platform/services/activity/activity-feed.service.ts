export {
  type TenantValidationResult,
  type EntityType,
  type ActivityAction,
  type ActivityEntry,
  type LegacyActivityEntry,
  type ActivityNotification,
  type NotificationPreference,
  type NotificationPreferences,
  type ActivityFilter,
  type LegacyActivityFilter,
  type ActivityCursor,
  type PaginatedActivityResult,
} from './activity-feed.types';

export {
  validateTenantAccess,
  assertValidTenantId,
  isSameTenant,
  filterActivitiesByTenant,
} from '../tenant/tenant-isolation';

export {
  sortActivitiesDesc,
  filterActivities,
  applyReadStatus,
  sortActivitiesDescLegacy,
  filterActivitiesLegacy,
  paginateActivities,
  shouldNotify,
  shouldNotifyLegacy,
} from './activity-filtering';

export {
  logActivity,
  getActivityFeed,
  getUserActivity,
  createNotification,
  getUnreadNotifications,
  markNotificationRead,
  markAllRead,
  dismissNotification,
} from './activity-logging';

export {
  getNotificationPreferencesLegacy,
  updateNotificationPreferencesLegacy,
  getNotificationPreferences,
  updateNotificationPreference,
  deleteNotificationPreference,
  getNotificationPreferencesWithDefaults,
} from './notification-preferences';

export {
  encodeCursor,
  decodeCursor,
  paginateActivitiesWithCursor,
  getActivityFeedPaginated,
} from './cursor-pagination';

export {
  markAsRead,
  markAllAsReadForUser,
  archiveActivity,
  unarchiveActivity,
  snoozeActivity,
  unsnoozeActivity,
  getActivityById,
} from './activity-state';

export {
  getExpiredSnoozedActivities,
  clearExpiredSnoozes,
  getUnreadActivityCount,
} from './cleanup-utilities';
