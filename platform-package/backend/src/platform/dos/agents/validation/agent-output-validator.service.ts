import { getAgentDefinition } from '../registry/agent-registry.service';

export interface OutputValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateAgentOutput(
  agentCode: string,
  output: Record<string, unknown>,
): Promise<OutputValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (output === null || output === undefined) {
    errors.push('output must not be null or undefined');
    return { valid: false, errors, warnings };
  }

  if (typeof output !== 'object' || Array.isArray(output)) {
    errors.push('output must be a plain object');
    return { valid: false, errors, warnings };
  }

  const def = getAgentDefinition(agentCode);
  if (!def) {
    warnings.push('agent_definition_not_found_skipping_policy_validation');
    return { valid: errors.length === 0, errors, warnings };
  }

  if (def.executionMode === 'observe-only') {
    if (output.mutations && Array.isArray(output.mutations) && output.mutations.length > 0) {
      errors.push('observe-only agent must not produce mutations');
    }
  }

  if (def.executionMode === 'advisory') {
    if (output.directActions && Array.isArray(output.directActions) && output.directActions.length > 0) {
      errors.push('advisory agent must not produce direct actions');
    }
  }

  if (output.sensitiveData) {
    warnings.push('output contains sensitiveData field — ensure audit compliance');
  }

  const maxOutputKeys = 100;
  if (Object.keys(output).length > maxOutputKeys) {
    warnings.push(`output has ${Object.keys(output).length} keys — consider consolidation`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

export const agentOutputValidatorService = {
  validateAgentOutput,
};
