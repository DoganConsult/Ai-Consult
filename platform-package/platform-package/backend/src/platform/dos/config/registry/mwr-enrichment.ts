/**
 * Shared MWR (module_workflow_registry) enrichment from MODULE_WORKFLOW_MAP + MODULE_EVENT_CONTRACTS.
 * Used by module subscription and tenant provisioning (module-registry installer).
 */

import { safeQuery } from '../../../../config/database';
import {
  MODULE_WORKFLOW_MAP,
  type CanonicalModuleCode,
  isPlatformOnly,
} from '../../../../config/modules/module-workflow-map';
import { MODULE_EVENT_CONTRACTS } from '../../../../config/modules/module-event-contracts';
import { isCanonicalModuleCode } from '../../../../config/modules/canonical-modules';

/** DB CHECK: automation_level IN ('manual','semi','full','autonomous') — platform map uses null → coalesce. */
function resolveAutomationLevel(
  level: 'full' | 'semi' | 'manual' | null | undefined,
): 'manual' | 'semi' | 'full' | 'autonomous' {
  if (level == null) return 'manual';
  if (level === 'full') return 'full';
  return level;
}

/**
 * Apply canonical workflow + event contract fields to one MWR row (UPDATE by module_code).
 */
export async function enrichMwrRowFromCanonicalMaps(
  schema: string,
  moduleCode: string,
): Promise<void> {
  if (!isCanonicalModuleCode(moduleCode)) return;

  const code = moduleCode as CanonicalModuleCode;
  const entry = MODULE_WORKFLOW_MAP[code];
  const contract = MODULE_EVENT_CONTRACTS[code];
  if (!entry) return;

  const automationLevel = resolveAutomationLevel(entry.automationLevel);
  const hasLifecycle = !isPlatformOnly(code);
  const events = contract?.events ?? [];

  await safeQuery(
    `UPDATE "${schema}".module_workflow_registry SET
       primary_template_code = $2,
       has_lifecycle = $3,
       module_category = $4,
       event_types = $5,
       sla_default_hours = COALESCE($6, sla_default_hours),
       automation_level = $7,
       updated_at = NOW()
     WHERE module_code = $1`,
    [
      moduleCode,
      entry.primaryTemplateCode,
      hasLifecycle,
      entry.category,
      events,
      entry.slaDefaultHours,
      automationLevel,
    ],
  ).catch(() => {
    /* row may not exist yet */
  });
}
