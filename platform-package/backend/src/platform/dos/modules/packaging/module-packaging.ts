// @ts-nocheck
import { type CanonicalModuleCode } from '../../../config/modules/canonical-modules';
import { CANONICAL_MODULE_REGISTRY } from '../registry/module-registry-canonical';
import { getAllRegisteredModuleCodes } from '../registry/platform-module-registry';

export type ModulePackagingType = 'standalone' | 'bundle-only' | 'core-required';
export type ModuleSKU = 'included' | 'addon' | 'premium-addon';

export interface ModulePackagingRule {
  moduleCode: CanonicalModuleCode;
  packagingType: ModulePackagingType;
  sku: ModuleSKU;
  requiredDependencies: CanonicalModuleCode[];
  optionalDependencies: CanonicalModuleCode[];
  bundleGroup: string | null;
  standaloneCapable: boolean;
  minimalFlowModules: CanonicalModuleCode[];
  supportsTrial: boolean;
  trialDurationDays: number;
}

export const MODULE_PACKAGING_RULES: Record<CanonicalModuleCode, ModulePackagingRule> = {
  foundation:     { moduleCode: 'foundation',     packagingType: 'core-required', sku: 'included', requiredDependencies: [],                       optionalDependencies: [],                                        bundleGroup: 'platform',    standaloneCapable: false, minimalFlowModules: [],                                              supportsTrial: false, trialDurationDays: 0 },
  admin:          { moduleCode: 'admin',          packagingType: 'core-required', sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: [],                                        bundleGroup: 'platform',    standaloneCapable: false, minimalFlowModules: [],                                              supportsTrial: false, trialDurationDays: 0 },
  workflow:       { moduleCode: 'workflow',        packagingType: 'core-required', sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: [],                                        bundleGroup: 'platform',    standaloneCapable: false, minimalFlowModules: [],                                              supportsTrial: false, trialDurationDays: 0 },
  notification:   { moduleCode: 'notification',    packagingType: 'core-required', sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: [],                                        bundleGroup: 'platform',    standaloneCapable: false, minimalFlowModules: [],                                              supportsTrial: false, trialDurationDays: 0 },
  team:           { moduleCode: 'team',            packagingType: 'core-required', sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: [],                                        bundleGroup: 'platform',    standaloneCapable: false, minimalFlowModules: [],                                              supportsTrial: false, trialDurationDays: 0 },

  ai:             { moduleCode: 'ai',              packagingType: 'bundle-only',   sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: ['ai-governance'],                          bundleGroup: 'ai',          standaloneCapable: false, minimalFlowModules: [],                                              supportsTrial: true,  trialDurationDays: 14 },
  'ai-governance': { moduleCode: 'ai-governance',  packagingType: 'standalone',    sku: 'addon',    requiredDependencies: ['foundation', 'ai'],     optionalDependencies: ['risk', 'compliance'],                     bundleGroup: 'ai',          standaloneCapable: true,  minimalFlowModules: ['foundation', 'ai'],                            supportsTrial: true,  trialDurationDays: 14 },

  governance:     { moduleCode: 'governance',      packagingType: 'standalone',    sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: ['risk', 'compliance', 'policy'],           bundleGroup: 'grc-core',    standaloneCapable: true,  minimalFlowModules: ['foundation', 'workflow'],                      supportsTrial: true,  trialDurationDays: 14 },
  risk:           { moduleCode: 'risk',            packagingType: 'standalone',    sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: ['compliance', 'remediation', 'action'],    bundleGroup: 'grc-core',    standaloneCapable: true,  minimalFlowModules: ['foundation', 'workflow'],                      supportsTrial: true,  trialDurationDays: 14 },
  compliance:     { moduleCode: 'compliance',      packagingType: 'standalone',    sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: ['risk', 'evidence', 'policy'],             bundleGroup: 'grc-core',    standaloneCapable: true,  minimalFlowModules: ['foundation', 'workflow'],                      supportsTrial: true,  trialDurationDays: 14 },
  policy:         { moduleCode: 'policy',          packagingType: 'standalone',    sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: ['compliance', 'governance'],               bundleGroup: 'grc-core',    standaloneCapable: true,  minimalFlowModules: ['foundation', 'workflow'],                      supportsTrial: true,  trialDurationDays: 14 },
  evidence:       { moduleCode: 'evidence',        packagingType: 'standalone',    sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: ['compliance', 'audit', 'controls'],        bundleGroup: 'grc-core',    standaloneCapable: true,  minimalFlowModules: ['foundation', 'workflow'],                      supportsTrial: true,  trialDurationDays: 14 },
  audit:          { moduleCode: 'audit',           packagingType: 'standalone',    sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: ['compliance', 'evidence', 'risk'],         bundleGroup: 'grc-core',    standaloneCapable: true,  minimalFlowModules: ['foundation', 'workflow'],                      supportsTrial: true,  trialDurationDays: 14 },
  incident:       { moduleCode: 'incident',        packagingType: 'standalone',    sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: ['risk', 'remediation'],                    bundleGroup: 'grc-ops',     standaloneCapable: true,  minimalFlowModules: ['foundation', 'workflow', 'notification'],      supportsTrial: true,  trialDurationDays: 14 },
  exception:      { moduleCode: 'exception',       packagingType: 'standalone',    sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: ['compliance', 'risk'],                     bundleGroup: 'grc-ops',     standaloneCapable: true,  minimalFlowModules: ['foundation', 'workflow'],                      supportsTrial: true,  trialDurationDays: 14 },
  vendor:         { moduleCode: 'vendor',          packagingType: 'standalone',    sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: ['risk', 'compliance'],                     bundleGroup: 'grc-ops',     standaloneCapable: true,  minimalFlowModules: ['foundation', 'workflow'],                      supportsTrial: true,  trialDurationDays: 14 },
  bcp:            { moduleCode: 'bcp',             packagingType: 'standalone',    sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: ['risk', 'incident'],                       bundleGroup: 'grc-ops',     standaloneCapable: true,  minimalFlowModules: ['foundation', 'workflow'],                      supportsTrial: true,  trialDurationDays: 14 },
  asset:          { moduleCode: 'asset',           packagingType: 'standalone',    sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: ['risk', 'compliance'],                     bundleGroup: 'grc-ops',     standaloneCapable: true,  minimalFlowModules: ['foundation'],                                  supportsTrial: true,  trialDurationDays: 14 },
  remediation:    { moduleCode: 'remediation',     packagingType: 'bundle-only',   sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: ['risk', 'audit', 'incident'],              bundleGroup: 'grc-ops',     standaloneCapable: false, minimalFlowModules: [],                                              supportsTrial: false, trialDurationDays: 0 },
  action:         { moduleCode: 'action',          packagingType: 'bundle-only',   sku: 'included', requiredDependencies: ['foundation', 'workflow'], optionalDependencies: [],                                        bundleGroup: 'grc-ops',     standaloneCapable: false, minimalFlowModules: [],                                              supportsTrial: false, trialDurationDays: 0 },
  training:       { moduleCode: 'training',        packagingType: 'standalone',    sku: 'addon',    requiredDependencies: ['foundation'],            optionalDependencies: ['compliance'],                              bundleGroup: 'awareness',   standaloneCapable: true,  minimalFlowModules: ['foundation', 'notification'],                  supportsTrial: true,  trialDurationDays: 14 },
  qiyas:          { moduleCode: 'qiyas',           packagingType: 'standalone',    sku: 'addon',    requiredDependencies: ['foundation'],            optionalDependencies: ['compliance', 'risk'],                     bundleGroup: null,          standaloneCapable: true,  minimalFlowModules: ['foundation'],                                  supportsTrial: true,  trialDurationDays: 14 },
  reporting:      { moduleCode: 'reporting',       packagingType: 'bundle-only',   sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: [],                                         bundleGroup: 'grc-core',    standaloneCapable: false, minimalFlowModules: [],                                              supportsTrial: false, trialDurationDays: 0 },
  analytics:      { moduleCode: 'analytics',       packagingType: 'bundle-only',   sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: [],                                         bundleGroup: 'grc-core',    standaloneCapable: false, minimalFlowModules: [],                                              supportsTrial: false, trialDurationDays: 0 },
  integrations:   { moduleCode: 'integrations',    packagingType: 'standalone',    sku: 'premium-addon', requiredDependencies: ['foundation'],       optionalDependencies: [],                                         bundleGroup: 'connectors',  standaloneCapable: true,  minimalFlowModules: ['foundation'],                                  supportsTrial: true,  trialDurationDays: 7 },
  issues:         { moduleCode: 'issues',          packagingType: 'standalone',    sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: ['workflow'],                                bundleGroup: 'grc-ops',     standaloneCapable: true,  minimalFlowModules: ['foundation'],                                  supportsTrial: true,  trialDurationDays: 14 },
  inbox:          { moduleCode: 'inbox',           packagingType: 'core-required', sku: 'included', requiredDependencies: ['foundation', 'notification'], optionalDependencies: [],                                    bundleGroup: 'platform',    standaloneCapable: false, minimalFlowModules: [],                                              supportsTrial: false, trialDurationDays: 0 },
  portals:        { moduleCode: 'portals',         packagingType: 'standalone',    sku: 'premium-addon', requiredDependencies: ['foundation'],       optionalDependencies: ['vendor', 'compliance'],                   bundleGroup: 'connectors',  standaloneCapable: true,  minimalFlowModules: ['foundation'],                                  supportsTrial: true,  trialDurationDays: 7 },
  records:        { moduleCode: 'records',         packagingType: 'standalone',    sku: 'addon',    requiredDependencies: ['foundation'],            optionalDependencies: ['compliance', 'evidence'],                 bundleGroup: null,          standaloneCapable: true,  minimalFlowModules: ['foundation'],                                  supportsTrial: true,  trialDurationDays: 14 },
  privacy:        { moduleCode: 'privacy',         packagingType: 'standalone',    sku: 'addon',    requiredDependencies: ['foundation'],            optionalDependencies: ['compliance', 'risk'],                     bundleGroup: null,          standaloneCapable: true,  minimalFlowModules: ['foundation', 'workflow'],                      supportsTrial: true,  trialDurationDays: 14 },
  controls:       { moduleCode: 'controls',        packagingType: 'standalone',    sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: ['compliance', 'evidence', 'risk'],         bundleGroup: 'grc-core',    standaloneCapable: true,  minimalFlowModules: ['foundation', 'workflow'],                      supportsTrial: true,  trialDurationDays: 14 },
  onboarding:     { moduleCode: 'onboarding',      packagingType: 'core-required', sku: 'included', requiredDependencies: ['foundation'],            optionalDependencies: [],                                         bundleGroup: 'platform',    standaloneCapable: false, minimalFlowModules: [],                                              supportsTrial: false, trialDurationDays: 0 },
  dora:           { moduleCode: 'dora',            packagingType: 'standalone',    sku: 'addon',    requiredDependencies: ['foundation'],            optionalDependencies: ['bcp', 'incident', 'vendor'],              bundleGroup: 'grc-ops',     standaloneCapable: true,  minimalFlowModules: ['foundation', 'workflow'],                      supportsTrial: true,  trialDurationDays: 14 },
  journey:        { moduleCode: 'journey',         packagingType: 'standalone',    sku: 'addon',    requiredDependencies: ['foundation'],            optionalDependencies: ['compliance', 'risk', 'qiyas'],            bundleGroup: null,          standaloneCapable: true,  minimalFlowModules: ['foundation'],                                  supportsTrial: true,  trialDurationDays: 14 },
  'ksa-regulatory': { moduleCode: 'ksa-regulatory', packagingType: 'standalone', sku: 'addon', requiredDependencies: ['foundation', 'compliance'], optionalDependencies: [], bundleGroup: 'regulatory', standaloneCapable: false, minimalFlowModules: ['foundation', 'compliance'], supportsTrial: true, trialDurationDays: 14 },
  'local-knowledge': { moduleCode: 'local-knowledge', packagingType: 'standalone', sku: 'addon', requiredDependencies: ['foundation'], optionalDependencies: [], bundleGroup: null, standaloneCapable: true, minimalFlowModules: ['foundation'], supportsTrial: true, trialDurationDays: 14 },
  packs: { moduleCode: 'packs', packagingType: 'core-required', sku: 'included', requiredDependencies: [], optionalDependencies: [], bundleGroup: null, standaloneCapable: false, minimalFlowModules: [], supportsTrial: false, trialDurationDays: 0 },
  'proactive-leadership': { moduleCode: 'proactive-leadership', packagingType: 'standalone', sku: 'addon', requiredDependencies: ['foundation', 'governance'], optionalDependencies: [], bundleGroup: 'governance', standaloneCapable: false, minimalFlowModules: ['foundation', 'governance'], supportsTrial: true, trialDurationDays: 14 },
  'agrc-engine': { moduleCode: 'agrc-engine', packagingType: 'core-required', sku: 'included', requiredDependencies: [], optionalDependencies: [], bundleGroup: null, standaloneCapable: false, minimalFlowModules: [], supportsTrial: false, trialDurationDays: 0 },
  dashboard: { moduleCode: 'dashboard', packagingType: 'core-required', sku: 'included', requiredDependencies: ['foundation'], optionalDependencies: [], bundleGroup: 'platform', standaloneCapable: false, minimalFlowModules: [], supportsTrial: false, trialDurationDays: 0 },
  'governance-ai': { moduleCode: 'governance-ai', packagingType: 'bundle-only', sku: 'included', requiredDependencies: ['foundation', 'governance'], optionalDependencies: ['ai'], bundleGroup: 'ai', standaloneCapable: false, minimalFlowModules: [], supportsTrial: false, trialDurationDays: 0 },
  'governance-os': { moduleCode: 'governance-os', packagingType: 'bundle-only', sku: 'included', requiredDependencies: ['foundation', 'governance'], optionalDependencies: [], bundleGroup: 'governance', standaloneCapable: false, minimalFlowModules: [], supportsTrial: false, trialDurationDays: 0 },
  provisioning: { moduleCode: 'provisioning', packagingType: 'core-required', sku: 'included', requiredDependencies: ['foundation'], optionalDependencies: [], bundleGroup: 'platform', standaloneCapable: false, minimalFlowModules: [], supportsTrial: false, trialDurationDays: 0 },
  navigation: { moduleCode: 'navigation', packagingType: 'core-required', sku: 'included', requiredDependencies: ['foundation'], optionalDependencies: [], bundleGroup: 'platform', standaloneCapable: false, minimalFlowModules: [], supportsTrial: false, trialDurationDays: 0 },
  bootstrap: { moduleCode: 'bootstrap', packagingType: 'core-required', sku: 'included', requiredDependencies: ['foundation'], optionalDependencies: [], bundleGroup: 'platform', standaloneCapable: false, minimalFlowModules: [], supportsTrial: false, trialDurationDays: 0 },
  widgets: { moduleCode: 'widgets', packagingType: 'core-required', sku: 'included', requiredDependencies: ['foundation'], optionalDependencies: [], bundleGroup: 'platform', standaloneCapable: false, minimalFlowModules: [], supportsTrial: false, trialDurationDays: 0 },
  'quality-gate': { moduleCode: 'quality-gate', packagingType: 'core-required', sku: 'addon', requiredDependencies: ['admin', 'foundation'], optionalDependencies: [], bundleGroup: 'platform', standaloneCapable: false, minimalFlowModules: [], supportsTrial: false, trialDurationDays: 0 },
};

export const MODULE_BUNDLES: Record<string, { name: string; nameAr: string; modules: CanonicalModuleCode[]; tier: string }> = {
  'grc-core':    { name: 'GRC Core',          nameAr: 'أساسيات الحوكمة',     modules: ['governance', 'risk', 'compliance', 'policy', 'evidence', 'audit', 'reporting', 'analytics', 'controls'], tier: 'starter' },
  'grc-ops':     { name: 'GRC Operations',    nameAr: 'عمليات الحوكمة',      modules: ['incident', 'exception', 'vendor', 'bcp', 'asset', 'remediation', 'action', 'issues'],       tier: 'starter' },
  'ai':          { name: 'AI Suite',           nameAr: 'حزمة الذكاء',         modules: ['ai', 'ai-governance'],                                                                      tier: 'scale' },
  'awareness':   { name: 'Awareness',          nameAr: 'التوعية',             modules: ['training'],                                                                                 tier: 'starter' },
  'connectors':  { name: 'Connectors',         nameAr: 'الموصلات',            modules: ['integrations', 'portals'],                                                                   tier: 'scale' },
  'platform':    { name: 'Platform Core',      nameAr: 'نواة المنصة',          modules: ['foundation', 'admin', 'workflow', 'notification', 'team', 'inbox', 'onboarding'],             tier: 'starter' },
};

export function getModulePackaging(moduleCode: CanonicalModuleCode): ModulePackagingRule {
  return MODULE_PACKAGING_RULES[moduleCode];
}

export function getStandaloneModules(): CanonicalModuleCode[] {
  return (getAllRegisteredModuleCodes() as CanonicalModuleCode[]).filter(c => MODULE_PACKAGING_RULES[c]?.standaloneCapable);
}

export function getBundleModules(bundleGroup: string): CanonicalModuleCode[] {
  return MODULE_BUNDLES[bundleGroup]?.modules ?? [];
}

export function getModuleDependencyChain(moduleCode: CanonicalModuleCode): CanonicalModuleCode[] {
  const visited = new Set<CanonicalModuleCode>();
  const chain: CanonicalModuleCode[] = [];

  function walk(code: CanonicalModuleCode) {
    if (visited.has(code)) return;
    visited.add(code);
    const rule = MODULE_PACKAGING_RULES[code];
    if (!rule) return;
    for (const dep of rule.requiredDependencies) {
      walk(dep);
    }
    chain.push(code);
  }

  walk(moduleCode);
  return chain;
}

export function validateModulePackagingConsistency(): string[] {
  const errors: string[] = [];

  for (const code of getAllRegisteredModuleCodes()) {
    const rule = MODULE_PACKAGING_RULES[code];
    if (!rule) {
      errors.push(`Missing packaging rule for module: ${code}`);
      continue;
    }

    const entry = CANONICAL_MODULE_REGISTRY[code];
    if (!entry) continue;

    if (entry.alwaysOn && rule.packagingType !== 'core-required') {
      errors.push(`Module ${code} is always-on in registry but not core-required in packaging`);
    }

    for (const dep of rule.requiredDependencies) {
      if (!getAllRegisteredModuleCodes().includes(dep)) {
        errors.push(`Module ${code} has any required dependency: ${dep}`);
      }
    }

    if (rule.standaloneCapable && rule.minimalFlowModules.length === 0) {
      errors.push(`Standalone module ${code} must declare minimalFlowModules`);
    }
  }

  return errors;
}
