/**
 * Error handling utilities for type-safe error processing
 */

/**
 * Safely extract error message from any error type
 */
export function toErrorMessage(err: any): string {
  if (err instanceof Error) {
    return (err instanceof Error ? err.message : String(err));
  }
  if (typeof err === 'string') {
    return err;
  }
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err instanceof Error ? err.message : String(err)));
  }
  return String(err);
}

/**
 * Safely extract error name from any error type
 */
export function toErrorName(err: any): string {
  if (err instanceof Error) {
    return err.name;
  }
  if (err && typeof err === 'object' && 'name' in err) {
    return String(err.name);
  }
  return 'UnknownError';
}

/**
 * Safely extract error stack from any error type
 */
export function toErrorStack(err: any): string | undefined {
  if (err instanceof Error) {
    return err.stack;
  }
  if (err && typeof err === 'object' && 'stack' in err) {
    return String(err.stack);
  }
  return undefined;
}

/**
 * Type guard to check if error is an Error instance
 */
export function isError(err: any): err is Error {
  return err instanceof Error;
}

export function classifyError(err: any): string {
  if (!err) return 'any';
  const msg = toErrorMessage(err).toLowerCase();
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('econnaborted')) return 'timeout';
  if (msg.includes('econnrefused') || msg.includes('enotfound') || msg.includes('enetunreach')) return 'network_error';
  if (msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('violates unique')) return 'duplicate';
  if (msg.includes('not found') || msg.includes('no rows')) return 'not_found';
  if (msg.includes('permission') || msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('access denied')) return 'auth_error';
  if (msg.includes('syntax error') || msg.includes('invalid input') || msg.includes('validation')) return 'validation_error';
  if (msg.includes('relation') || msg.includes('column') || msg.includes('does not exist')) return 'schema_error';
  if (msg.includes('connection') || msg.includes('pool') || msg.includes('too many clients')) return 'db_connection';
  if (msg.includes('deadlock') || msg.includes('lock')) return 'deadlock';
  if (msg.includes('out of memory') || msg.includes('oom')) return 'oom';
  return 'internal_error';
}
