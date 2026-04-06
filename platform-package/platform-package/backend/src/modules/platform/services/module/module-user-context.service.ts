import { safeQuery, tenantSchema } from '../../../../config/database';
import type { ModuleUserContext } from '../../../../types/actor-identity.types';

const VALID_CONTEXT_TYPES = [
  'preferences',
  'thresholds',
  'specializations',
  'focus_areas',
  'dashboard_config',
  'notification_rules',
] as const;

export type ContextType = typeof VALID_CONTEXT_TYPES[number];

export interface ModuleContextRegistryEntry {
  moduleCode: string;
  supportedContextTypes: ContextType[];
  schema: Record<string, { type: string; required?: boolean; default?: unknown }>;
}

const MODULE_CONTEXT_REGISTRY: Record<string, ModuleContextRegistryEntry> = {
  risk: {
    moduleCode: 'risk',
    supportedContextTypes: ['preferences', 'thresholds'],
    schema: {
      riskAppetiteThreshold: { type: 'number', default: 0.5 },
      preferredMethodology: { type: 'string', default: 'quantitative' },
      autoAssessFrequencyDays: { type: 'number', default: 90 },
    },
  },
  compliance: {
    moduleCode: 'compliance',
    supportedContextTypes: ['preferences', 'specializations'],
    schema: {
      frameworkSpecializations: { type: 'string[]', default: [] },
      assessmentDepthLevel: { type: 'string', default: 'standard' },
      controlOwnershipScope: { type: 'string', default: 'team' },
    },
  },
  audit: {
    moduleCode: 'audit',
    supportedContextTypes: ['preferences', 'focus_areas'],
    schema: {
      auditFocusAreas: { type: 'string[]', default: [] },
      findingSeverityThreshold: { type: 'string', default: 'medium' },
      preferredAuditType: { type: 'string', default: 'internal' },
    },
  },
  policy: {
    moduleCode: 'policy',
    supportedContextTypes: ['preferences'],
    schema: {
      reviewCycleDays: { type: 'number', default: 365 },
      approvalLevel: { type: 'number', default: 2 },
      templatePreferences: { type: 'string[]', default: [] },
    },
  },
  incident: {
    moduleCode: 'incident',
    supportedContextTypes: ['preferences', 'thresholds'],
    schema: {
      severityEscalationThreshold: { type: 'string', default: 'high' },
      autoAssignEnabled: { type: 'boolean', default: true },
      responseTimeSlaHours: { type: 'number', default: 4 },
    },
  },
  vendor: {
    moduleCode: 'vendor',
    supportedContextTypes: ['preferences', 'thresholds'],
    schema: {
      riskTierThreshold: { type: 'string', default: 'medium' },
      dueDiligenceDepth: { type: 'string', default: 'standard' },
      contractReviewCycleDays: { type: 'number', default: 365 },
    },
  },
  evidence: {
    moduleCode: 'evidence',
    supportedContextTypes: ['preferences'],
    schema: {
      collectionFrequencyDays: { type: 'number', default: 30 },
      autoRemindEnabled: { type: 'boolean', default: true },
      acceptedFormats: { type: 'string[]', default: ['pdf', 'xlsx', 'png', 'jpg'] },
    },
  },
  governance: {
    moduleCode: 'governance',
    supportedContextTypes: ['preferences', 'dashboard_config'],
    schema: {
      reportingFrequency: { type: 'string', default: 'quarterly' },
      boardPackAutoGenerate: { type: 'boolean', default: false },
      kpiDashboardLayout: { type: 'string', default: 'standard' },
    },
  },
  bcp: {
    moduleCode: 'bcp',
    supportedContextTypes: ['preferences', 'thresholds'],
    schema: {
      bcpRole: { type: 'string', default: 'participant' },
      crisisTeamMember: { type: 'boolean', default: false },
      recoveryPriorityKnowledge: { type: 'string[]', default: [] },
      drillFrequencyDays: { type: 'number', default: 180 },
    },
  },
  training: {
    moduleCode: 'training',
    supportedContextTypes: ['preferences', 'specializations'],
    schema: {
      trainingRoleType: { type: 'string', default: 'learner' },
      certificationTracking: { type: 'boolean', default: true },
      contentCreationAuth: { type: 'boolean', default: false },
      preferredFormat: { type: 'string', default: 'video' },
    },
  },
  qiyas: {
    moduleCode: 'qiyas',
    supportedContextTypes: ['preferences', 'thresholds'],
    schema: {
      maturityModelPreference: { type: 'string', default: 'cmmi' },
      assessmentFrequencyDays: { type: 'number', default: 90 },
      benchmarkComparison: { type: 'boolean', default: true },
    },
  },
  'ai-governance': {
    moduleCode: 'ai-governance',
    supportedContextTypes: ['preferences', 'thresholds'],
    schema: {
      riskToleranceLevel: { type: 'string', default: 'medium' },
      autoReviewEnabled: { type: 'boolean', default: false },
      deploymentApprovalRequired: { type: 'boolean', default: true },
    },
  },
  reporting: {
    moduleCode: 'reporting',
    supportedContextTypes: ['preferences', 'dashboard_config'],
    schema: {
      defaultReportFormat: { type: 'string', default: 'pdf' },
      scheduledReportFrequency: { type: 'string', default: 'monthly' },
      autoDistribute: { type: 'boolean', default: false },
    },
  },
  analytics: {
    moduleCode: 'analytics',
    supportedContextTypes: ['preferences', 'dashboard_config'],
    schema: {
      defaultTimeRange: { type: 'string', default: '90d' },
      kpiAlertThreshold: { type: 'number', default: 0.8 },
      drilldownDepth: { type: 'number', default: 3 },
    },
  },
  notification: {
    moduleCode: 'notification',
    supportedContextTypes: ['preferences', 'notification_rules'],
    schema: {
      enabledChannels: { type: 'string[]', default: ['email', 'in_app'] },
      quietHoursStart: { type: 'string', default: '22:00' },
      quietHoursEnd: { type: 'string', default: '07:00' },
      digestMode: { type: 'boolean', default: false },
    },
  },
  inbox: {
    moduleCode: 'inbox',
    supportedContextTypes: ['preferences'],
    schema: {
      autoArchiveDays: { type: 'number', default: 30 },
      prioritySortEnabled: { type: 'boolean', default: true },
      groupByModule: { type: 'boolean', default: true },
    },
  },
  portals: {
    moduleCode: 'portals',
    supportedContextTypes: ['preferences', 'dashboard_config'],
    schema: {
      defaultPortalView: { type: 'string', default: 'summary' },
      externalBrandingEnabled: { type: 'boolean', default: false },
    },
  },
  records: {
    moduleCode: 'records',
    supportedContextTypes: ['preferences'],
    schema: {
      retentionPolicyDefault: { type: 'string', default: '7y' },
      classificationScheme: { type: 'string', default: 'standard' },
      legalHoldNotify: { type: 'boolean', default: true },
    },
  },
  privacy: {
    moduleCode: 'privacy',
    supportedContextTypes: ['preferences', 'thresholds'],
    schema: {
      dsrResponseSlaHours: { type: 'number', default: 72 },
      consentReviewFrequencyDays: { type: 'number', default: 365 },
      crossBorderCheckEnabled: { type: 'boolean', default: true },
    },
  },
  issues: {
    moduleCode: 'issues',
    supportedContextTypes: ['preferences', 'thresholds'],
    schema: {
      autoEscalationDays: { type: 'number', default: 7 },
      deduplicationEnabled: { type: 'boolean', default: true },
      defaultPriority: { type: 'string', default: 'medium' },
    },
  },
  exception: {
    moduleCode: 'exception',
    supportedContextTypes: ['preferences', 'thresholds'],
    schema: {
      maxExceptionDurationDays: { type: 'number', default: 365 },
      renewalReminderDays: { type: 'number', default: 30 },
      riskLinkRequired: { type: 'boolean', default: true },
    },
  },
  remediation: {
    moduleCode: 'remediation',
    supportedContextTypes: ['preferences', 'thresholds'],
    schema: {
      defaultTrackingFrequency: { type: 'string', default: 'weekly' },
      verificationRequired: { type: 'boolean', default: true },
      autoCloseOnEvidence: { type: 'boolean', default: false },
    },
  },
  action: {
    moduleCode: 'action',
    supportedContextTypes: ['preferences', 'thresholds'],
    schema: {
      overdueEscalationDays: { type: 'number', default: 3 },
      autoRemindEnabled: { type: 'boolean', default: true },
      defaultPriority: { type: 'string', default: 'medium' },
    },
  },
  asset: {
    moduleCode: 'asset',
    supportedContextTypes: ['preferences'],
    schema: {
      classificationScheme: { type: 'string', default: 'cia_triad' },
      reviewCycleDays: { type: 'number', default: 365 },
      autoDiscoveryEnabled: { type: 'boolean', default: false },
    },
  },
  integrations: {
    moduleCode: 'integrations',
    supportedContextTypes: ['preferences'],
    schema: {
      syncFrequencyMinutes: { type: 'number', default: 60 },
      autoRetryEnabled: { type: 'boolean', default: true },
      maxRetries: { type: 'number', default: 3 },
    },
  },
  admin: {
    moduleCode: 'admin',
    supportedContextTypes: ['preferences', 'dashboard_config'],
    schema: {
      auditLogRetentionDays: { type: 'number', default: 365 },
      sessionTimeoutMinutes: { type: 'number', default: 30 },
      passwordPolicyLevel: { type: 'string', default: 'strong' },
    },
  },
  team: {
    moduleCode: 'team',
    supportedContextTypes: ['preferences', 'dashboard_config'],
    schema: {
      workloadViewDefault: { type: 'string', default: 'kanban' },
      raciAutoAssign: { type: 'boolean', default: false },
      capacityPlanningEnabled: { type: 'boolean', default: true },
    },
  },
  workflow: {
    moduleCode: 'workflow',
    supportedContextTypes: ['preferences', 'thresholds'],
    schema: {
      defaultApprovalMode: { type: 'string', default: 'sequential' },
      escalationTimeoutHours: { type: 'number', default: 48 },
      autoRouteEnabled: { type: 'boolean', default: true },
    },
  },
  ai: {
    moduleCode: 'ai',
    supportedContextTypes: ['preferences', 'thresholds'],
    schema: {
      modelPreference: { type: 'string', default: 'balanced' },
      maxTokenBudget: { type: 'number', default: 4096 },
      explainabilityLevel: { type: 'string', default: 'standard' },
    },
  },
  foundation: {
    moduleCode: 'foundation',
    supportedContextTypes: ['preferences', 'dashboard_config'],
    schema: {
      orgChartView: { type: 'string', default: 'hierarchical' },
      locationTrackingEnabled: { type: 'boolean', default: true },
    },
  },
};

export function getModuleContextRegistry(): Record<string, ModuleContextRegistryEntry> {
  return MODULE_CONTEXT_REGISTRY;
}

export function getRegistryEntry(moduleCode: string): ModuleContextRegistryEntry | undefined {
  return MODULE_CONTEXT_REGISTRY[moduleCode];
}

export async function setModuleUserContext(
  tenantId: string,
  userId: string,
  moduleCode: string,
  contextType: ContextType,
  contextData: Record<string, unknown>,
): Promise<ModuleUserContext> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".module_user_contexts
       (user_id, module_code, context_type, context_data)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, module_code, context_type) DO UPDATE SET
       context_data = EXCLUDED.context_data,
       updated_at = NOW()
     RETURNING *`,
    [userId, moduleCode, contextType, JSON.stringify(contextData)],
  );
  return mapContextRow(rows[0]);
}

export async function getModuleUserContext(
  tenantId: string,
  userId: string,
  moduleCode: string,
  contextType?: ContextType,
): Promise<ModuleUserContext[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".module_user_contexts WHERE user_id = $1 AND module_code = $2`;
  const params: unknown[] = [userId, moduleCode];
  if (contextType) {
    params.push(contextType);
    sql += ` AND context_type = $${params.length}`;
  }
  sql += ` AND is_active = TRUE ORDER BY context_type`;
  const { rows } = await safeQuery(sql, params);
  return rows.map(mapContextRow);
}

export async function getAllUserModuleContexts(
  tenantId: string,
  userId: string,
): Promise<ModuleUserContext[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".module_user_contexts
     WHERE user_id = $1 AND is_active = TRUE ORDER BY module_code, context_type`,
    [userId],
  );
  return rows.map(mapContextRow);
}

export async function deleteModuleUserContext(
  tenantId: string,
  userId: string,
  moduleCode: string,
  contextType?: ContextType,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  if (contextType) {
    await safeQuery(
      `UPDATE "${schema}".module_user_contexts SET is_active = FALSE, updated_at = NOW()
       WHERE user_id = $1 AND module_code = $2 AND context_type = $3`,
      [userId, moduleCode, contextType],
    );
  } else {
    await safeQuery(
      `UPDATE "${schema}".module_user_contexts SET is_active = FALSE, updated_at = NOW()
       WHERE user_id = $1 AND module_code = $2`,
      [userId, moduleCode],
    );
  }
}

function mapContextRow(row: any): ModuleUserContext {
  return {
    id: row.id,
    userId: row.user_id,
    moduleCode: row.module_code,
    contextType: row.context_type,
    contextData: row.context_data || {},
    isActive: row.is_active,
  };
}
