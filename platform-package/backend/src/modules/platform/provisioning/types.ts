export type ProvisioningJobStatus =
  | 'queued'
  | 'validating'
  | 'running'
  | 'waiting'
  | 'failed'
  | 'completed'
  | 'rolled_back';

export type ProvisioningStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'rolled_back';

export interface PackManifest {
  pack_key: string;
  pack_name: string;
  version: string;
  pack_type: string;
  description?: string;
  dependencies?: string[];

  // --- GPOC §8.1 required product manifest fields ---
  owner_team?: string;
  platform_dependencies?: string[];
  enabled_by_default?: boolean;
  seed_providers?: string[];
  tenant_defaults?: string[];
  required_reference_data?: string[];
  modules?: Record<string, boolean | string[]>;
  feature_flags?: Record<string, boolean | string | number>;
  limits_overrides?: Record<string, number>;
  role_pack?: {
    seed_roles?: string[];
    default_assignments?: Array<Record<string, any>>;
    home_by_role?: Record<string, string>;
    default_modules?: string[];
    default_widgets?: string[];
  };
  dashboard_pack?: {
    layouts?: string[];
    default_home_by_role?: Record<string, string>;
    default_dashboard?: string;
  };
  workflow_pack?: {
    templates?: string[];
    template_definitions?: Array<{
      name: string;
      description: string;
      definition: Record<string, any>;
      parameters_schema?: Record<string, any>;
    }>;
  };
  widget_definitions?: Array<{
    widget_key: string;
    label_en: string;
    label_ar: string;
    module_code: string;
    component_key: string;
    default_width: number;
    default_height: number;
    default_config?: Record<string, any>;
    sort_order: number;
  }>;
  dashboard_definitions?: Array<{
    dashboard_code: string;
    name_en: string;
    name_ar: string;
    audience: string;
    module_code: string;
    route: string;
    layout: Record<string, any>;
    sort_order: number;
    role_bindings?: Array<{
      role_code: string;
      is_allowed: boolean;
      is_default: boolean;
    }>;
  }>;
  content_pack_installations?: Array<{
    pack_id: string;
    version: string;
  }>;
  content_pack_refs?: string[];
  seed_payload?: Record<string, any>;
}

export interface ProvisioningContext {
  tenantId: string;
  tenantSlug: string;
  schemaName: string;
  actorUserId: string;
  locale: 'en' | 'ar';
  subscriptionTier: string;
  enabledModules: string[];
  packKeys: string[];
  manifestBundle: PackManifest[];
  recommendation?: Record<string, any> | null;
  workspaceSeed?: Record<string, any> | null;
  provisioningJobId: string;
  productKey: string;
}

export interface SeedInstallResult {
  installerKey: string;
  status: 'completed' | 'skipped' | 'failed';
  recordsCreated: number;
  recordsUpdated: number;
  warnings?: string[];
  details?: Record<string, any>;
  notes?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface TenantEntitlements {
  tenantId: string;
  subscription: {
    tier: string;
    status: 'trial' | 'trialing' | 'active' | 'past_due' | 'grace' | 'suspended' | 'cancelled' | 'expired' | 'preview' | 'trial_active' | 'trial_expired' | 'renewal_due' | 'grace_period' | 'paused';
    trialEndsAt?: string | null;
  };
  degradation?: {
    active: boolean;
    reason: string;
    mode: string;
    allowedRead: boolean;
    allowedWrite: boolean;
    allowedAdminBillingOnly: boolean;
    warnings: string[];
  };
  operationMode?: {
    defaultMode: string;
    agentConfidenceThreshold: number;
  };
  modules: {
    agrc: boolean;
    qiyas: boolean;
    dataGovernance: boolean;
    privacyOps: boolean;
    vendorGovernance: boolean;
    projectGovernance: boolean;
    connectorCenter: boolean;
    aiCopilot: boolean;
  };
  limits: {
    maxUsers: number;
    maxFrameworks: number;
    maxAssessments: number;
    maxDashboards: number;
    maxConnectors: number;
  };
  connectors: {
    siem: boolean;
    iam: boolean;
    cmdb: boolean;
    itsm: boolean;
    m365: boolean;
    vulnScanner: boolean;
  };
  features: {
    advancedScoring: boolean;
    qiyasBenchmarking: boolean;
    qiyasCertification: boolean;
    workflowDesigner: boolean;
    executiveNarratives: boolean;
    packInstaller: boolean;
  };
  moduleDetails: Record<string, {
    enabled: boolean;
    licensed: boolean;
    tierGate: string | null;
    kickstartStatus: string;
  }>;
  licensedModules: string[];
  ui: {
    visibleModules: string[];
    homeRouteByRole: Record<string, string>;
  };
  moduleOperatingStates?: Array<{
    moduleCode: string;
    state: 'on' | 'off' | 'trial';
    activationSource: string;
    trialExpiryAt?: string | null;
    isMandatory: boolean;
  }>;
}

export interface BootstrapChecklistItem {
  key: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  category: 'org' | 'roles' | 'modules' | 'frameworks' | 'workflows' | 'integrations' | 'users';
  route: string;
  required: boolean;
  completed: boolean;
  completedAt?: string | null;
  completionRule: {
    type: 'record_exists' | 'count_at_least' | 'flag_true' | 'custom';
    table?: string;
    field?: string;
    minCount?: number;
    customKey?: string;
  };
}

export interface BootstrapStatus {
  tenantId: string;
  tenantStatus: string;
  firstLoginCompleted: boolean;
  completedRequired: number;
  totalRequired: number;
  items: BootstrapChecklistItem[];
}
