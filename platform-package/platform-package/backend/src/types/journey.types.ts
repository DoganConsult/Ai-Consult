export { GenericRow } from './db-rows.types';

/** Company profile used during onboarding journey and RACI generation. */
export interface CompanyProfile {
  size: 'small' | 'medium' | 'large';
  sectorId: string;
  tenantId?: string;
  companyName?: string;
  country?: string;
  [key: string]: unknown;
}

/** A single RACI assignment entry. */
export interface RaciEntry {
  activity: string;
  responsible: string;
  accountable: string;
  consulted: string[];
  informed: string[];
}

/** A full RACI matrix for a company. */
export interface RaciMatrix {
  tenantId?: string;
  entries: RaciEntry[];
  roles?: Array<{ roleId: string; roleName: string; assignedUserId?: string }>;
  generatedAt: string;
  companySize?: string;
  sectorId?: string;
}

/** Team structure recommendation from RACI analysis. */
export interface RaciTeamRecommendation {
  recommendedRoles: Array<{
    roleId: string;
    roleName: string;
    description: string;
    isCritical: boolean;
  }>;
  minimumTeamSize: number;
  notes?: string[];
  consolidationSuggestions?: Array<Record<string, unknown>>;
}
export type GrcTermDefinition = any;
export type FrameworkRecommendation = any;
export type RoadmapTask = any;
export type GRCRoadmap = any;
export type RoadmapPhaseType = any;
export type MaturityScore = any;
export type MaturityComponent = any;
export type TrendPoint = any;
export type PhaseProgress = any;
export type ExecutiveSummary = any;
export type MaturityTrend = any;
export type GrcHealthReport = any;
export type GuidanceCard = any;
export type JourneyProgress = any;
export type GrcStage = any;
export type GrcStep = any;
export type GrcRoadmap = any;
export type JourneyState = any;
export type JourneyPhase = any;
export type Nudge = any;
export type RoadmapPhase = any;
export type Milestone = any;
export type RegulatoryMap = any;
export type ActivatedTemplate = any;
export type AIContent = any;
export type ProcessTemplate = any;
export type JourneyCompanyProfile = any;
export type RoleRecommendation = any;
export type CompanySize = any;
