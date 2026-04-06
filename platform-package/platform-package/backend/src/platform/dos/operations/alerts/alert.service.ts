import { logger } from '../../observability/logger.service';
import type { AlertDefinition, AlertEvent, AlertSeverity, AlertClass } from '../contracts/operations.types';
import { v4 as uuid } from 'uuid';

const alertDefinitions = new Map<string, AlertDefinition>();
const activeAlerts = new Map<string, AlertEvent>();
const resolvedAlerts: AlertEvent[] = [];
const MAX_RESOLVED = 500;

type AlertHandler = (event: AlertEvent) => void | Promise<void>;
const handlers: AlertHandler[] = [];

export function registerAlertDefinition(def: AlertDefinition): void {
  alertDefinitions.set(def.alertId, def);
}

export function registerAlertHandler(handler: AlertHandler): void {
  handlers.push(handler);
}

function getAlertClassForSeverity(severity: AlertSeverity): AlertClass {
  if (severity === 'critical') return 'page';
  if (severity === 'high') return 'warn';
  return 'info';
}

function dispatchAlertHandlers(event: AlertEvent): void {
  for (const handler of handlers) {
    try {
      const result = handler(event);
      if (result instanceof Promise) result.catch(() => {});
    } catch {}
  }
}

export function raiseAlert(options: {
  alertId?: string;
  alertName: string;
  severity: AlertSeverity;
  summary: string;
  affectedService?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}): AlertEvent {
  const def = options.alertId ? alertDefinitions.get(options.alertId) : undefined;
  const alertClass: AlertClass = def?.alertClass ?? getAlertClassForSeverity(options.severity);

  const event: AlertEvent = {
    alertId: options.alertId ?? uuid(),
    alertName: options.alertName,
    severity: options.severity,
    alertClass,
    summary: options.summary,
    affectedService: options.affectedService,
    correlationId: options.correlationId,
    triggeredAt: new Date().toISOString(),
    resolved: false,
    metadata: options.metadata,
  };

  activeAlerts.set(event.alertId, event);
  logger.warn(`[Alert] ${event.alertClass.toUpperCase()} | ${event.severity} | ${event.alertName}`, {
    summary: event.summary,
    service: event.affectedService,
    correlationId: event.correlationId,
  });

  dispatchAlertHandlers(event);
  return event;
}

export function resolveAlert(alertId: string): void {
  const event = activeAlerts.get(alertId);
  if (!event) return;
  event.resolved = true;
  event.resolvedAt = new Date().toISOString();
  activeAlerts.delete(alertId);
  resolvedAlerts.push(event);
  if (resolvedAlerts.length > MAX_RESOLVED) resolvedAlerts.shift();
  logger.info(`[Alert] Resolved: ${event.alertName}`, { alertId });
}

export function getActiveAlerts(severity?: AlertSeverity): AlertEvent[] {
  const alerts = Array.from(activeAlerts.values());
  return severity ? alerts.filter((a) => a.severity === severity) : alerts;
}

export function getResolvedAlerts(limit = 50): AlertEvent[] {
  return resolvedAlerts.slice(-limit);
}

export function evaluateThreshold(
  metricValue: number,
  threshold: number,
  operator: 'lt' | 'lte' | 'gt' | 'gte',
): boolean {
  switch (operator) {
    case 'lt': return metricValue < threshold;
    case 'lte': return metricValue <= threshold;
    case 'gt': return metricValue > threshold;
    case 'gte': return metricValue >= threshold;
    default: return false;
  }
}

export const alertService = {
  registerAlertDefinition,
  registerAlertHandler,
  raiseAlert,
  resolveAlert,
  getActiveAlerts,
  getResolvedAlerts,
  evaluateThreshold,
};
