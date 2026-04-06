// Activity Feed - Types & Interfaces
// All shared types used across the activity feed module

// Entity types supported across the GRC platform
export type EntityType = 'risk' | 'control' | 'policy' | 'framework' |
                         'incident' | 'vendor' | 'evidence' | 'finding';

// Activity action types
export type ActivityAction = 'created' | 'updated' | 'deleted' | 'approved' |
                             'rejected' | 'assigned' | 'commented' | 'linked';

/**
 * Tenant ID validation result
 */
export interface TenantValidationResult {
  valid: boolean;
  error?: string;
}

// Enhanced ActivityEntry interface per design document
export interface ActivityEntry {
  activityId: string;
  userId: string;
  userName: string;
  action: ActivityAction;
  module: string;
  entityType: EntityType;
  entityId: string;
  entityTitle: string;
  metadata: Record<string, any>;
  read: boolean;
  archived: boolean;
  snoozedUntil: string | null;
  createdAt: string;
}

// Legacy interface for backward compatibility with existing code
export interface LegacyActivityEntry {
  activity_id: string;
  user_id: string;
  action: string;
  module: string;
  entity_type: string;
  entity_id: string;
  entity_title: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ActivityNotification {
  notification_id: string;
  activity_id: string;
  user_id: string;
  read: boolean;
  dismissed: boolean;
  created_at: string;
  read_at: string | null;
}

// Enhanced notification preference interface per design document
export interface NotificationPreference {
  preferenceId: string;
  userId: string;
  activityType: ActivityAction;
  module: string;
  enabled: boolean;
  channels: ('in_app' | 'email' | 'push')[];
}

// Legacy notification preferences for backward compatibility
export interface NotificationPreferences {
  user_id: string;
  preferences: Record<string, { in_app: boolean; email: boolean }>;
}

// Enhanced ActivityFilter interface per design document - multi-criteria filtering
export interface ActivityFilter {
  modules?: string[];
  entityTypes?: EntityType[];
  userIds?: string[];
  actions?: ActivityAction[];
  dateFrom?: string;
  dateTo?: string;
  read?: boolean;
  archived?: boolean;
}

// Legacy filter interface for backward compatibility
export interface LegacyActivityFilter {
  module?: string;
  action?: string;
  entity_type?: string;
  user_id?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

/**
 * Cursor structure for pagination
 * Combines createdAt timestamp and activityId for unique, stable pagination
 */
export interface ActivityCursor {
  createdAt: string;
  activityId: string;
}

/**
 * Paginated result structure for activity feed
 */
export interface PaginatedActivityResult {
  activities: ActivityEntry[];
  nextCursor: string | null;
}
