// @ts-nocheck
import { logger } from '../../../../platform/dos/observability/services/logger.service';
import { getRegisteredTypes } from './event-bus.service';
import { asyncapiEnabled, parseAsyncAPIDocument } from '../../../../config/asyncapi-validation';

interface EventSchema {
  name: string;
  channel: 'websocket' | 'sse' | 'pgmq' | 'bullmq';
  description: string;
  descriptionAr: string;
  payloadSchema: Record<string, unknown>;
  module: string;
  direction: 'publish' | 'subscribe';
}

const EVENT_CATALOG: EventSchema[] = [
  {
    name: 'control.updated',
    channel: 'websocket',
    description: 'Control status or effectiveness changed',
    descriptionAr: 'تم تغيير حالة أو فعالية الضابط',
    payloadSchema: { controlId: 'string', status: 'string', effectiveness: 'number' },
    module: 'controls',
    direction: 'publish',
  },
  {
    name: 'risk.threshold_breached',
    channel: 'sse',
    description: 'Risk score exceeded configured threshold',
    descriptionAr: 'تجاوزت درجة المخاطر الحد المحدد',
    payloadSchema: { riskId: 'string', score: 'number', threshold: 'number' },
    module: 'risk',
    direction: 'publish',
  },
  {
    name: 'compliance.score_changed',
    channel: 'websocket',
    description: 'Overall compliance score changed',
    descriptionAr: 'تغيرت درجة الامتثال الإجمالية',
    payloadSchema: { frameworkId: 'string', oldScore: 'number', newScore: 'number' },
    module: 'compliance',
    direction: 'publish',
  },
  {
    name: 'evidence.collected',
    channel: 'pgmq',
    description: 'Evidence automatically collected from connector',
    descriptionAr: 'تم جمع الدليل تلقائياً من الموصل',
    payloadSchema: { controlId: 'string', connectorId: 'string', evidenceId: 'string' },
    module: 'evidence',
    direction: 'publish',
  },
  {
    name: 'report.generated',
    channel: 'bullmq',
    description: 'Report generation completed',
    descriptionAr: 'اكتمل إنشاء التقرير',
    payloadSchema: { reportId: 'string', reportType: 'string', format: 'string' },
    module: 'reporting',
    direction: 'publish',
  },
  {
    name: 'audit.finding_created',
    channel: 'websocket',
    description: 'New audit finding recorded',
    descriptionAr: 'تم تسجيل نتيجة تدقيق جديدة',
    payloadSchema: { auditId: 'string', findingId: 'string', severity: 'string' },
    module: 'audit',
    direction: 'publish',
  },
  {
    name: 'vendor.risk_changed',
    channel: 'sse',
    description: 'Vendor risk rating changed',
    descriptionAr: 'تغيّر تصنيف مخاطر المورد',
    payloadSchema: { vendorId: 'string', oldRating: 'string', newRating: 'string' },
    module: 'vendor',
    direction: 'publish',
  },
  {
    name: 'workflow.task_assigned',
    channel: 'websocket',
    description: 'Workflow task assigned to user',
    descriptionAr: 'تم تعيين مهمة سير العمل للمستخدم',
    payloadSchema: { taskId: 'string', assigneeId: 'string', workflowId: 'string' },
    module: 'workflow',
    direction: 'publish',
  },
  {
    name: 'ai.agent_completed',
    channel: 'sse',
    description: 'AI agent completed a task',
    descriptionAr: 'أكمل العامل الذكي مهمة',
    payloadSchema: { agentId: 'string', taskType: 'string', result: 'object' },
    module: 'ai',
    direction: 'publish',
  },
  {
    name: 'sla.breach_detected',
    channel: 'pgmq',
    description: 'SLA breach detected for overdue task',
    descriptionAr: 'تم اكتشاف خرق اتفاقية مستوى الخدمة',
    payloadSchema: { entityType: 'string', entityId: 'string', daysOverdue: 'number' },
    module: 'platform',
    direction: 'publish',
  },
];

export function getEventCatalog(): EventSchema[] {
  return EVENT_CATALOG;
}

export function getEventsByModule(module: string): EventSchema[] {
  return EVENT_CATALOG.filter(e => e.module === module);
}

export function getEventsByChannel(channel: EventSchema['channel']): EventSchema[] {
  return EVENT_CATALOG.filter(e => e.channel === channel);
}

export function generateAsyncAPISpec(): string {
  const channels: Record<string, any> = {};

  for (const event of EVENT_CATALOG) {
    channels[event.name] = {
      description: event.description,
      [event.direction]: {
        operationId: event.name.replace(/\./g, '_'),
        message: {
          payload: {
            type: 'object',
            properties: Object.fromEntries(
              Object.entries(event.payloadSchema).map(([k, v]) => [k, { type: v }])
            ),
          },
        },
      },
    };
  }

  const spec = {
    asyncapi: '2.6.0',
    info: {
      title: 'Dogan-AI OS GRC Event API',
      version: '1.0.0',
      description: 'Real-time event streams for GRC platform',
    },
    channels,
  };

  return JSON.stringify(spec, null, 2);
}

export async function validateCatalogConsistency(): Promise<{
  valid: boolean;
  registeredEvents: string[];
  catalogEvents: string[];
  missingFromCatalog: string[];
}> {
  const registeredEvents = getRegisteredTypes();
  const catalogEvents = EVENT_CATALOG.map(e => e.name);
  const missingFromCatalog = registeredEvents.filter(e => !catalogEvents.includes(e));

  if (asyncapiEnabled()) {
    const spec = generateAsyncAPISpec();
    const result = await parseAsyncAPIDocument(spec);
    if (!result.valid) {
      logger.warn('[EventCatalog] AsyncAPI spec validation failed', { errors: result.errors });
    }
  }

  return {
    valid: missingFromCatalog.length === 0,
    registeredEvents,
    catalogEvents,
    missingFromCatalog,
  };
}
