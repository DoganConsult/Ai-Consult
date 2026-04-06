// @ts-nocheck
// Activity Feed - Barrel Re-export
// All exports from the activity feed module are re-exported here to maintain
// backward compatibility with existing imports from 'activity-feed.service'.

// Types & Interfaces
export type {
  TenantValidationResult,
  EntityType,
  ActivityAction,
  ActivityEntry,
  LegacyActivityEntry,
  ActivityNotification,
  NotificationPreference,
  NotificationPreferences,
  ActivityFilter,
  LegacyActivityFilter,
  ActivityCursor,
  PaginatedActivityResult,
} from '../activity/activity-feed.types';

// Tenant Isolation Validation
export {
  validateTenantAccess,
  assertValidTenantId,
  isSameTenant,
  filterActivitiesByTenant,
} from '../tenant/tenant-isolation';

// Activity Filtering & Sorting Pure Functions
export {
  sortActivitiesDesc,
  filterActivities,
  applyReadStatus,
  sortActivitiesDescLegacy,
  filterActivitiesLegacy,
  paginateActivities,
  shouldNotify,
  shouldNotifyLegacy,
} from '../activity/activity-filtering';

// Activity Logging & Feed Queries
export {
  logActivity,
  getActivityFeed,
  getUserActivity,
  createNotification,
  getUnreadNotifications,
  markNotificationRead,
  markAllRead,
  dismissNotification,
} from './monitoring-observability/activity-logging';

// Notification Preferences CRUD
export {
  getNotificationPreferencesLegacy,
  updateNotificationPreferencesLegacy,
  getNotificationPreferences,
  updateNotificationPreference,
  deleteNotificationPreference,
  getNotificationPreferencesWithDefaults,
} from './webhooks-messaging/notification-preferences';

// Cursor-Based Pagination
export {
  encodeCursor,
  decodeCursor,
  paginateActivitiesWithCursor,
  getActivityFeedPaginated,
} from './ui-interactions/cursor-pagination';

// Activity State Management
export {
  markAsRead,
  markAllAsReadForUser,
  archiveActivity,
  unarchiveActivity,
  snoozeActivity,
  unsnoozeActivity,
  getActivityById,
} from './monitoring-observability/activity-state';

// Cleanup Utilities
export {
  getExpiredSnoozedActivities,
  clearExpiredSnoozes,
  getUnreadActivityCount,
} from './infrastructure-core/cleanup-utilities';
