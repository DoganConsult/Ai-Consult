// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../../config/database';
import { getFirstRow } from '../../../../utils/db-utils';

const PII_PATTERNS: { name: string; regex: RegExp; replacement: string }[] = [
  { name: 'credit_card', regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, replacement: '[REDACTED_CC]' },
  { name: 'ssn_us', regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED_SSN]' },
  { name: 'national_id_sa', regex: /\b[12]\d{9}\b/g, replacement: '[REDACTED_NID]' },
  { name: 'iban', regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/g, replacement: '[REDACTED_IBAN]' },
  { name: 'email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[REDACTED_EMAIL]' },
  { name: 'phone_intl', regex: /\b\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g, replacement: '[REDACTED_PHONE]' },
  { name: 'ip_address', regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[REDACTED_IP]' },
  { name: 'api_key', regex: /\b(sk|pk|api|key|token|secret|password)[_-]?[A-Za-z0-9]{16,}\b/gi, replacement: '[REDACTED_KEY]' },
  { name: 'jwt', regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, replacement: '[REDACTED_JWT]' },
];

export interface RedactionResult {
  text: string;
  redacted: boolean;
  patternsFound: string[];
}

export function redactPII(text: string, enabledPatterns?: string[]): RedactionResult {
  let result = text;
  const found: string[] = [];

  for (const pattern of PII_PATTERNS) {
    if (enabledPatterns && !enabledPatterns.includes(pattern.name)) continue;
    if (pattern.regex.test(result)) {
      found.push(pattern.name);
      result = result.replace(pattern.regex, pattern.replacement);
    }
    pattern.regex.lastIndex = 0;
  }

  return { text: result, redacted: found.length > 0, patternsFound: found };
}

export async function shouldRedactForUser(tenantId: string, userId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT pii_redaction_enabled FROM "${schema}".shadow_agent_config
       WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId],
    );
    return getFirstRow(result)?.pii_redaction_enabled ?? true;
  } catch {
    return true;
  }
}
