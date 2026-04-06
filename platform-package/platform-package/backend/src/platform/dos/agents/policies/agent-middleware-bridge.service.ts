import type { AgentRunRequest } from '../contracts/agent.types';

export interface MiddlewareCheckResult {
  passed: boolean;
  blocked: boolean;
  reason?: string;
  redacted: boolean;
  redactionCount?: number;
  redactionTypes?: string[];
}

export async function runInjectionGuard(
  input: Record<string, unknown>,
): Promise<{ safe: boolean; reason?: string }> {
  try {
    const userMessage = (input.userMessage as string) || (input.message as string) || '';
    if (!userMessage) return { safe: true };

    const INJECTION_PATTERNS = [
      /ignore (previous|above|all) instructions/i,
      /you are now/i,
      /forget (your|all) (instructions|training)/i,
      /act as (a |an )?(different|new|unrestricted)/i,
      /jailbreak/i,
      /DAN mode/i,
      /bypass (safety|filters|restrictions)/i,
      /\bsystem\s*:\s*ignore\b/i,
    ];

    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(userMessage)) {
        return { safe: false, reason: 'prompt_injection_detected' };
      }
    }
    return { safe: true };
  } catch {
    return { safe: true };
  }
}

export async function runOutputRedaction(
  output: Record<string, unknown>,
): Promise<{ redacted: Record<string, unknown>; redactionCount: number; redactionTypes: string[] }> {
  try {
    const { redactSensitiveContent } = await import('../../../../ai/security/output-redaction.middleware');
    const outputStr = JSON.stringify(output);
    const result = redactSensitiveContent(outputStr);
    if (result.redactionCount === 0) {
      return { redacted: output, redactionCount: 0, redactionTypes: [] };
    }
    return {
      redacted: JSON.parse(result.redacted),
      redactionCount: result.redactionCount,
      redactionTypes: result.redactionTypes,
    };
  } catch {
    return { redacted: output, redactionCount: 0, redactionTypes: [] };
  }
}

export async function runPreExecutionMiddleware(
  request: AgentRunRequest,
): Promise<MiddlewareCheckResult> {
  const injectionResult = await runInjectionGuard(request.input);
  if (!injectionResult.safe) {
    return {
      passed: false,
      blocked: true,
      reason: injectionResult.reason,
      redacted: false,
    };
  }

  return { passed: true, blocked: false, redacted: false };
}

export async function runPostExecutionMiddleware(
  output: Record<string, unknown>,
): Promise<{ output: Record<string, unknown>; middlewareResult: MiddlewareCheckResult }> {
  const redactionResult = await runOutputRedaction(output);
  return {
    output: redactionResult.redacted,
    middlewareResult: {
      passed: true,
      blocked: false,
      redacted: redactionResult.redactionCount > 0,
      redactionCount: redactionResult.redactionCount,
      redactionTypes: redactionResult.redactionTypes,
    },
  };
}

export const agentMiddlewareBridgeService = {
  runInjectionGuard,
  runOutputRedaction,
  runPreExecutionMiddleware,
  runPostExecutionMiddleware,
};
