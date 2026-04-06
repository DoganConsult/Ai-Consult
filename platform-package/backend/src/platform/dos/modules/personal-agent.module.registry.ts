import { getDefaultProductKey } from '../config/platform-identity';

/**
 * Personal Agent Module Registry
 *
 * Per Platform Operating System Governance Framework:
 * - Module identity, purpose, ownership
 * - Required contracts, dependencies
 * - Lifecycle states, health checks
 * - Permissions, routes, dashboards
 * - AI capability boundaries
 * - Audit requirements
 * 
 * Classification: Module Layer (AI domain)
 * Product Ownership: Shahin (agrc)
 * Extractability: Independent module, removable without platform damage
 */


export interface PersonalAgentModuleContract {
  // Module Identity
  moduleKey: 'personal_agent';
  moduleName: 'Personal Agent';
  moduleNameAr: 'الوكيل الشخصي';
  purpose: 'Dedicated AI agent per user with role inheritance, SLA-based activation, and tenant mode integration';
  productKey: string;
  ownerKind: 'module';
  
  // Dependencies
  requiredModules: string[];
  requiredServices: string[];
  requiredPermissions: string[];
  
  // Lifecycle
  lifecycleStates: ('provisioning' | 'active' | 'suspended' | 'deprecated')[];
  currentState: 'active';
  
  // Contracts (runtime description — values are type documentation strings)
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  
  // Events
  eventsConsumed: string[];
  eventsEmitted: [
    'personal_agent:assigned',
    'personal_agent:activated',
    'personal_agent:activity_created',
    'personal_agent:activity_approved',
    'personal_agent:activity_rejected',
    'personal_agent:sla_breach',
    'personal_agent:deactivated'
  ];
  
  // APIs
  exposedAPIs: {
    '/api/personal-agent/assign': 'POST';
    '/api/personal-agent/assignment': 'GET | PATCH';
    '/api/personal-agent/activity': 'POST';
    '/api/personal-agent/activity/:id': 'GET';
    '/api/personal-agent/activities/:id/approve': 'POST';
    '/api/personal-agent/activities/:id/reject': 'POST';
    '/api/personal-agent/dashboard': 'GET';
    '/api/personal-agent/audit-trail': 'GET';
    '/api/personal-agent/timeline': 'GET';
    '/api/personal-agent/activities/:id/confirm': 'POST';
  };
  
  // Permissions
  permissions: {
    'personal_agent.instance.read': string[];
    'personal_agent.instance.write': string[];
    'personal_agent.instance.manage': string[];
    'personal_agent.instance.approve': string[];
    'personal_agent.instance.configure': string[];
  };
  
  // Workflow Ownership
  workflowsInitiated: string[];
  workflowsParticipated: string[];
  approvalPoints: string[];
  artifactsGenerated: string[];
  
  // AI Rules
  aiCapabilities: {
    allowedTools: string[];
    memoryScope: 'workspace' | 'workflow' | 'session';
    approvalBoundaries: string[];
    escalationPolicy: string;
    tenantConstraints: boolean;
    productConstraints: boolean;
  };
  
  // Boundary Rules
  platformCoreDependencies: [
    'identity',
    'tenancy',
    'permissions',
    'workflow_engine',
    'audit',
    'ai_runtime'
  ];
  productShellDependencies: [];
  moduleOwnership: [
    'personal_agent_assignments',
    'agent_activity_log',
    'process_governance_rules',
    'sla_activation_rules'
  ];
  configurableAtTenantLevel: [
    'activation_mode',
    'sla_thresholds',
    'approval_rules',
    'allowed_action_types',
    'blocked_action_types'
  ];
  
  // Health Checks
  healthChecks: {
    database: 'personal_agent_assignments table exists';
    permissions: 'personal_agent:* permissions registered';
    routes: 'personal-agent routes mounted';
    jobs: 'personal-agent-sla-check job registered';
  };
  
  // Audit Requirements
  auditEvents: [
    'personal_agent:assigned',
    'personal_agent:updated',
    'personal_agent:activity_created',
    'personal_agent:activity_approved',
    'personal_agent:activity_rejected',
    'personal_agent:activity_executed',
    'personal_agent:sla_breach_detected',
    'personal_agent:auto_activated'
  ];
  
  // Success Criteria
  operational: {
    autoAssignmentWorks: boolean;
    slaMonitoringActive: boolean;
    dashboardQueriesPerformant: boolean;
    auditTrailComplete: boolean;
  };
  ux: {
    dashboardLoadsUnder2s: boolean;
    timelineVisualizationSmooth: boolean;
    confirmationWorkflowIntuitive: boolean;
  };
  audit: {
    allActionsLogged: boolean;
    approvalsTraceable: boolean;
    slaBreachesAlerted: boolean;
  };
  performance: {
    dashboardQueryTime: '<500ms';
    auditTrailQueryTime: '<1s';
    activityCreationTime: '<200ms';
  };
  adoption: {
    userConsentRate: '>80%';
    approvalRate: '>70%';
    slaComplianceRate: '>90%';
  };
}

export const PERSONAL_AGENT_MODULE: PersonalAgentModuleContract = {
  moduleKey: 'personal_agent',
  moduleName: 'Personal Agent',
  moduleNameAr: 'الوكيل الشخصي',
  purpose: 'Dedicated AI agent per user with role inheritance, SLA-based activation, and tenant mode integration',
  productKey: getDefaultProductKey(),
  ownerKind: 'module',
  
  requiredModules: ['ai', 'foundation', 'workflow'],
  requiredServices: [
    'platform-mode-gate.service',
    'audit-trail.service',
    'event-bus.service',
    'job-scheduler.service'
  ],
  requiredPermissions: [
    'personal_agent.instance.read',
    'personal_agent.instance.write',
    'personal_agent.instance.manage',
    'personal_agent.instance.approve',
    'personal_agent.instance.configure',
    'ai.agent.read',
    'ai.agent.write',
    'ai.agent.approve'
  ],
  
  lifecycleStates: ['provisioning', 'active', 'suspended', 'deprecated'],
  currentState: 'active',
  
  inputs: {
    userId: 'string',
    tenantId: 'string',
    agentId: 'string (optional)',
    activationMode: "'human' | 'hyper' | 'autonomous' (optional)",
    slaThresholdHours: 'number (optional)',
  },
  outputs: {
    assignmentId: 'string',
    agentActivityId: 'string',
    dashboardSummary: 'AgentDashboardSummary object',
    auditTrail: 'AgentActivity[] array',
  },
  
  eventsConsumed: [
    'platform_mode:activated',
    'platform_mode:transitioned',
    'sla:breach_detected',
    'workflow:task_overdue'
  ],
  eventsEmitted: [
    'personal_agent:assigned',
    'personal_agent:activated',
    'personal_agent:activity_created',
    'personal_agent:activity_approved',
    'personal_agent:activity_rejected',
    'personal_agent:sla_breach',
    'personal_agent:deactivated'
  ],
  
  exposedAPIs: {
    '/api/personal-agent/assign': 'POST',
    '/api/personal-agent/assignment': 'GET | PATCH',
    '/api/personal-agent/activity': 'POST',
    '/api/personal-agent/activity/:id': 'GET',
    '/api/personal-agent/activities/:id/approve': 'POST',
    '/api/personal-agent/activities/:id/reject': 'POST',
    '/api/personal-agent/dashboard': 'GET',
    '/api/personal-agent/audit-trail': 'GET',
    '/api/personal-agent/timeline': 'GET',
    '/api/personal-agent/activities/:id/confirm': 'POST',
  },
  
  permissions: {
    'personal_agent.instance.read': ['owner', 'admin', 'compliance_officer', 'risk_manager', 'auditor', 'viewer', 'manager'],
    'personal_agent.instance.write': ['owner', 'admin', 'compliance_officer', 'risk_manager', 'manager'],
    'personal_agent.instance.manage': ['owner', 'admin'],
    'personal_agent.instance.approve': ['owner', 'admin', 'compliance_officer', 'risk_manager', 'auditor', 'approver', 'manager'],
    'personal_agent.instance.configure': ['owner', 'admin'],
  },
  
  workflowsInitiated: [
    'agent_activity_approval',
    'agent_sla_activation',
    'agent_task_execution'
  ],
  workflowsParticipated: [
    'evidence_collection',
    'remediation',
    'assessment',
    'exception_handling'
  ],
  approvalPoints: [
    'activity_approval',
    'high_risk_action',
    'policy_override',
    'sla_breach_response'
  ],
  artifactsGenerated: [
    'agent_activity_log',
    'dashboard_summary',
    'audit_trail',
    'timeline_data',
    'performance_metrics'
  ],
  
  aiCapabilities: {
    allowedTools: [
      'read_controls',
      'read_evidence',
      'read_risks',
      'create_tasks',
      'update_status',
      'request_approval',
      'escalate'
    ],
    memoryScope: 'workspace',
    approvalBoundaries: [
      'high_risk_actions',
      'policy_changes',
      'privilege_changes',
      'destructive_actions',
      'regulator_facing_outputs'
    ],
    escalationPolicy: 'escalate_to_user_on_high_risk',
    tenantConstraints: true,
    productConstraints: true,
  },
  
  platformCoreDependencies: [
    'identity',
    'tenancy',
    'permissions',
    'workflow_engine',
    'audit',
    'ai_runtime'
  ],
  productShellDependencies: [],
  moduleOwnership: [
    'personal_agent_assignments',
    'agent_activity_log',
    'process_governance_rules',
    'sla_activation_rules'
  ],
  configurableAtTenantLevel: [
    'activation_mode',
    'sla_thresholds',
    'approval_rules',
    'allowed_action_types',
    'blocked_action_types'
  ],
  
  healthChecks: {
    database: 'personal_agent_assignments table exists',
    permissions: 'personal_agent:* permissions registered',
    routes: 'personal-agent routes mounted',
    jobs: 'personal-agent-sla-check job registered',
  },
  
  auditEvents: [
    'personal_agent:assigned',
    'personal_agent:updated',
    'personal_agent:activity_created',
    'personal_agent:activity_approved',
    'personal_agent:activity_rejected',
    'personal_agent:activity_executed',
    'personal_agent:sla_breach_detected',
    'personal_agent:auto_activated'
  ],
  
  operational: {
    autoAssignmentWorks: true,
    slaMonitoringActive: true,
    dashboardQueriesPerformant: true,
    auditTrailComplete: true,
  },
  ux: {
    dashboardLoadsUnder2s: true,
    timelineVisualizationSmooth: true,
    confirmationWorkflowIntuitive: true,
  },
  audit: {
    allActionsLogged: true,
    approvalsTraceable: true,
    slaBreachesAlerted: true,
  },
  performance: {
    dashboardQueryTime: '<500ms',
    auditTrailQueryTime: '<1s',
    activityCreationTime: '<200ms',
  },
  adoption: {
    userConsentRate: '>80%',
    approvalRate: '>70%',
    slaComplianceRate: '>90%',
  },
};

/**
 * Module Registration Helper
 * Registers personal-agent module in platform registries
 */
// TODO: registerPersonalAgentModule() — implement when module lifecycle registry is ready
