// ============================================================================
// Global Frameworks — Populated with Controls
// Re-exports global frameworks from global-frameworks.ts with domains
// filled in from global-framework-controls.ts
// ============================================================================

import { FrameworkDef } from "./ksa-frameworks";
import { GLOBAL_FRAMEWORKS as RAW_GLOBAL_FRAMEWORKS } from "./global-frameworks";
import { GLOBAL_DOMAIN_MAP } from "./global-framework-controls";

/**
 * Populate each global framework with its domain definitions.
 * If a framework has an entry in GLOBAL_DOMAIN_MAP, use those domains.
 * Otherwise, keep the original (empty) domains.
 */
export const GLOBAL_FRAMEWORKS: FrameworkDef[] = RAW_GLOBAL_FRAMEWORKS.map((fw) => {
  const domains = GLOBAL_DOMAIN_MAP[fw.instrumentId];
  if (domains && domains.length > 0) {
    return { ...fw, domains };
  }
  return fw;
});
