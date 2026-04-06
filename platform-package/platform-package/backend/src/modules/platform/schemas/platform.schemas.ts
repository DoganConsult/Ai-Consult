// @ts-nocheck
import { z } from 'zod';
import { paginationQuery, grcJsonMetadata, grcSanitizedText, queryBoolean, grcSortDir, grcPositiveInt, grcNonNegativeInt, grcSlug } from '../../../schemas/common.schemas';
import { PASSWORD_RE as CANONICAL_PASSWORD_RE, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '../../../platform/dauth';

export const WORKSPACE_TYPES = ['default', 'compliance', 'risk', 'security', 'privacy', 'it_governance', 'enterprise_grc', 'cybersecurity'] as const;
export const PASSWORD_RE = CANONICAL_PASSWORD_RE;

export const analyzeThreatBody = z.object({ windowHours: z.number().optional(), minThreatIndex: z.number().optional() }).optional();
export type AnalyzeThreatInput = z.infer<typeof analyzeThreatBody>;

export let createWorkspaceBody = z.object({
      name: z.string().min(1, 'name is required').max(200),
      description: z.string().max(1000).optional(),
      type: z.enum(WORKSPACE_TYPES).optional().default('default'),
    });

export type CreateWorkspaceBodyInput = z.infer<typeof createWorkspaceBody>;

export let updateWorkspaceBody = z.object({
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(1000).optional(),
      type: z.enum(WORKSPACE_TYPES).optional(),
    });

export type UpdateWorkspaceBodyInput = z.infer<typeof updateWorkspaceBody>;

export let modePutBody = z.object({
      mode: z.enum(['human', 'hybrid', 'shadow_agent', 'full_autonomous']),
    }).strict();

export type ModePutBodyInput = z.infer<typeof modePutBody>;

export let scopePostBody = z.object({
      dimension_type: z.string().min(1),
      name: z.string().min(1),
      parent_scope_id: z.string().optional(),
    });

export type ScopePostBodyInput = z.infer<typeof scopePostBody>;

export let preferencesBody = z.object({
      activityType: z.string(),
      module: z.string(),
      enabled: z.boolean().optional(),
      channels: z.array(z.string()).optional(),
    });

export type PreferencesBodyInput = z.infer<typeof preferencesBody>;

export let readAllBody = z.object({
      filter: z.object({}).optional(),
    });

export type ReadAllBodyInput = z.infer<typeof readAllBody>;

export let snoozeBody = z.object({
      snoozedUntil: z.string().min(1, 'snoozedUntil is required'),
    });

export type SnoozeBodyInput = z.infer<typeof snoozeBody>;

export let createCommentBody = z.object({});

export type CreateCommentBodyInput = z.infer<typeof createCommentBody>;

export let updateCommentBody = z.object({
      content: z.string().min(1, "content is required"),
    });

export type UpdateCommentBodyInput = z.infer<typeof updateCommentBody>;

export let triggerConfigBody = z.object({});

export type TriggerConfigBodyInput = z.infer<typeof triggerConfigBody>;

export let moduleTriggerBody = z.object({});

export type ModuleTriggerBodyInput = z.infer<typeof moduleTriggerBody>;

export let createAutomationRuleBody = z.object({
      module_code: z.string().min(1, "module_code is required"),
      rule_code: z.string().min(1, "rule_code is required"),
      trigger_event: z.string().min(1, "trigger_event is required"),
      action_type: z.string().min(1, "action_type is required"),
      rule_name_en: z.string().optional(),
      action_config: z.record(z.string(), z.unknown()).optional(),
      conditions: z.record(z.string(), z.unknown()).optional(),
      enabled: z.boolean().optional(),
    });

export type CreateAutomationRuleBodyInput = z.infer<typeof createAutomationRuleBody>;

export let updateAutomationRuleBody = z.object({
      rule_name_en: z.string().optional(),
      trigger_event: z.string().optional(),
      action_type: z.string().optional(),
      action_config: z.record(z.string(), z.unknown()).optional(),
      conditions: z.record(z.string(), z.unknown()).optional(),
      enabled: z.boolean().optional(),
    });

export type UpdateAutomationRuleBodyInput = z.infer<typeof updateAutomationRuleBody>;

export let idParam = z.object({ id: z.string().min(1) });

export type IdParamInput = z.infer<typeof idParam>;

export let moduleQuery = z.object({
      module: z.string().optional(),
    });

export type ModuleQueryInput = z.infer<typeof moduleQuery>;

export let logQuery = z.object({
      module: z.string().optional(),
      limit: z.coerce.number().int().positive().optional(),
      offset: z.coerce.number().int().min(0).optional(),
    });

export type LogQueryInput = z.infer<typeof logQuery>;

export let createRuleBody = z.object({
      name: z.string().min(1),
      module: z.string().min(1),
      event: z.string().min(1),
      actions: z.unknown().refine((v) => v !== null && v !== undefined, { message: "actions is required" }),
      description: z.string().optional(),
      conditions: z.unknown().optional(),
      lifecycle_phase: z.string().optional(),
      priority: z.number().optional(),
    });

export type CreateRuleBodyInput = z.infer<typeof createRuleBody>;

export let updateRuleBody = z.object({
      name: z.string().min(1).optional(),
      module: z.string().min(1).optional(),
      event: z.string().min(1).optional(),
      actions: z.unknown().optional(),
      description: z.string().optional(),
      conditions: z.unknown().optional(),
      enabled: z.boolean().optional(),
      lifecycle_phase: z.string().optional(),
      priority: z.number().optional(),
    });

export type UpdateRuleBodyInput = z.infer<typeof updateRuleBody>;

export let createTemplateBody = z.object({
      name: z.string().min(1),
      module: z.string().min(1),
      event: z.string().min(1),
      actions: z.unknown().refine((v) => v !== null && v !== undefined, { message: "actions is required" }),
      conditions: z.unknown().optional(),
      enabled: z.boolean().optional(),
      priority: z.number().optional(),
      sort_order: z.number().optional(),
    });

export type CreateTemplateBodyInput = z.infer<typeof createTemplateBody>;

export let updateTemplateBody = z.object({
      name: z.string().optional(),
      module: z.string().optional(),
      event: z.string().optional(),
      conditions: z.unknown().optional(),
      actions: z.unknown().optional(),
      enabled: z.boolean().optional(),
      priority: z.number().optional(),
      sort_order: z.number().optional(),
    });

export type UpdateTemplateBodyInput = z.infer<typeof updateTemplateBody>;

export let dpiaCreateBody = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      processingActivity: z.string().optional(),
      dataCategories: z.string().optional(),
      dataSubjects: z.string().optional(),
      legalBasis: z.string().optional(),
      overallRiskLevel: z.string().optional(),
      workspaceId: z.string().optional(),
    });

export type DpiaCreateBodyInput = z.infer<typeof dpiaCreateBody>;

export let dpiaUpdateBody = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      overallRiskLevel: z.string().optional(),
      riskAssessment: z.unknown().optional(),
      mitigationMeasures: z.unknown().optional(),
      dpoOpinion: z.string().optional(),
    });

export type DpiaUpdateBodyInput = z.infer<typeof dpiaUpdateBody>;

export let slaCreateBody = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      entityType: z.string().optional(),
      metricType: z.string().optional(),
      targetValue: z.number().optional(),
      targetUnit: z.string().optional(),
      warningThreshold: z.number().optional(),
      criticalThreshold: z.number().optional(),
      escalationChain: z.array(z.unknown()).optional(),
    });

export type SlaCreateBodyInput = z.infer<typeof slaCreateBody>;

export let esgCategoryBody = z.object({
      pillar: z.string().min(1),
      nameEn: z.string().min(1),
      nameAr: z.string().optional(),
      descriptionEn: z.string().optional(),
      descriptionAr: z.string().optional(),
      sortOrder: z.number().optional(),
    });

export type EsgCategoryBodyInput = z.infer<typeof esgCategoryBody>;

export let esgMetricBody = z.object({
      categoryId: z.string().optional(),
      nameEn: z.string().min(1),
      nameAr: z.string().optional(),
      unit: z.string().optional(),
      targetValue: z.number().optional(),
      currentValue: z.number().optional(),
      dataSource: z.string().optional(),
      reportingPeriod: z.string().optional(),
      frameworkRefs: z.string().optional(),
      workspaceId: z.string().optional(),
    });

export type EsgMetricBodyInput = z.infer<typeof esgMetricBody>;

export let locationCreateBody = z.object({
      nameEn: z.string().min(1),
      nameAr: z.string().optional(),
      locationType: z.string().optional(),
      parentLocationId: z.string().optional(),
      addressLine1: z.string().optional(),
      city: z.string().optional(),
      stateProvince: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      timezone: z.string().optional(),
      employeeCount: z.number().optional(),
      isCritical: z.boolean().optional(),
      applicableJurisdictions: z.string().optional(),
      workspaceId: z.string().optional(),
    });

export type LocationCreateBodyInput = z.infer<typeof locationCreateBody>;

export let locationUpdateBody = z.object({
      nameEn: z.string().optional(),
      nameAr: z.string().optional(),
      locationType: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      status: z.string().optional(),
      employeeCount: z.number().optional(),
      isCritical: z.boolean().optional(),
    });

export type LocationUpdateBodyInput = z.infer<typeof locationUpdateBody>;

export let signatureCreateBody = z.object({
      entityType: z.string().min(1),
      entityId: z.string().min(1),
      signerName: z.string().optional(),
      signerRole: z.string().optional(),
      signatureType: z.string().optional(),
    });

export type SignatureCreateBodyInput = z.infer<typeof signatureCreateBody>;

export let savedViewCreateBody = z.object({
      name: z.string().min(1),
      pageRoute: z.string().optional(),
      filters: z.record(z.string(), z.unknown()).optional(),
      sortConfig: z.record(z.string(), z.unknown()).optional(),
      columnConfig: z.array(z.unknown()).optional(),
      isDefault: z.boolean().optional(),
      shared: z.boolean().optional(),
    });

export type SavedViewCreateBodyInput = z.infer<typeof savedViewCreateBody>;

export let favoriteCreateBody = z.object({
      entityType: z.string().min(1),
      entityId: z.string().min(1),
      entityTitle: z.string().optional(),
    });

export type FavoriteCreateBodyInput = z.infer<typeof favoriteCreateBody>;

export let dashboardShareCreateBody = z.object({
      dashboardCode: z.string().min(1),
      shareType: z.string().optional(),
      sharedWith: z.string().min(1),
      permission: z.string().optional(),
      expiresAt: z.string().optional(),
    });

export type DashboardShareCreateBodyInput = z.infer<typeof dashboardShareCreateBody>;

export let emailTemplateBody = z.object({});

export type EmailTemplateBodyInput = z.infer<typeof emailTemplateBody>;

export let emailSendBody = z.object({});

export type EmailSendBodyInput = z.infer<typeof emailSendBody>;

export let connectorCreateBody = z.object({});

export type ConnectorCreateBodyInput = z.infer<typeof connectorCreateBody>;

export let connectorUpdateBody = z.object({});

export type ConnectorUpdateBodyInput = z.infer<typeof connectorUpdateBody>;

export let moduleCodeParam = z.object({ moduleCode: z.string().regex(/^[a-z][a-z0-9_-]{1,40}$/, 'Invalid moduleCode format') });

export type ModuleCodeParamInput = z.infer<typeof moduleCodeParam>;

export let toggleActivationBody = z.object({ isActive: z.boolean() });

export type ToggleActivationBodyInput = z.infer<typeof toggleActivationBody>;

export let updateEntitlementsBody = z.object({
      licensedModules: z.array(z.string()).optional(),
      defaultOperationMode: z.string().optional(),
    }).refine(d => d.licensedModules || d.defaultOperationMode, { message: 'At least one field (licensedModules or defaultOperationMode) is required' });

export type UpdateEntitlementsBodyInput = z.infer<typeof updateEntitlementsBody>;

export let configKeyParam = z.object({ key: z.string().regex(/^[a-z][a-z0-9_.:-]{1,80}$/, 'Invalid config key format') });

export type ConfigKeyParamInput = z.infer<typeof configKeyParam>;

export let updatePlatformConfigBody = z.object({ value: z.unknown(), description: z.string().optional() });

export type UpdatePlatformConfigBodyInput = z.infer<typeof updatePlatformConfigBody>;

export let upsertModuleConfigBody = z.object({
      configKey: z.string().min(1),
      configValue: z.unknown(),
      configScope: z.enum(['platform', 'product', 'tenant', 'module']).default('tenant'),
      description: z.string().optional(),
    });

export type UpsertModuleConfigBodyInput = z.infer<typeof upsertModuleConfigBody>;

export let packActivateBody = z.object({
      packCode: z.string().min(1).max(64),
    }).strict();

export type PackActivateBodyInput = z.infer<typeof packActivateBody>;

export let moduleKickstartPostBody = z.object({});

export type ModuleKickstartPostBodyInput = z.infer<typeof moduleKickstartPostBody>;

export let moduleContactsModuleCodePutBody = z.object({});

export type ModuleContactsModuleCodePutBodyInput = z.infer<typeof moduleContactsModuleCodePutBody>;

export let moduleCodeOnboardingStartPostBody = z.object({
      parentSessionId: z.string().optional(),
    });

export type ModuleCodeOnboardingStartPostBodyInput = z.infer<typeof moduleCodeOnboardingStartPostBody>;

export let moduleCodeOnboardingSessionsSessionIdAnswersPutBody = z.object({
      answers: z.array(z.unknown()),
    });

export type ModuleCodeOnboardingSessionsSessionIdAnswersPutBodyInput = z.infer<typeof moduleCodeOnboardingSessionsSessionIdAnswersPutBody>;

export let moduleCodeOnboardingSessionsSessionIdProvisionPostBody = z.object({});

export type ModuleCodeOnboardingSessionsSessionIdProvisionPostBodyInput = z.infer<typeof moduleCodeOnboardingSessionsSessionIdProvisionPostBody>;

export let automationRuleIdPutBody = z.object({
      enabled: z.boolean().optional(),
    });

export type AutomationRuleIdPutBodyInput = z.infer<typeof automationRuleIdPutBody>;

export let moduleCodePutBody = z.object({});

export type ModuleCodePutBodyInput = z.infer<typeof moduleCodePutBody>;

export let rootPostBody = z.object({
      name: z.string(),
      module_code: z.string().optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      enabled: z.boolean().optional(),
      status: z.string().optional(),
    });

export type RootPostBodyInput = z.infer<typeof rootPostBody>;

export let idPutBody = z.object({});

export type IdPutBodyInput = z.infer<typeof idPutBody>;

export let autonomyConfigBody = z.object({});

export type AutonomyConfigBodyInput = z.infer<typeof autonomyConfigBody>;

export let evaluateScoreBody = z.object({
      score: z.number({ error: "score required" }),
    });

export type EvaluateScoreBodyInput = z.infer<typeof evaluateScoreBody>;

export let updateAgentBody = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      enabled: z.boolean().optional(),
      config: z.record(z.string(), z.unknown()).optional(),
      schedule: z.string().optional(),
      status: z.string().optional(),
    });

export type UpdateAgentBodyInput = z.infer<typeof updateAgentBody>;

export let toolCreateSchema = z.object({
      tool_name: z.string().min(1).max(128),
      display_name_en: z.string().min(1).max(255),
      display_name_ar: z.string().max(255).optional(),
      description_en: z.string().min(1),
      description_ar: z.string().optional(),
      agent_id: z.string().min(1).max(20),
      owner_module_code: z.string().min(1).max(64),
      domain_code: z.string().min(1).max(64),
      category: z.string().max(64).optional(),
      execution_type: z.enum(['internal_service', 'workflow_action', 'connector_action', 'http_proxy', 'job_dispatch', 'approval_only']).optional(),
      handler_key: z.string().min(1).max(255),
      provider_key: z.string().max(128).optional(),
      execution_config: z.record(z.string(), z.unknown()).optional(),
      input_schema: z.record(z.string(), z.unknown()).optional(),
      output_schema: z.record(z.string(), z.unknown()).optional(),
      risk_level: z.enum(['critical', 'high', 'medium', 'low']).optional(),
      data_classification: z.enum(['public', 'internal', 'confidential', 'restricted']).optional(),
      approval_mode: z.enum(['none', 'single', 'multi_step', 'risk_based', 'manual_gate']).optional(),
      min_autonomy: z.enum(['L0', 'L1', 'L2', 'L3']).optional(),
      max_autonomy: z.enum(['L0', 'L1', 'L2', 'L3']).optional(),
      default_autonomy: z.enum(['L0', 'L1', 'L2', 'L3']).optional(),
      max_calls_per_min: z.number().int().positive().optional(),
      visibility_scope: z.enum(['all', 'internal', 'admin_only', 'beta']).optional(),
      tags: z.array(z.string()).optional(),
      is_enabled: z.boolean().optional(),
      sort_order: z.number().int().optional(),
    });

export type ToolCreateSchemaInput = z.infer<typeof toolCreateSchema>;

export let overrideSchema = z.object({
      is_enabled: z.boolean().optional(),
      approval_mode: z.enum(['none', 'single', 'multi_step', 'risk_based', 'manual_gate']).optional(),
      min_autonomy: z.enum(['L0', 'L1', 'L2', 'L3']).optional(),
      max_autonomy: z.enum(['L0', 'L1', 'L2', 'L3']).optional(),
      default_autonomy: z.enum(['L0', 'L1', 'L2', 'L3']).optional(),
      max_calls_per_min: z.number().int().positive().optional(),
      custom_input_schema: z.record(z.string(), z.unknown()).optional(),
      execution_config: z.record(z.string(), z.unknown()).optional(),
      notes: z.string().optional(),
    });

export type OverrideSchemaInput = z.infer<typeof overrideSchema>;

export let tenantConfigBody = z.object({
      configs: z.array(z.object({})),
    });

export type TenantConfigBodyInput = z.infer<typeof tenantConfigBody>;

export let startAssessmentBody = z.object({
      title: z.string().optional(),
    });

export type StartAssessmentBodyInput = z.infer<typeof startAssessmentBody>;

export let respondBody = z.object({
      questionId: z.string().min(1, "questionId is required"),
      answer: z.unknown().optional(),
      score: z.number({ error: "score is required" }),
    });

export type RespondBodyInput = z.infer<typeof respondBody>;

export let fromTemplateBody = z.object({
      templateId: z.string().min(1, "templateId is required"),
      title: z.string().min(1, "title is required"),
    });

export type FromTemplateBodyInput = z.infer<typeof fromTemplateBody>;

export let scoreItemBody = z.object({
      itemId: z.string().min(1, "itemId is required"),
      score: z.number({ error: "score is required" }),
      templateId: z.string().optional(),
    });

export type ScoreItemBodyInput = z.infer<typeof scoreItemBody>;

export let createAssessmentBody = z.object({
      frameworkId: z.string().min(1, "frameworkId is required"),
      title: z.string().min(1, "title is required"),
    });

export type CreateAssessmentBodyInput = z.infer<typeof createAssessmentBody>;

export let updateAssessmentBody = z.object({
      title: z.string().optional(),
      status: z.string().optional(),
    });

export type UpdateAssessmentBodyInput = z.infer<typeof updateAssessmentBody>;

export let updateItemStatusBody = z.object({
      status: z.enum(["compliant", "partially_compliant", "non_compliant", "not_applicable"]),
    });

export type UpdateItemStatusBodyInput = z.infer<typeof updateItemStatusBody>;

export let createActorBody = z.object({
      actorType: z.enum(['human', 'agent', 'service', 'external']),
      displayName: z.string().min(1).max(255),
      displayNameAr: z.string().max(255).optional(),
      email: z.string().email().optional(),
      externalRef: z.string().max(255).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });

export type CreateActorBodyInput = z.infer<typeof createActorBody>;

export let authorityCheckBody = z.object({
      authorityType: z.enum(['approve', 'override', 'accept_risk', 'close_finding', 'publish_policy', 'sign_off', 'escalate', 'delegate', 'revoke']),
      resourceType: z.string().min(1).max(100),
    });

export type AuthorityCheckBodyInput = z.infer<typeof authorityCheckBody>;

export let addCompetencyBody = z.object({
      competencyCode: z.string().min(1).max(100),
      competencyNameEn: z.string().min(1).max(255),
      competencyNameAr: z.string().max(255).optional(),
      competencyType: z.enum(['framework', 'tool', 'domain', 'language', 'certification']),
      proficiencyLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
      certifiedAt: z.string().optional(),
      expiresAt: z.string().optional(),
      issuingAuthority: z.string().max(255).optional(),
      credentialId: z.string().max(255).optional(),
      sourceModule: z.string().max(50).optional(),
    });

export type AddCompetencyBodyInput = z.infer<typeof addCompetencyBody>;

export let checkCompetencyBody = z.object({
      requiredCompetencies: z.array(z.string().min(1)).min(1).max(50),
    });

export type CheckCompetencyBodyInput = z.infer<typeof checkCompetencyBody>;

export let setModuleContextBody = z.object({
      contextType: z.enum(['preferences', 'thresholds', 'specializations', 'focus_areas', 'dashboard_config', 'notification_rules']),
      contextData: z.record(z.string(), z.unknown()),
    });

export type SetModuleContextBodyInput = z.infer<typeof setModuleContextBody>;

export let createStakeholderBody = z.object({
      stakeholderType: z.enum(['vendor', 'regulator', 'consultant', 'auditor', 'partner', 'customer']),
      organizationName: z.string().min(1).max(255),
      organizationNameAr: z.string().max(255).optional(),
      contactName: z.string().max(255).optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().max(30).optional(),
      portalType: z.string().max(50).optional(),
      allowedModules: z.array(z.string()).optional(),
      allowedActions: z.array(z.string()).optional(),
      ndaStatus: z.string().max(20).optional(),
      maxDataClassification: z.string().max(20).optional(),
      validTo: z.string().optional(),
    });

export type CreateStakeholderBodyInput = z.infer<typeof createStakeholderBody>;

export let updateStakeholderAccessBody = z.object({
      allowedModules: z.array(z.string()).optional(),
      allowedActions: z.array(z.string()).optional(),
      ndaStatus: z.string().max(20).optional(),
    });

export type UpdateStakeholderAccessBodyInput = z.infer<typeof updateStakeholderAccessBody>;

export let upsertAgentProfileBody = z.object({
      agentCode: z.string().min(1).max(20),
      displayName: z.string().min(1).max(255),
      agentVersion: z.string().max(20).optional(),
      capabilityDomains: z.array(z.string()).optional(),
      toolAccess: z.array(z.string()).optional(),
      allowedActions: z.array(z.string()).optional(),
      forbiddenActions: z.array(z.string()).optional(),
      maxAutonomyLevel: z.string().max(30).optional(),
      humanRolesReplaceable: z.array(z.string()).optional(),
    });

export type UpsertAgentProfileBodyInput = z.infer<typeof upsertAgentProfileBody>;

export let computeCompletenessBody = z.object({
      actorType: z.enum(['human', 'agent', 'service', 'external']),
      profileData: z.record(z.string(), z.unknown()),
    });

export type ComputeCompletenessBodyInput = z.infer<typeof computeCompletenessBody>;

export let batchComputeBody = z.object({
      userIds: z.array(z.string().min(1)).min(1).max(200),
    });

export type BatchComputeBodyInput = z.infer<typeof batchComputeBody>;

export let setAvailabilityBody = z.object({
      status: z.enum(['available', 'busy', 'ooo', 'limited']),
      oooStart: z.string().optional(),
      oooEnd: z.string().optional(),
      delegateUserId: z.string().optional(),
      workingHours: z.object({
        start: z.string(),
        end: z.string(),
        days: z.array(z.number().int().min(0).max(6)),
      }).optional(),
      timezone: z.string().max(50).optional(),
      autoDelegate: z.boolean().optional(),
    });

export type SetAvailabilityBodyInput = z.infer<typeof setAvailabilityBody>;

export let registerBody = z.object({
      email: z.string().email("Valid email is required").max(254),
      password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`).max(PASSWORD_MAX_LENGTH)
        .refine(v => PASSWORD_RE.test(v), "Password must include uppercase, lowercase, digit, and special character"),
      name: z.string().min(2, "Name must be at least 2 characters").max(200),
      companyName: z.string().min(2).max(200).optional(),
      consent: z.literal(true, { error: "Consent is required" }),
    }).strict();

export type RegisterBodyInput = z.infer<typeof registerBody>;

export let joinRegisterBody = z.object({
      email: z.string().email("Valid email is required").max(254),
      password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`).max(PASSWORD_MAX_LENGTH)
        .refine(v => PASSWORD_RE.test(v), "Password must include uppercase, lowercase, digit, and special character"),
      name: z.string().min(2, "Name must be at least 2 characters").max(200),
    }).strict();

export type JoinRegisterBodyInput = z.infer<typeof joinRegisterBody>;

// loginBody intentionally omits PASSWORD_RE refine — users with legacy passwords must still log in
export let loginBody = z.object({
      email: z.string().email("Valid email is required").max(254),
      password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`).max(PASSWORD_MAX_LENGTH),
      rememberMe: z.boolean().optional(),
      captchaId: z.string().max(64).optional(),
      captchaCode: z.string().max(20).optional(),
    }).strict();

export type LoginBodyInput = z.infer<typeof loginBody>;

export let forgotPasswordBody = z.object({
      email: z.string().email("Valid email is required").max(254),
    }).strict();

export type ForgotPasswordBodyInput = z.infer<typeof forgotPasswordBody>;

export let resetPasswordBody = z.object({
      token: z.string().min(1, "token is required").max(512),
      newPassword: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`).max(PASSWORD_MAX_LENGTH)
        .refine(v => PASSWORD_RE.test(v), "Password must include uppercase, lowercase, digit, and special character"),
    }).strict();

export type ResetPasswordBodyInput = z.infer<typeof resetPasswordBody>;

export let mfaLoginVerifyBody = z.object({
      userId: z.string().min(1, "userId is required").max(64),
      code: z.string().min(1, "code is required").max(10),
      mfaType: z.string().max(20).optional(),
      rememberMe: z.boolean().optional(),
    }).strict();

export type MfaLoginVerifyBodyInput = z.infer<typeof mfaLoginVerifyBody>;

export let mfaEnableBody = z.object({
      type: z.string().max(20).optional(),
    }).strict();

export type MfaEnableBodyInput = z.infer<typeof mfaEnableBody>;

export let mfaVerifyBody = z.object({
      code: z.string().min(1, "code is required").max(10),
      type: z.string().max(20).optional(),
    }).strict();

export type MfaVerifyBodyInput = z.infer<typeof mfaVerifyBody>;

export let changePasswordBody = z.object({
      currentPassword: z.string().min(1, "currentPassword is required").max(PASSWORD_MAX_LENGTH),
      newPassword: z.string().min(PASSWORD_MIN_LENGTH, `New password must be at least ${PASSWORD_MIN_LENGTH} characters`).max(PASSWORD_MAX_LENGTH)
        .refine(v => PASSWORD_RE.test(v), "Password must include uppercase, lowercase, digit, and special character"),
    }).strict();

export type ChangePasswordBodyInput = z.infer<typeof changePasswordBody>;

export let refreshBody = z.object({
      refreshToken: z.string().max(2048).optional(),
    }).strict();

export type RefreshBodyInput = z.infer<typeof refreshBody>;

export let packIdInstallPostBody = z.object({});

export type PackIdInstallPostBodyInput = z.infer<typeof packIdInstallPostBody>;

export let packIdUpgradePostBody = z.object({});

export type PackIdUpgradePostBodyInput = z.infer<typeof packIdUpgradePostBody>;

export let seedBaselinePostBody = z.object({
      sectorCode: z.string().optional(),
      orgName: z.string().optional(),
      employeeBand: z.string().optional(),
    });

export type SeedBaselinePostBodyInput = z.infer<typeof seedBaselinePostBody>;

export let jobsIdRetryPostBody = z.object({});

export type JobsIdRetryPostBodyInput = z.infer<typeof jobsIdRetryPostBody>;

export let jobsIdRetryStagePostBody = z.object({
      stageIndex: z.string().optional(),
    });

export type JobsIdRetryStagePostBodyInput = z.infer<typeof jobsIdRetryStagePostBody>;

export let userIdParam = z.object({ userId: z.string().min(1) });

export type UserIdParamInput = z.infer<typeof userIdParam>;

export let analysisQuery = z.object({
      windowHours: z.string().optional().transform(v => v ? parseInt(v, 10) : 24),
      minThreatIndex: z.string().optional().transform(v => v ? parseFloat(v) : 40),
    });

export type AnalysisQueryInput = z.infer<typeof analysisQuery>;

export let createKsaDpiaBody = z.object({
      title: z.string().min(1),
      data: z.unknown().optional(),
    });

export type CreateKsaDpiaBodyInput = z.infer<typeof createKsaDpiaBody>;

export let updateKsaDpiaBody = z.object({
      title: z.string().optional(),
      status: z.string().optional(),
      data: z.unknown().optional(),
    });

export type UpdateKsaDpiaBodyInput = z.infer<typeof updateKsaDpiaBody>;

export let grantPostBody = z.object({
      userId: z.string(),
      purpose: z.string().optional(),
    });

export type GrantPostBodyInput = z.infer<typeof grantPostBody>;

export let revokePostBody = z.object({
      userId: z.string(),
    });

export type RevokePostBodyInput = z.infer<typeof revokePostBody>;

export let rightToForgetPostBody = z.object({
      userId: z.string(),
    });

export type RightToForgetPostBodyInput = z.infer<typeof rightToForgetPostBody>;

export let idConsumePostBody = z.object({
      queryDescription: z.string(),
      epsilonCost: z.string(),
    });

export type IdConsumePostBodyInput = z.infer<typeof idConsumePostBody>;

export let idResetPostBody = z.object({});

export type IdResetPostBodyInput = z.infer<typeof idResetPostBody>;

export let dataRequestPostBody = z.object({
      requestType: z.string().optional(),
      subjectEmail: z.string().optional(),
    });

export type DataRequestPostBodyInput = z.infer<typeof dataRequestPostBody>;

export let ropaPostBody = z.object({});

export type RopaPostBodyInput = z.infer<typeof ropaPostBody>;

export let dsrPostBody = z.object({
      requestType: z.string(),
      subjectId: z.string(),
      requestedBy: z.string(),
      details: z.string().optional(),
    });

export type DsrPostBodyInput = z.infer<typeof dsrPostBody>;

export let breachPostBody = z.object({
      severity: z.string(),
      description: z.string(),
      reportedBy: z.string(),
      affectedSubjects: z.string().optional(),
    });

export type BreachPostBodyInput = z.infer<typeof breachPostBody>;

export let consentPostBody = z.object({
      subjectId: z.string(),
      processingPurpose: z.string(),
      consentVersion: z.string().optional(),
      withdrawn: z.string().optional(),
    });

export type ConsentPostBodyInput = z.infer<typeof consentPostBody>;

export let installBody = z.object({
      packId: z.string().min(1, "packId is required"),
    });

export type InstallBodyInput = z.infer<typeof installBody>;

export let upgradeBody = z.object({
      packId: z.string().min(1, "packId is required"),
      manifest: z.object({}),
    });

export type UpgradeBodyInput = z.infer<typeof upgradeBody>;

export let rollbackBody = z.object({
      packId: z.string().min(1, "packId is required"),
      targetVersion: z.string().min(1, "targetVersion is required"),
    });

export type RollbackBodyInput = z.infer<typeof rollbackBody>;

export let proactiveBody = z.object({
      currentModule: z.string().min(1),
      completionPercent: z.number().optional(),
    });

export type ProactiveBodyInput = z.infer<typeof proactiveBody>;

export let emptyBody = z.object({});

export type EmptyBodyInput = z.infer<typeof emptyBody>;

export let ontologyCrudBody = z.object({});

export type OntologyCrudBodyInput = z.infer<typeof ontologyCrudBody>;

export let registerPostBody = z.object({});

export type RegisterPostBodyInput = z.infer<typeof registerPostBody>;

export let providerIdSyncPostBody = z.object({});

export type ProviderIdSyncPostBodyInput = z.infer<typeof providerIdSyncPostBody>;

export let syncAllPostBody = z.object({});

export type SyncAllPostBodyInput = z.infer<typeof syncAllPostBody>;

export let idStartPostBody = z.object({});

export type IdStartPostBodyInput = z.infer<typeof idStartPostBody>;

export let seedPostBody = z.object({});

export type SeedPostBodyInput = z.infer<typeof seedPostBody>;

export let completionsCompletionIdPutBody = z.object({
      completedSteps: z.string().optional(),
      notes: z.string().optional(),
    });

export type CompletionsCompletionIdPutBodyInput = z.infer<typeof completionsCompletionIdPutBody>;

export let sopIdStartPostBody = z.object({
      totalSteps: z.string(),
    });

export type SopIdStartPostBodyInput = z.infer<typeof sopIdStartPostBody>;

export let autoTaskConfigBody = z.object({});

export type AutoTaskConfigBodyInput = z.infer<typeof autoTaskConfigBody>;

export let updateAutoTaskBody = z.object({});

export type UpdateAutoTaskBodyInput = z.infer<typeof updateAutoTaskBody>;

export let jobNameParam = z.object({ name: z.string().min(1).max(100) });

export type JobNameParamInput = z.infer<typeof jobNameParam>;

export let historyQuery = z.object({ limit: z.coerce.number().int().positive().max(200).optional() });

export type HistoryQueryInput = z.infer<typeof historyQuery>;

export let processEventBody = z.object({
      eventName: z.string().min(1).max(128),
      payload: z.record(z.string(), z.unknown()).optional(),
    }).strict();

export type ProcessEventBodyInput = z.infer<typeof processEventBody>;

export let receiveParamsSchema = z.object({
      endpointId: z.string().uuid(),
    });

export type ReceiveParamsSchemaInput = z.infer<typeof receiveParamsSchema>;

export let receiveBodySchema = z.record(z.string(), z.unknown());

export type ReceiveBodySchemaInput = z.infer<typeof receiveBodySchema>;

export let toolsToolNameExecutePostBody = z.object({});

export type ToolsToolNameExecutePostBodyInput = z.infer<typeof toolsToolNameExecutePostBody>;

export let stripePostBody = z.object({});

export type StripePostBodyInput = z.infer<typeof stripePostBody>;

export let moyasarPostBody = z.object({
      toString: z.string().optional(),
    });

export type MoyasarPostBodyInput = z.infer<typeof moyasarPostBody>;

export let customFieldsDefinePostBody = z.object({});

export type CustomFieldsDefinePostBodyInput = z.infer<typeof customFieldsDefinePostBody>;

export let validateAiPostBody = z.object({
      operation: z.string().optional(),
      nodeType: z.string().optional(),
      nodeId: z.string().optional(),
      nodeData: z.string().optional(),
      parentId: z.string().optional(),
      previousState: z.string().optional(),
      sector: z.string().optional(),
      regulator: z.string().optional(),
    });

export type ValidateAiPostBodyInput = z.infer<typeof validateAiPostBody>;

export let validateChangePostBody = z.object({});

export type ValidateChangePostBodyInput = z.infer<typeof validateChangePostBody>;

export let locationsAssignPostBody = z.object({});

export type LocationsAssignPostBodyInput = z.infer<typeof locationsAssignPostBody>;

export let costCentersAssignPostBody = z.object({});

export type CostCentersAssignPostBodyInput = z.infer<typeof costCentersAssignPostBody>;

export let membersAssignPostBody = z.object({});

export type MembersAssignPostBodyInput = z.infer<typeof membersAssignPostBody>;

export let membersBulkAssignPostBody = z.object({
      assignments: z.string().optional(),
    });

export type MembersBulkAssignPostBodyInput = z.infer<typeof membersBulkAssignPostBody>;

export let bulkCreatePostBody = z.object({
      nodes: z.string().optional(),
    });

export type BulkCreatePostBodyInput = z.infer<typeof bulkCreatePostBody>;

export let bulkUpdateStatusPostBody = z.object({
      nodeType: z.string(),
      newStatus: z.string(),
      nodeIds: z.string().optional(),
    });

export type BulkUpdateStatusPostBodyInput = z.infer<typeof bulkUpdateStatusPostBody>;

export let bulkDeletePostBody = z.object({
      nodeType: z.string(),
      nodeIds: z.string().optional(),
    });

export type BulkDeletePostBodyInput = z.infer<typeof bulkDeletePostBody>;

export let bulkMovePostBody = z.object({
      moves: z.string().optional(),
    });

export type BulkMovePostBodyInput = z.infer<typeof bulkMovePostBody>;

export let nodeNodeTypePostBody = z.object({
      parentId: z.string().optional(),
    });

export type NodeNodeTypePostBodyInput = z.infer<typeof nodeNodeTypePostBody>;

export let nodeNodeTypeNodeIdPutBody = z.object({});

export type NodeNodeTypeNodeIdPutBodyInput = z.infer<typeof nodeNodeTypeNodeIdPutBody>;

export let importPostBody = z.object({
      importData: z.string(),
      format: z.string(),
      options: z.record(z.string(), z.unknown()).optional(),
    });

export type ImportPostBodyInput = z.infer<typeof importPostBody>;

export let templatesTemplateIdApplySelectivePostBody = z.object({
      organizationName: z.string(),
      activationSelection: z.string(),
      organizationNameAr: z.string().optional(),
    });

export type TemplatesTemplateIdApplySelectivePostBodyInput = z.infer<typeof templatesTemplateIdApplySelectivePostBody>;

export let activationStatusPutBody = z.object({});

export type ActivationStatusPutBodyInput = z.infer<typeof activationStatusPutBody>;

export let usersUserIdAssignProfilePostBody = z.object({
      teamId: z.string(),
      departmentId: z.string(),
      profileCode: z.string(),
    });

export type UsersUserIdAssignProfilePostBodyInput = z.infer<typeof usersUserIdAssignProfilePostBody>;

export let smartModuleActivationPostBody = z.object({
      regulatoryProfile: z.string().optional(),
      organizationSize: z.string().optional(),
      dataTypes: z.string().optional(),
    });

export type SmartModuleActivationPostBodyInput = z.infer<typeof smartModuleActivationPostBody>;

export let contactPostBody = z.object({
      email: z.string(),
      name: z.string().optional(),
      company: z.string().optional(),
      phone: z.string().optional(),
      message: z.string().optional(),
    });

export type ContactPostBodyInput = z.infer<typeof contactPostBody>;

export let demoRequestPostBody = z.object({
      email: z.string(),
      name: z.string().optional(),
      company: z.string().optional(),
      phone: z.string().optional(),
      message: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });

export type DemoRequestPostBodyInput = z.infer<typeof demoRequestPostBody>;

export let newsletterPostBody = z.object({
      email: z.string(),
      name: z.string().optional(),
    });

export type NewsletterPostBodyInput = z.infer<typeof newsletterPostBody>;

export let checkoutStripePostBody = z.object({
      tier: z.string(),
      cycle: z.string(),
    });

export type CheckoutStripePostBodyInput = z.infer<typeof checkoutStripePostBody>;

export let checkoutMoyasarPostBody = z.object({
      tier: z.string(),
      cycle: z.string(),
      paymentMethod: z.string(),
    });

export type CheckoutMoyasarPostBodyInput = z.infer<typeof checkoutMoyasarPostBody>;

export let billingPortalPostBody = z.object({});

export type BillingPortalPostBodyInput = z.infer<typeof billingPortalPostBody>;

export let cancelPostBody = z.object({});

export type CancelPostBodyInput = z.infer<typeof cancelPostBody>;

export let trialPostBody = z.object({
      tier: z.string().optional(),
    });

export type TrialPostBodyInput = z.infer<typeof trialPostBody>;

export let readinessPostBody = z.object({
      sectorIds: z.string(),
      companySize: z.string().optional(),
    });

export type ReadinessPostBodyInput = z.infer<typeof readinessPostBody>;

export let executeActionIdPostBody = z.object({});

export type ExecuteActionIdPostBodyInput = z.infer<typeof executeActionIdPostBody>;

export let skipActionIdPostBody = z.object({});

export type SkipActionIdPostBodyInput = z.infer<typeof skipActionIdPostBody>;

export let executeAllPostBody = z.object({});

export type ExecuteAllPostBodyInput = z.infer<typeof executeAllPostBody>;

export let resetPostBody = z.object({});

export type ResetPostBodyInput = z.infer<typeof resetPostBody>;

export let tasksTaskIdStatusPutBody = z.object({
      status: z.string(),
    });

export type TasksTaskIdStatusPutBodyInput = z.infer<typeof tasksTaskIdStatusPutBody>;

export let generatePostBody = z.object({});

export type GeneratePostBodyInput = z.infer<typeof generatePostBody>;

export let subscriptionTrialExtensionRequestPostBody = z.object({
      reason: z.string(),
    });

export type SubscriptionTrialExtensionRequestPostBodyInput = z.infer<typeof subscriptionTrialExtensionRequestPostBody>;

export let adminTrialExtensionRequestIdApprovePostBody = z.object({
      notes: z.string().optional(),
    });

export type AdminTrialExtensionRequestIdApprovePostBodyInput = z.infer<typeof adminTrialExtensionRequestIdApprovePostBody>;

export let adminTrialExtensionRequestIdRejectPostBody = z.object({
      notes: z.string().optional(),
    });

export type AdminTrialExtensionRequestIdRejectPostBodyInput = z.infer<typeof adminTrialExtensionRequestIdRejectPostBody>;

export let optInBody = z.object({
      optedIn: z.boolean({ error: "optedIn must be a boolean" }),
    });

export type OptInBodyInput = z.infer<typeof optInBody>;

export let generateBody = z.object({
      periodType: z.string().min(1, "periodType is required"),
      periodStart: z.string().min(1, "periodStart is required"),
    });

export type GenerateBodyInput = z.infer<typeof generateBody>;

export let createTaskBody = z.object({
      controlId: z.string().min(1, "controlId is required"),
      periodType: z.string().min(1, "periodType is required"),
      dueDate: z.string().min(1, "dueDate is required"),
      taskType: z.string().optional(),
      assignedTo: z.string().optional(),
      description: z.string().optional(),
    });

export type CreateTaskBodyInput = z.infer<typeof createTaskBody>;

export let completeTaskBody = z.object({
      notes: z.string().optional(),
      completedBy: z.string().optional(),
    });

export type CompleteTaskBodyInput = z.infer<typeof completeTaskBody>;

export let updateTaskBody = z.object({
      status: z.string().optional(),
      assignedTo: z.string().optional(),
      dueDate: z.string().optional(),
      notes: z.string().optional(),
    });

export type UpdateTaskBodyInput = z.infer<typeof updateTaskBody>;

export let overridesBody = z.object({
      overrides: z.array(z.object({})),
    });

export type OverridesBodyInput = z.infer<typeof overridesBody>;

export let explainPostBody = z.object({
      sql: z.string().min(1).max(50000),
    });

export type ExplainPostBodyInput = z.infer<typeof explainPostBody>;

export let credentialsPostBody = z.object({
      key: z.string().min(1).max(255),
      value: z.string().min(1).max(10000),
      category: z.string().max(100).optional(),
    });

export type CredentialsPostBodyInput = z.infer<typeof credentialsPostBody>;

export let encryptPostBody = z.object({
      credentials: z.record(z.string(), z.unknown()).optional(),
    });

export type EncryptPostBodyInput = z.infer<typeof encryptPostBody>;

export let decryptPostBody = z.object({
      encrypted: z.string().optional(),
    });

export type DecryptPostBodyInput = z.infer<typeof decryptPostBody>;

export let saveSearchBody = z.object({
      name: z.string().min(1),
      query: z.string().min(1),
      filters: z.record(z.string(), z.unknown()).optional(),
    });

export type SaveSearchBodyInput = z.infer<typeof saveSearchBody>;

export let grcQueryBody = z.object({
      query: z.string().min(1),
      context: z.object({
        entityType: z.string().optional(),
        frameworkCode: z.string().optional(),
        domain: z.string().optional(),
      }).optional(),
    });

export type GrcQueryBodyInput = z.infer<typeof grcQueryBody>;

export let grcBatchQueryBody = z.object({
      queries: z.array(z.object({
        query: z.string().min(1),
        context: z.record(z.string(), z.unknown()).optional(),
      })).min(1).max(10),
    });

export type GrcBatchQueryBodyInput = z.infer<typeof grcBatchQueryBody>;

export let searchSchema = z.object({
      q: z.string().min(1).max(500),
      modules: z.string().optional(),
      limit: z.coerce.number().min(1).max(100).optional(),
      threshold: z.coerce.number().min(0).max(1).optional(),
    });

export type SearchSchemaInput = z.infer<typeof searchSchema>;

export let raciPutBody = z.object({
      matrix: z.string(),
    });

export type RaciPutBodyInput = z.infer<typeof raciPutBody>;

export let configPatchBody = z.object({});

export type ConfigPatchBodyInput = z.infer<typeof configPatchBody>;

export let configRollbackVersionPostBody = z.object({});

export type ConfigRollbackVersionPostBodyInput = z.infer<typeof configRollbackVersionPostBody>;

export let rootPutBody = z.object({});

export type RootPutBodyInput = z.infer<typeof rootPutBody>;

export let testPostBody = z.object({});

export type TestPostBodyInput = z.infer<typeof testPostBody>;

export let sendTestPostBody = z.object({
      to: z.string(),
    });

export type SendTestPostBodyInput = z.infer<typeof sendTestPostBody>;

export let platformApprovalRequestPostBody = z.object({});

export type PlatformApprovalRequestPostBodyInput = z.infer<typeof platformApprovalRequestPostBody>;

export let platformApprovalReviewPostBody = z.object({
      tenantId: z.string(),
      decision: z.string(),
      note: z.string().optional(),
    });

export type PlatformApprovalReviewPostBodyInput = z.infer<typeof platformApprovalReviewPostBody>;

export let preferencesPatchBody = z.object({});

export type PreferencesPatchBodyInput = z.infer<typeof preferencesPatchBody>;

export let ignitePostBody = z.object({
      dryRun: z.string().optional(),
      scope: z.string().optional(),
    });

export type IgnitePostBodyInput = z.infer<typeof ignitePostBody>;

export let bulkActionBody = z.object({
      entityIds: z.array(z.string().min(1)).min(1, 'entityIds is required'),
      actionType: z.string().min(1, 'actionType is required').max(100),
      params: z.record(z.string(), z.unknown()).optional(),
    });

export type BulkActionBodyInput = z.infer<typeof bulkActionBody>;

export let inlineEditBody = z.record(z.string(), z.unknown());

export type InlineEditBodyInput = z.infer<typeof inlineEditBody>;

export let channelsPostBody = z.object({
      name: z.string(),
    });

export type ChannelsPostBodyInput = z.infer<typeof channelsPostBody>;

export let channelsIdMessagesPostBody = z.object({
      content: z.string(),
      entityAttachments: z.string().optional(),
    });

export type ChannelsIdMessagesPostBodyInput = z.infer<typeof channelsIdMessagesPostBody>;

export let dmPostBody = z.object({
      recipientId: z.string(),
      content: z.string(),
      entityAttachments: z.string().optional(),
    });

export type DmPostBodyInput = z.infer<typeof dmPostBody>;

export let pushTokenPostBody = z.object({
      token: z.string(),
      platform: z.string().optional(),
      deviceLabel: z.string().optional(),
    });

export type PushTokenPostBodyInput = z.infer<typeof pushTokenPostBody>;

export let regulatorsPostBody = z.object({
      regulator_id: z.string(),
      name_en: z.string(),
      name_ar: z.string(),
    });

export type RegulatorsPostBodyInput = z.infer<typeof regulatorsPostBody>;

export let instrumentsPostBody = z.object({
      instrument_id: z.string(),
      regulator_id: z.string(),
      name_en: z.string(),
      name_ar: z.string(),
      type: z.string(),
    });

export type InstrumentsPostBodyInput = z.infer<typeof instrumentsPostBody>;

export let structurePostBody = z.object({
      node_id: z.string(),
      instrument_id: z.string(),
      code: z.string(),
      title_en: z.string(),
      title_ar: z.string(),
      level: z.number().optional(),
    });

export type StructurePostBodyInput = z.infer<typeof structurePostBody>;

export let crossMappingsPostBody = z.object({
      source_node_id: z.string(),
      target_node_id: z.string(),
    });

export type CrossMappingsPostBodyInput = z.infer<typeof crossMappingsPostBody>;

export let sectorsPostBody = z.object({
      sector_id: z.string(),
      name_en: z.string(),
      name_ar: z.string(),
    });

export type SectorsPostBodyInput = z.infer<typeof sectorsPostBody>;

export let applicableRegulationsPostBody = z.object({
      sectorIds: z.string(),
    });

export type ApplicableRegulationsPostBodyInput = z.infer<typeof applicableRegulationsPostBody>;

export let validateNamingPostBody = z.object({
      entityType: z.string(),
      id: z.string(),
    });

export type ValidateNamingPostBodyInput = z.infer<typeof validateNamingPostBody>;

// --- Phase 1 Step 1.1 Synthesized Schemas ---

export let provisioningStartBody = z.object({
  tenantId: z.string().optional(),
  tenantSlug: z.string().optional(),
  actorUserId: z.string().optional(),
  sessionId: z.string().optional(),
  locale: z.enum(['en', 'ar']).optional(),
});
export type ProvisioningStartBodyInput = z.infer<typeof provisioningStartBody>;

export let agentProgressionBody = z.object({
  boardApprovalGranted: z.boolean().optional(),
});
export type AgentProgressionBodyInput = z.infer<typeof agentProgressionBody>;

export let autonomyGateBody = z.object({
  requestedMode: z.string().min(1, 'requestedMode is required'),
});
export type AutonomyGateBodyInput = z.infer<typeof autonomyGateBody>;

export let competencyDelegateBody = z.object({
  delegatorUserId: z.string().min(1, 'delegatorUserId is required'),
  candidateUserIds: z.array(z.string().min(1)).min(1, 'candidateUserIds is required'),
  requiredCompetencies: z.array(z.string().min(1)).min(1, 'requiredCompetencies is required'),
  delegationType: z.string().optional(),
  validTo: z.string().optional(),
});
export type CompetencyDelegateBodyInput = z.infer<typeof competencyDelegateBody>;

export let delegationCheckPolicyBody = z.object({
  delegatorRole: z.string().min(1, 'delegatorRole is required'),
  delegateActorType: z.string().min(1, 'delegateActorType is required'),
  scopeType: z.string().min(1, 'scopeType is required'),
  actions: z.array(z.string()).optional(),
});
export type DelegationCheckPolicyBodyInput = z.infer<typeof delegationCheckPolicyBody>;
