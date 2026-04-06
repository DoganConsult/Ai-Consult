// @ts-nocheck
// ============================================
// Shahin AI-KSA GRC — Master Aggregator
// Exports ALL_REGULATORS, ALL_FRAMEWORKS, ALL_SECTORS
// from all modular data files
// ============================================

import { RegulatorDef, FrameworkDef } from "./ksa-frameworks";
import { SectorDef, KSA_SECTORS } from "./ksa-sectors";
import { KSA_REGULATORS_FULL } from "./ksa-regulators";
import { NCA_FRAMEWORKS } from "./ksa-fw-nca";
import { SAMA_FRAMEWORKS } from "./ksa-fw-sama";
import { SDAIA_FRAMEWORKS } from "./ksa-fw-sdaia";
import { CST_FRAMEWORKS } from "./ksa-fw-cst";
import { CMA_FRAMEWORKS } from "./ksa-fw-cma";
import { ZATCA_FRAMEWORKS } from "./ksa-fw-zatca";
import { HEALTH_FRAMEWORKS } from "./ksa-fw-health";
import { ENERGY_FRAMEWORKS } from "./ksa-fw-energy";
import { TRANSPORT_FRAMEWORKS } from "./ksa-fw-transport";
import { GOV_FRAMEWORKS } from "./ksa-fw-gov";
import { LABOR_COMMERCE_FRAMEWORKS } from "./ksa-fw-labor-commerce";
import { DIGITAL_FRAMEWORKS } from "./ksa-fw-digital";
import { EDUCATION_FRAMEWORKS } from "./ksa-fw-education";
import { ENVIRONMENT_FRAMEWORKS } from "./ksa-fw-environment";
import { VISION2030_FRAMEWORKS } from "./ksa-fw-vision2030";
import { INTL_FRAMEWORKS } from "./ksa-fw-intl";
import { ALL_CROSS_MAPPINGS, CrossMappingDef } from "./ksa-cross-mappings";
import { BULK_FRAMEWORKS } from "./ksa-bulk-controls";
import { BULK_FRAMEWORKS_2 } from "./ksa-bulk-controls-2";
import { BULK_FRAMEWORKS_3 } from "./ksa-bulk-controls-3";
import { REGULATOR_FRAMEWORKS_BATCH4 } from "./ksa-fw-regulators-batch4";
import { REGULATOR_FRAMEWORKS_BATCH5 } from "./ksa-fw-regulators-batch5";
import { REGULATOR_FRAMEWORKS_BATCH6 } from "./ksa-fw-regulators-batch6";
import { GLOBAL_REGULATORS } from "./global-regulators";
import { GLOBAL_FRAMEWORKS } from "./global-frameworks-populated";
import { GLOBAL_SECTORS } from "./global-sectors";

// ── All Regulators (120+ KSA + 79 Global) ──
export const ALL_REGULATORS: RegulatorDef[] = [...KSA_REGULATORS_FULL, ...GLOBAL_REGULATORS];

// ── All Frameworks (48+ instruments, 4000+ controls) ──
export const ALL_FRAMEWORKS: FrameworkDef[] = [
  ...NCA_FRAMEWORKS,
  ...SAMA_FRAMEWORKS,
  ...SDAIA_FRAMEWORKS,
  ...CST_FRAMEWORKS,
  ...CMA_FRAMEWORKS,
  ...ZATCA_FRAMEWORKS,
  ...HEALTH_FRAMEWORKS,
  ...ENERGY_FRAMEWORKS,
  ...TRANSPORT_FRAMEWORKS,
  ...GOV_FRAMEWORKS,
  ...LABOR_COMMERCE_FRAMEWORKS,
  ...DIGITAL_FRAMEWORKS,
  ...EDUCATION_FRAMEWORKS,
  ...ENVIRONMENT_FRAMEWORKS,
  ...VISION2030_FRAMEWORKS,
  ...INTL_FRAMEWORKS,
  ...BULK_FRAMEWORKS,
  ...BULK_FRAMEWORKS_2,
  ...BULK_FRAMEWORKS_3,
  ...REGULATOR_FRAMEWORKS_BATCH4,
  ...REGULATOR_FRAMEWORKS_BATCH5,
  ...REGULATOR_FRAMEWORKS_BATCH6,
  ...GLOBAL_FRAMEWORKS,
];

// ── All Sectors (42+ KSA + 80+ Global) ──
export const ALL_SECTORS: SectorDef[] = [...KSA_SECTORS, ...GLOBAL_SECTORS];

// ── All Cross-Mappings ──
export const ALL_MAPPINGS: CrossMappingDef[] = ALL_CROSS_MAPPINGS;

// ── Stats helper ──
export function getRegistryStats() {
  let totalControls = 0;
  let totalDomains = 0;
  let totalSubdomains = 0;
  for (const fw of ALL_FRAMEWORKS) {
    for (const d of fw.domains) {
      totalDomains++;
      for (const s of d.subdomains) {
        totalSubdomains++;
        totalControls += s.controls.length;
      }
    }
  }
  return {
    regulators: ALL_REGULATORS.length,
    frameworks: ALL_FRAMEWORKS.length,
    domains: totalDomains,
    subdomains: totalSubdomains,
    controls: totalControls,
    sectors: ALL_SECTORS.length,
    crossMappings: ALL_MAPPINGS.length,
  };
}
