/**
 * module-workflow-map.validator
 *
 * Validates that MODULE_WORKFLOW_MAP covers all canonical module codes
 * and that entries are internally consistent.
 *
 * Called at server startup to catch configuration drift early.
 */

import { CANONICAL_AGRC_MODULE_CODES  } from './modules/canonical-modules';
import { MODULE_WORKFLOW_MAP  } from './modules/module-workflow-map';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validate(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check every canonical code has an entry
  for (const code of CANONICAL_AGRC_MODULE_CODES) {
    const entry = MODULE_WORKFLOW_MAP[code];
    if (!entry) {
      errors.push(`Missing MODULE_WORKFLOW_MAP entry for canonical module '${code}'`);
      continue;
    }

    // R2: platform modules must not have template codes
    if (entry.tier === 'platform' && entry.primaryTemplateCode !== null) {
      warnings.push(`Platform module '${code}' has a non-null primaryTemplateCode — expected null per R2`);
    }

    // Non-platform modules should have template codes (warning, not error)
    if (entry.tier !== 'platform' && entry.primaryTemplateCode === null) {
      warnings.push(`Non-platform module '${code}' (tier=${entry.tier}) has null primaryTemplateCode`);
    }
  }

  // Check map doesn't have extra codes not in canonical list
  const canonicalSet = new Set<string>(CANONICAL_AGRC_MODULE_CODES);
  for (const key of Object.keys(MODULE_WORKFLOW_MAP)) {
    if (!canonicalSet.has(key)) {
      warnings.push(`MODULE_WORKFLOW_MAP has entry '${key}' not in CANONICAL_AGRC_MODULE_CODES`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Run module-workflow-map validation at startup.
 * @param strict - If true, throw on errors. If false, log warnings only.
 */
export function runModuleWorkflowValidation(strict = false): void {
  const result = validate();

  if (result.warnings.length > 0) {
    console.warn('[module-workflow-map] Validation warnings:', result.warnings);
  }

  if (!result.valid) {
    const msg = `[module-workflow-map] Validation failed: ${result.errors.join('; ')}`;
    if (strict) {
      throw new Error(msg);
    } else {
      console.error(msg);
    }
  }
}
