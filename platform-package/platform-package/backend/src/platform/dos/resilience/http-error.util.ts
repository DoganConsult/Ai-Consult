/**
 * Resilience http-error utility (re-export from canonical location).
 */

export function toErrorMessage(err: any): string {
  return err instanceof Error ? err.message : String(err ?? 'Unknown error');
}
