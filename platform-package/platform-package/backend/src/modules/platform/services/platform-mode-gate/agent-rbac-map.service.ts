// @ts-nocheck
/**
 * Agent RBAC Map — defines per-agent RBAC entries consumed by the
 * platform mode gate and agent fleet dashboards.
 *
 * Each agent maps to a GRC role with specific domain permissions.
 */

import type { AgentRbacEntry } from './platform-mode.types';
import { safeQuery, tenantSchema } from '../../../../config/database';

/**
 * Canonical AGENT_RBAC_MAP — static mapping of agent IDs to RBAC entries.
 * Used for display, capability gating, and hyper-role computation.
 */
export const AGENT_RBAC_MAP: Record<string, AgentRbacEntry> = {
  A01: {
    agentId: 'A01', name: 'Risk Sentinel', nameAr: 'حارس المخاطر',
    grcRole: 'Risk Manager', grcRoleAr: 'مدير المخاطر',
    permissions: ['risk.record.read', 'risk.record.write', 'risk.assessment.manage'],
    domain: 'Risk', domainAr: 'المخاطر', icon: 'pi-shield', color: '#EF4444',
    description: 'Monitors and assesses organizational risks', descriptionAr: 'مراقبة وتقييم مخاطر المؤسسة',
  },
  A02: {
    agentId: 'A02', name: 'Compliance Guardian', nameAr: 'حارس الامتثال',
    grcRole: 'Compliance Officer', grcRoleAr: 'مسؤول الامتثال',
    permissions: ['compliance.record.read', 'compliance.record.write', 'compliance.assessment.manage'],
    domain: 'Compliance', domainAr: 'الامتثال', icon: 'pi-check-circle', color: '#3B82F6',
    description: 'Ensures regulatory compliance', descriptionAr: 'ضمان الامتثال التنظيمي',
  },
  A03: {
    agentId: 'A03', name: 'Policy Architect', nameAr: 'مهندس السياسات',
    grcRole: 'Policy Manager', grcRoleAr: 'مدير السياسات',
    permissions: ['policy.record.read', 'policy.record.write'],
    domain: 'Policy', domainAr: 'السياسات', icon: 'pi-file-edit', color: '#8B5CF6',
    description: 'Drafts and reviews policies', descriptionAr: 'صياغة ومراجعة السياسات',
  },
  A04: {
    agentId: 'A04', name: 'Evidence Collector', nameAr: 'جامع الأدلة',
    grcRole: 'Evidence Manager', grcRoleAr: 'مدير الأدلة',
    permissions: ['evidence.record.read', 'evidence.record.write', 'evidence.request.manage'],
    domain: 'Evidence', domainAr: 'الأدلة', icon: 'pi-folder', color: '#10B981',
    description: 'Collects and validates evidence', descriptionAr: 'جمع والتحقق من الأدلة',
  },
  A05: {
    agentId: 'A05', name: 'Audit Coordinator', nameAr: 'منسق التدقيق',
    grcRole: 'Auditor', grcRoleAr: 'المدقق',
    permissions: ['audit.record.read', 'audit.record.write'],
    domain: 'Audit', domainAr: 'التدقيق', icon: 'pi-search', color: '#F59E0B',
    description: 'Coordinates audit activities', descriptionAr: 'تنسيق أنشطة التدقيق',
  },
  A06: {
    agentId: 'A06', name: 'Incident Responder', nameAr: 'مستجيب الحوادث',
    grcRole: 'Incident Manager', grcRoleAr: 'مدير الحوادث',
    permissions: ['incident.record.read', 'incident.record.write', 'incident.response.manage'],
    domain: 'Incident', domainAr: 'الحوادث', icon: 'pi-exclamation-triangle', color: '#DC2626',
    description: 'Manages incident response', descriptionAr: 'إدارة الاستجابة للحوادث',
  },
  A07: {
    agentId: 'A07', name: 'Vendor Assessor', nameAr: 'مقيم الموردين',
    grcRole: 'Vendor Manager', grcRoleAr: 'مدير الموردين',
    permissions: ['vendor.record.read', 'vendor.record.write', 'vendor.assessment.manage'],
    domain: 'Vendor', domainAr: 'الموردين', icon: 'pi-briefcase', color: '#6366F1',
    description: 'Assesses vendor risks', descriptionAr: 'تقييم مخاطر الموردين',
  },
  A08: {
    agentId: 'A08', name: 'BCP Planner', nameAr: 'مخطط استمرارية الأعمال',
    grcRole: 'BCP Manager', grcRoleAr: 'مدير استمرارية الأعمال',
    permissions: ['bcp.record.read', 'bcp.record.write'],
    domain: 'BCP', domainAr: 'استمرارية الأعمال', icon: 'pi-replay', color: '#0EA5E9',
    description: 'Plans business continuity', descriptionAr: 'تخطيط استمرارية الأعمال',
  },
  A09: {
    agentId: 'A09', name: 'Training Advisor', nameAr: 'مستشار التدريب',
    grcRole: 'Training Manager', grcRoleAr: 'مدير التدريب',
    permissions: ['training.record.read', 'training.record.write'],
    domain: 'Training', domainAr: 'التدريب', icon: 'pi-graduation-cap', color: '#14B8A6',
    description: 'Manages training programs', descriptionAr: 'إدارة برامج التدريب',
  },
  A10: {
    agentId: 'A10', name: 'Asset Guardian', nameAr: 'حارس الأصول',
    grcRole: 'Asset Manager', grcRoleAr: 'مدير الأصول',
    permissions: ['asset.record.read', 'asset.record.write'],
    domain: 'Asset', domainAr: 'الأصول', icon: 'pi-server', color: '#F97316',
    description: 'Tracks and classifies assets', descriptionAr: 'تتبع وتصنيف الأصول',
  },
  A11: {
    agentId: 'A11', name: 'Governance Orchestrator', nameAr: 'منسق الحوكمة',
    grcRole: 'Governance Lead', grcRoleAr: 'قائد الحوكمة',
    permissions: ['governance.record.read', 'governance.record.write', 'governance.board.manage'],
    domain: 'Governance', domainAr: 'الحوكمة', icon: 'pi-sitemap', color: '#7C3AED',
    description: 'Orchestrates governance activities', descriptionAr: 'تنسيق أنشطة الحوكمة',
  },
  A12: {
    agentId: 'A12', name: 'Remediation Tracker', nameAr: 'متتبع المعالجة',
    grcRole: 'Remediation Manager', grcRoleAr: 'مدير المعالجة',
    permissions: ['remediation.record.read', 'remediation.record.write'],
    domain: 'Remediation', domainAr: 'المعالجة', icon: 'pi-wrench', color: '#EA580C',
    description: 'Tracks remediation actions', descriptionAr: 'تتبع إجراءات المعالجة',
  },
};

/**
 * Get all agent RBAC entries as an array.
 */
export function getAgentRbacEntries(): AgentRbacEntry[] {
  return Object.values(AGENT_RBAC_MAP);
}

/**
 * Get a single agent's RBAC entry by agent ID.
 * Returns undefined if the agent ID is not in the map.
 */
export function getAgentRbacEntry(agentId: string): AgentRbacEntry | undefined {
  return AGENT_RBAC_MAP[agentId];
}
