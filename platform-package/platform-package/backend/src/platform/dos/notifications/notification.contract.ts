/**
 * DOS In-App Notification Contract — Patch 1 §2.8
 *
 * Defines the canonical shape for in-app notifications that DOS
 * workflows, lifecycle, and orchestration can emit without importing
 * from module/notification directly.
 *
 * The notification module registers its implementation via registerNotificationProvider().
 * DOS code calls sendNotification() which delegates to the registered provider.
 *
 * @owner DOS
 * @since 2026-03-30
 */

export interface InAppNotification {
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string;
  metadata?: Record<string, unknown>;
}

export type NotificationProvider = (tenantId: string, notification: InAppNotification) => Promise<void>;

let _provider: NotificationProvider | null = null;

export function registerNotificationProvider(provider: NotificationProvider): void {
  _provider = provider;
}

export async function sendNotification(tenantId: string, notification: InAppNotification): Promise<void> {
  if (_provider) {
    await _provider(tenantId, notification);
  }
}
