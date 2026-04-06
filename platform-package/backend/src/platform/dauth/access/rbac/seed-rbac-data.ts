// @ts-nocheck
// ============================================
// DAuth — RBAC Data Seeder
// Seeds canonical roles, permissions, and mappings into a tenant
// schema during provisioning. Data-driven security (Law 3).
// Owner: DAuth
// ============================================

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../../../config/database';
import { invalidatePermissionCache } from '../decision-engine';
import { logger } from '../../../dos/observability/logger.service';

// ── Types ──────────────────────────────────────────────────────────

export interface SeedResult {
  rolesSeeded: number;
  permissionsSeeded: number;
  mappingsSeeded: number;
}

// ── Canonical role definitions ─────────────────────────────────────

interface RoleDef {
  code: string;
  name: string;
  description: string;
  tier: 'platform' | 'tenant' | 'module';
  isSystem: boolean;
}

const CANONICAL_ROLES: RoleDef[] = [
  { code: 'platform_super_admin', name: 'Platform Super Admin', description: 'Full platform control — provisioning, tenancy, global config', tier: 'platform', isSystem: true },
  { code: 'tenant_admin', name: 'Tenant Admin', description: 'Full tenant control — users, roles, modules, settings', tier: 'tenant', isSystem: true },
  { code: 'security_admin', name: 'Security Admin', description: 'Auth config, access profiles, SoD rules, audit log access', tier: 'tenant', isSystem: true },
  { code: 'compliance_officer', name: 'Compliance Officer', description: 'Compliance module — controls, evidence, attestations', tier: 'module', isSystem: false },
  { code: 'risk_manager', name: 'Risk Manager', description: 'Risk module — risk register, assessments, treatment plans', tier: 'module', isSystem: false },
  { code: 'auditor', name: 'Auditor', description: 'Audit module — audit plans, findings, follow-ups (read-heavy)', tier: 'module', isSystem: false },
  { code: 'policy_owner', name: 'Policy Owner', description: 'Policy module — draft, review, publish, retire policies', tier: 'module', isSystem: false },
  { code: 'incident_manager', name: 'Incident Manager', description: 'Incident module — triage, assign, resolve incidents', tier: 'module', isSystem: false },
  { code: 'vendor_manager', name: 'Vendor Manager', description: 'Vendor module — onboard, assess, monitor vendors', tier: 'module', isSystem: false },
  { code: 'standard_user', name: 'Standard User', description: 'Default role — read access to assigned modules', tier: 'tenant', isSystem: true },
  { code: 'viewer', name: 'Viewer', description: 'Read-only access across enabled modules', tier: 'tenant', isSystem: true },
  { code: 'workflow_admin', name: 'Workflow Admin', description: 'Workflow module — design, deploy, manage workflows', tier: 'module', isSystem: false },
];

// ── Canonical permission definitions ───────────────────────────────

interface PermDef {
  code: string;
  name: string;
  module: string;
  resource: string;
  action: string;
}

export { CANONICAL_ROLES, CANONICAL_PERMISSIONS, ROLE_PERMISSION_MAP };

const CANONICAL_PERMISSIONS: PermDef[] = [
  // Platform
  { code: 'platform.tenant.create', name: 'Create Tenant', module: 'platform', resource: 'tenant', action: 'create' },
  { code: 'platform.tenant.read', name: 'Read Tenant', module: 'platform', resource: 'tenant', action: 'read' },
  { code: 'platform.tenant.update', name: 'Update Tenant', module: 'platform', resource: 'tenant', action: 'update' },
  { code: 'platform.tenant.delete', name: 'Delete Tenant', module: 'platform', resource: 'tenant', action: 'delete' },
  { code: 'platform.user.create', name: 'Create User', module: 'platform', resource: 'user', action: 'create' },
  { code: 'platform.user.read', name: 'Read User', module: 'platform', resource: 'user', action: 'read' },
  { code: 'platform.user.update', name: 'Update User', module: 'platform', resource: 'user', action: 'update' },
  { code: 'platform.user.delete', name: 'Delete User', module: 'platform', resource: 'user', action: 'delete' },
  { code: 'platform.role.manage', name: 'Manage Roles', module: 'platform', resource: 'role', action: 'manage' },
  { code: 'platform.permission.manage', name: 'Manage Permissions', module: 'platform', resource: 'permission', action: 'manage' },
  { code: 'platform.settings.read', name: 'Read Settings', module: 'platform', resource: 'settings', action: 'read' },
  { code: 'platform.settings.update', name: 'Update Settings', module: 'platform', resource: 'settings', action: 'update' },
  { code: 'platform.audit.read', name: 'Read Audit Log', module: 'platform', resource: 'audit', action: 'read' },
  { code: 'platform.module.enable', name: 'Enable Module', module: 'platform', resource: 'module', action: 'enable' },
  { code: 'platform.module.disable', name: 'Disable Module', module: 'platform', resource: 'module', action: 'disable' },
  // Delegation / Auth
  { code: 'dauth.delegation.create', name: 'Create Delegation', module: 'dauth', resource: 'delegation', action: 'create' },
  { code: 'dauth.delegation.revoke', name: 'Revoke Delegation', module: 'dauth', resource: 'delegation', action: 'revoke' },
  { code: 'dauth.sod.manage', name: 'Manage SoD Rules', module: 'dauth', resource: 'sod', action: 'manage' },
  { code: 'dauth.access_profile.manage', name: 'Manage Access Profiles', module: 'dauth', resource: 'access_profile', action: 'manage' },
  // Compliance
  { code: 'compliance.control.read', name: 'Read Controls', module: 'compliance', resource: 'control', action: 'read' },
  { code: 'compliance.control.manage', name: 'Manage Controls', module: 'compliance', resource: 'control', action: 'manage' },
  { code: 'compliance.evidence.submit', name: 'Submit Evidence', module: 'compliance', resource: 'evidence', action: 'submit' },
  { code: 'compliance.evidence.review', name: 'Review Evidence', module: 'compliance', resource: 'evidence', action: 'review' },
  { code: 'compliance.attestation.create', name: 'Create Attestation', module: 'compliance', resource: 'attestation', action: 'create' },
  // Risk (sub-resource actions kept; register.* deprecated — use risk.record.* / risk.manage)
  { code: 'risk.register.read', name: 'Read Risk Register (deprecated: use risk.record.read)', module: 'risk', resource: 'register', action: 'read' },
  { code: 'risk.register.manage', name: 'Manage Risk Register (deprecated: use risk.manage)', module: 'risk', resource: 'register', action: 'manage' },
  { code: 'risk.assessment.create', name: 'Create Assessment', module: 'risk', resource: 'assessment', action: 'create' },
  { code: 'risk.assessment.approve', name: 'Approve Assessment', module: 'risk', resource: 'assessment', action: 'approve' },
  // Audit (sub-resource actions kept; plan.* deprecated — use audit.record.*)
  { code: 'audit.plan.read', name: 'Read Audit Plans (deprecated: use audit.record.read)', module: 'audit', resource: 'plan', action: 'read' },
  { code: 'audit.plan.manage', name: 'Manage Audit Plans (deprecated: use audit.record.manage)', module: 'audit', resource: 'plan', action: 'manage' },
  { code: 'audit.finding.create', name: 'Create Finding', module: 'audit', resource: 'finding', action: 'create' },
  { code: 'audit.finding.resolve', name: 'Resolve Finding', module: 'audit', resource: 'finding', action: 'resolve' },
  // Policy
  { code: 'policy.document.read', name: 'Read Policies', module: 'policy', resource: 'document', action: 'read' },
  { code: 'policy.document.manage', name: 'Manage Policies', module: 'policy', resource: 'document', action: 'manage' },
  { code: 'policy.document.publish', name: 'Publish Policy', module: 'policy', resource: 'document', action: 'publish' },
  // Incident (ticket.* deprecated — use incident.record.* / incident.manage; resolve kept as sub-resource action)
  { code: 'incident.ticket.read', name: 'Read Incidents (deprecated: use incident.record.read)', module: 'incident', resource: 'ticket', action: 'read' },
  { code: 'incident.ticket.manage', name: 'Manage Incidents (deprecated: use incident.manage)', module: 'incident', resource: 'ticket', action: 'manage' },
  { code: 'incident.ticket.resolve', name: 'Resolve Incident', module: 'incident', resource: 'ticket', action: 'resolve' },
  // Vendor (profile.* deprecated — use vendor.record.* / vendor.manage; assessment.create kept as sub-resource action)
  { code: 'vendor.profile.read', name: 'Read Vendors (deprecated: use vendor.record.read)', module: 'vendor', resource: 'profile', action: 'read' },
  { code: 'vendor.profile.manage', name: 'Manage Vendors (deprecated: use vendor.manage)', module: 'vendor', resource: 'profile', action: 'manage' },
  { code: 'vendor.assessment.create', name: 'Create Vendor Assessment', module: 'vendor', resource: 'assessment', action: 'create' },
  // Workflow
  { code: 'workflow.definition.read', name: 'Read Workflows', module: 'workflow', resource: 'definition', action: 'read' },
  { code: 'workflow.definition.manage', name: 'Manage Workflows', module: 'workflow', resource: 'definition', action: 'manage' },
  { code: 'workflow.instance.approve', name: 'Approve Workflow Step', module: 'workflow', resource: 'instance', action: 'approve' },
  // Onboarding
  { code: 'onboarding.record.read', name: 'Read Onboarding Records', module: 'onboarding', resource: 'record', action: 'read' },
  { code: 'onboarding.record.write', name: 'Create/Edit Onboarding Records', module: 'onboarding', resource: 'record', action: 'write' },
  { code: 'onboarding.manage', name: 'Manage Onboarding Settings', module: 'onboarding', resource: 'module', action: 'manage' },
  // Reporting / Dashboard
  { code: 'reporting.dashboard.read', name: 'Read Dashboards', module: 'reporting', resource: 'dashboard', action: 'read' },
  { code: 'reporting.report.generate', name: 'Generate Reports', module: 'reporting', resource: 'report', action: 'generate' },
  // Workspace (frontend route-level permissions — aligned with init-master-db canonical codes)
  { code: 'workspace.config.read', name: 'Read Workspace Config', module: 'workspace', resource: 'config', action: 'read' },
  { code: 'workspace.config.write', name: 'Write Workspace Config', module: 'workspace', resource: 'config', action: 'write' },
  { code: 'profile.record.read', name: 'Read Profile', module: 'profile', resource: 'record', action: 'read' },
  { code: 'admin.system.read', name: 'Read Admin System', module: 'admin', resource: 'system', action: 'read' },
  { code: 'admin.system.write', name: 'Write Admin System', module: 'admin', resource: 'system', action: 'write' },
  { code: 'users.account.manage', name: 'Manage User Accounts', module: 'users', resource: 'account', action: 'manage' },
  { code: 'platform.system.admin', name: 'Platform System Admin', module: 'platform', resource: 'system', action: 'admin' },
  { code: 'platform.agent.read', name: 'Read Platform Agents', module: 'platform', resource: 'agent', action: 'read' },
  // Module route-level permissions (frontend component-registry canonical codes)
  { code: 'analytics.report.read', name: 'Read Analytics Reports', module: 'analytics', resource: 'report', action: 'read' },
  { code: 'analytics.report.write', name: 'Write Analytics Reports', module: 'analytics', resource: 'report', action: 'write' },
  { code: 'control.record.read', name: 'Read Control Records', module: 'control', resource: 'record', action: 'read' },
  { code: 'control.record.write', name: 'Write Control Records', module: 'control', resource: 'record', action: 'write' },
  { code: 'assessment.record.read', name: 'Read Assessments', module: 'assessment', resource: 'record', action: 'read' },
  { code: 'assessment.record.manage', name: 'Manage Assessments', module: 'assessment', resource: 'record', action: 'manage' },
  { code: 'framework.record.read', name: 'Read Frameworks', module: 'framework', resource: 'record', action: 'read' },
  { code: 'framework.record.manage', name: 'Manage Frameworks', module: 'framework', resource: 'record', action: 'manage' },
  { code: 'risk.record.read', name: 'Read Risk Records', module: 'risk', resource: 'record', action: 'read' },
  { code: 'risk.record.write', name: 'Write Risk Records', module: 'risk', resource: 'record', action: 'write' },
  { code: 'audit.record.read', name: 'Read Audit Records', module: 'audit', resource: 'record', action: 'read' },
  { code: 'audit.record.manage', name: 'Manage Audit Records', module: 'audit', resource: 'record', action: 'manage' },
  { code: 'evidence.item.read', name: 'Read Evidence Items', module: 'evidence', resource: 'item', action: 'read' },
  { code: 'evidence.item.write', name: 'Write Evidence Items', module: 'evidence', resource: 'item', action: 'write' },
  { code: 'compliance.program.read', name: 'Read Compliance Programs', module: 'compliance', resource: 'program', action: 'read' },
  { code: 'incident.record.read', name: 'Read Incident Records', module: 'incident', resource: 'record', action: 'read' },
  { code: 'incident.record.write', name: 'Write Incident Records', module: 'incident', resource: 'record', action: 'write' },
  { code: 'vendor.record.read', name: 'Read Vendor Records', module: 'vendor', resource: 'record', action: 'read' },
  { code: 'vendor.record.write', name: 'Write Vendor Records', module: 'vendor', resource: 'record', action: 'write' },
  { code: 'privacy.record.read', name: 'Read Privacy Records', module: 'privacy', resource: 'record', action: 'read' },
  { code: 'copilot.assistant.read', name: 'Read AI Copilot', module: 'copilot', resource: 'assistant', action: 'read' },
  { code: 'ai.agent.read', name: 'Read AI Agents', module: 'ai', resource: 'agent', action: 'read' },
  { code: 'ai.agent.manage', name: 'Manage AI Agents', module: 'ai', resource: 'agent', action: 'manage' },
  { code: 'knowledge.base.read', name: 'Read Knowledge Base', module: 'knowledge', resource: 'base', action: 'read' },
  { code: 'integrations.connector.read', name: 'Read Integrations', module: 'integrations', resource: 'connector', action: 'read' },
  { code: 'integrations.connector.write', name: 'Write Integrations', module: 'integrations', resource: 'connector', action: 'write' },
  { code: 'report.document.read', name: 'Read Report Documents', module: 'report', resource: 'document', action: 'read' },
  { code: 'report.document.write', name: 'Write Report Documents', module: 'report', resource: 'document', action: 'write' },
  { code: 'timeline.event.read', name: 'Read Timeline Events', module: 'timeline', resource: 'event', action: 'read' },
  { code: 'task.item.read', name: 'Read Tasks', module: 'task', resource: 'item', action: 'read' },
  { code: 'action.item.read', name: 'Read Action Items', module: 'action', resource: 'item', action: 'read' },
  { code: 'exception.record.read', name: 'Read Exceptions', module: 'exception', resource: 'record', action: 'read' },
  { code: 'remediation.task.read', name: 'Read Remediation Tasks', module: 'remediation', resource: 'task', action: 'read' },
  { code: 'messaging.channel.read', name: 'Read Messaging Channels', module: 'messaging', resource: 'channel', action: 'read' },
  { code: 'workflow.instance.read', name: 'Read Workflow Instances', module: 'workflow', resource: 'instance', action: 'read' },
  { code: 'workflow.instance.write', name: 'Write Workflow Instances', module: 'workflow', resource: 'instance', action: 'write' },
  { code: 'governance.record.read', name: 'Read Governance Records', module: 'governance', resource: 'record', action: 'read' },
  { code: 'governance.record.manage', name: 'Manage Governance Records', module: 'governance', resource: 'record', action: 'manage' },
  { code: 'foundation.org.read', name: 'Read Foundation Org Structure', module: 'foundation', resource: 'org', action: 'read' },
  { code: 'foundation.org.manage', name: 'Manage Foundation Org Structure', module: 'foundation', resource: 'org', action: 'manage' },
  { code: 'asset.record.read', name: 'Read Asset Records', module: 'asset', resource: 'record', action: 'read' },
  { code: 'asset.record.manage', name: 'Manage Asset Records', module: 'asset', resource: 'record', action: 'manage' },
  { code: 'position.record.read', name: 'Read Position Records', module: 'position', resource: 'record', action: 'read' },
  { code: 'team.member.read', name: 'Read Team Members', module: 'team', resource: 'member', action: 'read' },
  { code: 'team.member.manage', name: 'Manage Team Members', module: 'team', resource: 'member', action: 'manage' },
  { code: 'ai.governance.read', name: 'Read AI Governance', module: 'ai', resource: 'governance', action: 'read' },
  { code: 'training.record.read', name: 'Read Training Records', module: 'training', resource: 'record', action: 'read' },
  { code: 'training.record.manage', name: 'Manage Training Records', module: 'training', resource: 'record', action: 'manage' },
  { code: 'bcp.plan.read', name: 'Read BCP Plans', module: 'bcp', resource: 'plan', action: 'read' },
  { code: 'bcp.plan.manage', name: 'Manage BCP Plans', module: 'bcp', resource: 'plan', action: 'manage' },
  // Backend API route permissions (full cross-module audit)
  // Foundation (backend routes use foundation.record.* family)
  { code: 'foundation.record.read', name: 'Read Foundation Records', module: 'foundation', resource: 'record', action: 'read' },
  { code: 'foundation.record.write', name: 'Write Foundation Records', module: 'foundation', resource: 'record', action: 'write' },
  { code: 'foundation.record.approve', name: 'Approve Foundation Records', module: 'foundation', resource: 'record', action: 'approve' },
  { code: 'foundation.record.delete', name: 'Delete Foundation Records', module: 'foundation', resource: 'record', action: 'delete' },
  { code: 'foundation.manage', name: 'Manage Foundation Module', module: 'foundation', resource: 'module', action: 'manage' },
  // Policy (write/configure/delete)
  { code: 'policy.document.write', name: 'Write Policies', module: 'policy', resource: 'document', action: 'write' },
  { code: 'policy.document.configure', name: 'Configure Policies', module: 'policy', resource: 'document', action: 'configure' },
  { code: 'policy.document.delete', name: 'Delete Policies', module: 'policy', resource: 'document', action: 'delete' },
  { code: 'policy.record.read', name: 'Read Policy Records', module: 'policy', resource: 'record', action: 'read' },
  { code: 'policy.record.approve', name: 'Approve Policy Records', module: 'policy', resource: 'record', action: 'approve' },
  // Risk (configure/delete)
  { code: 'risk.record.configure', name: 'Configure Risk Records', module: 'risk', resource: 'record', action: 'configure' },
  { code: 'risk.record.delete', name: 'Delete Risk Records', module: 'risk', resource: 'record', action: 'delete' },
  // Incident (configure)
  { code: 'incident.record.configure', name: 'Configure Incident Records', module: 'incident', resource: 'record', action: 'configure' },
  // Compliance (approve/write/delete)
  { code: 'compliance.control.approve', name: 'Approve Controls', module: 'compliance', resource: 'control', action: 'approve' },
  { code: 'compliance.program.manage', name: 'Manage Compliance Programs', module: 'compliance', resource: 'program', action: 'manage' },
  { code: 'compliance.program.write', name: 'Write Compliance Programs', module: 'compliance', resource: 'program', action: 'write' },
  { code: 'compliance.record.read', name: 'Read Compliance Records', module: 'compliance', resource: 'record', action: 'read' },
  // Workflow (record/approval/task)
  { code: 'workflow.record.read', name: 'Read Workflow Records', module: 'workflow', resource: 'record', action: 'read' },
  { code: 'workflow.approval.read', name: 'Read Workflow Approvals', module: 'workflow', resource: 'approval', action: 'read' },
  { code: 'workflow.task.read', name: 'Read Workflow Tasks', module: 'workflow', resource: 'task', action: 'read' },
  // Admin (configure/manage/field-rbac/security-config/record)
  { code: 'admin.system.configure', name: 'Configure Admin System', module: 'admin', resource: 'system', action: 'configure' },
  { code: 'admin.system.manage', name: 'Manage Admin System', module: 'admin', resource: 'system', action: 'manage' },
  { code: 'admin.record.read', name: 'Read Admin Records', module: 'admin', resource: 'record', action: 'read' },
  { code: 'admin.field-rbac.read', name: 'Read Field RBAC', module: 'admin', resource: 'field-rbac', action: 'read' },
  { code: 'admin.field-rbac.write', name: 'Write Field RBAC', module: 'admin', resource: 'field-rbac', action: 'write' },
  { code: 'admin.security-config.read', name: 'Read Security Config', module: 'admin', resource: 'security-config', action: 'read' },
  { code: 'admin.security-config.write', name: 'Write Security Config', module: 'admin', resource: 'security-config', action: 'write' },
  // BCP (write/configure/record)
  { code: 'bcp.plan.write', name: 'Write BCP Plans', module: 'bcp', resource: 'plan', action: 'write' },
  { code: 'bcp.plan.configure', name: 'Configure BCP Plans', module: 'bcp', resource: 'plan', action: 'configure' },
  { code: 'bcp.record.read', name: 'Read BCP Records', module: 'bcp', resource: 'record', action: 'read' },
  // Training (write/configure)
  { code: 'training.record.write', name: 'Write Training Records', module: 'training', resource: 'record', action: 'write' },
  { code: 'training.record.configure', name: 'Configure Training Records', module: 'training', resource: 'record', action: 'configure' },
  // Vendor (configure/manage)
  { code: 'vendor.record.configure', name: 'Configure Vendor Records', module: 'vendor', resource: 'record', action: 'configure' },
  { code: 'vendor.record.manage', name: 'Manage Vendor Records', module: 'vendor', resource: 'record', action: 'manage' },
  // Analytics (record/configure)
  { code: 'analytics.record.read', name: 'Read Analytics Records', module: 'analytics', resource: 'record', action: 'read' },
  { code: 'analytics.report.configure', name: 'Configure Analytics Reports', module: 'analytics', resource: 'report', action: 'configure' },
  // Asset (write)
  { code: 'asset.record.write', name: 'Write Asset Records', module: 'asset', resource: 'record', action: 'write' },
  // Evidence (record)
  { code: 'evidence.record.read', name: 'Read Evidence Records', module: 'evidence', resource: 'record', action: 'read' },
  // Privacy (write/approve/configure/delete)
  { code: 'privacy.record.write', name: 'Write Privacy Records', module: 'privacy', resource: 'record', action: 'write' },
  { code: 'privacy.record.approve', name: 'Approve Privacy Records', module: 'privacy', resource: 'record', action: 'approve' },
  { code: 'privacy.record.configure', name: 'Configure Privacy Records', module: 'privacy', resource: 'record', action: 'configure' },
  { code: 'privacy.record.delete', name: 'Delete Privacy Records', module: 'privacy', resource: 'record', action: 'delete' },
  // Exception (configure)
  { code: 'exception.record.configure', name: 'Configure Exceptions', module: 'exception', resource: 'record', action: 'configure' },
  // Remediation (record/configure/execute)
  { code: 'remediation.record.read', name: 'Read Remediation Records', module: 'remediation', resource: 'record', action: 'read' },
  { code: 'remediation.task.configure', name: 'Configure Remediation Tasks', module: 'remediation', resource: 'task', action: 'configure' },
  { code: 'remediation.task.execute', name: 'Execute Remediation Tasks', module: 'remediation', resource: 'task', action: 'execute' },
  // Controls (record)
  { code: 'controls.record.read', name: 'Read Controls Records', module: 'controls', resource: 'record', action: 'read' },
  // Reporting (record)
  { code: 'reporting.record.read', name: 'Read Reporting Records', module: 'reporting', resource: 'record', action: 'read' },
  // Governance (write)
  { code: 'governance.record.write', name: 'Write Governance Records', module: 'governance', resource: 'record', action: 'write' },
  // Team (record/manage)
  { code: 'team.record.read', name: 'Read Team Records', module: 'team', resource: 'record', action: 'read' },
  { code: 'team.record.write', name: 'Write Team Records', module: 'team', resource: 'record', action: 'write' },
  { code: 'team.record.approve', name: 'Approve Team Records', module: 'team', resource: 'record', action: 'approve' },
  { code: 'team.record.delete', name: 'Delete Team Records', module: 'team', resource: 'record', action: 'delete' },
  { code: 'team.manage', name: 'Manage Teams', module: 'team', resource: 'module', action: 'manage' },
  // Action (record/configure)
  { code: 'action.record.read', name: 'Read Action Records', module: 'action', resource: 'record', action: 'read' },
  { code: 'action.item.configure', name: 'Configure Action Items', module: 'action', resource: 'item', action: 'configure' },
  // AI / AI-Governance
  { code: 'ai.record.read', name: 'Read AI Records', module: 'ai', resource: 'record', action: 'read' },
  { code: 'ai-governance.record.read', name: 'Read AI Governance Records', module: 'ai', resource: 'governance-record', action: 'read' },
  // Notification (config/record)
  { code: 'notification.config.read', name: 'Read Notification Config', module: 'notification', resource: 'config', action: 'read' },
  { code: 'notification.config.write', name: 'Write Notification Config', module: 'notification', resource: 'config', action: 'write' },
  { code: 'notification.config.configure', name: 'Configure Notifications', module: 'notification', resource: 'config', action: 'configure' },
  { code: 'notification.record.read', name: 'Read Notification Records', module: 'notification', resource: 'record', action: 'read' },
  // Integrations (configure/delete/record)
  { code: 'integrations.connector.configure', name: 'Configure Integrations', module: 'integrations', resource: 'connector', action: 'configure' },
  { code: 'integrations.connector.delete', name: 'Delete Integrations', module: 'integrations', resource: 'connector', action: 'delete' },
  { code: 'integrations.record.read', name: 'Read Integrations Records', module: 'integrations', resource: 'record', action: 'read' },
  // Platform (subscription/workspace)
  { code: 'platform.subscription.read', name: 'Read Platform Subscription', module: 'platform', resource: 'subscription', action: 'read' },
  { code: 'platform.subscription.manage', name: 'Manage Platform Subscription', module: 'platform', resource: 'subscription', action: 'manage' },
  { code: 'platform.workspace.read', name: 'Read Platform Workspace', module: 'platform', resource: 'workspace', action: 'read' },
  { code: 'platform.workspace.manage', name: 'Manage Platform Workspace', module: 'platform', resource: 'workspace', action: 'manage' },
  // Tenant (config)
  { code: 'tenant.config.read', name: 'Read Tenant Config', module: 'platform', resource: 'tenant-config', action: 'read' },
  { code: 'tenant.config.write', name: 'Write Tenant Config', module: 'platform', resource: 'tenant-config', action: 'write' },
  { code: 'tenant.config.manage', name: 'Manage Tenant Config', module: 'platform', resource: 'tenant-config', action: 'manage' },
  // Onboarding (admin)
  { code: 'onboarding.admin', name: 'Onboarding Admin', module: 'onboarding', resource: 'module', action: 'admin' },
  // Dashboard
  { code: 'dashboard.record.read', name: 'Read Dashboard Records', module: 'analytics', resource: 'dashboard-record', action: 'read' },
  { code: 'dashboard.record.write', name: 'Write Dashboard Records', module: 'analytics', resource: 'dashboard-record', action: 'write' },
  { code: 'dashboard.record.approve', name: 'Approve Dashboard Records', module: 'analytics', resource: 'dashboard-record', action: 'approve' },
  { code: 'dashboard.record.delete', name: 'Delete Dashboard Records', module: 'analytics', resource: 'dashboard-record', action: 'delete' },
  { code: 'dashboard.manage', name: 'Manage Dashboards', module: 'analytics', resource: 'dashboard', action: 'manage' },
  // Navigation
  { code: 'navigation.record.read', name: 'Read Navigation Records', module: 'admin', resource: 'navigation', action: 'read' },
  { code: 'navigation.record.write', name: 'Write Navigation Records', module: 'admin', resource: 'navigation', action: 'write' },
  { code: 'navigation.record.approve', name: 'Approve Navigation Records', module: 'admin', resource: 'navigation', action: 'approve' },
  { code: 'navigation.record.delete', name: 'Delete Navigation Records', module: 'admin', resource: 'navigation', action: 'delete' },
  { code: 'navigation.manage', name: 'Manage Navigation', module: 'admin', resource: 'navigation', action: 'manage' },
  // Widgets
  { code: 'widgets.record.read', name: 'Read Widget Records', module: 'analytics', resource: 'widget', action: 'read' },
  { code: 'widgets.record.write', name: 'Write Widget Records', module: 'analytics', resource: 'widget', action: 'write' },
  { code: 'widgets.record.approve', name: 'Approve Widget Records', module: 'analytics', resource: 'widget', action: 'approve' },
  { code: 'widgets.record.delete', name: 'Delete Widget Records', module: 'analytics', resource: 'widget', action: 'delete' },
  { code: 'widgets.manage', name: 'Manage Widgets', module: 'analytics', resource: 'widget', action: 'manage' },
  // Inbox
  { code: 'inbox.item.read', name: 'Read Inbox Items', module: 'notification', resource: 'inbox', action: 'read' },
  { code: 'inbox.item.write', name: 'Write Inbox Items', module: 'notification', resource: 'inbox', action: 'write' },
  { code: 'inbox.item.delete', name: 'Delete Inbox Items', module: 'notification', resource: 'inbox', action: 'delete' },
  { code: 'inbox.item.bulk', name: 'Bulk Inbox Actions', module: 'notification', resource: 'inbox', action: 'bulk' },
  { code: 'inbox.item.configure', name: 'Configure Inbox', module: 'notification', resource: 'inbox', action: 'configure' },
  { code: 'inbox.record.read', name: 'Read Inbox Records', module: 'notification', resource: 'inbox-record', action: 'read' },
  // Portals
  { code: 'portals.record.read', name: 'Read Portal Records', module: 'platform', resource: 'portal', action: 'read' },
  { code: 'portals.record.write', name: 'Write Portal Records', module: 'platform', resource: 'portal', action: 'write' },
  { code: 'portals.record.approve', name: 'Approve Portal Records', module: 'platform', resource: 'portal', action: 'approve' },
  { code: 'portals.record.delete', name: 'Delete Portal Records', module: 'platform', resource: 'portal', action: 'delete' },
  { code: 'portals.record.bulk', name: 'Bulk Portal Actions', module: 'platform', resource: 'portal', action: 'bulk' },
  { code: 'portals.record.configure', name: 'Configure Portals', module: 'platform', resource: 'portal', action: 'configure' },
  // Records (generic)
  { code: 'records.record.read', name: 'Read Records', module: 'platform', resource: 'records', action: 'read' },
  { code: 'records.record.write', name: 'Write Records', module: 'platform', resource: 'records', action: 'write' },
  { code: 'records.record.approve', name: 'Approve Records', module: 'platform', resource: 'records', action: 'approve' },
  { code: 'records.record.delete', name: 'Delete Records', module: 'platform', resource: 'records', action: 'delete' },
  { code: 'records.record.bulk', name: 'Bulk Record Actions', module: 'platform', resource: 'records', action: 'bulk' },
  { code: 'records.record.configure', name: 'Configure Records', module: 'platform', resource: 'records', action: 'configure' },
  // Issues
  { code: 'issues.record.read', name: 'Read Issues', module: 'governance', resource: 'issue', action: 'read' },
  { code: 'issues.record.write', name: 'Write Issues', module: 'governance', resource: 'issue', action: 'write' },
  { code: 'issues.record.approve', name: 'Approve Issues', module: 'governance', resource: 'issue', action: 'approve' },
  { code: 'issues.record.delete', name: 'Delete Issues', module: 'governance', resource: 'issue', action: 'delete' },
  { code: 'issues.record.bulk', name: 'Bulk Issue Actions', module: 'governance', resource: 'issue', action: 'bulk' },
  { code: 'issues.record.configure', name: 'Configure Issues', module: 'governance', resource: 'issue', action: 'configure' },
  // Bootstrap/Provisioning
  { code: 'bootstrap.record.read', name: 'Read Bootstrap Records', module: 'platform', resource: 'bootstrap', action: 'read' },
  { code: 'bootstrap.record.write', name: 'Write Bootstrap Records', module: 'platform', resource: 'bootstrap', action: 'write' },
  { code: 'bootstrap.manage', name: 'Manage Bootstrap', module: 'platform', resource: 'bootstrap', action: 'manage' },
  { code: 'provisioning.record.read', name: 'Read Provisioning Records', module: 'platform', resource: 'provisioning', action: 'read' },
  { code: 'provisioning.record.write', name: 'Write Provisioning Records', module: 'platform', resource: 'provisioning', action: 'write' },
  { code: 'provisioning.record.approve', name: 'Approve Provisioning', module: 'platform', resource: 'provisioning', action: 'approve' },
  { code: 'provisioning.manage', name: 'Manage Provisioning', module: 'platform', resource: 'provisioning', action: 'manage' },
  // Journey (onboarding)
  { code: 'journey.record.read', name: 'Read Journey Records', module: 'onboarding', resource: 'journey', action: 'read' },
  { code: 'journey.record.write', name: 'Write Journey Records', module: 'onboarding', resource: 'journey', action: 'write' },
  { code: 'journey.record.delete', name: 'Delete Journey Records', module: 'onboarding', resource: 'journey', action: 'delete' },
  // Packs
  { code: 'packs.record.read', name: 'Read Pack Records', module: 'admin', resource: 'pack', action: 'read' },
  { code: 'packs.pack.manage', name: 'Manage Packs', module: 'admin', resource: 'pack', action: 'manage' },
  { code: 'packs.policy.read', name: 'Read Pack Policies', module: 'admin', resource: 'pack-policy', action: 'read' },
  { code: 'packs.policy.manage', name: 'Manage Pack Policies', module: 'admin', resource: 'pack-policy', action: 'manage' },
  { code: 'packs.manage', name: 'Manage Packs Module', module: 'admin', resource: 'pack-module', action: 'manage' },
  // DORA
  { code: 'dora.record.read', name: 'Read DORA Records', module: 'compliance', resource: 'dora', action: 'read' },
  { code: 'dora.record.write', name: 'Write DORA Records', module: 'compliance', resource: 'dora', action: 'write' },
  { code: 'dora.record.delete', name: 'Delete DORA Records', module: 'compliance', resource: 'dora', action: 'delete' },
  // Qiyas
  { code: 'qiyas.record.read', name: 'Read Qiyas Records', module: 'compliance', resource: 'qiyas', action: 'read' },
  { code: 'qiyas.assessment.read', name: 'Read Qiyas Assessments', module: 'compliance', resource: 'qiyas-assessment', action: 'read' },
  { code: 'qiyas.assessment.configure', name: 'Configure Qiyas', module: 'compliance', resource: 'qiyas-assessment', action: 'configure' },
  // Governance AI
  { code: 'governance_ai.record.read', name: 'Read Governance AI Records', module: 'ai', resource: 'gov-ai-record', action: 'read' },
  { code: 'governance_ai.record.write', name: 'Write Governance AI Records', module: 'ai', resource: 'gov-ai-record', action: 'write' },
  { code: 'governance_ai.manage', name: 'Manage Governance AI', module: 'ai', resource: 'gov-ai', action: 'manage' },
  { code: 'governance_ai.recommendation.read', name: 'Read AI Recommendations', module: 'ai', resource: 'recommendation', action: 'read' },
  { code: 'governance_ai.recommendation.execute', name: 'Execute AI Recommendations', module: 'ai', resource: 'recommendation', action: 'execute' },
  { code: 'governance_ai.recommendation.approve', name: 'Approve AI Recommendations', module: 'ai', resource: 'recommendation', action: 'approve' },
  { code: 'governance_ai.pipeline.read', name: 'Read AI Pipeline', module: 'ai', resource: 'pipeline', action: 'read' },
  { code: 'governance_ai.pipeline.execute', name: 'Execute AI Pipeline', module: 'ai', resource: 'pipeline', action: 'execute' },
  { code: 'governance_ai.signal.read', name: 'Read AI Signals', module: 'ai', resource: 'signal', action: 'read' },
  { code: 'governance_ai.signal.execute', name: 'Execute AI Signals', module: 'ai', resource: 'signal', action: 'execute' },
  { code: 'governance_ai.signal.interpret', name: 'Interpret AI Signals', module: 'ai', resource: 'signal', action: 'interpret' },
  { code: 'governance_ai.health.read', name: 'Read AI Health', module: 'ai', resource: 'health', action: 'read' },
  { code: 'governance_ai.health.execute', name: 'Execute AI Health Check', module: 'ai', resource: 'health', action: 'execute' },
  { code: 'governance_ai.escalation.read', name: 'Read AI Escalations', module: 'ai', resource: 'escalation', action: 'read' },
  { code: 'governance_ai.escalation.execute', name: 'Execute AI Escalation', module: 'ai', resource: 'escalation', action: 'execute' },
  { code: 'governance_ai.compliance_score.read', name: 'Read AI Compliance Score', module: 'ai', resource: 'compliance-score', action: 'read' },
  { code: 'governance_ai.compliance_score.execute', name: 'Execute AI Compliance Score', module: 'ai', resource: 'compliance-score', action: 'execute' },
  // Governance OS
  { code: 'governance_os.admin.read', name: 'Read GOS Admin', module: 'governance', resource: 'os-admin', action: 'read' },
  { code: 'governance_os.admin.manage', name: 'Manage GOS Admin', module: 'governance', resource: 'os-admin', action: 'manage' },
  { code: 'governance_os.diagnostics.read', name: 'Read GOS Diagnostics', module: 'governance', resource: 'diagnostics', action: 'read' },
  { code: 'governance_os.framework.read', name: 'Read GOS Frameworks', module: 'governance', resource: 'os-framework', action: 'read' },
  { code: 'governance_os.framework.write', name: 'Write GOS Frameworks', module: 'governance', resource: 'os-framework', action: 'write' },
  { code: 'governance_os.framework.delete', name: 'Delete GOS Frameworks', module: 'governance', resource: 'os-framework', action: 'delete' },
  { code: 'governance_os.initiative.read', name: 'Read GOS Initiatives', module: 'governance', resource: 'initiative', action: 'read' },
  { code: 'governance_os.initiative.write', name: 'Write GOS Initiatives', module: 'governance', resource: 'initiative', action: 'write' },
  { code: 'governance_os.maturity.read', name: 'Read GOS Maturity', module: 'governance', resource: 'maturity', action: 'read' },
  { code: 'governance_os.maturity.write', name: 'Write GOS Maturity', module: 'governance', resource: 'maturity', action: 'write' },
  // KSA Regulatory
  { code: 'ksa_regulatory.intelligence.read', name: 'Read KSA Intelligence', module: 'compliance', resource: 'ksa-intelligence', action: 'read' },
  { code: 'ksa_regulatory.readiness.read', name: 'Read KSA Readiness', module: 'compliance', resource: 'ksa-readiness', action: 'read' },
  { code: 'ksa_regulatory.compliance_score.read', name: 'Read KSA Compliance Score', module: 'compliance', resource: 'ksa-score', action: 'read' },
  { code: 'ksa_regulatory.framework_mapping.read', name: 'Read KSA Framework Mapping', module: 'compliance', resource: 'ksa-mapping', action: 'read' },
  { code: 'ksa_regulatory.sector_maturity.read', name: 'Read KSA Sector Maturity', module: 'compliance', resource: 'ksa-maturity', action: 'read' },
  // Local Knowledge
  { code: 'local_knowledge.document.read', name: 'Read Local Knowledge Docs', module: 'knowledge', resource: 'local-doc', action: 'read' },
  { code: 'local_knowledge.document.create', name: 'Create Local Knowledge Docs', module: 'knowledge', resource: 'local-doc', action: 'create' },
  { code: 'local_knowledge.search.read', name: 'Search Local Knowledge', module: 'knowledge', resource: 'local-search', action: 'read' },
  { code: 'local_knowledge.source.read', name: 'Read Local Knowledge Sources', module: 'knowledge', resource: 'local-source', action: 'read' },
  { code: 'local_knowledge.source.create', name: 'Create Local Knowledge Sources', module: 'knowledge', resource: 'local-source', action: 'create' },
  // Proactive Leadership
  { code: 'proactive_leadership.config.read', name: 'Read PL Config', module: 'governance', resource: 'pl-config', action: 'read' },
  { code: 'proactive_leadership.config.update', name: 'Update PL Config', module: 'governance', resource: 'pl-config', action: 'update' },
  { code: 'proactive_leadership.evaluation.execute', name: 'Execute PL Evaluation', module: 'governance', resource: 'pl-evaluation', action: 'execute' },
  { code: 'proactive_leadership.insight.read', name: 'Read PL Insights', module: 'governance', resource: 'pl-insight', action: 'read' },
  // Route-level permissions — full deep audit (133 codes from route middleware)
  { code: 'action.manage', name: 'Manage Actions Module', module: 'action', resource: 'module', action: 'manage' },
  { code: 'admin.config.manage', name: 'Manage Admin Config', module: 'admin', resource: 'config', action: 'manage' },
  { code: 'admin.content-pack.read', name: 'Read Content Packs', module: 'admin', resource: 'content-pack', action: 'read' },
  { code: 'admin.content-pack.write', name: 'Write Content Packs', module: 'admin', resource: 'content-pack', action: 'write' },
  { code: 'admin.feature-table.write', name: 'Write Feature Tables', module: 'admin', resource: 'feature-table', action: 'write' },
  { code: 'admin.manage', name: 'Manage Admin Module', module: 'admin', resource: 'module', action: 'manage' },
  { code: 'admin.pack.write', name: 'Write Admin Packs', module: 'admin', resource: 'pack', action: 'write' },
  { code: 'admin.payment.write', name: 'Write Payments', module: 'admin', resource: 'payment', action: 'write' },
  { code: 'admin.platform.read', name: 'Read Platform Admin', module: 'admin', resource: 'platform', action: 'read' },
  { code: 'admin.platform.write', name: 'Write Platform Admin', module: 'admin', resource: 'platform', action: 'write' },
  { code: 'admin.system.shell', name: 'Admin System Shell', module: 'admin', resource: 'system', action: 'shell' },
  { code: 'admin.tenant.manage', name: 'Manage Tenant Admin', module: 'admin', resource: 'tenant', action: 'manage' },
  { code: 'agrc_engine.manage', name: 'Manage AGRC Engine', module: 'platform', resource: 'agrc-engine', action: 'manage' },
  { code: 'ai.agent.approve', name: 'Approve AI Agent', module: 'ai', resource: 'agent', action: 'approve' },
  { code: 'ai.agent.configure', name: 'Configure AI Agent', module: 'ai', resource: 'agent', action: 'configure' },
  { code: 'ai.agent.execute', name: 'Execute AI Agent', module: 'ai', resource: 'agent', action: 'execute' },
  { code: 'ai.agent.view', name: 'View AI Agent', module: 'ai', resource: 'agent', action: 'view' },
  { code: 'ai.agent.write', name: 'Write AI Agent', module: 'ai', resource: 'agent', action: 'write' },
  { code: 'ai.copilot.read', name: 'Read AI Copilot', module: 'ai', resource: 'copilot', action: 'read' },
  { code: 'ai.copilot.write', name: 'Write AI Copilot', module: 'ai', resource: 'copilot', action: 'write' },
  { code: 'ai.governance.approve', name: 'Approve AI Governance', module: 'ai', resource: 'governance', action: 'approve' },
  { code: 'ai.governance.configure', name: 'Configure AI Governance', module: 'ai', resource: 'governance', action: 'configure' },
  { code: 'ai.governance.write', name: 'Write AI Governance', module: 'ai', resource: 'governance', action: 'write' },
  { code: 'ai.personal-agent.approve', name: 'Approve Personal Agent', module: 'ai', resource: 'personal-agent', action: 'approve' },
  { code: 'ai.personal-agent.write', name: 'Write Personal Agent', module: 'ai', resource: 'personal-agent', action: 'write' },
  { code: 'ai.squad.read', name: 'Read AI Squad', module: 'ai', resource: 'squad', action: 'read' },
  { code: 'ai_governance.manage', name: 'Manage AI Governance Module', module: 'ai', resource: 'ai-gov-module', action: 'manage' },
  { code: 'ai_governance.read', name: 'Read AI Governance Module', module: 'ai', resource: 'ai-gov-module', action: 'read' },
  { code: 'analytics.manage', name: 'Manage Analytics Module', module: 'analytics', resource: 'module', action: 'manage' },
  { code: 'asset.manage', name: 'Manage Asset Module', module: 'asset', resource: 'module', action: 'manage' },
  { code: 'attestation.record.manage', name: 'Manage Attestations', module: 'compliance', resource: 'attestation', action: 'manage' },
  { code: 'attestation.record.read', name: 'Read Attestations', module: 'compliance', resource: 'attestation', action: 'read' },
  { code: 'attestation.record.write', name: 'Write Attestations', module: 'compliance', resource: 'attestation', action: 'write' },
  { code: 'audit.finding.read', name: 'Read Audit Findings', module: 'audit', resource: 'finding', action: 'read' },
  { code: 'audit.manage', name: 'Manage Audit Module', module: 'audit', resource: 'module', action: 'manage' },
  { code: 'audit.record.configure', name: 'Configure Audit Records', module: 'audit', resource: 'record', action: 'configure' },
  { code: 'bcp.manage', name: 'Manage BCP Module', module: 'bcp', resource: 'module', action: 'manage' },
  { code: 'ccm.record.read', name: 'Read CCM Records', module: 'compliance', resource: 'ccm', action: 'read' },
  { code: 'compliance.assessment.approve', name: 'Approve Compliance Assessments', module: 'compliance', resource: 'assessment', action: 'approve' },
  { code: 'compliance.assessment.read', name: 'Read Compliance Assessments', module: 'compliance', resource: 'assessment', action: 'read' },
  { code: 'compliance.assessment.write', name: 'Write Compliance Assessments', module: 'compliance', resource: 'assessment', action: 'write' },
  { code: 'compliance.dpia.write', name: 'Write DPIA', module: 'compliance', resource: 'dpia', action: 'write' },
  { code: 'compliance.manage', name: 'Manage Compliance Module', module: 'compliance', resource: 'module', action: 'manage' },
  { code: 'compliance.mapping.manage', name: 'Manage Compliance Mappings', module: 'compliance', resource: 'mapping', action: 'manage' },
  { code: 'compliance.mapping.view', name: 'View Compliance Mappings', module: 'compliance', resource: 'mapping', action: 'view' },
  { code: 'compliance.maturity.assess', name: 'Assess Compliance Maturity', module: 'compliance', resource: 'maturity', action: 'assess' },
  { code: 'compliance.maturity.view', name: 'View Compliance Maturity', module: 'compliance', resource: 'maturity', action: 'view' },
  { code: 'compliance.program.configure', name: 'Configure Compliance Programs', module: 'compliance', resource: 'program', action: 'configure' },
  { code: 'compliance.read', name: 'Read Compliance Module', module: 'compliance', resource: 'module', action: 'read' },
  { code: 'compliance.regulatory.manage', name: 'Manage Regulatory', module: 'compliance', resource: 'regulatory', action: 'manage' },
  { code: 'compliance.regulatory.view', name: 'View Regulatory', module: 'compliance', resource: 'regulatory', action: 'view' },
  { code: 'compliance.score.view', name: 'View Compliance Score', module: 'compliance', resource: 'score', action: 'view' },
  { code: 'controls.manage', name: 'Manage Controls Module', module: 'controls', resource: 'module', action: 'manage' },
  { code: 'controls.record.delete', name: 'Delete Controls Records', module: 'controls', resource: 'record', action: 'delete' },
  { code: 'controls.record.write', name: 'Write Controls Records', module: 'controls', resource: 'record', action: 'write' },
  { code: 'delegation.chain.manage', name: 'Manage Delegation Chains', module: 'dauth', resource: 'delegation-chain', action: 'manage' },
  { code: 'delegation.chain.read', name: 'Read Delegation Chains', module: 'dauth', resource: 'delegation-chain', action: 'read' },
  { code: 'delegation.chain.write', name: 'Write Delegation Chains', module: 'dauth', resource: 'delegation-chain', action: 'write' },
  { code: 'document.record.delete', name: 'Delete Documents', module: 'governance', resource: 'document', action: 'delete' },
  { code: 'document.record.read', name: 'Read Documents', module: 'governance', resource: 'document', action: 'read' },
  { code: 'document.record.write', name: 'Write Documents', module: 'governance', resource: 'document', action: 'write' },
  { code: 'dora.manage', name: 'Manage DORA Module', module: 'compliance', resource: 'dora-module', action: 'manage' },
  { code: 'event.log.read', name: 'Read Event Logs', module: 'platform', resource: 'event-log', action: 'read' },
  { code: 'evidence.item.admin', name: 'Admin Evidence', module: 'evidence', resource: 'item', action: 'admin' },
  { code: 'evidence.item.configure', name: 'Configure Evidence', module: 'evidence', resource: 'item', action: 'configure' },
  { code: 'evidence.manage', name: 'Manage Evidence Module', module: 'evidence', resource: 'module', action: 'manage' },
  { code: 'evidence.read', name: 'Read Evidence Module', module: 'evidence', resource: 'module', action: 'read' },
  { code: 'foundation.org.write', name: 'Write Foundation Org', module: 'foundation', resource: 'org', action: 'write' },
  { code: 'framework.record.write', name: 'Write Framework Records', module: 'framework', resource: 'record', action: 'write' },
  { code: 'gate.record.read', name: 'Read Gate Records', module: 'workflow', resource: 'gate', action: 'read' },
  { code: 'governance.manage', name: 'Manage Governance Module', module: 'governance', resource: 'module', action: 'manage' },
  { code: 'governance.read', name: 'Read Governance Module', module: 'governance', resource: 'module', action: 'read' },
  { code: 'governance.record.configure', name: 'Configure Governance Records', module: 'governance', resource: 'record', action: 'configure' },
  { code: 'governance.record.delete', name: 'Delete Governance Records', module: 'governance', resource: 'record', action: 'delete' },
  { code: 'inbox.manage', name: 'Manage Inbox Module', module: 'notification', resource: 'inbox-module', action: 'manage' },
  { code: 'incident.manage', name: 'Manage Incident Module', module: 'incident', resource: 'module', action: 'manage' },
  { code: 'integrations.connector.manage', name: 'Manage Integration Connectors', module: 'integrations', resource: 'connector', action: 'manage' },
  { code: 'integrations.manage', name: 'Manage Integrations Module', module: 'integrations', resource: 'module', action: 'manage' },
  { code: 'issues.manage', name: 'Manage Issues Module', module: 'governance', resource: 'issue-module', action: 'manage' },
  { code: 'knowledge.base.write', name: 'Write Knowledge Base', module: 'knowledge', resource: 'base', action: 'write' },
  { code: 'knowledge.graph.read', name: 'Read Knowledge Graph', module: 'knowledge', resource: 'graph', action: 'read' },
  { code: 'knowledge.graph.write', name: 'Write Knowledge Graph', module: 'knowledge', resource: 'graph', action: 'write' },
  { code: 'ksa_regulatory.manage', name: 'Manage KSA Regulatory', module: 'compliance', resource: 'ksa-module', action: 'manage' },
  { code: 'local_knowledge.manage', name: 'Manage Local Knowledge', module: 'knowledge', resource: 'local-module', action: 'manage' },
  { code: 'maturity.assessment.read', name: 'Read Maturity Assessments', module: 'compliance', resource: 'maturity-assessment', action: 'read' },
  { code: 'notification.manage', name: 'Manage Notification Module', module: 'notification', resource: 'module', action: 'manage' },
  { code: 'platform.agent.manage', name: 'Manage Platform Agents', module: 'platform', resource: 'agent', action: 'manage' },
  { code: 'platform.agent.write', name: 'Write Platform Agents', module: 'platform', resource: 'agent', action: 'write' },
  { code: 'policy.manage', name: 'Manage Policy Module', module: 'policy', resource: 'module', action: 'manage' },
  { code: 'portals.manage', name: 'Manage Portals Module', module: 'platform', resource: 'portal-module', action: 'manage' },
  { code: 'privacy.manage', name: 'Manage Privacy Module', module: 'privacy', resource: 'module', action: 'manage' },
  { code: 'proactive_leadership.manage', name: 'Manage Proactive Leadership', module: 'governance', resource: 'pl-module', action: 'manage' },
  { code: 'profile.record.write', name: 'Write Profile Records', module: 'profile', resource: 'record', action: 'write' },
  { code: 'qiyas.assessment.delete', name: 'Delete Qiyas Assessments', module: 'compliance', resource: 'qiyas-assessment', action: 'delete' },
  { code: 'qiyas.assessment.write', name: 'Write Qiyas Assessments', module: 'compliance', resource: 'qiyas-assessment', action: 'write' },
  { code: 'qiyas.manage', name: 'Manage Qiyas Module', module: 'compliance', resource: 'qiyas-module', action: 'manage' },
  { code: 'remediation.manage', name: 'Manage Remediation Module', module: 'remediation', resource: 'module', action: 'manage' },
  { code: 'report.document.download', name: 'Download Reports', module: 'report', resource: 'document', action: 'download' },
  { code: 'report.document.share', name: 'Share Reports', module: 'report', resource: 'document', action: 'share' },
  { code: 'reporting.cadence.read', name: 'Read Reporting Cadence', module: 'reporting', resource: 'cadence', action: 'read' },
  { code: 'reporting.cadence.write', name: 'Write Reporting Cadence', module: 'reporting', resource: 'cadence', action: 'write' },
  { code: 'reporting.manage', name: 'Manage Reporting Module', module: 'reporting', resource: 'module', action: 'manage' },
  { code: 'reporting.monitoring.delete', name: 'Delete Monitoring', module: 'reporting', resource: 'monitoring', action: 'delete' },
  { code: 'reporting.monitoring.read', name: 'Read Monitoring', module: 'reporting', resource: 'monitoring', action: 'read' },
  { code: 'reporting.monitoring.write', name: 'Write Monitoring', module: 'reporting', resource: 'monitoring', action: 'write' },
  { code: 'reporting.report.configure', name: 'Configure Reports', module: 'reporting', resource: 'report', action: 'configure' },
  { code: 'reporting.report.read', name: 'Read Reports', module: 'reporting', resource: 'report', action: 'read' },
  { code: 'reports.document.generate', name: 'Generate Report Docs', module: 'reporting', resource: 'report-doc', action: 'generate' },
  { code: 'reports.document.read', name: 'Read Report Docs', module: 'reporting', resource: 'report-doc', action: 'read' },
  { code: 'reports.document.sign', name: 'Sign Report Docs', module: 'reporting', resource: 'report-doc', action: 'sign' },
  { code: 'risk.manage', name: 'Manage Risk Module', module: 'risk', resource: 'module', action: 'manage' },
  { code: 'runbook.record.read', name: 'Read Runbook Records', module: 'workflow', resource: 'runbook', action: 'read' },
  { code: 'runbook.record.write', name: 'Write Runbook Records', module: 'workflow', resource: 'runbook', action: 'write' },
  { code: 'shell.ui.read', name: 'Read Shell UI', module: 'platform', resource: 'shell-ui', action: 'read' },
  { code: 'shell.ui.write', name: 'Write Shell UI', module: 'platform', resource: 'shell-ui', action: 'write' },
  { code: 'sop.document.read', name: 'Read SOPs', module: 'governance', resource: 'sop', action: 'read' },
  { code: 'sop.document.write', name: 'Write SOPs', module: 'governance', resource: 'sop', action: 'write' },
  { code: 'telemetry.data.write', name: 'Write Telemetry', module: 'platform', resource: 'telemetry', action: 'write' },
  { code: 'training.manage', name: 'Manage Training Module', module: 'training', resource: 'module', action: 'manage' },
  { code: 'vendor.manage', name: 'Manage Vendor Module', module: 'vendor', resource: 'module', action: 'manage' },
  { code: 'workflow.agent.execute', name: 'Execute Workflow Agent', module: 'workflow', resource: 'agent', action: 'execute' },
  { code: 'workflow.agent.manage', name: 'Manage Workflow Agent', module: 'workflow', resource: 'agent', action: 'manage' },
  { code: 'workflow.agent.read', name: 'Read Workflow Agent', module: 'workflow', resource: 'agent', action: 'read' },
  { code: 'workflow.approval.approve', name: 'Approve Workflow', module: 'workflow', resource: 'approval', action: 'approve' },
  { code: 'workflow.autonomous.config', name: 'Configure Autonomous Workflow', module: 'workflow', resource: 'autonomous', action: 'config' },
  { code: 'workflow.autonomous.read', name: 'Read Autonomous Workflow', module: 'workflow', resource: 'autonomous', action: 'read' },
  { code: 'workflow.autonomous.write', name: 'Write Autonomous Workflow', module: 'workflow', resource: 'autonomous', action: 'write' },
  { code: 'workflow.instance.configure', name: 'Configure Workflow Instance', module: 'workflow', resource: 'instance', action: 'configure' },
  { code: 'workflow.instance.execute', name: 'Execute Workflow Instance', module: 'workflow', resource: 'instance', action: 'execute' },
  { code: 'workflow.manage', name: 'Manage Workflow Module', module: 'workflow', resource: 'module', action: 'manage' },
  { code: 'workflow.policy.manage', name: 'Manage Workflow Policies', module: 'workflow', resource: 'policy', action: 'manage' },
  { code: 'workflow.policy.read', name: 'Read Workflow Policies', module: 'workflow', resource: 'policy', action: 'read' },
  { code: 'workflow.task.act', name: 'Act on Workflow Task', module: 'workflow', resource: 'task', action: 'act' },
  // Dot-format canonical equivalents (role mappings use these)
  { code: 'incident.write', name: 'Write Incidents', module: 'incident', resource: 'ticket', action: 'write' },
  { code: 'incident.delete', name: 'Delete Incidents', module: 'incident', resource: 'ticket', action: 'delete' },
  { code: 'controls.monitor', name: 'Monitor Controls', module: 'controls', resource: 'record', action: 'monitor' },
  { code: 'controls.test', name: 'Test Controls', module: 'controls', resource: 'record', action: 'test' },
  { code: 'controls.certify', name: 'Certify Controls', module: 'controls', resource: 'record', action: 'certify' },
  { code: 'controls.report', name: 'Report Controls', module: 'controls', resource: 'record', action: 'report' },
  { code: 'controls.admin', name: 'Admin Controls', module: 'controls', resource: 'record', action: 'admin' },
  { code: 'remediation.write', name: 'Write Remediation', module: 'remediation', resource: 'task', action: 'write' },
  { code: 'remediation.delete', name: 'Delete Remediation', module: 'remediation', resource: 'task', action: 'delete' },
  { code: 'exception.write', name: 'Write Exceptions', module: 'exception', resource: 'record', action: 'write' },
  { code: 'exception.approve', name: 'Approve Exceptions', module: 'exception', resource: 'record', action: 'approve' },
  { code: 'exception.bulk', name: 'Bulk Exceptions', module: 'exception', resource: 'record', action: 'bulk' },
  { code: 'compliance.delete', name: 'Delete Compliance', module: 'compliance', resource: 'record', action: 'delete' },
  { code: 'action.write', name: 'Write Actions', module: 'action', resource: 'item', action: 'write' },
  { code: 'action.bulk', name: 'Bulk Actions', module: 'action', resource: 'item', action: 'bulk' },
  { code: 'integrations.write', name: 'Write Integrations', module: 'integrations', resource: 'connector', action: 'write' },
  { code: 'risk.approve', name: 'Approve Risk', module: 'risk', resource: 'record', action: 'approve' },
  { code: 'platform.admin', name: 'Platform Admin', module: 'platform', resource: 'system', action: 'admin' },
  { code: 'access.read', name: 'Read Access', module: 'dauth', resource: 'access', action: 'read' },
  { code: 'access.manage', name: 'Manage Access', module: 'dauth', resource: 'access', action: 'manage' },
  { code: 'agent.read', name: 'Read Agents', module: 'ai', resource: 'agent', action: 'read' },
  { code: 'agent.manage', name: 'Manage Agents', module: 'ai', resource: 'agent', action: 'manage' },
  // Canonical dot-format codes (migrated from legacy colon-format)
  { code: 'incident.record.write', name: 'Write Incidents', module: 'incident', resource: 'record', action: 'write' },
  { code: 'incident.record.delete', name: 'Delete Incidents', module: 'incident', resource: 'record', action: 'delete' },
  { code: 'controls.record.monitor', name: 'Monitor Controls', module: 'controls', resource: 'record', action: 'monitor' },
  { code: 'controls.record.test', name: 'Test Controls', module: 'controls', resource: 'record', action: 'test' },
  { code: 'controls.record.certify', name: 'Certify Controls', module: 'controls', resource: 'record', action: 'certify' },
  { code: 'controls.record.report', name: 'Report Controls', module: 'controls', resource: 'record', action: 'report' },
  { code: 'controls.record.admin', name: 'Admin Controls', module: 'controls', resource: 'record', action: 'admin' },
  { code: 'remediation.record.write', name: 'Write Remediation', module: 'remediation', resource: 'record', action: 'write' },
  { code: 'remediation.record.delete', name: 'Delete Remediation', module: 'remediation', resource: 'record', action: 'delete' },
  { code: 'exception.record.write', name: 'Write Exceptions', module: 'exception', resource: 'record', action: 'write' },
  { code: 'exception.record.approve', name: 'Approve Exceptions', module: 'exception', resource: 'record', action: 'approve' },
  { code: 'exception.record.bulk', name: 'Bulk Exceptions', module: 'exception', resource: 'record', action: 'bulk' },
  { code: 'compliance.record.delete', name: 'Delete Compliance', module: 'compliance', resource: 'record', action: 'delete' },
  { code: 'action.record.write', name: 'Write Actions', module: 'action', resource: 'record', action: 'write' },
  { code: 'action.record.bulk', name: 'Bulk Actions', module: 'action', resource: 'record', action: 'bulk' },
  { code: 'evidence.item.manage', name: 'Manage Evidence', module: 'evidence', resource: 'item', action: 'manage' },
  { code: 'integrations.connector.write', name: 'Write Integrations', module: 'integrations', resource: 'connector', action: 'write' },
  { code: 'risk.record.approve', name: 'Approve Risk', module: 'risk', resource: 'record', action: 'approve' },
  { code: 'platform:admin', name: 'Platform Admin (legacy)', module: 'platform', resource: 'system', action: 'admin-legacy' },
  { code: 'access.profile.read', name: 'Read Access', module: 'dauth', resource: 'access', action: 'read' },
  { code: 'access.profile.manage', name: 'Manage Access', module: 'dauth', resource: 'access', action: 'manage' },
  { code: 'agent.record.read', name: 'Read Agents', module: 'ai', resource: 'agent', action: 'read' },
  { code: 'agent.record.manage', name: 'Manage Agents', module: 'ai', resource: 'agent', action: 'manage' },
  { code: 'risk.record.submit', name: 'Submit Risk Record', module: 'risk', resource: 'record', action: 'submit' },
  { code: 'risk.record.review', name: 'Review Risk Record', module: 'risk', resource: 'record', action: 'review' },
  { code: 'risk.record.approve', name: 'Approve Risk Record', module: 'risk', resource: 'record', action: 'approve' },
  { code: 'risk.record.close', name: 'Close Risk Record', module: 'risk', resource: 'record', action: 'close' },
  { code: 'risk.record.update', name: 'Update Risk Record', module: 'risk', resource: 'record', action: 'update' },
  { code: 'risk.treatment.assign', name: 'Assign Risk Treatment', module: 'risk', resource: 'treatment', action: 'assign' },
  { code: 'audit.engagement.create', name: 'Create Audit Engagement', module: 'audit', resource: 'engagement', action: 'create' },
  { code: 'audit.finding.close', name: 'Close Audit Finding', module: 'audit', resource: 'finding', action: 'close' },
  { code: 'audit.finding.issue', name: 'Issue Audit Finding', module: 'audit', resource: 'finding', action: 'issue' },
  { code: 'audit.finding.respond', name: 'Respond to Audit Finding', module: 'audit', resource: 'finding', action: 'respond' },
  { code: 'audit.report.approve', name: 'Approve Audit Report', module: 'audit', resource: 'report', action: 'approve' },
  { code: 'audit.report.create', name: 'Create Audit Report', module: 'audit', resource: 'report', action: 'create' },
  { code: 'audit.workpaper.update', name: 'Update Audit Workpaper', module: 'audit', resource: 'workpaper', action: 'update' },
  { code: 'policy.document.update', name: 'Update Policy Document', module: 'policy', resource: 'document', action: 'update' },
  { code: 'policy.document.review', name: 'Review Policy Document', module: 'policy', resource: 'document', action: 'review' },
  { code: 'policy.document.approve', name: 'Approve Policy Document', module: 'policy', resource: 'document', action: 'approve' },
  { code: 'policy.document.retire', name: 'Retire Policy Document', module: 'policy', resource: 'document', action: 'retire' },
  { code: 'compliance.control.update', name: 'Update Compliance Control', module: 'compliance', resource: 'control', action: 'update' },
  { code: 'compliance.obligation.approve', name: 'Approve Compliance Obligation', module: 'compliance', resource: 'obligation', action: 'approve' },
  { code: 'compliance.obligation.update', name: 'Update Compliance Obligation', module: 'compliance', resource: 'obligation', action: 'update' },
  { code: 'compliance.attestation.submit', name: 'Submit Compliance Attestation', module: 'compliance', resource: 'attestation', action: 'submit' },
  { code: 'compliance.attestation.review', name: 'Review Compliance Attestation', module: 'compliance', resource: 'attestation', action: 'review' },
  { code: 'compliance.attestation.manage', name: 'Manage Compliance Attestation', module: 'compliance', resource: 'attestation', action: 'manage' },
  { code: 'compliance.score.approve', name: 'Approve Compliance Score', module: 'compliance', resource: 'score', action: 'approve' },
  { code: 'compliance.score.review', name: 'Review Compliance Score', module: 'compliance', resource: 'score', action: 'review' },
  { code: 'compliance.test.execute', name: 'Execute Compliance Test', module: 'compliance', resource: 'test', action: 'execute' },
  { code: 'incident.record.update', name: 'Update Incident Record', module: 'incident', resource: 'record', action: 'update' },
  { code: 'incident.record.review', name: 'Review Incident Record', module: 'incident', resource: 'record', action: 'review' },
  { code: 'incident.record.approve', name: 'Approve Incident Record', module: 'incident', resource: 'record', action: 'approve' },
  { code: 'incident.record.escalate', name: 'Escalate Incident Record', module: 'incident', resource: 'record', action: 'escalate' },
  { code: 'vendor.record.create', name: 'Create Vendor Record', module: 'vendor', resource: 'record', action: 'create' },
  { code: 'vendor.assessment.execute', name: 'Execute Vendor Assessment', module: 'vendor', resource: 'assessment', action: 'execute' },
  { code: 'vendor.assessment.approve', name: 'Approve Vendor Assessment', module: 'vendor', resource: 'assessment', action: 'approve' },
  { code: 'evidence.item.upload', name: 'Upload Evidence Item', module: 'evidence', resource: 'item', action: 'upload' },
  { code: 'evidence.item.verify', name: 'Verify Evidence Item', module: 'evidence', resource: 'item', action: 'verify' },
  { code: 'evidence.item.lock', name: 'Lock Evidence Item', module: 'evidence', resource: 'item', action: 'lock' },
  { code: 'evidence.item.release', name: 'Release Evidence Item', module: 'evidence', resource: 'item', action: 'release' },
  { code: 'evidence.item.archive', name: 'Archive Evidence Item', module: 'evidence', resource: 'item', action: 'archive' },
  { code: 'governance.body.create', name: 'Create Governance Body', module: 'governance', resource: 'body', action: 'create' },
  { code: 'governance.charter.update', name: 'Update Governance Charter', module: 'governance', resource: 'charter', action: 'update' },
  { code: 'governance.meeting.manage', name: 'Manage Governance Meeting', module: 'governance', resource: 'meeting', action: 'manage' },
  { code: 'exception.request.create', name: 'Create Exception Request', module: 'exception', resource: 'request', action: 'create' },
  { code: 'exception.request.review', name: 'Review Exception Request', module: 'exception', resource: 'request', action: 'review' },
  { code: 'exception.request.approve', name: 'Approve Exception Request', module: 'exception', resource: 'request', action: 'approve' },
  { code: 'remediation.task.update', name: 'Update Remediation Task', module: 'remediation', resource: 'task', action: 'update' },
  { code: 'remediation.task.close', name: 'Close Remediation Task', module: 'remediation', resource: 'task', action: 'close' },
  { code: 'action.item.update', name: 'Update Action Item', module: 'action', resource: 'item', action: 'update' },
  { code: 'action.item.close', name: 'Close Action Item', module: 'action', resource: 'item', action: 'close' },
  { code: 'asset.record.update', name: 'Update Asset Record', module: 'asset', resource: 'record', action: 'update' },
  { code: 'asset.classification.review', name: 'Review Asset Classification', module: 'asset', resource: 'classification', action: 'review' },
  { code: 'bcp.plan.update', name: 'Update BCP Plan', module: 'bcp', resource: 'plan', action: 'update' },
  { code: 'bcp.exercise.approve', name: 'Approve BCP Exercise', module: 'bcp', resource: 'exercise', action: 'approve' },
  { code: 'training.program.manage', name: 'Manage Training Program', module: 'training', resource: 'program', action: 'manage' },
  // ── Track A: Route-referenced but previously unseeded (24 codes) ──
  { code: 'admin.config.read', name: 'Read Admin Config', module: 'admin', resource: 'config', action: 'read' },
  { code: 'admin.system.settings', name: 'Admin System Settings', module: 'admin', resource: 'system', action: 'settings' },
  { code: 'ai.contextual.read', name: 'Read AI Contextual', module: 'ai', resource: 'contextual', action: 'read' },
  { code: 'ai.contextual.write', name: 'Write AI Contextual', module: 'ai', resource: 'contextual', action: 'write' },
  { code: 'ai_squad.manage', name: 'Manage AI Squad', module: 'ai', resource: 'squad', action: 'manage' },
  { code: 'ai_squad.read', name: 'Read AI Squad (module)', module: 'ai', resource: 'squad', action: 'read' },
  { code: 'assessment.record.delete', name: 'Delete Assessment Records', module: 'assessment', resource: 'record', action: 'delete' },
  { code: 'assessment.record.write', name: 'Write Assessment Records', module: 'assessment', resource: 'record', action: 'write' },
  { code: 'control.record.delete', name: 'Delete Control Records', module: 'control', resource: 'record', action: 'delete' },
  { code: 'evidence.item.delete', name: 'Delete Evidence Items', module: 'evidence', resource: 'item', action: 'delete' },
  { code: 'evidence.item.manage', name: 'Manage Evidence Items', module: 'evidence', resource: 'item', action: 'manage' },
  { code: 'exception.record.write', name: 'Write Exception Records', module: 'exception', resource: 'record', action: 'write' },
  { code: 'obligation.write', name: 'Write Obligations', module: 'compliance', resource: 'obligation', action: 'write' },
  { code: 'platform.command_palette.read', name: 'Read Command Palette', module: 'platform', resource: 'command_palette', action: 'read' },
  { code: 'platform.entity_link.delete', name: 'Delete Entity Links', module: 'platform', resource: 'entity_link', action: 'delete' },
  { code: 'platform.entity_link.write', name: 'Write Entity Links', module: 'platform', resource: 'entity_link', action: 'write' },
  { code: 'platform.inline_edit.read', name: 'Read Inline Edit', module: 'platform', resource: 'inline_edit', action: 'read' },
  { code: 'platform.inline_edit.write', name: 'Write Inline Edit', module: 'platform', resource: 'inline_edit', action: 'write' },
  { code: 'platform.messaging.write', name: 'Write Platform Messaging', module: 'platform', resource: 'messaging', action: 'write' },
  { code: 'platform.search.read', name: 'Read Platform Search', module: 'platform', resource: 'search', action: 'read' },
  { code: 'security.config.read', name: 'Read Security Config', module: 'dauth', resource: 'security-config', action: 'read' },
  { code: 'security.config.write', name: 'Write Security Config', module: 'dauth', resource: 'security-config', action: 'write' },
  { code: 'workflow.approve', name: 'Approve Workflow', module: 'workflow', resource: 'instance', action: 'approve' },
  { code: 'workflow.delete', name: 'Delete Workflow', module: 'workflow', resource: 'instance', action: 'delete' },
  // ── Track A: Lifecycle transition permissions (8 codes) ──
  { code: 'bootstrap.record.approve', name: 'Approve Bootstrap Record', module: 'platform', resource: 'bootstrap', action: 'approve' },
  { code: 'compliance.assessment.finalize', name: 'Finalize Compliance Assessment', module: 'compliance', resource: 'assessment', action: 'finalize' },
  { code: 'compliance.framework.approve', name: 'Approve Compliance Framework', module: 'compliance', resource: 'framework', action: 'approve' },
  { code: 'compliance.framework.suspend', name: 'Suspend Compliance Framework', module: 'compliance', resource: 'framework', action: 'suspend' },
  { code: 'compliance.obligation.waive', name: 'Waive Compliance Obligation', module: 'compliance', resource: 'obligation', action: 'waive' },
  { code: 'dora.record.approve', name: 'Approve DORA Record', module: 'compliance', resource: 'dora', action: 'approve' },
  { code: 'evidence.collection.complete', name: 'Complete Evidence Collection', module: 'evidence', resource: 'collection', action: 'complete' },
  { code: 'evidence.collection.manage', name: 'Manage Evidence Collection', module: 'evidence', resource: 'collection', action: 'manage' },
];

// ── Role → Permission mappings ─────────────────────────────────────

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  platform_super_admin: CANONICAL_PERMISSIONS.map(p => p.code),
  tenant_admin: [
    'platform.tenant.read', 'platform.tenant.update',
    'platform.user.create', 'platform.user.read', 'platform.user.update', 'platform.user.delete',
    'platform.role.manage', 'platform.permission.manage',
    'platform.settings.read', 'platform.settings.update',
    'platform.audit.read', 'platform.module.enable', 'platform.module.disable',
    'platform.agent.read', 'platform.subscription.read', 'platform.subscription.manage',
    'platform.workspace.read', 'platform.workspace.manage',
    'dauth.delegation.create', 'dauth.delegation.revoke',
    'dauth.sod.manage', 'dauth.access_profile.manage',
    'onboarding.record.read', 'onboarding.record.write', 'onboarding.manage', 'onboarding.admin',
    'reporting.dashboard.read', 'reporting.report.generate', 'reporting.record.read',
    'workspace.config.read', 'workspace.config.write',
    'profile.record.read',
    'admin.system.read', 'admin.system.write', 'admin.system.configure', 'admin.system.manage',
    'admin.record.read', 'admin.field-rbac.read', 'admin.field-rbac.write',
    'admin.security-config.read', 'admin.security-config.write',
    'users.account.manage',
    'analytics.report.read', 'analytics.report.write', 'analytics.report.configure', 'analytics.record.read',
    'control.record.read', 'control.record.write',
    'assessment.record.read', 'assessment.record.manage',
    'framework.record.read', 'framework.record.manage',
    'risk.record.read', 'risk.record.write', 'risk.record.configure', 'risk.record.delete',
    'audit.record.read', 'audit.record.manage',
    'evidence.item.read', 'evidence.item.write', 'evidence.record.read',
    'compliance.program.read', 'compliance.program.manage', 'compliance.program.write', 'compliance.record.read',
    'compliance.control.approve',
    'incident.record.read', 'incident.record.write', 'incident.record.configure',
    'vendor.record.read', 'vendor.record.write', 'vendor.record.configure', 'vendor.record.manage',
    'privacy.record.read', 'privacy.record.write', 'privacy.record.configure',
    'copilot.assistant.read',
    'ai.agent.read', 'ai.agent.manage', 'ai.record.read', 'ai-governance.record.read',
    'knowledge.base.read',
    'integrations.connector.read', 'integrations.connector.write', 'integrations.connector.configure', 'integrations.record.read',
    'report.document.read', 'report.document.write',
    'timeline.event.read',
    'task.item.read', 'action.item.read', 'action.item.configure', 'action.record.read',
    'exception.record.read', 'exception.record.configure', 'remediation.task.read', 'remediation.record.read',
    'messaging.channel.read',
    'workflow.instance.read', 'workflow.instance.write', 'workflow.record.read', 'workflow.approval.read', 'workflow.task.read',
    'governance.record.read', 'governance.record.manage', 'governance.record.write',
    'foundation.org.read', 'foundation.org.manage',
    'foundation.record.read', 'foundation.record.write', 'foundation.record.approve', 'foundation.record.delete', 'foundation.manage',
    'asset.record.read', 'asset.record.manage', 'asset.record.write',
    'position.record.read',
    'team.member.read', 'team.member.manage', 'team.record.read', 'team.record.write', 'team.manage',
    'ai.governance.read',
    'training.record.read', 'training.record.manage', 'training.record.write', 'training.record.configure',
    'bcp.plan.read', 'bcp.plan.manage', 'bcp.plan.write', 'bcp.plan.configure', 'bcp.record.read',
    'tenant.config.read', 'tenant.config.write', 'tenant.config.manage',
    'notification.config.read', 'notification.config.write', 'notification.record.read',
    'inbox.item.read', 'inbox.item.write', 'inbox.record.read',
    'dashboard.record.read', 'dashboard.record.write', 'dashboard.manage',
    'navigation.record.read', 'navigation.record.write', 'navigation.manage',
    'widgets.record.read', 'widgets.record.write', 'widgets.manage',
    'portals.record.read', 'portals.record.write',
    'records.record.read', 'records.record.write',
    'issues.record.read', 'issues.record.write',
    'bootstrap.record.read', 'bootstrap.manage',
    'provisioning.record.read', 'provisioning.manage',
    'journey.record.read', 'journey.record.write',
    'packs.record.read', 'packs.pack.manage', 'packs.manage',
    'dora.record.read', 'dora.record.write',
    'qiyas.record.read', 'qiyas.assessment.read',
    'governance_ai.record.read', 'governance_ai.manage',
    'governance_os.admin.read', 'governance_os.admin.manage', 'governance_os.framework.read',
    'ksa_regulatory.intelligence.read', 'ksa_regulatory.readiness.read',
    'local_knowledge.document.read', 'local_knowledge.search.read', 'local_knowledge.source.read',
    'proactive_leadership.config.read', 'proactive_leadership.insight.read',
    'controls.record.read', 'controls.record.write', 'controls.record.delete', 'controls.manage',
    'incident.write', 'controls.monitor', 'controls.admin',
    'remediation.write', 'exception.write', 'action.write',
    'risk.approve', 'platform.admin',
    'access.read', 'access.manage', 'agent.read', 'agent.manage',
    'action.manage', 'admin.config.manage', 'admin.content-pack.read', 'admin.content-pack.write',
    'admin.feature-table.write', 'admin.manage', 'admin.pack.write', 'admin.payment.write',
    'admin.platform.read', 'admin.platform.write', 'admin.system.shell', 'admin.tenant.manage',
    'agrc_engine.manage', 'analytics.manage', 'asset.manage',
    'ai.agent.approve', 'ai.agent.configure', 'ai.agent.execute', 'ai.agent.view', 'ai.agent.write',
    'ai.copilot.read', 'ai.copilot.write', 'ai.governance.approve', 'ai.governance.configure', 'ai.governance.write',
    'ai.personal-agent.approve', 'ai.personal-agent.write', 'ai.squad.read',
    'ai_governance.manage', 'ai_governance.read',
    'attestation.record.manage', 'attestation.record.read', 'attestation.record.write',
    'audit.finding.read', 'audit.manage', 'audit.record.configure',
    'bcp.manage', 'ccm.record.read',
    'compliance.assessment.approve', 'compliance.assessment.read', 'compliance.assessment.write',
    'compliance.dpia.write', 'compliance.manage', 'compliance.mapping.manage', 'compliance.mapping.view',
    'compliance.maturity.assess', 'compliance.maturity.view', 'compliance.program.configure',
    'compliance.read', 'compliance.regulatory.manage', 'compliance.regulatory.view', 'compliance.score.view',
    'delegation.chain.manage', 'delegation.chain.read', 'delegation.chain.write',
    'document.record.delete', 'document.record.read', 'document.record.write',
    'dora.manage', 'dora.record.delete', 'event.log.read',
    'evidence.item.admin', 'evidence.item.configure', 'evidence.manage', 'evidence.read',
    'foundation.org.write', 'framework.record.write', 'gate.record.read',
    'governance.manage', 'governance.read', 'governance.record.configure', 'governance.record.delete',
    'inbox.manage', 'incident.manage', 'integrations.connector.manage', 'integrations.manage',
    'issues.manage', 'knowledge.base.write', 'knowledge.graph.read', 'knowledge.graph.write',
    'ksa_regulatory.manage', 'local_knowledge.manage',
    'maturity.assessment.read', 'notification.manage',
    'platform.agent.manage', 'platform.agent.write',
    'policy.manage', 'portals.manage', 'privacy.manage', 'proactive_leadership.manage',
    'profile.record.write',
    'qiyas.assessment.delete', 'qiyas.assessment.write', 'qiyas.manage',
    'remediation.manage',
    'report.document.download', 'report.document.share',
    'reporting.cadence.read', 'reporting.cadence.write', 'reporting.manage',
    'reporting.monitoring.delete', 'reporting.monitoring.read', 'reporting.monitoring.write',
    'reporting.report.configure', 'reporting.report.read',
    'reports.document.generate', 'reports.document.read', 'reports.document.sign',
    'risk.manage',
    'risk.record.submit', 'risk.record.review', 'risk.record.approve', 'risk.record.close', 'risk.record.update', 'risk.treatment.assign',
    'audit.engagement.create', 'audit.finding.close', 'audit.finding.issue', 'audit.finding.respond',
    'audit.report.approve', 'audit.report.create', 'audit.workpaper.update',
    'policy.document.update', 'policy.document.review', 'policy.document.approve', 'policy.document.retire',
    'compliance.control.update', 'compliance.obligation.approve', 'compliance.obligation.update',
    'compliance.attestation.submit', 'compliance.attestation.review', 'compliance.attestation.manage',
    'compliance.score.approve', 'compliance.score.review', 'compliance.test.execute',
    'incident.record.update', 'incident.record.review', 'incident.record.approve', 'incident.record.escalate',
    'vendor.record.create', 'vendor.assessment.execute', 'vendor.assessment.approve',
    'evidence.item.upload', 'evidence.item.verify', 'evidence.item.lock', 'evidence.item.release', 'evidence.item.archive',
    'governance.body.create', 'governance.charter.update', 'governance.meeting.manage',
    'exception.request.create', 'exception.request.review', 'exception.request.approve',
    'remediation.task.update', 'remediation.task.close',
    'action.item.update', 'action.item.close',
    'asset.record.update', 'asset.classification.review',
    'bcp.plan.update', 'bcp.exercise.approve',
    'training.program.manage',
    'runbook.record.read', 'runbook.record.write',
    'shell.ui.read', 'shell.ui.write',
    'sop.document.read', 'sop.document.write',
    'telemetry.data.write', 'training.manage', 'vendor.manage',
    'workflow.agent.execute', 'workflow.agent.manage', 'workflow.agent.read',
    'workflow.approval.approve', 'workflow.autonomous.config', 'workflow.autonomous.read', 'workflow.autonomous.write',
    'workflow.instance.configure', 'workflow.instance.execute', 'workflow.manage',
    'workflow.policy.manage', 'workflow.policy.read', 'workflow.task.act',
    'admin.config.read', 'admin.system.settings',
    'ai.contextual.read', 'ai.contextual.write',
    'ai_squad.manage', 'ai_squad.read',
    'assessment.record.delete', 'assessment.record.write',
    'control.record.delete',
    'evidence.item.delete', 'evidence.item.manage',
    'exception.record.write',
    'obligation.write',
    'platform.command_palette.read',
    'platform.entity_link.delete', 'platform.entity_link.write',
    'platform.inline_edit.read', 'platform.inline_edit.write',
    'platform.messaging.write', 'platform.search.read',
    'security.config.read', 'security.config.write',
    'workflow.approve', 'workflow.delete',
    'bootstrap.record.approve',
    'compliance.assessment.finalize', 'compliance.framework.approve', 'compliance.framework.suspend',
    'compliance.obligation.waive',
    'dora.record.approve',
    'evidence.collection.complete', 'evidence.collection.manage',
  ],
  security_admin: [
    'platform.user.read', 'platform.role.manage', 'platform.permission.manage',
    'platform.audit.read', 'platform.settings.read',
    'dauth.delegation.create', 'dauth.delegation.revoke',
    'dauth.sod.manage', 'dauth.access_profile.manage',
    'workspace.config.read', 'profile.record.read',
    'admin.system.read', 'admin.field-rbac.read', 'admin.field-rbac.write',
    'admin.security-config.read', 'admin.security-config.write',
    'analytics.report.read', 'report.document.read',
    'timeline.event.read',
    'notification.config.read', 'notification.config.write',
    'access.read', 'access.manage',
    'security.config.read', 'security.config.write',
    'admin.config.read',
  ],
  compliance_officer: [
    'compliance.control.read', 'compliance.control.manage', 'compliance.control.approve',
    'compliance.evidence.submit', 'compliance.evidence.review',
    'compliance.program.read', 'compliance.program.manage', 'compliance.program.write', 'compliance.record.read',
    'reporting.dashboard.read',
    'workspace.config.read', 'profile.record.read',
    'control.record.read', 'controls.record.read', 'assessment.record.read', 'framework.record.read',
    'evidence.item.read', 'evidence.record.read',
    'analytics.report.read', 'report.document.read',
    'risk.record.read', 'audit.record.read', 'policy.document.read', 'policy.record.read',
    'task.item.read', 'action.item.read', 'timeline.event.read',
    'governance.record.read', 'foundation.org.read', 'foundation.record.read', 'asset.record.read',
    'position.record.read', 'team.member.read', 'training.record.read',
    'dora.record.read', 'qiyas.record.read', 'qiyas.assessment.read',
    'ksa_regulatory.intelligence.read', 'ksa_regulatory.readiness.read', 'ksa_regulatory.compliance_score.read',
    'controls.monitor', 'controls.test', 'controls.report',
    'exception.record.read', 'remediation.task.read',
    'issues.record.read', 'inbox.item.read', 'inbox.record.read',
    'workflow.instance.read', 'workflow.record.read',
    'attestation.record.read', 'attestation.record.write', 'attestation.record.manage',
    'compliance.assessment.read', 'compliance.assessment.write', 'compliance.assessment.approve',
    'compliance.dpia.write', 'compliance.manage', 'compliance.mapping.manage', 'compliance.mapping.view',
    'compliance.maturity.assess', 'compliance.maturity.view', 'compliance.program.configure',
    'compliance.read', 'compliance.regulatory.manage', 'compliance.regulatory.view', 'compliance.score.view',
    'ccm.record.read', 'maturity.assessment.read',
    'controls.record.write', 'controls.manage',
    'evidence.item.configure', 'evidence.manage', 'evidence.read',
    'document.record.read',
    'compliance.control.update', 'compliance.obligation.approve', 'compliance.obligation.update',
    'compliance.attestation.submit', 'compliance.attestation.review', 'compliance.attestation.manage',
    'compliance.score.approve', 'compliance.score.review', 'compliance.test.execute',
    'evidence.item.upload', 'evidence.item.verify', 'evidence.item.lock', 'evidence.item.release',
    'evidence.item.delete', 'evidence.item.manage',
    'assessment.record.write', 'assessment.record.delete',
    'control.record.delete',
    'exception.record.write', 'obligation.write',
    'compliance.assessment.finalize', 'compliance.framework.approve', 'compliance.framework.suspend',
    'compliance.obligation.waive',
    'evidence.collection.complete', 'evidence.collection.manage',
    'platform.inline_edit.read', 'platform.search.read',
  ],
  risk_manager: [
    'risk.assessment.create', 'risk.assessment.approve',
    'risk.record.read', 'risk.record.write', 'risk.record.configure', 'risk.record.delete',
    'reporting.dashboard.read',
    'workspace.config.read', 'profile.record.read',
    'control.record.read', 'assessment.record.read', 'framework.record.read',
    'analytics.report.read', 'report.document.read',
    'task.item.read', 'action.item.read', 'timeline.event.read',
    'governance.record.read', 'foundation.org.read', 'foundation.record.read', 'asset.record.read',
    'bcp.plan.read', 'bcp.record.read', 'vendor.record.read', 'incident.record.read',
    'risk.approve', 'exception.record.read', 'remediation.task.read',
    'issues.record.read', 'workflow.instance.read',
    'risk.manage', 'compliance.assessment.read', 'compliance.score.view',
    'document.record.read', 'evidence.read',
    'risk.record.submit', 'risk.record.review', 'risk.record.approve', 'risk.record.close', 'risk.record.update', 'risk.treatment.assign',
  ],
  auditor: [
    'audit.finding.create', 'audit.finding.resolve',
    'audit.record.read', 'audit.record.manage',
    'compliance.control.read', 'compliance.evidence.review',
    'compliance.program.read', 'compliance.record.read',
    'reporting.dashboard.read',
    'workspace.config.read', 'profile.record.read',
    'control.record.read', 'controls.record.read', 'assessment.record.read', 'framework.record.read',
    'evidence.item.read', 'evidence.record.read',
    'risk.record.read', 'policy.document.read', 'policy.record.read',
    'analytics.report.read', 'report.document.read',
    'task.item.read', 'action.item.read', 'timeline.event.read',
    'governance.record.read', 'foundation.org.read', 'foundation.record.read', 'asset.record.read',
    'issues.record.read', 'workflow.instance.read',
    'audit.finding.read', 'audit.manage', 'audit.record.configure',
    'attestation.record.read', 'compliance.assessment.read', 'compliance.read',
    'document.record.read', 'evidence.read', 'evidence.item.configure',
    'audit.engagement.create', 'audit.finding.close', 'audit.finding.issue', 'audit.finding.respond',
    'audit.report.approve', 'audit.report.create', 'audit.workpaper.update',
    'evidence.item.upload', 'evidence.item.verify',
  ],
  policy_owner: [
    'policy.document.read', 'policy.document.manage', 'policy.document.publish',
    'policy.document.write', 'policy.document.configure', 'policy.document.delete',
    'policy.record.read', 'policy.record.approve',
    'reporting.dashboard.read',
    'workspace.config.read', 'profile.record.read',
    'framework.record.read', 'control.record.read',
    'analytics.report.read', 'report.document.read',
    'task.item.read', 'timeline.event.read',
    'governance.record.read', 'foundation.org.read', 'foundation.record.read',
    'workflow.instance.read',
    'policy.manage', 'document.record.read', 'document.record.write', 'sop.document.read', 'sop.document.write',
    'policy.document.update', 'policy.document.review', 'policy.document.approve', 'policy.document.retire',
  ],
  incident_manager: [
    'incident.record.read', 'incident.record.write', 'incident.record.configure',
    'reporting.dashboard.read',
    'workspace.config.read', 'profile.record.read',
    'analytics.report.read', 'report.document.read',
    'task.item.read', 'action.item.read', 'timeline.event.read',
    'governance.record.read', 'bcp.plan.read', 'bcp.record.read', 'asset.record.read',
    'incident.write', 'incident.delete',
    'workflow.instance.read',
    'incident.manage', 'runbook.record.read',
    'incident.record.update', 'incident.record.review', 'incident.record.approve', 'incident.record.escalate',
  ],
  vendor_manager: [
    'vendor.assessment.create',
    'vendor.record.read', 'vendor.record.write', 'vendor.record.configure', 'vendor.record.manage',
    'reporting.dashboard.read',
    'workspace.config.read', 'profile.record.read',
    'analytics.report.read', 'report.document.read',
    'task.item.read', 'timeline.event.read',
    'governance.record.read', 'asset.record.read',
    'workflow.instance.read',
    'vendor.manage',
    'vendor.record.create', 'vendor.assessment.execute', 'vendor.assessment.approve',
  ],
  standard_user: [
    'platform.user.read', 'platform.settings.read',
    'compliance.control.read', 'compliance.program.read', 'compliance.record.read',
    'policy.document.read', 'policy.record.read',
    'workflow.definition.read', 'onboarding.record.read', 'onboarding.record.write',
    'reporting.dashboard.read',
    'workspace.config.read', 'profile.record.read',
    'control.record.read', 'controls.record.read', 'assessment.record.read', 'framework.record.read',
    'risk.record.read', 'audit.record.read', 'evidence.item.read', 'evidence.record.read',
    'incident.record.read', 'vendor.record.read',
    'privacy.record.read', 'copilot.assistant.read',
    'knowledge.base.read', 'analytics.report.read', 'analytics.record.read',
    'report.document.read', 'integrations.connector.read', 'integrations.record.read',
    'timeline.event.read', 'task.item.read', 'action.item.read', 'action.record.read',
    'exception.record.read', 'remediation.task.read', 'remediation.record.read',
    'messaging.channel.read',
    'workflow.instance.read', 'workflow.record.read', 'workflow.task.read',
    'governance.record.read', 'foundation.org.read', 'foundation.record.read', 'asset.record.read',
    'position.record.read', 'team.member.read', 'team.record.read',
    'ai.governance.read', 'ai.record.read',
    'training.record.read', 'bcp.plan.read', 'bcp.record.read',
    'notification.config.read', 'notification.record.read', 'inbox.item.read', 'inbox.record.read',
    'dashboard.record.read', 'widgets.record.read',
    'issues.record.read', 'records.record.read',
    'journey.record.read',
    'dora.record.read', 'qiyas.record.read',
    'governance_ai.record.read', 'governance_os.framework.read',
    'ksa_regulatory.intelligence.read',
    'local_knowledge.document.read', 'local_knowledge.search.read',
    'proactive_leadership.insight.read',
    'attestation.record.read', 'audit.finding.read', 'ccm.record.read',
    'compliance.assessment.read', 'compliance.mapping.view', 'compliance.maturity.view',
    'compliance.read', 'compliance.regulatory.view', 'compliance.score.view',
    'document.record.read', 'event.log.read', 'evidence.read',
    'gate.record.read', 'governance.read',
    'knowledge.graph.read', 'maturity.assessment.read',
    'reporting.cadence.read', 'reporting.monitoring.read', 'reporting.report.read',
    'reports.document.read', 'runbook.record.read',
    'shell.ui.read', 'sop.document.read',
    'ai.agent.view', 'ai.copilot.read', 'ai.squad.read', 'ai_governance.read',
    'delegation.chain.read', 'workflow.autonomous.read', 'workflow.policy.read', 'workflow.agent.read',
    'risk.record.submit', 'risk.record.update',
    'policy.document.update',
    'compliance.attestation.submit',
    'incident.record.update',
    'evidence.item.upload',
    'exception.request.create',
    'remediation.task.update',
    'action.item.update',
    'asset.record.update',
    'bcp.plan.update',
    'platform.command_palette.read', 'platform.search.read',
    'platform.inline_edit.read', 'platform.entity_link.write',
    'platform.messaging.write',
    'ai.contextual.read', 'ai_squad.read',
  ],
  viewer: [
    'platform.user.read', 'platform.settings.read',
    'compliance.control.read', 'compliance.program.read', 'compliance.record.read',
    'policy.document.read', 'policy.record.read',
    'workflow.definition.read', 'reporting.dashboard.read',
    'workspace.config.read', 'profile.record.read',
    'control.record.read', 'controls.record.read', 'assessment.record.read', 'framework.record.read',
    'risk.record.read', 'audit.record.read', 'evidence.item.read', 'evidence.record.read',
    'incident.record.read', 'vendor.record.read',
    'privacy.record.read', 'knowledge.base.read',
    'analytics.report.read', 'analytics.record.read', 'report.document.read',
    'integrations.connector.read', 'integrations.record.read',
    'timeline.event.read', 'task.item.read', 'action.item.read', 'action.record.read',
    'exception.record.read', 'remediation.task.read', 'remediation.record.read',
    'workflow.instance.read', 'workflow.record.read',
    'governance.record.read', 'foundation.org.read', 'foundation.record.read', 'asset.record.read',
    'position.record.read', 'team.member.read', 'team.record.read',
    'ai.governance.read', 'ai.record.read',
    'training.record.read', 'bcp.plan.read', 'bcp.record.read',
    'notification.config.read', 'notification.record.read', 'inbox.item.read', 'inbox.record.read',
    'dashboard.record.read', 'widgets.record.read',
    'issues.record.read', 'records.record.read',
    'dora.record.read', 'qiyas.record.read',
    'governance_ai.record.read', 'governance_os.framework.read',
    'ksa_regulatory.intelligence.read',
    'local_knowledge.document.read', 'local_knowledge.search.read',
    'proactive_leadership.insight.read',
    'attestation.record.read', 'audit.finding.read', 'ccm.record.read',
    'compliance.assessment.read', 'compliance.mapping.view', 'compliance.maturity.view',
    'compliance.read', 'compliance.regulatory.view', 'compliance.score.view',
    'document.record.read', 'event.log.read', 'evidence.read',
    'gate.record.read', 'governance.read',
    'knowledge.graph.read', 'maturity.assessment.read',
    'reporting.cadence.read', 'reporting.monitoring.read', 'reporting.report.read',
    'reports.document.read', 'runbook.record.read',
    'shell.ui.read', 'sop.document.read',
    'ai.agent.view', 'ai.copilot.read', 'ai.squad.read', 'ai_governance.read',
    'delegation.chain.read', 'workflow.autonomous.read', 'workflow.policy.read', 'workflow.agent.read',
    'platform.command_palette.read', 'platform.search.read', 'platform.inline_edit.read',
    'ai.contextual.read', 'ai_squad.read',
  ],
  workflow_admin: [
    'workflow.definition.read', 'workflow.definition.manage', 'workflow.instance.approve',
    'workflow.instance.read', 'workflow.instance.write', 'workflow.record.read', 'workflow.approval.read', 'workflow.task.read',
    'reporting.dashboard.read',
    'workspace.config.read', 'profile.record.read',
    'analytics.report.read', 'report.document.read',
    'task.item.read', 'timeline.event.read',
    'governance.record.read',
    'action.item.read', 'action.record.read',
    'workflow.agent.execute', 'workflow.agent.manage', 'workflow.agent.read',
    'workflow.approval.approve', 'workflow.autonomous.config', 'workflow.autonomous.read', 'workflow.autonomous.write',
    'workflow.instance.configure', 'workflow.instance.execute', 'workflow.manage',
    'workflow.policy.manage', 'workflow.policy.read', 'workflow.task.act',
    'gate.record.read', 'runbook.record.read', 'runbook.record.write',
    'workflow.approve', 'workflow.delete',
  ],
};

// ── Access profile definitions ─────────────────────────────────────

interface AccessProfileDef {
  code: string;
  name: string;
  description: string;
}

const DEFAULT_ACCESS_PROFILES: AccessProfileDef[] = [
  {
    code: 'platform_super_admin',
    name: 'Platform Super Admin Profile',
    description: 'Full platform access — all roles, all modules',
  },
  {
    code: 'tenant_admin',
    name: 'Tenant Admin Profile',
    description: 'Tenant administration — user management, module config, settings',
  },
  {
    code: 'standard_user',
    name: 'Standard User Profile',
    description: 'Default access — read-level access to assigned modules',
  },
  {
    code: 'viewer',
    name: 'Viewer Profile',
    description: 'Read-only access across enabled modules',
  },
];

// ── Seed entry point ───────────────────────────────────────────────

/**
 * Seeds the canonical RBAC data (roles, permissions, role→permission
 * mappings, and access profiles) into a tenant schema.
 *
 * Phase 7 Auth Consolidation: Seeds into BOTH authorization systems:
 *   - Legacy (030): roles, role_permission_map
 *   - Enterprise (163): functional_roles, permissions, role_permissions, access_profiles
 * The enterprise (163) system is PRIMARY. Legacy seeding is retained for
 * backward compatibility until full migration completes.
 *
 * Idempotent: uses ON CONFLICT DO NOTHING to avoid duplicates on re-run.
 */
export async function seedDynamicRbacData(tenantId: string): Promise<SeedResult> {
  const ts = tenantSchema(tenantId);
  let rolesSeeded = 0;
  let permissionsSeeded = 0;
  let mappingsSeeded = 0;

  const permModuleLookup = new Map<string, string>();
  for (const p of CANONICAL_PERMISSIONS) permModuleLookup.set(p.code, p.module);

  try {
    // ── 0. Heal tenant membership rows (Step 3 prerequisite) ──────────────────
    // If a user belongs to this tenant in public.users but lacks an active row
    // in public.tenant_user_memberships, every requirePermission route will 403
    // at DAuth Step 3 — even ALWAYS_ON modules — regardless of role/permission state.
    // This upsert is idempotent and runs on every restart to heal stale rows.
    const tenantUsers = await safeQuery(
      `SELECT user_id, role FROM public.users
       WHERE tenant_id = $1 AND status != 'deleted'`,
      [tenantId],
    );
    for (const row of tenantUsers.rows) {
      const memberRole = (row.role === 'owner' || row.role === 'admin') ? row.role : 'member';
      await safeQuery(
        `INSERT INTO public.tenant_user_memberships
           (tenant_id, user_id, role, membership_type, is_tenant_owner, status, is_primary)
         VALUES ($1, $2, $3, 'internal', $4, 'active', TRUE)
         ON CONFLICT (user_id, tenant_id) DO UPDATE SET
           status     = 'active',
           updated_at = NOW()
         WHERE tenant_user_memberships.status != 'active'`,
        [tenantId, row.user_id, memberRole, memberRole === 'owner'],
      );
    }
    if (tenantUsers.rows.length > 0) {
      logger.debug(`[DAuth] Membership heal: ${tenantUsers.rows.length} user(s) for tenant ${tenantId}`);
    }

    // ── 0b. Seed module entitlements if empty (Step 5 prerequisite) ───────
    // If the tenant schema's tenant_module_entitlements table has zero rows,
    // Step 5 of the decision engine will deny all non-ALWAYS_ON modules.
    // Seed all modules from CANONICAL_PERMISSIONS + GRC_CORE_MODULES.
    const entCheck = await safeQuery(
      `SELECT 1 FROM "${ts}".tenant_module_entitlements LIMIT 1`,
    );
    if (entCheck.rows.length === 0) {
      const allModules = new Set<string>();
      for (const p of CANONICAL_PERMISSIONS) allModules.add(p.module);
      // Add core platform modules that may not have explicit permissions but must be entitled
      for (const m of ['foundation', 'governance', 'notification', 'profile', 'onboarding',
        'dashboard', 'workflow', 'admin', 'navigation', 'inbox', 'widgets', 'team', 'portals',
        'knowledge', 'records', 'integrations', 'analytics', 'reporting']) {
        allModules.add(m);
      }
      let entSeeded = 0;
      for (const moduleCode of allModules) {
        await safeQuery(
          `INSERT INTO "${ts}".tenant_module_entitlements
             (module_code, is_active, activated_at)
           VALUES ($1, TRUE, NOW())
           ON CONFLICT (module_code) DO NOTHING`,
          [moduleCode],
        );
        entSeeded++;
      }
      logger.info(`[DAuth] Entitlement seed: ${entSeeded} modules for tenant ${tenantId} (table was empty)`);
    }

    for (const role of CANONICAL_ROLES) {
      const result = await safeQuery(
        `INSERT INTO "${ts}".roles (role_id, role_code, name_en, description_en, role_category, is_system, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'system', $5, true, NOW(), NOW())
         ON CONFLICT (role_code) DO NOTHING
         RETURNING role_id`,
        [uuid(), role.code, role.name, role.description, role.isSystem],
      );
      if (result.rowCount && result.rowCount > 0) rolesSeeded++;
    }

    // ── 1b. Seed into enterprise functional_roles (migration 163/776 — Phase 7 primary) ──
    // The 163 enterprise authorization model uses functional_roles as its role registry.
    // We seed the same CANONICAL_ROLES here so both systems stay in sync.
    // Module code derived from role tier: platform→'platform', tenant→'platform', module→role code prefix.
    for (const role of CANONICAL_ROLES) {
      const __moduleCode = role.tier === 'module' ? role.code.replace(/_/g, '-') : 'platform';
      await safeQuery(
        `INSERT INTO "${ts}".functional_roles (role_code, role_name_en, description_en, category, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, 'grc_core', TRUE, NOW(), NOW())
         ON CONFLICT (role_code) DO NOTHING`,
        [role.code, role.name, role.description],
      ).catch(() => {
        // functional_roles table may not exist in all tenant schemas yet (pre-776 tenants)
      });
    }

    // ── 2. Seed permissions (post-163 enterprise schema: code, module_code, resource_code, action_code) ──
    for (const perm of CANONICAL_PERMISSIONS) {
      const result = await safeQuery(
        `INSERT INTO "${ts}".permissions (code, module_code, resource_code, action_code, description, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (code) DO NOTHING
         RETURNING id`,
        [perm.code, perm.module, perm.resource, perm.action, perm.name],
      );
      if (result.rowCount && result.rowCount > 0) permissionsSeeded++;
    }

    // ── 3. Seed role → permission mappings into role_permission_map (migration-412) ──
    for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSION_MAP)) {
      for (const permCode of permCodes) {
        const moduleCode = permModuleLookup.get(permCode) || permCode.split('.')[0];
        const result = await safeQuery(
          `INSERT INTO "${ts}".role_permission_map (tenant_id, role_code, permission_code, module_code, granted_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (tenant_id, role_code, permission_code, module_code) DO UPDATE SET granted_at = NOW()`,
          [tenantId, roleCode, permCode, moduleCode],
        );
        if (result.rowCount && result.rowCount > 0) mappingsSeeded++;
      }
    }

    // ── 3b. Seed into enterprise role_permissions (migration 163 — Phase 7 primary) ──
    // The 163 enterprise model uses role_permissions (functional_role_id, permission_id) as FK-based
    // mapping. We resolve IDs from the seeded functional_roles and permissions tables.
    // This ensures the enterprise authorization path has parity with role_permission_map.
    for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSION_MAP)) {
      for (const permCode of permCodes) {
        await safeQuery(
          `INSERT INTO "${ts}".role_permissions (functional_role_id, permission_id)
           SELECT fr.id, p.id
           FROM "${ts}".functional_roles fr, "${ts}".permissions p
           WHERE fr.role_code = $1 AND p.code = $2
           ON CONFLICT DO NOTHING`,
          [roleCode, permCode],
        ).catch(() => {
          // role_permissions (163 schema) may not exist in all tenant schemas yet
        });
      }
    }

    // ── 4. Seed access profiles (post-163 enterprise schema) ──
    for (const profile of DEFAULT_ACCESS_PROFILES) {
      await safeQuery(
        `INSERT INTO "${ts}".access_profiles (code, name, description, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (code) DO NOTHING`,
        [profile.code, profile.name, profile.description],
      );
    }

    // ── 5. Post-seed invariant: verify mappings actually persisted ──
    const mapCheck = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${ts}".role_permission_map WHERE tenant_id = $1`,
      [tenantId],
    );
    const mapCount = mapCheck.rows[0]?.cnt ?? 0;
    if (mapCount === 0 && mappingsSeeded === 0) {
      invalidatePermissionCache(tenantId);
      const msg = `[DAuth] RBAC seed invariant FAILED: zero role_permission_map rows for tenant ${tenantId} — refusing to create a poisoned tenant`;
      logger.error(msg);
      throw new Error(msg);
    }

    logger.info(`[DAuth] RBAC seed complete for tenant ${tenantId}: ${rolesSeeded} roles, ${permissionsSeeded} permissions, ${mappingsSeeded} mappings (${mapCount} total in role_permission_map)`);
    invalidatePermissionCache(tenantId);
    return { rolesSeeded, permissionsSeeded, mappingsSeeded };
  } catch (err: unknown) {
    invalidatePermissionCache(tenantId);
    if (err instanceof Error && err.message.includes('RBAC seed invariant FAILED')) throw err;
    logger.error(`[DAuth] RBAC seed FAILED for tenant ${tenantId}`, {
      error: err instanceof Error ? err.message : String(err),
      rolesSeeded, permissionsSeeded, mappingsSeeded,
    });
    throw err;
  }
}
