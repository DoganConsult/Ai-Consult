// @ts-nocheck
// Activity Feed - Filtering & Sorting Pure Functions
// Pure functions for activity filtering, sorting, pagination, and read status

import {
  ActivityEntry,
  ActivityFilter,
  LegacyActivityEntry,
  LegacyActivityFilter,
  _ActivityAction,
  NotificationPreference,
  NotificationPreferences,
} from './activity-feed.types';

/**
 * Pure function: Sort activities by timestamp descending (most recent first)
 * Validates: Requirement 2.10 - Activity sorting by timestamp descending
 * Property 4: Activity Sorting Consistency
 */
export function sortActivitiesDesc(entries: ActivityEntry[]): ActivityEntry[] {
  return [...entries].sort((a, b) => {
    const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.activityId.localeCompare(b.activityId);
  });
}

/**
 * Pure function: Filter activities with multi-criteria filtering
 * Validates: Requirement 2.3 - Activity filtering by module, entity type, user, date range
 * Property 3: Activity Filtering Correctness
 *
 * Filters activities based on ALL specified criteria (AND logic):
 * - modules: Activity module must be in the list
 * - entityTypes: Activity entity type must be in the list
 * - userIds: Activity user must be in the list
 * - actions: Activity action must be in the list
 * - dateFrom: Activity timestamp must be >= dateFrom
 * - dateTo: Activity timestamp must be <= dateTo
 * - read: Activity read status must match
 * - archived: Activity archived status must match
 */
export function filterActivities(entries: ActivityEntry[], filter: ActivityFilter): ActivityEntry[] {
  return entries.filter(entry => {
    // Filter by modules (array - OR within, AND with other filters)
    if (filter.modules && filter.modules.length > 0) {
      if (!filter.modules.includes(entry.module)) return false;
    }

    // Filter by entity types (array - OR within, AND with other filters)
    if (filter.entityTypes && filter.entityTypes.length > 0) {
      if (!filter.entityTypes.includes(entry.entityType)) return false;
    }

    // Filter by user IDs (array - OR within, AND with other filters)
    if (filter.userIds && filter.userIds.length > 0) {
      if (!filter.userIds.includes(entry.userId)) return false;
    }

    // Filter by actions (array - OR within, AND with other filters)
    if (filter.actions && filter.actions.length > 0) {
      if (!filter.actions.includes(entry.action)) return false;
    }

    // Filter by date range - from
    if (filter.dateFrom) {
      const entryDate = new Date(entry.createdAt);
      const fromDate = new Date(filter.dateFrom);
      if (entryDate < fromDate) return false;
    }

    // Filter by date range - to
    if (filter.dateTo) {
      const entryDate = new Date(entry.createdAt);
      const toDate = new Date(filter.dateTo);
      if (entryDate > toDate) return false;
    }

    // Filter by read status (exact match when specified)
    if (filter.read !== undefined) {
      if (entry.read !== filter.read) return false;
    }

    // Filter by archived status (exact match when specified)
    if (filter.archived !== undefined) {
      if (entry.archived !== filter.archived) return false;
    }

    return true;
  });
}

/**
 * Pure function: Apply read status to activities
 * Validates: Requirement 2.5 - Mark activities as read/unread
 * Property 5: Activity Read State Transitions
 *
 * Returns a new array with activities marked as read if their ID is in activityIds
 */
export function applyReadStatus(activities: ActivityEntry[], activityIds: string[]): ActivityEntry[] {
  const idsToMark = new Set(activityIds);
  return activities.map(activity => {
    if (idsToMark.has(activity.activityId)) {
      return { ...activity, read: true };
    }
    return activity;
  });
}

// Legacy sort function for backward compatibility
export function sortActivitiesDescLegacy(entries: LegacyActivityEntry[]): LegacyActivityEntry[] {
  return [...entries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// Legacy filter function for backward compatibility
export function filterActivitiesLegacy(entries: LegacyActivityEntry[], filter: LegacyActivityFilter): LegacyActivityEntry[] {
  return entries.filter(e => {
    if (filter.module && e.module !== filter.module) return false;
    if (filter.action && e.action !== filter.action) return false;
    if (filter.entity_type && e.entity_type !== filter.entity_type) return false;
    if (filter.user_id && e.user_id !== filter.user_id) return false;
    if (filter.from_date && new Date(e.created_at) < new Date(filter.from_date)) return false;
    if (filter.to_date && new Date(e.created_at) > new Date(filter.to_date)) return false;
    return true;
  });
}

export function paginateActivities(entries: LegacyActivityEntry[], limit: number, offset: number): LegacyActivityEntry[] {
  return entries.slice(offset, offset + limit);
}

/**
 * Pure function: Determine if a notification should be sent based on user preferences
 * Validates: Requirement 2.6 - Respect notification preferences
 * Property 6: Notification Preference Filtering
 *
 * Returns true if the user has enabled notifications for the activity type and module
 */
export function shouldNotify(entry: ActivityEntry, preferences: NotificationPreference[]): boolean {
  // Find matching preference for this activity type and module
  const matchingPref = preferences.find(
    pref => pref.activityType === entry.action && pref.module === entry.module
  );

  // If no specific preference exists, default to notify (enabled)
  if (!matchingPref) {
    return true;
  }

  // Return the enabled status from the preference
  return matchingPref.enabled;
}

// Legacy shouldNotify for backward compatibility
export function shouldNotifyLegacy(prefs: NotificationPreferences, action: string, channel: 'in_app' | 'email'): boolean {
  const actionPrefs = prefs.preferences[action];
  if (!actionPrefs) return true;
  return actionPrefs[channel] ?? true;
}
