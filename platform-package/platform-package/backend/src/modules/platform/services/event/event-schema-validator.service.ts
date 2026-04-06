import { z } from 'zod';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

const basePayload = z.object({
  tenantId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  correlationId: z.string().optional(),
});

export const StatusChangedPayloadSchema = z.object({
  previousStatus: z.string(),
  newStatus: z.string(),
  entityId: z.string().optional(),
  moduleCode: z.string().optional(),
  transitionedBy: z.string().optional(),
  userId: z.string().optional(),
});
export type StatusChangedPayload = z.infer<typeof StatusChangedPayloadSchema>;

export const RiskScoreChangedPayloadSchema = z.object({
  riskId: z.string().optional(),
  entityId: z.string().optional(),
  newScore: z.number().optional(),
  userId: z.string().optional(),
}).refine(d => d.riskId || d.entityId, { message: 'riskId or entityId required' });
export type RiskScoreChangedPayload = z.infer<typeof RiskScoreChangedPayloadSchema>;

export const RiskExceededAppetitePayloadSchema = z.object({
  riskId: z.string().optional(),
  entityId: z.string().optional(),
  riskScore: z.number().optional(),
  userId: z.string().optional(),
}).refine(d => d.riskId || d.entityId, { message: 'riskId or entityId required' });
export type RiskExceededAppetitePayload = z.infer<typeof RiskExceededAppetitePayloadSchema>;

export const ComplianceGapPayloadSchema = z.object({
  entityId: z.string().optional(),
  controlId: z.string().optional(),
  effectiveness: z.number().optional(),
  criticality: z.string().optional(),
  complianceScore: z.number().optional(),
  upcomingAuditDays: z.number().optional(),
  userId: z.string().optional(),
}).refine(d => d.entityId || d.controlId, { message: 'entityId or controlId required' });
export type ComplianceGapPayload = z.infer<typeof ComplianceGapPayloadSchema>;

export const CompliancePosturePayloadSchema = z.object({
  frameworkCode: z.string().optional(),
  entityId: z.string().optional(),
  newPosture: z.number().optional(),
  complianceScore: z.number().optional(),
  effectiveness: z.number().optional(),
  upcomingAuditDays: z.number().optional(),
  userId: z.string().optional(),
}).refine(d => d.frameworkCode || d.entityId, { message: 'frameworkCode or entityId required' });
export type CompliancePosturePayload = z.infer<typeof CompliancePosturePayloadSchema>;

export const EvidenceSubmittedPayloadSchema = z.object({
  evidenceId: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
}).refine(d => d.evidenceId || d.entityId, { message: 'evidenceId or entityId required' });
export type EvidenceSubmittedPayload = z.infer<typeof EvidenceSubmittedPayloadSchema>;

export const VendorRiskChangedPayloadSchema = z.object({
  vendorId: z.string().optional(),
  entityId: z.string().optional(),
  riskRating: z.string().optional(),
  newRating: z.string().optional(),
  hasActiveContracts: z.boolean().optional(),
  userId: z.string().optional(),
}).refine(d => d.vendorId || d.entityId, { message: 'vendorId or entityId required' });
export type VendorRiskChangedPayload = z.infer<typeof VendorRiskChangedPayloadSchema>;

export const EntityCreatedPayloadSchema = z.object({
  entityId: z.string().optional(),
  id: z.string().optional(),
  status: z.string().optional(),
  userId: z.string().optional(),
}).refine(d => d.entityId || d.id, { message: 'entityId or id required' });
export type EntityCreatedPayload = z.infer<typeof EntityCreatedPayloadSchema>;

export const InboundWebhookReceivePayloadSchema = z.object({});
export type InboundWebhookReceivePayload = z.infer<typeof InboundWebhookReceivePayloadSchema>;

const STATUS_CHANGED_MODULES = [
  'risk', 'compliance', 'policy', 'evidence', 'audit', 'incident',
  'exception', 'governance', 'vendor', 'bcp', 'asset', 'remediation',
  'action', 'training', 'qiyas', 'ai_governance', 'issues',
  'portals', 'records', 'inbox',
];

const ENTITY_CREATED_EVENTS = [
  'risk.created', 'risk.updated', 'compliance.created', 'compliance.updated',
  'policy.created', 'policy.updated', 'evidence.collected',
  'audit.created', 'incident.created', 'incident.updated',
  'vendor.created', 'vendor.updated', 'bcp.created',
  'asset.created', 'asset.updated', 'exception.created',
  'remediation.created', 'action.created',
  'training.campaign_launched', 'governance.created',
  'issues.created', 'issues.assigned', 'records.created',
  'privacy.dsr_received', 'portals.provisioned',
];

const EVENT_SCHEMAS: Record<string, z.ZodType> = {
  'risk.score_changed': RiskScoreChangedPayloadSchema,
  'risk.exceeded_appetite': RiskExceededAppetitePayloadSchema,
  'compliance.gap_detected': ComplianceGapPayloadSchema,
  'compliance.posture_changed': CompliancePosturePayloadSchema,
  'evidence.submitted': EvidenceSubmittedPayloadSchema,
  'vendor.risk_changed': VendorRiskChangedPayloadSchema,
  ...Object.fromEntries(STATUS_CHANGED_MODULES.map(m => [`${m}.status_changed`, StatusChangedPayloadSchema])),
  ...Object.fromEntries(ENTITY_CREATED_EVENTS.map(e => [e, EntityCreatedPayloadSchema])),
};

const NAMESPACE_SCHEMAS: Record<string, z.ZodType> = {
  risk: z.object({
    riskId: z.string().optional(),
    severity: z.string().optional(),
    riskScore: z.number().optional(),
  }),
  compliance: z.object({
    frameworkCode: z.string().optional(),
    gapCount: z.number().optional(),
  }),
  incident: z.object({
    incidentId: z.string().optional(),
    severity: z.string().optional(),
  }),
  policy: z.object({
    policyId: z.string().optional(),
  }),
  evidence: z.object({
    evidenceId: z.string().optional(),
  }),
  audit: z.object({
    engagementId: z.string().optional(),
    findingId: z.string().optional(),
  }),
  vendor: z.object({
    vendorId: z.string().optional(),
  }),
};

export function registerEventSchema(eventType: string, schema: z.ZodType): void {
  EVENT_SCHEMAS[eventType] = schema;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export function validateEventPayload(eventType: string, payload: Record<string, any>): ValidationResult {
  const baseResult = basePayload.safeParse(payload);
  if (!baseResult.success) {
    return { valid: false, errors: baseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  }

  const specific = EVENT_SCHEMAS[eventType];
  if (specific) {
    const result = specific.safeParse(payload);
    if (!result.success) {
      return { valid: false, errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
    }
    return { valid: true };
  }

  const namespace = eventType.split('.')[0];
  const nsSchema = NAMESPACE_SCHEMAS[namespace];
  if (nsSchema) {
    const result = nsSchema.safeParse(payload);
    if (!result.success) {
      logger.debug(`[EventValidator] Namespace schema warning for ${eventType}: ${result.error.issues.map(i => i.message).join(', ')}`);
    }
  }

  return { valid: true };
}

export function getRegisteredSchemaCount(): number {
  return Object.keys(EVENT_SCHEMAS).length + Object.keys(NAMESPACE_SCHEMAS).length;
}
