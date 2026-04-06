// @ts-nocheck
/**
 * Canonical Module Registry — unified truth for all module identities.
 *
 * For each of the 32 canonical modules, this registry aligns:
 *   - mount path (API prefix)
 *   - module code (frozen in canonical-modules.ts)
 *   - entitlement key (product_modules table)
 *   - navigation identity (nav_key in navigation_registry)
 *   - permission family (prefix for all module permissions)
 *   - event namespace (MODULE_EVENT_CONTRACTS key)
 *   - audit label (argument to moduleStack() / auditMiddleware())
 *   - bootstrap order (provisioning sequence)
 *
 * Validation: `validateRegistryAlignment()` cross-checks this registry
 * against permission files, event contracts, and route catalogs.
 *
 * Used by drift tests, runtime diagnostics, and future registry normalization.
 */

import { getAllRegisteredModuleCodes } from './platform-module-registry';
import {
  _CANONICAL_AGRC_MODULE_CODES,
  type CanonicalModuleCode,
} from '../../../config/modules/canonical-modules';
import { MODULE_EVENT_CONTRACTS } from '../../../config/modules/module-event-contracts';
import { type OwnershipTier, getModuleOwnership } from '../../contracts/ownership-matrix';

// ── Entry Type ──────────────────────────────────────────────────────────

export interface CanonicalModuleEntry {
  moduleCode: CanonicalModuleCode;
  /** API mount prefix (e.g., '/api/risks') */
  mountPrefix: string;
  /** Key in product_modules / tenant_module_entitlements (usually same as moduleCode) */
  entitlementKey: string;
  /** Nav group key in navigation_registry (usually same as moduleCode) */
  navKey: string;
  /** Permission prefix: all permissions for this module start with `permissionFamily:` */
  permissionFamily: string;
  /** Audit label passed to moduleStack() and auditMiddleware() */
  auditLabel: string;
  /** Event namespace key in MODULE_EVENT_CONTRACTS */
  eventNamespace: string;
  /** Bootstrap order (1 = first provisioned, 25 = last) */
  bootstrapOrder: number;
  /** Ownership tier from ownership-matrix.ts */
  tier: OwnershipTier;
  /** Always-on module (no entitlement check needed) */
  alwaysOn: boolean;
}

// ── Registry ────────────────────────────────────────────────────────────

export const CANONICAL_MODULE_REGISTRY: Record<CanonicalModuleCode, CanonicalModuleEntry> = {
  // ── Platform Core ─────────────────────────────────────────────────────
  foundation:   { moduleCode: 'foundation',   mountPrefix: '/api/foundation',    entitlementKey: 'foundation',   navKey: 'foundation',   permissionFamily: 'foundation',   auditLabel: 'foundation',   eventNamespace: 'foundation',   bootstrapOrder: 1,  tier: 'platform-core',  alwaysOn: true },
  admin:        { moduleCode: 'admin',        mountPrefix: '/api/admin',         entitlementKey: 'admin',        navKey: 'admin',        permissionFamily: 'admin',        auditLabel: 'admin',        eventNamespace: 'admin',        bootstrapOrder: 2,  tier: 'platform-core',  alwaysOn: true },
  workflow:     { moduleCode: 'workflow',      mountPrefix: '/api/workflows',     entitlementKey: 'workflow',     navKey: 'workflow',     permissionFamily: 'workflow',     auditLabel: 'workflow',     eventNamespace: 'workflow',     bootstrapOrder: 3,  tier: 'platform-core',  alwaysOn: true },
  notification: { moduleCode: 'notification',  mountPrefix: '/api/notifications', entitlementKey: 'notification', navKey: 'notification', permissionFamily: 'notification', auditLabel: 'notification', eventNamespace: 'notification', bootstrapOrder: 4,  tier: 'platform-core',  alwaysOn: true },
  team:         { moduleCode: 'team',          mountPrefix: '/api/teams',         entitlementKey: 'team',         navKey: 'team',         permissionFamily: 'team',         auditLabel: 'team',         eventNamespace: 'team',         bootstrapOrder: 5,  tier: 'platform-core',  alwaysOn: false },

  // ── Platform AI ───────────────────────────────────────────────────────
  ai:              { moduleCode: 'ai',              mountPrefix: '/api/ai',              entitlementKey: 'ai',              navKey: 'ai',              permissionFamily: 'ai',              auditLabel: 'ai',              eventNamespace: 'ai',              bootstrapOrder: 6,  tier: 'platform-ai',  alwaysOn: false },
  'ai-governance': { moduleCode: 'ai-governance',   mountPrefix: '/api/ai-governance',   entitlementKey: 'ai-governance',   navKey: 'ai-governance',   permissionFamily: 'ai-governance',   auditLabel: 'ai-governance',   eventNamespace: 'ai-governance',   bootstrapOrder: 7,  tier: 'platform-ai',  alwaysOn: false },

  // ── Product AGRC ──────────────────────────────────────────────────────
  governance:   { moduleCode: 'governance',   mountPrefix: '/api/governance',    entitlementKey: 'governance',   navKey: 'governance',   permissionFamily: 'governance',   auditLabel: 'governance',   eventNamespace: 'governance',   bootstrapOrder: 8,  tier: 'product-agrc',  alwaysOn: false },
  risk:         { moduleCode: 'risk',         mountPrefix: '/api/risks',         entitlementKey: 'risk',         navKey: 'risk',         permissionFamily: 'risk',         auditLabel: 'risk',         eventNamespace: 'risk',         bootstrapOrder: 9,  tier: 'product-agrc',  alwaysOn: false },
  compliance:   { moduleCode: 'compliance',   mountPrefix: '/api/compliance',    entitlementKey: 'compliance',   navKey: 'compliance',   permissionFamily: 'compliance',   auditLabel: 'compliance',   eventNamespace: 'compliance',   bootstrapOrder: 10, tier: 'product-agrc',  alwaysOn: false },
  policy:       { moduleCode: 'policy',       mountPrefix: '/api/policies',      entitlementKey: 'policy',       navKey: 'policy',       permissionFamily: 'policy',       auditLabel: 'policy',       eventNamespace: 'policy',       bootstrapOrder: 11, tier: 'product-agrc',  alwaysOn: false },
  evidence:     { moduleCode: 'evidence',     mountPrefix: '/api/evidence',      entitlementKey: 'evidence',     navKey: 'evidence',     permissionFamily: 'evidence',     auditLabel: 'evidence',     eventNamespace: 'evidence',     bootstrapOrder: 12, tier: 'product-agrc',  alwaysOn: false },
  audit:        { moduleCode: 'audit',        mountPrefix: '/api/audit',         entitlementKey: 'audit',        navKey: 'audit',        permissionFamily: 'audit',        auditLabel: 'audit',        eventNamespace: 'audit',        bootstrapOrder: 13, tier: 'product-agrc',  alwaysOn: false },
  incident:     { moduleCode: 'incident',     mountPrefix: '/api/incidents',     entitlementKey: 'incident',     navKey: 'incident',     permissionFamily: 'incident',     auditLabel: 'incident',     eventNamespace: 'incident',     bootstrapOrder: 14, tier: 'product-agrc',  alwaysOn: false },
  exception:    { moduleCode: 'exception',    mountPrefix: '/api/exceptions',    entitlementKey: 'exception',    navKey: 'exception',    permissionFamily: 'exception',    auditLabel: 'exception',    eventNamespace: 'exception',    bootstrapOrder: 15, tier: 'product-agrc',  alwaysOn: false },
  vendor:       { moduleCode: 'vendor',       mountPrefix: '/api/vendors',       entitlementKey: 'vendor',       navKey: 'vendor',       permissionFamily: 'vendor',       auditLabel: 'vendor',       eventNamespace: 'vendor',       bootstrapOrder: 16, tier: 'product-agrc',  alwaysOn: false },
  bcp:          { moduleCode: 'bcp',          mountPrefix: '/api/bcp',           entitlementKey: 'bcp',          navKey: 'bcp',          permissionFamily: 'bcp',          auditLabel: 'bcp',          eventNamespace: 'bcp',          bootstrapOrder: 17, tier: 'product-agrc',  alwaysOn: false },
  asset:        { moduleCode: 'asset',        mountPrefix: '/api/assets',        entitlementKey: 'asset',        navKey: 'asset',        permissionFamily: 'asset',        auditLabel: 'asset',        eventNamespace: 'asset',        bootstrapOrder: 18, tier: 'product-agrc',  alwaysOn: false },
  remediation:  { moduleCode: 'remediation',  mountPrefix: '/api/remediation',   entitlementKey: 'remediation',  navKey: 'remediation',  permissionFamily: 'remediation',  auditLabel: 'remediation',  eventNamespace: 'remediation',  bootstrapOrder: 19, tier: 'product-agrc',  alwaysOn: false },
  action:       { moduleCode: 'action',       mountPrefix: '/api/action-items',  entitlementKey: 'action',       navKey: 'action',       permissionFamily: 'action',       auditLabel: 'action',       eventNamespace: 'action',       bootstrapOrder: 20, tier: 'product-agrc',  alwaysOn: false },
  training:     { moduleCode: 'training',     mountPrefix: '/api/training',      entitlementKey: 'training',     navKey: 'training',     permissionFamily: 'training',     auditLabel: 'training',     eventNamespace: 'training',     bootstrapOrder: 21, tier: 'product-agrc',  alwaysOn: false },
  qiyas:        { moduleCode: 'qiyas',        mountPrefix: '/api/qiyas',         entitlementKey: 'qiyas',        navKey: 'qiyas',        permissionFamily: 'qiyas',        auditLabel: 'qiyas',        eventNamespace: 'qiyas',        bootstrapOrder: 22, tier: 'product-agrc',  alwaysOn: false },
  reporting:    { moduleCode: 'reporting',    mountPrefix: '/api/reports',        entitlementKey: 'reporting',    navKey: 'reporting',    permissionFamily: 'reporting',    auditLabel: 'reporting',    eventNamespace: 'reporting',    bootstrapOrder: 23, tier: 'product-agrc',  alwaysOn: false },
  analytics:    { moduleCode: 'analytics',    mountPrefix: '/api/analytics',     entitlementKey: 'analytics',    navKey: 'analytics',    permissionFamily: 'analytics',    auditLabel: 'analytics',    eventNamespace: 'analytics',    bootstrapOrder: 24, tier: 'product-agrc',  alwaysOn: false },

  // ── Edge / External ───────────────────────────────────────────────────
  integrations: { moduleCode: 'integrations', mountPrefix: '/api/integrations',  entitlementKey: 'integrations', navKey: 'integrations', permissionFamily: 'integrations', auditLabel: 'integrations', eventNamespace: 'integrations', bootstrapOrder: 25, tier: 'edge-external', alwaysOn: false },

  // ── Extended Modules ───────────────────────────────────────────────────
  issues:       { moduleCode: 'issues',       mountPrefix: '/api/issues',        entitlementKey: 'issues',       navKey: 'issues',       permissionFamily: 'issues',       auditLabel: 'issues',       eventNamespace: 'issues',       bootstrapOrder: 26, tier: 'product-agrc',  alwaysOn: false },
  inbox:        { moduleCode: 'inbox',        mountPrefix: '/api/inbox',         entitlementKey: 'inbox',        navKey: 'inbox',        permissionFamily: 'inbox',        auditLabel: 'inbox',        eventNamespace: 'inbox',        bootstrapOrder: 27, tier: 'platform-core', alwaysOn: false },
  portals:      { moduleCode: 'portals',      mountPrefix: '/api/portals',       entitlementKey: 'portals',      navKey: 'portals',      permissionFamily: 'portals',      auditLabel: 'portals',      eventNamespace: 'portals',      bootstrapOrder: 28, tier: 'edge-external', alwaysOn: false },
  records:      { moduleCode: 'records',      mountPrefix: '/api/records',       entitlementKey: 'records',      navKey: 'records',      permissionFamily: 'records',      auditLabel: 'records',      eventNamespace: 'records',      bootstrapOrder: 29, tier: 'product-agrc',  alwaysOn: false },
  privacy:      { moduleCode: 'privacy',      mountPrefix: '/api/privacy',       entitlementKey: 'privacy',      navKey: 'privacy',      permissionFamily: 'privacy',      auditLabel: 'privacy',      eventNamespace: 'privacy',      bootstrapOrder: 30, tier: 'product-agrc',  alwaysOn: false },
  controls:     { moduleCode: 'controls',     mountPrefix: '/api/controls',      entitlementKey: 'controls',     navKey: 'controls',     permissionFamily: 'controls',     auditLabel: 'controls',     eventNamespace: 'controls',     bootstrapOrder: 31, tier: 'product-agrc',  alwaysOn: false },
  onboarding:   { moduleCode: 'onboarding',   mountPrefix: '/api/onboarding',    entitlementKey: 'onboarding',   navKey: 'onboarding',   permissionFamily: 'onboarding',   auditLabel: 'onboarding',   eventNamespace: 'onboarding',   bootstrapOrder: 32, tier: 'platform-core', alwaysOn: true },
  dora:         { moduleCode: 'dora',         mountPrefix: '/api/dora',          entitlementKey: 'dora',         navKey: 'dora',         permissionFamily: 'dora',         auditLabel: 'dora',         eventNamespace: 'dora',         bootstrapOrder: 33, tier: 'product-agrc',  alwaysOn: false },
  journey:      { moduleCode: 'journey',      mountPrefix: '/api/journey',       entitlementKey: 'journey',      navKey: 'journey',      permissionFamily: 'journey',      auditLabel: 'journey',      eventNamespace: 'journey',      bootstrapOrder: 34, tier: 'product-agrc',  alwaysOn: false },
  'ksa-regulatory': { moduleCode: 'ksa-regulatory', mountPrefix: '/api/ksa-regulatory', entitlementKey: 'ksa-regulatory', navKey: 'ksa-regulatory', permissionFamily: 'ksa-regulatory', auditLabel: 'ksa-regulatory', eventNamespace: 'ksa_regulatory', bootstrapOrder: 35, tier: 'product-agrc', alwaysOn: false },
  'local-knowledge': { moduleCode: 'local-knowledge', mountPrefix: '/api/local-knowledge', entitlementKey: 'local-knowledge', navKey: 'local-knowledge', permissionFamily: 'local-knowledge', auditLabel: 'local-knowledge', eventNamespace: 'local_knowledge', bootstrapOrder: 36, tier: 'product-agrc', alwaysOn: false },
  packs: { moduleCode: 'packs', mountPrefix: '/api/packs', entitlementKey: 'packs', navKey: 'packs', permissionFamily: 'packs', auditLabel: 'packs', eventNamespace: 'packs', bootstrapOrder: 37, tier: 'product-agrc', alwaysOn: false },
  'proactive-leadership': { moduleCode: 'proactive-leadership', mountPrefix: '/api/proactive-leadership', entitlementKey: 'proactive-leadership', navKey: 'proactive-leadership', permissionFamily: 'proactive-leadership', auditLabel: 'proactive-leadership', eventNamespace: 'proactive_leadership', bootstrapOrder: 38, tier: 'product-agrc', alwaysOn: false },
  'agrc-engine': { moduleCode: 'agrc-engine', mountPrefix: '/api/agrc-engine', entitlementKey: 'agrc-engine', navKey: 'agrc-engine', permissionFamily: 'agrc-engine', auditLabel: 'agrc-engine', eventNamespace: 'agrc_engine', bootstrapOrder: 39, tier: 'platform-ai', alwaysOn: false },
  dashboard: { moduleCode: 'dashboard', mountPrefix: '/api/dashboard', entitlementKey: 'dashboard', navKey: 'dashboard', permissionFamily: 'dashboard', auditLabel: 'dashboard', eventNamespace: 'dashboard', bootstrapOrder: 40, tier: 'platform-core', alwaysOn: true },
  'governance-ai': { moduleCode: 'governance-ai', mountPrefix: '/api/governance-ai', entitlementKey: 'governance-ai', navKey: 'governance-ai', permissionFamily: 'governance-ai', auditLabel: 'governance-ai', eventNamespace: 'governance_ai', bootstrapOrder: 41, tier: 'platform-ai', alwaysOn: false },
  'governance-os': { moduleCode: 'governance-os', mountPrefix: '/api/governance-os', entitlementKey: 'governance-os', navKey: 'governance-os', permissionFamily: 'governance-os', auditLabel: 'governance-os', eventNamespace: 'governance_os', bootstrapOrder: 42, tier: 'product-agrc', alwaysOn: false },
  provisioning: { moduleCode: 'provisioning', mountPrefix: '/api/provisioning', entitlementKey: 'provisioning', navKey: 'provisioning', permissionFamily: 'provisioning', auditLabel: 'provisioning', eventNamespace: 'provisioning', bootstrapOrder: 43, tier: 'platform-core', alwaysOn: true },
  navigation: { moduleCode: 'navigation', mountPrefix: '/api/navigation', entitlementKey: 'navigation', navKey: 'navigation', permissionFamily: 'navigation', auditLabel: 'navigation', eventNamespace: 'navigation', bootstrapOrder: 44, tier: 'platform-core', alwaysOn: true },
  bootstrap: { moduleCode: 'bootstrap', mountPrefix: '/api/bootstrap', entitlementKey: 'bootstrap', navKey: 'bootstrap', permissionFamily: 'bootstrap', auditLabel: 'bootstrap', eventNamespace: 'bootstrap', bootstrapOrder: 45, tier: 'platform-core', alwaysOn: true },
  widgets: { moduleCode: 'widgets', mountPrefix: '/api/widgets', entitlementKey: 'widgets', navKey: 'widgets', permissionFamily: 'widgets', auditLabel: 'widgets', eventNamespace: 'widgets', bootstrapOrder: 46, tier: 'platform-core', alwaysOn: false },
  'quality-gate': { moduleCode: 'quality-gate', mountPrefix: '/api/quality-gate', entitlementKey: 'quality-gate', navKey: 'quality-gate', permissionFamily: 'quality-gate', auditLabel: 'quality-gate', eventNamespace: 'quality-gate', bootstrapOrder: 47, tier: 'platform-core', alwaysOn: false },
};

// ── Query Helpers ───────────────────────────────────────────────────────

export function getModuleEntry(code: CanonicalModuleCode): CanonicalModuleEntry {
  return CANONICAL_MODULE_REGISTRY[code];
}

export function getAlwaysOnModules(): CanonicalModuleCode[] {
  return Object.values(CANONICAL_MODULE_REGISTRY)
    .filter(e => e.alwaysOn)
    .map(e => e.moduleCode);
}

export function getModuleByMountPrefix(prefix: string): CanonicalModuleEntry | undefined {
  return Object.values(CANONICAL_MODULE_REGISTRY).find(e => e.mountPrefix === prefix);
}

// ── Registry Alignment Validation ───────────────────────────────────────

export function validateRegistryAlignment(): string[] {
  const errors: string[] = [];

  for (const code of getAllRegisteredModuleCodes()) {
    const entry = CANONICAL_MODULE_REGISTRY[code];
    if (!entry) {
      errors.push(`Missing registry entry for canonical module: ${code}`);
      continue;
    }

    // Check ownership matrix alignment
    const ownership = getModuleOwnership(code as CanonicalModuleCode);
    if (ownership.tier !== entry.tier) {
      errors.push(`Tier mismatch for ${code}: ownership-matrix says '${ownership.tier}', registry says '${entry.tier}'`);
    }
    if (ownership.mountPrefix !== entry.mountPrefix) {
      errors.push(`mountPrefix mismatch for ${code}: ownership-matrix says '${ownership.mountPrefix}', registry says '${entry.mountPrefix}'`);
    }
    if (ownership.permissionFamily !== entry.permissionFamily) {
      errors.push(`permissionFamily mismatch for ${code}: ownership-matrix says '${ownership.permissionFamily}', registry says '${entry.permissionFamily}'`);
    }

    // Check event contracts alignment
    const eventContract = MODULE_EVENT_CONTRACTS[code];
    if (!eventContract) {
      errors.push(`Missing event contract for canonical module: ${code}`);
    }
  }

  return errors;
}
