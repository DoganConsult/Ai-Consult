/**
 * Module Workflow Map Validator
 *
 * Rule R5: Same validator code, different failOnError flag.
 *   - Startup: warn loudly, do not block boot
 *   - CI (npm run validate:module-workflow-map): fail hard, exit 1
 *
 * Rule R2: Platform modules with null primaryTemplateCode are valid — not an error.
 */

import { CANONICAL_AGRC_MODULE_CODES } from './canonical-modules';
import { MODULE_WORKFLOW_MAP } from './module-workflow-map';
import { MODULE_EVENT_CONTRACTS } from './module-event-contracts';
import { getWorkflowTemplateByCode, getWorkflowTemplateById } from '../../data/workflow-templates/index';
import { resolveWorkflowTemplateCodeToDag } from './workflow-template-code-resolution';
import { logger } from '../../platform/dos/observability/logger.service';

export interface ValidationIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function validateModuleWorkflowMap(): ValidationResult {
  const issues: ValidationIssue[] = [];

  // 1. Every canonical code must have a MODULE_WORKFLOW_MAP entry
  for (const code of CANONICAL_AGRC_MODULE_CODES) {
    if (!(code in MODULE_WORKFLOW_MAP)) {
      issues.push({
        level: 'error',
        code: 'MISSING_MAP_ENTRY',
        message: `Canonical module '${code}' has no MODULE_WORKFLOW_MAP entry`,
      });
    }
  }

  // 2. Every non-null primaryTemplateCode must resolve via getWorkflowTemplateByCode()
  for (const code of CANONICAL_AGRC_MODULE_CODES) {
    const entry = MODULE_WORKFLOW_MAP[code];
    if (!entry) continue;

    if (entry.primaryTemplateCode !== null) {
      const template = getWorkflowTemplateByCode(entry.primaryTemplateCode);
      if (!template) {
        issues.push({
          level: 'error',
          code: 'TEMPLATE_NOT_RESOLVABLE',
          message: `Module '${code}' primaryTemplateCode '${entry.primaryTemplateCode}' does not resolve in WORKFLOW_TEMPLATES_LIBRARY`,
        });
      }
      const dagCode = resolveWorkflowTemplateCodeToDag(entry.primaryTemplateCode);
      if (!dagCode) {
        issues.push({
          level: 'error',
          code: 'PRIMARY_NO_DAG_SEED',
          message: `Module '${code}' primaryTemplateCode '${entry.primaryTemplateCode}' does not map to a DAG seed (resolveWorkflowTemplateCodeToDag) — provisioning cannot materialize workflow_templates`,
        });
      }
    }

    // Every non-null libraryId must resolve via getWorkflowTemplateById()
    if (entry.libraryId !== null) {
      const libTemplate = getWorkflowTemplateById(entry.libraryId);
      if (!libTemplate) {
        issues.push({
          level: 'error',
          code: 'LIBRARY_ID_NOT_RESOLVABLE',
          message: `Module '${code}' libraryId '${entry.libraryId}' does not resolve in WORKFLOW_TEMPLATES_LIBRARY`,
        });
      }
    }

    // R2: Platform modules must have null primaryTemplateCode
    if (entry.tier === 'platform' && entry.primaryTemplateCode !== null) {
      issues.push({
        level: 'error',
        code: 'PLATFORM_HAS_TEMPLATE',
        message: `Platform module '${code}' has non-null primaryTemplateCode '${entry.primaryTemplateCode}' — violates R2`,
      });
    }

    // Operational modules must have non-null primaryTemplateCode
    if (entry.tier !== 'platform' && entry.primaryTemplateCode === null) {
      issues.push({
        level: 'error',
        code: 'OPERATIONAL_MISSING_TEMPLATE',
        message: `Operational module '${code}' (tier=${entry.tier}) has null primaryTemplateCode`,
      });
    }
  }

  // 3. Every non-null primaryTemplateCode must have a matching event contract
  for (const code of CANONICAL_AGRC_MODULE_CODES) {
    if (!(code in MODULE_EVENT_CONTRACTS)) {
      issues.push({
        level: 'error',
        code: 'MISSING_EVENT_CONTRACT',
        message: `Canonical module '${code}' has no MODULE_EVENT_CONTRACTS entry`,
      });
      continue;
    }

    const entry = MODULE_WORKFLOW_MAP[code];
    const contract = MODULE_EVENT_CONTRACTS[code];

    // Operational modules should have at least one event
    if (entry && entry.tier !== 'platform' && contract.events.length === 0) {
      issues.push({
        level: 'warning',
        code: 'OPERATIONAL_NO_EVENTS',
        message: `Operational module '${code}' has empty event contract`,
      });
    }
  }

  // 4. No extra keys in MODULE_WORKFLOW_MAP beyond canonical codes
  const canonicalSet = new Set<string>(CANONICAL_AGRC_MODULE_CODES);
  for (const key of Object.keys(MODULE_WORKFLOW_MAP)) {
    if (!canonicalSet.has(key)) {
      issues.push({
        level: 'error',
        code: 'EXTRA_MAP_ENTRY',
        message: `MODULE_WORKFLOW_MAP has non-canonical key '${key}'`,
      });
    }
  }

  return {
    valid: issues.filter((i) => i.level === 'error').length === 0,
    issues,
  };
}

/**
 * Run validation and log results.
 * @param failOnError If true, throws on validation errors (for CI). If false, only logs warnings (for startup).
 */
export function runModuleWorkflowValidation(failOnError: boolean): void {
  const result = validateModuleWorkflowMap();

  for (const issue of result.issues) {
    if (issue.level === 'error') {
      logger.error(`[module-workflow-map] ${issue.code}: ${issue.message}`);
    } else {
      logger.warn(`[module-workflow-map] ${issue.code}: ${issue.message}`);
    }
  }

  if (result.valid) {
    logger.info(`[module-workflow-map] Validation passed: ${CANONICAL_AGRC_MODULE_CODES.length} modules, 0 errors`);
  } else {
    const errorCount = result.issues.filter((i) => i.level === 'error').length;
    const msg = `[module-workflow-map] Validation FAILED: ${errorCount} error(s)`;
    logger.error(msg);
    if (failOnError) {
      process.exit(1);
    }
  }
}

// CLI entry point: npm run validate:module-workflow-map
if (require.main === module) {
  runModuleWorkflowValidation(true);
}
