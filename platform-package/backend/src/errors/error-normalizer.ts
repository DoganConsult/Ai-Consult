/**
 * Normalizes any caught errors into a consistent shape.
 * Replaces `catch (err: unknown)` across the codebase with `catch (err: unknown)`.
 *
 * Usage:
 *   catch (err: unknown) {
 *     const e = normalizeError(err);
 *     logger.error(`[Module] ${(e instanceof Error ? e.message : String(e))}`);
 *     res.status(e.status).json({ error: 'Operation failed', details: (e instanceof Error ? e.message : String(e)) });
 *   }
 */

export interface NormalizedError {
  message: string;
  code?: string;
  status: number;
  stack?: string;
}

export function normalizeError(err: any): NormalizedError {
  if (err instanceof Error) {
    const status =
      (err as NodeJS.ErrnoException).code === 'ENOENT' ? 404 :
      (err as NodeJS.ErrnoException).code === 'EACCES' ? 403 :
      'status' in err ? (err as { status: number }).status :
      'statusCode' in err ? (err as { statusCode: number }).statusCode :
      500;
    return {
      message: (err as Error).message,
      code: (err as NodeJS.ErrnoException).code,
      status: typeof status === 'number' ? status : 500,
      stack: err.stack,
    };
  }

  if (typeof err === 'string') {
    return { message: err, status: 500 };
  }

  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, any>;
    return {
      message: typeof obj.message === 'string' ? obj.message : JSON.stringify(err),
      code: typeof obj.code === 'string' ? obj.code : undefined,
      status: typeof obj.status === 'number' ? obj.status :
              typeof obj.statusCode === 'number' ? obj.statusCode : 500,
    };
  }

  return { message: String(err), status: 500 };
}

/** Extracts just the error message string from an any error. */
export function errorMessage(err: any): string {
  if (err instanceof Error) return (err as Error).message;
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, any>;
    if (typeof obj.message === 'string') return obj.message;
  }
  return String(err);
}
