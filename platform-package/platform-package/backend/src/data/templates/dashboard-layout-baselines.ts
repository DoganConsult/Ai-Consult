/**
 * Server-side baseline dashboard layouts when tenant `dashboard_layouts` has no row.
 * Kept in sync with frontend `dashboard.registry.ts` widget keys/placements (regenerate JSON if FE changes).
 */
import baselines from './dashboard-layout-baselines.json';

type BaselineEntry = { nameEn: string; nameAr: string | null; widgets: { id: string; x: number; y: number; w: number; h: number }[] };

const BASE = baselines as Record<string, BaselineEntry>;

export function getBaselineDashboardLayoutPayload(dashboardCode: string): {
  layoutId: string;
  dashboardCode: string;
  nameEn: string;
  nameAr: string | null;
  layout: { widgets: { id: string; x: number; y: number; w: number; h: number }[] };
  audience: string;
  sortOrder: number;
} | null {
  const b = BASE[dashboardCode];
  if (!b) return null;
  return {
    layoutId: `baseline-${dashboardCode}`,
    dashboardCode,
    nameEn: b.nameEn,
    nameAr: b.nameAr ?? null,
    layout: { widgets: b.widgets },
    audience: 'all',
    sortOrder: 0,
  };
}

export function listBaselineDashboardCodes(): string[] {
  return Object.keys(BASE);
}
