/**
 * Workflow Operability Validator
 *
 * Single gate answering:
 *   - does this module have an MWR row?
 *   - is it operational tier?
 *   - does its primary template resolve?
 *   - does it declare events?
 *   - is it allowed to start workflows?
 *
 * Used by UI/API exposure and provisioning checks.
 * Per-tier definition of done is enforced here.
 *
 * CONFIG BOUNDARY: owner = product (AGRC/Shahin-AI).
 */

import { CanonicalModuleCode, isCanonicalModuleCode } from '../modules/canonical-modules';
import { MODULE_WORKFLOW_MAP, isPlatformOnly, type ModuleTier } from '../modules/module-workflow-map';
import { MODULE_EVENT_CONTRACTS } from '../modules/module-event-contracts';
import { getWorkflowTemplateByCode } from '../../data/workflow-templates/index';
import { resolveWorkflowTemplateCodeToDag } from './workflow-template-code-resolution';

export type OperabilityTier = 'full_workflow' | 'domain_workflow' | 'platform_only' | 'unknown';

export interface ModuleOperabilityReport {
  moduleCode: string;
  tier: OperabilityTier;
  hasMwrEntry: boolean;
  isOperational: boolean;
  hasLifecycle: boolean;
  primaryTemplateCode: string | null;
  templateResolvesInLibrary: boolean;
  templateResolvesInDag: boolean;
  declaresEvents: boolean;
  eventCount: number;
  chainTriggerEventCount: number;
  chainEligible: boolean;
  canStartWorkflows: boolean;
  definitionOfDone: DefinitionOfDoneResult;
}

export interface DefinitionOfDoneResult {
  passed: boolean;
  checks: Array<{ check: string; passed: boolean; detail: string }>;
}

function mapTier(tier: ModuleTier): OperabilityTier {
  switch (tier) {
    case 'full': return 'full_workflow';
    case 'domain': return 'domain_workflow';
    case 'platform': return 'platform_only';
    default: return 'unknown';
  }
}

export function getModuleOperability(moduleCode: string): ModuleOperabilityReport {
  if (!isCanonicalModuleCode(moduleCode)) {
    return {
      moduleCode,
      tier: 'unknown',
      hasMwrEntry: false,
      isOperational: false,
      hasLifecycle: false,
      primaryTemplateCode: null,
      templateResolvesInLibrary: false,
      templateResolvesInDag: false,
      declaresEvents: false,
      eventCount: 0,
      chainTriggerEventCount: 0,
      chainEligible: false,
      canStartWorkflows: false,
      definitionOfDone: { passed: false, checks: [{ check: 'canonical_module', passed: false, detail: `'${moduleCode}' is not a canonical module code` }] },
    };
  }

  const code = moduleCode as CanonicalModuleCode;
  const entry = MODULE_WORKFLOW_MAP[code];
  const contract = MODULE_EVENT_CONTRACTS[code];
  const platform = isPlatformOnly(code);
  const tier = mapTier(entry.tier);

  const primaryTemplateCode = entry.primaryTemplateCode;
  const templateResolvesInLibrary = primaryTemplateCode ? !!getWorkflowTemplateByCode(primaryTemplateCode) : false;
  const templateResolvesInDag = primaryTemplateCode ? !!resolveWorkflowTemplateCodeToDag(primaryTemplateCode) : false;
  const eventCount = contract?.events.length ?? 0;
  const chainTriggerEventCount = contract?.chainTriggerEvents.length ?? 0;
  const chainEligible = entry.tier === 'full';
  const hasLifecycle = !platform;
  const isOperational = !platform;
  const declaresEvents = eventCount > 0;
  const canStartWorkflows = isOperational && templateResolvesInLibrary && templateResolvesInDag;

  const checks: Array<{ check: string; passed: boolean; detail: string }> = [];

  if (tier === 'full_workflow') {
    checks.push({ check: 'mwr_row', passed: true, detail: 'MODULE_WORKFLOW_MAP entry exists' });
    checks.push({ check: 'lifecycle', passed: hasLifecycle, detail: hasLifecycle ? 'has_lifecycle = true' : 'MISSING lifecycle' });
    checks.push({ check: 'template_library', passed: templateResolvesInLibrary, detail: templateResolvesInLibrary ? `${primaryTemplateCode} resolves in WORKFLOW_TEMPLATES_LIBRARY` : `${primaryTemplateCode} NOT found in library` });
    checks.push({ check: 'template_dag', passed: templateResolvesInDag, detail: templateResolvesInDag ? `${primaryTemplateCode} resolves via DAG seed` : `${primaryTemplateCode} NOT found in DAG seeds` });
    checks.push({ check: 'event_contract', passed: declaresEvents, detail: declaresEvents ? `${eventCount} events declared` : 'NO events declared' });
    checks.push({ check: 'chain_eligibility', passed: chainEligible, detail: chainEligible ? `${chainTriggerEventCount} chain trigger(s)` : 'not chain eligible' });
  } else if (tier === 'domain_workflow') {
    checks.push({ check: 'mwr_row', passed: true, detail: 'MODULE_WORKFLOW_MAP entry exists' });
    checks.push({ check: 'lifecycle', passed: hasLifecycle, detail: hasLifecycle ? 'has_lifecycle = true' : 'MISSING lifecycle' });
    checks.push({ check: 'template_library', passed: templateResolvesInLibrary, detail: templateResolvesInLibrary ? `${primaryTemplateCode} resolves in WORKFLOW_TEMPLATES_LIBRARY` : `${primaryTemplateCode} NOT found in library` });
    checks.push({ check: 'template_dag', passed: templateResolvesInDag, detail: templateResolvesInDag ? `${primaryTemplateCode} resolves via DAG seed` : `${primaryTemplateCode} NOT found in DAG seeds` });
    checks.push({ check: 'event_contract', passed: declaresEvents, detail: declaresEvents ? `${eventCount} events declared` : 'NO events declared' });
  } else if (tier === 'platform_only') {
    checks.push({ check: 'mwr_row', passed: true, detail: 'MODULE_WORKFLOW_MAP entry exists' });
    checks.push({ check: 'no_lifecycle_required', passed: !hasLifecycle, detail: 'platform module — no lifecycle required' });
    checks.push({ check: 'no_template_required', passed: primaryTemplateCode === null, detail: 'platform module — no template required' });
    checks.push({ check: 'no_workflow_apis', passed: true, detail: 'platform module — no workflow APIs surfaced by default' });
  }

  const passed = checks.every(c => c.passed);

  return {
    moduleCode,
    tier,
    hasMwrEntry: true,
    isOperational,
    hasLifecycle,
    primaryTemplateCode,
    templateResolvesInLibrary,
    templateResolvesInDag,
    declaresEvents,
    eventCount,
    chainTriggerEventCount,
    chainEligible,
    canStartWorkflows,
    definitionOfDone: { passed, checks },
  };
}

export function getAllModuleOperability(): ModuleOperabilityReport[] {
  const codes = Object.keys(MODULE_WORKFLOW_MAP) as CanonicalModuleCode[];
  return codes.map(getModuleOperability);
}

export function getOperationalModuleReports(): ModuleOperabilityReport[] {
  return getAllModuleOperability().filter(r => r.isOperational);
}

export function getNonOperationalModules(): string[] {
  return getAllModuleOperability()
    .filter(r => r.isOperational && !r.canStartWorkflows)
    .map(r => r.moduleCode);
}

export function validateAllModuleOperability(): { passed: boolean; reports: ModuleOperabilityReport[] } {
  const reports = getAllModuleOperability();
  const passed = reports.every(r => r.definitionOfDone.passed);
  return { passed, reports };
}
