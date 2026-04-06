/**
 * Smart Module Activation — Type Definitions
 *
 * Shared interfaces used across the smart module activation subsystem.
 */

export interface ModuleActivationRule {
  moduleCode: string;
  moduleName: string;
  moduleNameAr: string;
  activationConditions: {
    requiredDepartments?: string[]; // Department codes that trigger this module
    requiredTeams?: string[]; // Team codes that trigger this module
    organizationSize?: 'small' | 'medium' | 'enterprise';
    regulatoryRequirements?: string[]; // Regulator codes (NCA, SAMA, etc.)
    dataTypes?: string[]; // PII, PCI, PHI, etc.
    dependencies?: string[]; // Other modules that must be active first
    minTeamCount?: number;
    minDepartmentCount?: number;
    autoEnable?: boolean;
  };
  grcProcessRequirements: {
    mandatoryWorkflows: string[]; // Workflows that must be enabled
    mandatoryRoles: string[]; // Roles that must exist
    mandatoryDashboards: string[]; // Dashboards that must be available
    evidenceCadence?: 'monthly' | 'quarterly' | 'continuous';
    assessmentFrequency?: 'monthly' | 'quarterly' | 'annual';
  };
  autoEnable: boolean; // If true, auto-enable when conditions met
  priority: number; // Lower = higher priority (enabled first)
}
