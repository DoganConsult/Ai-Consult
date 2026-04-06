import { safeQuery, tenantSchema } from '../../../../config/database';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';
import { computeAgentTrustScore, getAgentProfile } from './agent-actor-profile.service';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

export type PlatformMode = 'human' | 'hybrid' | 'shadow_agent' | 'full_autonomous';

export interface ProgressionGate {
  targetMode: PlatformMode;
  minAccuracyRate: number;
  maxOverrideRate: number;
  minTotalActions: number;
  requiresBoardApproval: boolean;
}

const PROGRESSION_GATES: ProgressionGate[] = [
  { targetMode: 'hybrid',          minAccuracyRate: 0.80, maxOverrideRate: 0.30, minTotalActions: 0,      requiresBoardApproval: false },
  { targetMode: 'shadow_agent',    minAccuracyRate: 0.90, maxOverrideRate: 0.15, minTotalActions: 500,    requiresBoardApproval: false },
  { targetMode: 'full_autonomous', minAccuracyRate: 0.98, maxOverrideRate: 0.02, minTotalActions: 10000,  requiresBoardApproval: true },
];

const MODE_ORDER: PlatformMode[] = ['human', 'hybrid', 'shadow_agent', 'full_autonomous'];

export interface ProgressionResult {
  agentCode: string;
  currentMode: PlatformMode;
  eligibleMode: PlatformMode;
  promoted: boolean;
  reason: string;
  trustScore: number;
  accuracyRate: number;
  overrideRate: number;
  totalActions: number;
  gateDetails: Array<{
    targetMode: PlatformMode;
    passed: boolean;
    failReasons: string[];
  }>;
}

export function getProgressionGates(): ProgressionGate[] {
  return PROGRESSION_GATES;
}

export async function evaluateAgentProgression(
  tenantId: string,
  agentCode: string,
  boardApprovalGranted = false,
): Promise<ProgressionResult> {
  const trustResult = await computeAgentTrustScore(tenantId, agentCode);
  const trustScore = trustResult.score;
  const accuracyRate = trustResult.factors['successRate'] ?? 0;
  const overrideRate = 1 - (trustResult.factors['approvalRate'] ?? 1);
  const totalActions = trustResult.factors['totalRuns'] ?? 0;
  const profile = await getAgentProfile(tenantId, agentCode);
  const currentMode = (profile?.maxAutonomyLevel as PlatformMode) || 'human';
  const currentIdx = MODE_ORDER.indexOf(currentMode);

  let eligibleMode: PlatformMode = 'human';
  const gateDetails: ProgressionResult['gateDetails'] = [];

  for (const gate of PROGRESSION_GATES) {
    const fails: string[] = [];

    if (accuracyRate < gate.minAccuracyRate)
      fails.push(`accuracy ${(accuracyRate * 100).toFixed(1)}% < required ${(gate.minAccuracyRate * 100)}%`);
    if (overrideRate > gate.maxOverrideRate)
      fails.push(`override rate ${(overrideRate * 100).toFixed(1)}% > max ${(gate.maxOverrideRate * 100)}%`);
    if (totalActions < gate.minTotalActions)
      fails.push(`total actions ${totalActions} < required ${gate.minTotalActions}`);
    if (gate.requiresBoardApproval && !boardApprovalGranted)
      fails.push('board/CISO approval required');

    const passed = fails.length === 0;
    gateDetails.push({ targetMode: gate.targetMode, passed, failReasons: fails });

    if (passed) {
      eligibleMode = gate.targetMode;
    }
  }

  const eligibleIdx = MODE_ORDER.indexOf(eligibleMode);
  const promoted = eligibleIdx > currentIdx;
  let reason: string;

  if (promoted) {
    reason = `Agent eligible for promotion from ${currentMode} to ${eligibleMode}`;
  } else if (eligibleIdx === currentIdx) {
    reason = `Agent operating at correct level (${currentMode})`;
  } else {
    reason = `Agent metrics suggest demotion from ${currentMode} to ${eligibleMode}`;
  }

  if (promoted && profile) {
    const schema = tenantSchema(tenantId);
    await swallowDefault(EC.FALLBACK_QUERY, undefined, safeQuery(
      `UPDATE "${schema}".agent_profiles
       SET max_autonomy_level = $1, updated_at = NOW()
       WHERE agent_code = $2`,
      [eligibleMode, agentCode],
    ), { tenantId, operation: 'promote_agent' });
    logger.info(`[AutonomyProgression] Agent ${agentCode} promoted: ${currentMode} → ${eligibleMode}`);
  }

  return {
    agentCode,
    currentMode,
    eligibleMode,
    promoted,
    reason,
    trustScore,
    accuracyRate,
    overrideRate,
    totalActions,
    gateDetails,
  };
}

export async function enforceAutonomyGate(
  tenantId: string,
  agentCode: string,
  requestedMode: PlatformMode,
): Promise<{ allowed: boolean; reason: string }> {
  const trustResult2 = await computeAgentTrustScore(tenantId, agentCode);
  const accuracyRate = trustResult2.factors['successRate'] ?? 0;
  const overrideRate = 1 - (trustResult2.factors['approvalRate'] ?? 1);
  const totalActions = trustResult2.factors['totalRuns'] ?? 0;
  const modeIdx = MODE_ORDER.indexOf(requestedMode);

  for (const gate of PROGRESSION_GATES) {
    if (MODE_ORDER.indexOf(gate.targetMode) > modeIdx) continue;
    if (gate.targetMode !== requestedMode) continue;

    const fails: string[] = [];
    if (accuracyRate < gate.minAccuracyRate)
      fails.push(`accuracy ${(accuracyRate * 100).toFixed(1)}% < ${(gate.minAccuracyRate * 100)}%`);
    if (overrideRate > gate.maxOverrideRate)
      fails.push(`override rate ${(overrideRate * 100).toFixed(1)}% > ${(gate.maxOverrideRate * 100)}%`);
    if (totalActions < gate.minTotalActions)
      fails.push(`actions ${totalActions} < ${gate.minTotalActions}`);

    if (fails.length > 0) {
      return { allowed: false, reason: `Gate blocked: ${fails.join('; ')}` };
    }
  }

  return { allowed: true, reason: `Agent meets all gates for ${requestedMode}` };
}
