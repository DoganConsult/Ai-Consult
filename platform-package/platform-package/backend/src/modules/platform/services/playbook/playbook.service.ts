/**
 * Playbook Engine Service — Facade module.
 *
 * Re-exports all public symbols from 6 focused sub-modules so that existing
 * consumers continue to work without modification.
 *
 * Local exports: buildPlaybook, serializePlaybook, deserializePlaybook.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 9.1, 9.2, 9.3
 */

type UserRole = string;
import { PlaybookSnapshot } from '../../../agrc-engine/services/engine/playbook.types';

// ─── Re-export everything from sub-modules ───

export { NavItemDef, hasPermission } from './playbook-permissions.service';
export { ALL_NAV_ITEMS, MODULE_I18N, computeModuleMap } from './playbook-nav.service';
export { RESOURCE_I18N, ACTION_TYPES, computeActionMatrix } from './playbook-action-matrix.service';
export { ROLE_TO_SWIMLANES, PARTICIPATION_PRIORITY, WORKFLOW_I18N, WORKFLOW_LIFECYCLE_PHASE, computeWorkflowParticipation } from './playbook-workflows.service';
export { WIDGET_I18N, REPORT_I18N, NOTIFICATION_I18N, PERMISSION_TO_WIDGETS, computeWidgetGuide, computeReportGuide, computeNotificationGuide } from './playbook-widgets.service';
export { GUIDE_LIBRARY, computeTaskGuides } from './playbook-guides.service';

// ─── Import compute functions for buildPlaybook orchestration ───

import { computeModuleMap } from './playbook-nav.service';
import { computeActionMatrix } from './playbook-action-matrix.service';
import { computeWorkflowParticipation } from './playbook-workflows.service';
import { computeWidgetGuide, computeReportGuide, computeNotificationGuide } from './playbook-widgets.service';
import { computeTaskGuides } from './playbook-guides.service';

// ─── buildPlaybook orchestrator ───

/**
 * Orchestrate all compute functions into a single PlaybookSnapshot.
 * Calls each section's compute function and assembles the result with
 * a generatedAt ISO timestamp.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export function buildPlaybook(role: UserRole, profileId?: string): PlaybookSnapshot {
  return {
    role,
    profileId: profileId ?? null,
    generatedAt: new Date().toISOString(),
    modules: computeModuleMap(role),
    actionMatrix: computeActionMatrix(role),
    workflows: computeWorkflowParticipation(role, profileId),
    widgets: computeWidgetGuide(role, profileId),
    reports: computeReportGuide(role, profileId),
    notifications: computeNotificationGuide(profileId),
    taskGuides: computeTaskGuides(role, profileId),
  };
}

// ─── Serialization / Deserialization ───

/**
 * Serialize a PlaybookSnapshot to a JSON string.
 *
 * Requirements: 9.1
 */
export function serializePlaybook(snapshot: PlaybookSnapshot): string {
  return JSON.stringify(snapshot);
}

/**
 * Deserialize a JSON string back into a PlaybookSnapshot.
 * Validates the parsed object has the expected shape and throws a
 * descriptive error if the JSON is malformed or missing required fields.
 *
 * Requirements: 9.2, 9.3
 */
export function deserializePlaybook(json: string): PlaybookSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('deserializePlaybook: invalid JSON string');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('deserializePlaybook: expected a JSON object');
  }

  const obj = parsed as Record<string, any>;

  // Validate required top-level fields
  if (typeof obj.role !== 'string') {
    throw new Error('deserializePlaybook: missing or invalid "role" field (expected string)');
  }
  if (obj.profileId !== null && typeof obj.profileId !== 'string') {
    throw new Error('deserializePlaybook: "profileId" must be a string or null');
  }
  if (typeof obj.generatedAt !== 'string') {
    throw new Error('deserializePlaybook: missing or invalid "generatedAt" field (expected ISO string)');
  }

  const arrayFields = ['modules', 'actionMatrix', 'workflows', 'widgets', 'reports', 'notifications', 'taskGuides'] as const;
  for (const field of arrayFields) {
    if (!Array.isArray(obj[field])) {
      throw new Error(`deserializePlaybook: missing or invalid "${field}" field (expected array)`);
    }
  }

  return parsed as PlaybookSnapshot;
}
