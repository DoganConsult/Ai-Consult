// @ts-nocheck
// ============================================
// Shahin AI-KSA GRC — KSA Regulator Registry (barrel)
// Re-exports all category arrays and the combined KSA_REGULATORS_FULL array
// ============================================



import { REGS_CYBERSECURITY } from "./cybersecurity";
import { REGS_FINANCE } from "./finance";
import { REGS_HEALTH } from "./health";
import { REGS_ENERGY } from "./energy";
import { REGS_TELECOM } from "./telecom";
import { REGS_TAX_COMMERCE } from "./tax-commerce";
import { REGS_TRANSPORT } from "./transport";
import { REGS_GOVERNMENT } from "./government";
import { REGS_LABOR } from "./labor";
import { REGS_EDUCATION } from "./education";
import { REGS_ENVIRONMENT } from "./environment";
import { REGS_TOURISM } from "./tourism";
import { REGS_DEFENSE } from "./defense";
import { REGS_HAJJ } from "./hajj";
import { REGS_CONSTRUCTION } from "./construction";
import { REGS_MEDIA } from "./media";
import { REGS_MINING } from "./mining";
import { REGS_SPECIAL_ZONES } from "./special-zones";
import { REGS_NUCLEAR } from "./nuclear";
import { REGS_DIGITAL } from "./digital";
import { REGS_NONPROFIT } from "./nonprofit";
import { REGS_INTERNATIONAL } from "./international";
import { RegulatorDef } from '../ksa-frameworks/ksa-frameworks';

// Re-export individual category arrays for selective imports
export {
  REGS_CYBERSECURITY,
  REGS_FINANCE,
  REGS_HEALTH,
  REGS_ENERGY,
  REGS_TELECOM,
  REGS_TAX_COMMERCE,
  REGS_TRANSPORT,
  REGS_GOVERNMENT,
  REGS_LABOR,
  REGS_EDUCATION,
  REGS_ENVIRONMENT,
  REGS_TOURISM,
  REGS_DEFENSE,
  REGS_HAJJ,
  REGS_CONSTRUCTION,
  REGS_MEDIA,
  REGS_MINING,
  REGS_SPECIAL_ZONES,
  REGS_NUCLEAR,
  REGS_DIGITAL,
  REGS_NONPROFIT,
  REGS_INTERNATIONAL,
};

/**
 * Combined array of all 120+ KSA regulators, preserving the original order.
 * Drop-in replacement for the original KSA_REGULATORS_FULL export.
 */
export const KSA_REGULATORS_FULL: RegulatorDef[] = [
  ...REGS_CYBERSECURITY,
  ...REGS_FINANCE,
  ...REGS_HEALTH,
  ...REGS_ENERGY,
  ...REGS_TELECOM,
  ...REGS_TAX_COMMERCE,
  ...REGS_TRANSPORT,
  ...REGS_GOVERNMENT,
  ...REGS_LABOR,
  ...REGS_EDUCATION,
  ...REGS_ENVIRONMENT,
  ...REGS_TOURISM,
  ...REGS_DEFENSE,
  ...REGS_HAJJ,
  ...REGS_CONSTRUCTION,
  ...REGS_MEDIA,
  ...REGS_MINING,
  ...REGS_SPECIAL_ZONES,
  ...REGS_NUCLEAR,
  ...REGS_DIGITAL,
  ...REGS_NONPROFIT,
  ...REGS_INTERNATIONAL,
];

/**
 * Map of category label to its regulator array for convenient per-category access.
 */
export const KSA_REGULATORS_BY_CATEGORY: Record<string, RegulatorDef[]> = {
  cybersecurity: REGS_CYBERSECURITY,
  finance: REGS_FINANCE,
  health: REGS_HEALTH,
  energy: REGS_ENERGY,
  telecom: REGS_TELECOM,
  tax_commerce: REGS_TAX_COMMERCE,
  transport: REGS_TRANSPORT,
  government: REGS_GOVERNMENT,
  labor: REGS_LABOR,
  education: REGS_EDUCATION,
  environment: REGS_ENVIRONMENT,
  tourism: REGS_TOURISM,
  defense: REGS_DEFENSE,
  hajj: REGS_HAJJ,
  construction: REGS_CONSTRUCTION,
  media: REGS_MEDIA,
  mining: REGS_MINING,
  special_zone: REGS_SPECIAL_ZONES,
  nuclear: REGS_NUCLEAR,
  digital: REGS_DIGITAL,
  nonprofit: REGS_NONPROFIT,
  international: REGS_INTERNATIONAL,
};
