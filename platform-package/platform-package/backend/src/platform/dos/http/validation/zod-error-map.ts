/**
 * GRC Global Zod Error Map — enterprise-grade error messages.
 * Registered at server startup via z.setErrorMap().
 *
 * Zod v4 issue codes:
 *   invalid_type, too_big, too_small, invalid_format, not_multiple_of,
 *   unrecognized_keys, invalid_union, invalid_key, invalid_element,
 *   invalid_value, custom
 */

import { z } from 'zod';

export function grcErrorMap(issue: { code: string; message: string; [k: string]: unknown }): string {
  switch (issue.code) {
    case 'too_small': {
      const origin = issue.origin as string | undefined;
      const minimum = issue.minimum as number | undefined;
      if (origin === 'string') {
        if (minimum === 1) return 'This field is required';
        return `Must be at least ${minimum} characters`;
      }
      if (origin === 'number') return `Must be at least ${minimum}`;
      if (origin === 'array') return `Must contain at least ${minimum} item(s)`;
      return issue.message;
    }

    case 'too_big': {
      const origin = issue.origin as string | undefined;
      const maximum = issue.maximum as number | undefined;
      if (origin === 'string') return `Must be at most ${maximum} characters`;
      if (origin === 'number') return `Must be at most ${maximum}`;
      if (origin === 'array') return `Must contain at most ${maximum} item(s)`;
      return issue.message;
    }

    case 'invalid_type': {
      const expected = issue.expected as string | undefined;
      return `Expected ${expected}`;
    }

    case 'invalid_format': {
      const fmt = issue.format as string | undefined;
      if (fmt === 'email') return 'Invalid email address';
      if (fmt === 'uuid') return 'Invalid ID format (expected UUID)';
      if (fmt === 'url') return 'Invalid URL format';
      if (fmt === 'datetime') return 'Invalid datetime format (expected ISO 8601)';
      if (fmt === 'regex') return 'Invalid format';
      return issue.message;
    }

    case 'invalid_value': {
      const vals = issue.values as string[] | undefined;
      if (vals) return `Invalid value. Expected one of: ${vals.join(', ')}`;
      return issue.message;
    }

    case 'invalid_union':
      if (issue.discriminator) return `Invalid type discriminator: "${issue.discriminator}"`;
      return 'No matching variant found';

    case 'unrecognized_keys': {
      const keys = issue.keys as string[] | undefined;
      if (keys) return `Unknown field(s): ${keys.join(', ')}`;
      return 'Unrecognized fields in request';
    }

    case 'not_multiple_of':
      return `Must be a multiple of ${issue.divisor}`;

    case 'custom':
      return issue.message;

    default:
      return issue.message;
  }
}

export function registerGrcErrorMap(): void {
  z.setErrorMap(grcErrorMap as any);
}
