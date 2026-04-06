/**
 * Platform Event Catalog — Zod-Validated Event Schemas
 *
 * All events published through the Platform Event Bus MUST be defined here.
 * Publishing an event with an unregistered type is a compile-time error.
 * This prevents silent payload drift when event producers change without notifying consumers.
 */

import { z } from 'zod';

// ── Base Event Schema ────────────────────────────────────────────────────────

export const BaseEventSchema = z.object({
  eventType: z.string().min(1),
  tenantId: z.string().min(1),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
  timestamp: z.string().datetime().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type BaseEvent = z.infer<typeof BaseEventSchema>;

// ── Domain Event Schemas ────────────────────────────────────────────────────

export const ControlFailedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('control.failed'),
  payload: z.object({
    control_id: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    reason: z.string().optional(),
  }),
});

export const AuditFindingCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('audit.finding_created'),
  payload: z.object({
    finding_id: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    title: z.string().optional(),
  }),
});

export const RiskExceededAppetiteEventSchema = BaseEventSchema.extend({
  eventType: z.literal('risk.exceeded_appetite'),
  payload: z.object({
    risk_id: z.string().optional(),
    risk_score: z.number().optional(),
    appetite_threshold: z.number().optional(),
  }).optional(),
});

export const IncidentCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('incident.created'),
  payload: z.object({
    incident_id: z.string().optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  }).optional(),
});

export const IncidentEscalatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('incident.escalated'),
  payload: z.object({
    incident_id: z.string().optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  }).optional(),
});

export const EvidenceExpiredEventSchema = BaseEventSchema.extend({
  eventType: z.literal('evidence.expired'),
  payload: z.object({
    evidence_id: z.string(),
    title: z.string().optional(),
    expiry_date: z.string().optional(),
  }),
});

export const EntityStateChangedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('entity.state_changed'),
  payload: z.object({
    entityType: z.string(),
    entityId: z.string(),
    fromState: z.string(),
    toState: z.string(),
    actor: z.string().optional(),
  }),
});

export const ConstitutionBreachEventSchema = BaseEventSchema.extend({
  eventType: z.literal('constitution.breach'),
  payload: z.object({
    breach_type: z.string().optional(),
    rule_id: z.string().optional(),
  }).optional(),
});

export const PolicyViolatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('policy.violated'),
  payload: z.object({
    policy_id: z.string().optional(),
    violation_type: z.string().optional(),
  }).optional(),
});

export const VendorRiskChangedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('vendor.risk_changed'),
  payload: z.object({
    vendor_id: z.string().optional(),
    riskRating: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  }).optional(),
});

export const AgentEscalationEventSchema = BaseEventSchema.extend({
  eventType: z.literal('agent.escalation'),
  payload: z.object({
    agent_id: z.string().optional(),
    reason: z.string().optional(),
  }).optional(),
});

export const SecurityVulnerabilityDetectedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('security.vulnerability_detected'),
  payload: z.object({
    vulnerability_id: z.string().optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    title: z.string().optional(),
  }).optional(),
});

export const EthicsReportCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('ethics.report_created'),
  payload: z.object({
    report_id: z.string().optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  }).optional(),
});

// ── Workflow Event Schemas ─────────────────────────────────────────────────

const WorkflowPayload = z.object({
  instanceId: z.string().optional(),
  stepId: z.string().optional(),
  triggeredBy: z.string().optional(),
  requestId: z.string().optional(),
}).passthrough();

export const WorkflowStartedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('workflow.started'),
  payload: WorkflowPayload,
});

export const WorkflowStepEnteredEventSchema = BaseEventSchema.extend({
  eventType: z.literal('workflow.step_entered'),
  payload: WorkflowPayload,
});

export const WorkflowTaskCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('workflow.task_created'),
  payload: WorkflowPayload,
});

export const WorkflowTaskAssignedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('workflow.task_assigned'),
  payload: WorkflowPayload,
});

export const WorkflowTaskCompletedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('workflow.task_completed'),
  payload: WorkflowPayload,
});

export const WorkflowApprovedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('workflow.approved'),
  payload: WorkflowPayload,
});

export const WorkflowRejectedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('workflow.rejected'),
  payload: WorkflowPayload,
});

export const WorkflowEscalatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('workflow.escalated'),
  payload: WorkflowPayload,
});

export const WorkflowCompletedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('workflow.completed'),
  payload: WorkflowPayload,
});

export const WorkflowCancelledEventSchema = BaseEventSchema.extend({
  eventType: z.literal('workflow.cancelled'),
  payload: WorkflowPayload,
});

export const WorkflowReassignedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('workflow.reassigned'),
  payload: WorkflowPayload,
});

// ── Approval Event Schemas ────────────────────────────────────────────────

export const ApprovalSubmittedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('approval.submitted'),
  payload: z.object({
    requestId: z.string(),
    chainId: z.string().optional(),
    submittedBy: z.string().optional(),
  }).passthrough(),
});

export const ApprovalCompletedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('approval.completed'),
  payload: z.object({
    requestId: z.string(),
    approvedBy: z.string().optional(),
    step: z.number().optional(),
  }).passthrough(),
});

export const ApprovalRejectedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('approval.rejected'),
  payload: z.object({
    requestId: z.string(),
    rejectedBy: z.string().optional(),
    reason: z.string().optional(),
    step: z.number().optional(),
  }).passthrough(),
});

export const ApprovalEscalatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('approval.escalated'),
  payload: z.object({
    requestId: z.string(),
    escalatedFromStep: z.number().optional(),
  }).passthrough(),
});

// ── Lifecycle Event Schemas ───────────────────────────────────────────────

export const LifecycleStateChangedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('lifecycle.state_changed'),
  payload: z.object({
    entityType: z.string(),
    entityId: z.string(),
    moduleCode: z.string().optional(),
    fromState: z.string(),
    toState: z.string(),
    actor: z.string().optional(),
    reason: z.string().optional(),
  }).passthrough(),
});

// ── Process Task Event Schemas ────────────────────────────────────────────

export const ProcessTaskCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('process_task.created'),
  payload: z.object({
    taskId: z.string(),
    taskType: z.string().optional(),
    priority: z.string().optional(),
    assignedUserId: z.string().nullable().optional(),
    routingTier: z.string().optional(),
  }).passthrough(),
});

export const ProcessTaskUnassignedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('process_task.unassigned'),
  payload: z.object({
    taskId: z.string(),
    taskType: z.string().optional(),
    priority: z.string().optional(),
  }).passthrough(),
});

// ── Notification Event Schemas ────────────────────────────────────────────

export const NotificationCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('notification.created'),
  payload: z.object({
    notificationId: z.string().optional(),
    userId: z.string(),
    type: z.string(),
  }).passthrough(),
});

export const NotificationDeliveredEventSchema = BaseEventSchema.extend({
  eventType: z.literal('notification.delivered'),
  payload: z.object({
    notificationId: z.string().optional(),
    channel: z.string().optional(),
  }).passthrough(),
});

// ── Event Catalog Registry ─────────────────────────────────────────────────

export const EVENT_CATALOG: Record<string, z.ZodTypeAny> = {
  'control.failed': ControlFailedEventSchema,
  'audit.finding_created': AuditFindingCreatedEventSchema,
  'risk.exceeded_appetite': RiskExceededAppetiteEventSchema,
  'incident.created': IncidentCreatedEventSchema,
  'incident.escalated': IncidentEscalatedEventSchema,
  'evidence.expired': EvidenceExpiredEventSchema,
  'entity.state_changed': EntityStateChangedEventSchema,
  'constitution.breach': ConstitutionBreachEventSchema,
  'policy.violated': PolicyViolatedEventSchema,
  'vendor.risk_changed': VendorRiskChangedEventSchema,
  'agent.escalation': AgentEscalationEventSchema,
  'security.vulnerability_detected': SecurityVulnerabilityDetectedEventSchema,
  'ethics.report_created': EthicsReportCreatedEventSchema,

  'workflow.started': WorkflowStartedEventSchema,
  'workflow.step_entered': WorkflowStepEnteredEventSchema,
  'workflow.task_created': WorkflowTaskCreatedEventSchema,
  'workflow.task_assigned': WorkflowTaskAssignedEventSchema,
  'workflow.task_completed': WorkflowTaskCompletedEventSchema,
  'workflow.approved': WorkflowApprovedEventSchema,
  'workflow.rejected': WorkflowRejectedEventSchema,
  'workflow.escalated': WorkflowEscalatedEventSchema,
  'workflow.completed': WorkflowCompletedEventSchema,
  'workflow.cancelled': WorkflowCancelledEventSchema,
  'workflow.reassigned': WorkflowReassignedEventSchema,

  'approval.submitted': ApprovalSubmittedEventSchema,
  'approval.completed': ApprovalCompletedEventSchema,
  'approval.rejected': ApprovalRejectedEventSchema,
  'approval.escalated': ApprovalEscalatedEventSchema,

  'lifecycle.state_changed': LifecycleStateChangedEventSchema,

  'process_task.created': ProcessTaskCreatedEventSchema,
  'process_task.unassigned': ProcessTaskUnassignedEventSchema,

  'notification.created': NotificationCreatedEventSchema,
  'notification.delivered': NotificationDeliveredEventSchema,
};

export type PlatformEventType = keyof typeof EVENT_CATALOG;

/**
 * Validate a raw event payload against its registered schema.
 * Returns { success, data, errors }
 */
export function validateEventPayload(
  eventType: string,
  payload: unknown
): { success: boolean; data?: unknown; errors?: string[] } {
  const schema = EVENT_CATALOG[eventType];
  if (!schema) {
    return {
      success: false,
      errors: [`[EventCatalog] Unknown event type: '${eventType}'. Register it in event-catalog.ts.`],
    };
  }

  const result = schema.safeParse(payload);
  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
  };
}
