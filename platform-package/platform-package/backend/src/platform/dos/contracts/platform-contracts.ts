export interface TenantContract {
  version: number;
  tenantId: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended' | 'provisioning';
  plan: string;
  language: string;
  timezone: string;
}

export interface WorkspaceContract {
  version: number;
  workspaceId: string;
  tenantId: string;
  name: string;
  type: 'default' | 'project' | 'sandbox';
  isActive: boolean;
}

export interface ProductContract {
  version: number;
  productCode: string;
  name: string;
  productVersion: string;
  isActive: boolean;
  ownedModules: string[];
  optionalModules: string[];
}

export interface ModuleContract {
  version: number;
  moduleCode: string;
  name: string;
  moduleVersion: string;
  tier: string;
  category: string;
  isActive: boolean;
  routeBase: string;
  eventNamespace: string;
  provisioningOrder: number;
  tablePrefix: string;
  publishedEvents: string[];
  consumedEvents: string[];
}

export interface ProvisioningContract {
  version: number;
  tenantId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  steps: ProvisioningStep[];
  startedAt: string;
  completedAt: string | null;
}

export interface ProvisioningStep {
  version: number;
  stepName: string;
  status: 'pending' | 'completed' | 'failed' | 'skipped';
  order: number;
  error: string | null;
}

export interface ShellContract {
  version: number;
  navigationGroups: NavigationGroup[];
  dashboardBundles: string[];
  widgetSlots: string[];
}

export interface NavigationGroup {
  version: number;
  groupId: string;
  label: string;
  icon: string;
  order: number;
  items: NavigationItem[];
}

export interface NavigationItem {
  version: number;
  id: string;
  label: string;
  route: string;
  icon: string;
  moduleCode: string | null;
  requiredPermission: string | null;
}

export interface FeatureFlagContract {
  version: number;
  flagCode: string;
  tenantId: string;
  isEnabled: boolean;
  metadata: Record<string, unknown>;
}
