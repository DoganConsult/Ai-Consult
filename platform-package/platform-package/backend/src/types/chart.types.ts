/** Result of a Monte Carlo risk simulation. */
export interface MonteCarloResult {
  distribution: number[];
  mean: number;
  stdDev: number;
  percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number };
  meta?: { capped?: boolean; partial?: boolean };
}
export type WidgetDataEnvelope = any;
export type RiskHeatmapData = any;
export type ComplianceTrendData = any;
export type VendorBubbleData = any;
export type MaturityRadarData = any;
export type FindingsBarData = any;
export type EvidenceDonutData = any;
export type ControlSankeyData = any;
