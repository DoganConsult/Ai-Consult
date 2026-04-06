import { logger } from '../../observability/logger.service';
import type { MappingDefinition, MappingRule, MappingValidationPolicy, MappingFailurePolicy } from '../contracts/integration.types';

const mappingRegistry = new Map<string, MappingDefinition>();

export function registerMapping(mapping: MappingDefinition): void {
  mappingRegistry.set(mapping.mappingId, mapping);
  logger.info('[MappingValidator] Mapping registered', {
    mappingId: mapping.mappingId,
    connectorCode: mapping.connectorCode,
    sourceContract: mapping.sourceContract,
    targetContract: mapping.targetContract,
  });
}

export function getMapping(mappingId: string): MappingDefinition | null {
  return mappingRegistry.get(mappingId) ?? null;
}

export function getMappingByContracts(
  connectorCode: string,
  sourceContract: string,
  targetContract: string,
): MappingDefinition | null {
  for (const m of mappingRegistry.values()) {
    if (m.connectorCode === connectorCode && m.sourceContract === sourceContract && m.targetContract === targetContract) {
      return m;
    }
  }
  return null;
}

export function listMappingsByConnector(connectorCode: string): MappingDefinition[] {
  return Array.from(mappingRegistry.values()).filter((m) => m.connectorCode === connectorCode);
}

export interface MappingValidationResult {
  valid: boolean;
  failurePolicy: MappingFailurePolicy;
  violations: string[];
  mappedPayload: Record<string, unknown> | null;
}

export function applyMapping(
  mappingId: string,
  sourcePayload: Record<string, unknown>,
): MappingValidationResult {
  const mapping = mappingRegistry.get(mappingId);
  if (!mapping) {
    return { valid: false, failurePolicy: 'reject', violations: [`Mapping not found: ${mappingId}`], mappedPayload: null };
  }
  return validateAndMap(sourcePayload, mapping.rules, mapping.validationPolicy, mapping.failurePolicy);
}

export function applyMappingByContracts(
  connectorCode: string,
  sourceContract: string,
  targetContract: string,
  sourcePayload: Record<string, unknown>,
): MappingValidationResult {
  const mapping = getMappingByContracts(connectorCode, sourceContract, targetContract);
  if (!mapping) {
    return {
      valid: false,
      failurePolicy: 'reject',
      violations: [`No mapping for ${connectorCode}: ${sourceContract} -> ${targetContract}`],
      mappedPayload: null,
    };
  }
  return validateAndMap(sourcePayload, mapping.rules, mapping.validationPolicy, mapping.failurePolicy);
}

function validateAndMap(
  source: Record<string, unknown>,
  rules: MappingRule[],
  policy: MappingValidationPolicy,
  failurePolicy: MappingFailurePolicy,
): MappingValidationResult {
  const violations: string[] = [];
  const mapped: Record<string, unknown> = {};
  let nullCount = 0;
  let totalMapped = 0;

  for (const rule of rules) {
    const value = resolveField(source, rule.sourceField);

    if (value === undefined || value === null) {
      nullCount++;
      if (rule.required) {
        if (policy.rejectOnMissingRequired) {
          violations.push(`Required field missing: ${rule.sourceField}`);
          continue;
        }
      }
      mapped[rule.targetField] = null;
    } else {
      const transformed = applyTransform(value, rule.transform);
      mapped[rule.targetField] = rule.redact ? '[REDACTED]' : transformed;
    }
    totalMapped++;
  }

  if (totalMapped > 0 && policy.maxAllowedNullPercent < 100) {
    const nullPercent = (nullCount / totalMapped) * 100;
    if (nullPercent > policy.maxAllowedNullPercent) {
      violations.push(
        `Null rate ${nullPercent.toFixed(1)}% exceeds maximum allowed ${policy.maxAllowedNullPercent}%`,
      );
    }
  }

  const valid = violations.length === 0;
  return {
    valid,
    failurePolicy,
    violations,
    mappedPayload: valid || failurePolicy === 'partial-accept' ? mapped : null,
  };
}

function resolveField(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((curr, key) => {
    if (curr && typeof curr === 'object') return (curr as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function applyTransform(value: unknown, transform?: string): unknown {
  if (!transform) return value;
  switch (transform) {
    case 'toString': return String(value);
    case 'toNumber': return Number(value);
    case 'toBoolean': return Boolean(value);
    case 'toUpperCase': return typeof value === 'string' ? value.toUpperCase() : value;
    case 'toLowerCase': return typeof value === 'string' ? value.toLowerCase() : value;
    case 'trim': return typeof value === 'string' ? value.trim() : value;
    default: return value;
  }
}
