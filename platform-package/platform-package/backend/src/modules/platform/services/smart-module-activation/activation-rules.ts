/**
 * Smart Module Activation — Activation Rules
 *
 * Core GRC modules with smart activation rules defining when each module
 * should be activated based on organizational structure, regulatory
 * requirements, and inter-module dependencies.
 */

import type { ModuleActivationRule } from './types';

export const MODULE_ACTIVATION_RULES: ModuleActivationRule[] = [
  // Foundation - Always enabled (base platform)
  {
    moduleCode: 'foundation',
    moduleName: 'Foundation',
    moduleNameAr: 'الأساسيات',
    activationConditions: {
      autoEnable: true,
    },
    grcProcessRequirements: {
      mandatoryWorkflows: [],
      mandatoryRoles: ['TenantAdmin'],
      mandatoryDashboards: ['executive'],
      evidenceCadence: 'quarterly',
    },
    autoEnable: true,
    priority: 1,
  },

  // Compliance - Enabled if compliance department exists OR regulatory requirements
  {
    moduleCode: 'compliance',
    moduleName: 'Compliance',
    moduleNameAr: 'الامتثال',
    activationConditions: {
      requiredDepartments: ['COMPLIANCE', 'COMP', 'GOVERNANCE'],
      regulatoryRequirements: ['NCA', 'SAMA', 'CST', 'PDPL'],
      dependencies: ['foundation'],
      autoEnable: true,
    },
    grcProcessRequirements: {
      mandatoryWorkflows: ['evidence_collection', 'assessment', 'exception_request'],
      mandatoryRoles: ['ComplianceManager', 'ComplianceOfficer', 'ControlOwner'],
      mandatoryDashboards: ['compliance_ops', 'compliance_posture'],
      evidenceCadence: 'monthly',
      assessmentFrequency: 'quarterly',
    },
    autoEnable: true,
    priority: 2,
  },

  // Risk - Enabled if risk department exists OR high-risk indicators
  {
    moduleCode: 'risk',
    moduleName: 'Risk Management',
    moduleNameAr: 'إدارة المخاطر',
    activationConditions: {
      requiredDepartments: ['RISK', 'SECURITY'],
      dependencies: ['foundation'],
      autoEnable: true,
    },
    grcProcessRequirements: {
      mandatoryWorkflows: ['risk_assessment', 'risk_treatment'],
      mandatoryRoles: ['RiskManager'],
      mandatoryDashboards: ['risk_register', 'risk_heatmap'],
      evidenceCadence: 'quarterly',
      assessmentFrequency: 'quarterly',
    },
    autoEnable: true,
    priority: 3,
  },

  // Security - Enabled if security department exists OR security team
  {
    moduleCode: 'security',
    moduleName: 'Security',
    moduleNameAr: 'الأمن',
    activationConditions: {
      requiredDepartments: ['SECURITY', 'SEC', 'IT'],
      requiredTeams: ['SOC', 'SECURITY-OPS'],
      dependencies: ['foundation'],
      autoEnable: true,
    },
    grcProcessRequirements: {
      mandatoryWorkflows: ['incident_response', 'vulnerability_management'],
      mandatoryRoles: ['SecurityManager', 'SecurityAnalyst'],
      mandatoryDashboards: ['security_posture', 'incident_dashboard'],
      evidenceCadence: 'continuous',
      assessmentFrequency: 'monthly',
    },
    autoEnable: true,
    priority: 4,
  },

  // Evidence - Enabled if compliance OR security is active
  {
    moduleCode: 'evidence',
    moduleName: 'Evidence Management',
    moduleNameAr: 'إدارة الأدلة',
    activationConditions: {
      dependencies: ['compliance', 'security'],
      autoEnable: true,
    },
    grcProcessRequirements: {
      mandatoryWorkflows: ['evidence_collection', 'evidence_review'],
      mandatoryRoles: ['EvidenceCustodian'],
      mandatoryDashboards: ['evidence_ops', 'evidence_coverage'],
      evidenceCadence: 'monthly',
    },
    autoEnable: true,
    priority: 5,
  },

  // Audit - Enabled if audit department exists OR compliance is active
  {
    moduleCode: 'audit',
    moduleName: 'Audit',
    moduleNameAr: 'التدقيق',
    activationConditions: {
      requiredDepartments: ['AUDIT', 'INTERNAL_AUDIT'],
      dependencies: ['compliance', 'evidence'],
      autoEnable: true,
    },
    grcProcessRequirements: {
      mandatoryWorkflows: ['audit_engagement', 'finding_management'],
      mandatoryRoles: ['Auditor'],
      mandatoryDashboards: ['audit_dashboard', 'findings'],
      evidenceCadence: 'quarterly',
      assessmentFrequency: 'annual',
    },
    autoEnable: true,
    priority: 6,
  },

  // Governance - Enabled if governance/legal department exists
  {
    moduleCode: 'governance',
    moduleName: 'Governance',
    moduleNameAr: 'الحوكمة',
    activationConditions: {
      requiredDepartments: ['GOVERNANCE', 'GOV', 'LEGAL'],
      dependencies: ['foundation'],
      autoEnable: true,
    },
    grcProcessRequirements: {
      mandatoryWorkflows: ['policy_approval', 'exception_request'],
      mandatoryRoles: ['GovernanceManager'],
      mandatoryDashboards: ['governance_dashboard'],
      evidenceCadence: 'quarterly',
    },
    autoEnable: true,
    priority: 7,
  },

  // Workflow - Enabled if any operational module is active
  {
    moduleCode: 'workflow',
    moduleName: 'Workflow Engine',
    moduleNameAr: 'محرك سير العمل',
    activationConditions: {
      dependencies: ['compliance', 'risk', 'security', 'audit'],
      autoEnable: true,
    },
    grcProcessRequirements: {
      mandatoryWorkflows: [],
      mandatoryRoles: [],
      mandatoryDashboards: ['workflow_queue'],
      evidenceCadence: 'continuous',
    },
    autoEnable: true,
    priority: 8,
  },

  // Reporting - Always enabled if compliance or risk is active
  {
    moduleCode: 'reporting',
    moduleName: 'Reporting',
    moduleNameAr: 'التقارير',
    activationConditions: {
      dependencies: ['compliance', 'risk'],
      autoEnable: true,
    },
    grcProcessRequirements: {
      mandatoryWorkflows: ['report_generation'],
      mandatoryRoles: [],
      mandatoryDashboards: ['executive', 'compliance_ops'],
      evidenceCadence: 'monthly',
    },
    autoEnable: true,
    priority: 9,
  },

  // Assessment / Maturity - Enabled if compliance is active
  {
    moduleCode: 'qiyas',
    moduleName: 'Assessment & Maturity',
    moduleNameAr: 'التقييم والنضج',
    activationConditions: {
      dependencies: ['compliance'],
      autoEnable: true,
    },
    grcProcessRequirements: {
      mandatoryWorkflows: ['assessment'],
      mandatoryRoles: ['ComplianceManager', 'Auditor'],
      mandatoryDashboards: ['assessment_dashboard'],
      evidenceCadence: 'quarterly',
      assessmentFrequency: 'quarterly',
    },
    autoEnable: true,
    priority: 10,
  },

  // Vendor Risk - Enabled if vendor/third-party team exists
  {
    moduleCode: 'vendor',
    moduleName: 'Vendor Risk',
    moduleNameAr: 'مخاطر الموردين',
    activationConditions: {
      requiredDepartments: ['PROCUREMENT', 'VENDOR', 'THIRD_PARTY'],
      requiredTeams: ['VENDOR-MGMT', 'THIRD-PARTY'],
      dependencies: ['risk'],
      autoEnable: false, // Manual activation recommended
    },
    grcProcessRequirements: {
      mandatoryWorkflows: ['vendor_assessment', 'vendor_onboarding'],
      mandatoryRoles: ['VendorRiskOwner'],
      mandatoryDashboards: ['vendor_hub'],
      evidenceCadence: 'quarterly',
    },
    autoEnable: false,
    priority: 11,
  },

  // Incident - Enabled if security is active
  {
    moduleCode: 'incident',
    moduleName: 'Incident Management',
    moduleNameAr: 'إدارة الحوادث',
    activationConditions: {
      dependencies: ['security'],
      autoEnable: true,
    },
    grcProcessRequirements: {
      mandatoryWorkflows: ['incident_response', 'incident_remediation'],
      mandatoryRoles: ['SecurityManager', 'IncidentResponder'],
      mandatoryDashboards: ['incident_dashboard'],
      evidenceCadence: 'continuous',
    },
    autoEnable: true,
    priority: 12,
  },

  // BCP - Enabled for enterprise or critical infrastructure
  {
    moduleCode: 'bcp',
    moduleName: 'Business Continuity',
    moduleNameAr: 'استمرارية الأعمال',
    activationConditions: {
      organizationSize: 'enterprise',
      dependencies: ['risk'],
      autoEnable: false,
    },
    grcProcessRequirements: {
      mandatoryWorkflows: ['bcp_assessment', 'dr_test'],
      mandatoryRoles: ['BCMOwner'],
      mandatoryDashboards: ['bcp_dashboard'],
      evidenceCadence: 'quarterly',
    },
    autoEnable: false,
    priority: 13,
  },

  // AI - Enabled if any module is active (AI assists all modules)
  {
    moduleCode: 'ai',
    moduleName: 'AI & Automation',
    moduleNameAr: 'الذكاء الاصطناعي والأتمتة',
    activationConditions: {
      dependencies: ['foundation'],
      autoEnable: true,
    },
    grcProcessRequirements: {
      mandatoryWorkflows: [],
      mandatoryRoles: [],
      mandatoryDashboards: ['ai_dashboard'],
      evidenceCadence: 'continuous',
    },
    autoEnable: true,
    priority: 14,
  },
];
