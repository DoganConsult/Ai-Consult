// @ts-nocheck
// ============================================
// Shahin GRC — Workflow Template Library Types
// Shared type definitions for workflow templates.
// ============================================

import type { WorkflowTemplateSeed } from '../seed-workflow-templates';

/**
 * Library DAG templates are not the same artifact as provisioning DB seeds (`WorkflowTemplateSeed`).
 * `templateCode` is optional here; provisioning uses `seed-workflow-templates.ts` codes.
 */
export interface WorkflowTemplateLibraryEntry
  extends Omit<WorkflowTemplateSeed, 'templateCode'> {
  /** When set, aligns with `workflow_template_codes` in workspace seed profiles. */
  templateCode?: string;
  /** Unique template identifier (kebab-case) */
  id: string;
  /** Template category for filtering */
  category:
    | 'evidence' | 'compliance' | 'risk' | 'audit' | 'policy' | 'incident'
    | 'vendor' | 'change' | 'data_privacy' | 'bcp' | 'regulatory'
    | 'training' | 'asset' | 'exception' | 'remediation' | 'action'
    | 'governance' | 'ai_governance' | 'qiyas'
    | 'reporting' | 'notification' | 'analytics' | 'integration' | 'team'
    | 'issues' | 'portals' | 'records' | 'privacy'
    | 'ai' | 'provisioning' | 'navigation' | 'proactive_leadership'
    | 'local_knowledge' | 'ksa_regulatory';
  /** Roles involved in this workflow */
  roles: string[];
  /** Default SLA configuration */
  sla: {
    totalDays: number;
    escalationHours: number;
  };
  /** Trigger configuration */
  triggers: Array<{
    type: 'schedule' | 'event' | 'manual';
    event?: string;
    cron?: string;
  }>;
}
