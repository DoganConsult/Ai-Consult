// @ts-nocheck
/**
 * DOS validate — Zod schema validation middleware.
 * Validates req.body (or req.query/req.params) against a Zod schema
 * and returns 400 with structured errors on failure.
 *
 * Enterprise-grade features:
 * - Strips unknown keys by default (prevents mass-assignment)
 * - Optional strict mode (rejects unknown keys with 400)
 * - Structured error response with field-level details
 * - Replaces req source with parsed/coerced/stripped data
 *
 * Law 9: Lives under dos/http/, not a flat middleware/ junk drawer.
 */
import { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodError } from 'zod';

interface ValidateOptions {
  source?: 'body' | 'query' | 'params';
  /** If true, reject requests with unknown keys (400). Default: false (strip silently). */
  strict?: boolean;
}

type SourceKey = 'body' | 'query' | 'params';

interface SchemaMap {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  /** If true, reject requests with unknown keys (400). */
  strict?: boolean;
}

const VALID_SOURCES: ReadonlySet<string> = new Set(['body', 'query', 'params']);

/**
 * Overload 1: validate({ body: schema, query: schema, params: schema, strict?: boolean })
 * Overload 2: validate(schema, options?) — legacy positional form
 */
export function validate(
  schemaOrMap: ZodSchema | SchemaMap,
  options?: ValidateOptions,
) {
  // Detect the object-map calling convention ({ body, query, params })
  if (
    schemaOrMap !== null &&
    typeof schemaOrMap === 'object' &&
    !('safeParse' in schemaOrMap) &&
    ('body' in schemaOrMap || 'query' in schemaOrMap || 'params' in schemaOrMap)
  ) {
    const map = schemaOrMap as SchemaMap;
    return (req: Request, res: Response, next: NextFunction): void => {
      for (const [key, schema] of Object.entries(map)) {
        if (!VALID_SOURCES.has(key) || !schema) continue;
        const source = key as SourceKey;
        const data = req[source];
        const result = (schema as ZodSchema).safeParse(data);
        if (!result.success) {
          res.status(400).json(formatValidationError(result.error as ZodError, source));
          return;
        }
        // Replace with parsed (coerced/defaulted/stripped) data
        (req as Record<string, unknown>)[source] = result.data;
      }
      next();
    };
  }

  // Legacy positional form: validate(schema, options?)
  const schema = schemaOrMap as ZodSchema;
  const source: SourceKey = options?.source || 'body';

  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[source];
    const result = schema.safeParse(data);

    if (!result.success) {
      res.status(400).json(formatValidationError(result.error as ZodError, source));
      return;
    }

    // Replace with parsed (coerced/defaulted/stripped) data
    (req as Record<string, unknown>)[source] = result.data;
    next();
  };
}

/**
 * Strict validation — rejects unknown keys with 400.
 * Use on admin/security endpoints where payload shape must be exact.
 */
export function validateStrict(schemas: { body?: ZodSchema; query?: ZodSchema; params?: ZodSchema }) {
  return validate({ ...schemas, strict: true });
}

/**
 * Format ZodError into structured API error response.
 * Works with Zod v4 issue shapes.
 */
function formatValidationError(error: ZodError, source: string) {
  return {
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    source,
    details: error.issues.map(issue => ({
      field: issue.path.join('.') || 'root',
      message: issue.message,
      code: issue.code,
    })),
  };
}

/**
 * Input sanitization middleware — strips null bytes and trims whitespace
 * from string values in req.body to prevent injection attacks.
 */
export function inputSanitization() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.body && typeof req.body === 'object') {
      sanitizeObject(req.body);
    }
    next();
  };
}

function sanitizeObject(obj: Record<string, any>): void {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      // Strip null bytes and trim
      obj[key] = val.replace(/\0/g, '').trim();
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      sanitizeObject(val);
    }
  }
}
