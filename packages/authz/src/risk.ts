import type { AgentsRuntime } from '@dogan/agents';

export type RiskBand = 'low' | 'medium' | 'high' | 'critical';

export interface AuthSignal {
  tenantId: string;
  userId?: string;
  kind: string;
  ip?: string;
  userAgent?: string;
  country?: string;
  knownIps?: string[];
  knownCountries?: string[];
  recentFailures?: number;
  hourOfDayUtc?: number;
  isNewDevice?: boolean;
}

export interface RiskDecision {
  score: number;          // 0..100
  band: RiskBand;
  factors: Record<string, number>;
  model: string;          // identifier of the engine/model used
}

const FACTOR_WEIGHTS = {
  newCountry: 35,
  newIp: 15,
  recentFailures: 25,
  unusualHour: 10,
  newDevice: 10,
  knownGoodSignal: -15,
  loginFailureKind: 20,
};

function band(score: number): RiskBand {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

/**
 * RiskEngine produces a deterministic baseline risk score from rule-based
 * factors, optionally enriched by a kernel-built-in agent (LangChain via
 * LiteLLM) when configured. The agent path runs only when AgentsRuntime is
 * provided AND langsmith/llm is configured; the rule path always runs and
 * is the authoritative floor.
 */
export class RiskEngine {
  constructor(private readonly agents?: AgentsRuntime) {}

  async score(signal: AuthSignal): Promise<RiskDecision> {
    const factors: Record<string, number> = {};

    if (signal.country && signal.knownCountries && signal.knownCountries.length > 0
        && !signal.knownCountries.includes(signal.country)) {
      factors.newCountry = FACTOR_WEIGHTS.newCountry;
    }
    if (signal.ip && signal.knownIps && signal.knownIps.length > 0
        && !signal.knownIps.includes(signal.ip)) {
      factors.newIp = FACTOR_WEIGHTS.newIp;
    }
    if (signal.recentFailures && signal.recentFailures > 0) {
      factors.recentFailures = Math.min(
        FACTOR_WEIGHTS.recentFailures,
        signal.recentFailures * 5,
      );
    }
    if (typeof signal.hourOfDayUtc === 'number'
        && (signal.hourOfDayUtc < 5 || signal.hourOfDayUtc > 23)) {
      factors.unusualHour = FACTOR_WEIGHTS.unusualHour;
    }
    if (signal.isNewDevice) factors.newDevice = FACTOR_WEIGHTS.newDevice;
    if (signal.kind === 'login.failure') factors.loginFailureKind = FACTOR_WEIGHTS.loginFailureKind;
    if (signal.kind === 'login.success' && (factors.newCountry ?? 0) === 0
        && (factors.newIp ?? 0) === 0) {
      factors.knownGoodSignal = FACTOR_WEIGHTS.knownGoodSignal;
    }

    const baseScore = clamp(
      Object.values(factors).reduce((a, b) => a + b, 0),
      0, 100,
    );

    let model = 'rule.v1';
    let finalScore = baseScore;

    if (this.agents) {
      const enriched = await this.enrich(signal, baseScore, factors);
      if (enriched !== null) {
        finalScore = clamp(Math.round((baseScore + enriched.score) / 2), 0, 100);
        factors.aiAdjustment = enriched.score - baseScore;
        model = `rule.v1+${enriched.model}`;
      }
    }

    return { score: finalScore, band: band(finalScore), factors, model };
  }

  private async enrich(
    signal: AuthSignal,
    baseScore: number,
    factors: Record<string, number>,
  ): Promise<{ score: number; model: string } | null> {
    if (!this.agents) return null;
    try {
      const desc = this.agents.describe();
      if (!desc.langsmith && !desc.liteLlm) return null;
      const prompt = `You are a security risk classifier. Return strict JSON {"score":0-100}.
Signal: ${JSON.stringify({ ...signal, baseScore, factors })}`;
      const res = await this.agents.chat({
        tenantId: signal.tenantId,
        userId: signal.userId,
        productId: 'dauth',
        system: 'Output only JSON: {"score": number}. No prose.',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        maxTokens: 32,
      });
      const m = /\{[^}]*"score"\s*:\s*(\d+)[^}]*\}/.exec(res.content);
      if (!m) return null;
      const n = clamp(parseInt(m[1]!, 10), 0, 100);
      return { score: n, model: res.model };
    } catch {
      return null;
    }
  }
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
