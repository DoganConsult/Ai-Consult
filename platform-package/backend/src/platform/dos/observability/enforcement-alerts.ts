/**
 * Enforcement Alerts — Event-Driven Notifications
 *
 * Subscribes to enforcement and worker failure events,
 * routes notifications to admin users.
 *
 * @owner DOS
 * Maps to: AGENTS.md Enterprise Playbook §AG (incident response), §AQ (alerting)
 */

import { logger } from './logger.service';

export async function registerEnforcementAlerts(): Promise<void> {
  try {
    const { eventBus } = await import('../events/event-bus');
    const createNotification = await getNotifier();

    // Alert on enforcement sweep failure
    eventBus.subscribe('enforcement.sweep.completed', 'enforcement-alert', async (event: any) => {
      if (event.verdict === 'FAIL') {
        await createNotification({
          type: 'enforcement_failure',
          severity: 'high',
          title: `Enforcement sweep FAILED: ${event.failCount}/${event.checkCount} checks failed`,
          body: `Run ${event.runId} completed with verdict FAIL. ${event.failCount} law violations detected.`,
          recipientRole: 'admin',
          metadata: { runId: event.runId, verdict: event.verdict, failCount: event.failCount },
        });
        logger.warn('[EnforcementAlert] Sweep FAILED', { runId: event.runId, failCount: event.failCount });
      }
    });

    // Alert on individual critical check failure
    eventBus.subscribe('enforcement.check.failed', 'enforcement-check-alert', async (event: any) => {
      await createNotification({
        type: 'enforcement_check_failure',
        severity: 'medium',
        title: `Enforcement check failed: ${event.checkName} (${event.lawRef})`,
        body: `${event.findingCount} findings for ${event.lawRef}. Top findings: ${(event.findings || []).slice(0, 3).join('; ')}`,
        recipientRole: 'admin',
        metadata: { checkName: event.checkName, lawRef: event.lawRef, findings: event.findings },
      });
    });

    // Alert on worker execution failure
    eventBus.subscribe('worker.execution.failed', 'worker-failure-alert', async (event: any) => {
      await createNotification({
        type: 'worker_failure',
        severity: event.workerType === 'temporal' ? 'critical' : 'high',
        title: `Worker failed: ${event.workerType}/${event.workerName}`,
        body: `Execution ${event.executionId} failed: ${event.error || 'Unknown error'}`,
        recipientRole: 'admin',
        metadata: { workerType: event.workerType, workerName: event.workerName, error: event.error },
      });
      logger.error('[WorkerAlert] Worker failed', { workerType: event.workerType, workerName: event.workerName });
    });

    logger.info('[EnforcementAlerts] 3 alert subscriptions registered');
  } catch (err) {
    logger.warn('[EnforcementAlerts] Registration failed — alerts disabled', { error: (err as Error).message });
  }
}

async function getNotifier(): Promise<(opts: any) => Promise<void>> {
  try {
    const { createNotification } = await import('../../../modules/notification/services/notification.service');
    return async (opts: any) => {
      try {
        await createNotification('platform', {
          recipient_id: opts.recipientRole,
          notification_type: opts.type,
          subject: opts.title,
          body: opts.body,
          severity: opts.severity,
          metadata: opts.metadata,
        } as any);
      } catch { /* notification service may not be available */ }
    };
  } catch {
    return async () => { /* no-op fallback */ };
  }
}
