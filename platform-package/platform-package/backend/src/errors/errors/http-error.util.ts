import type { Response } from 'express';

export function toErrorMessage(err: any): string {
  return err instanceof Error ? err.message : String(err);
}

const SAFE_PATTERNS = [
  /^Missing required field/,
  /^Invalid .+ format$/,
  /^Session not found$/,
  /^Job not found$/,
  /^already registered$/i,
  /^blocked/i,
  /^Provisioning job/,
  /^No provisioning/,
  /^Onboarding session/,
];

function isSafeMessage(msg: string): boolean {
  return SAFE_PATTERNS.some((p) => p.test(msg));
}

export function sendError(
  res: Response,
  err: any,
  fallbackStatus = 500,
  fallbackMessage = 'Internal server error',
): void {
  const msg = err instanceof Error ? err.message : String(err ?? fallbackMessage);

  if (fallbackStatus < 500) {
    res.status(fallbackStatus).json({ error: msg });
    return;
  }

  const errObj = err as Record<string, any> | null | undefined;
  const status = (typeof errObj?.statusCode === 'number' ? errObj.statusCode : typeof errObj?.status === 'number' ? errObj.status : fallbackStatus) as number;
  const clientMsg = isSafeMessage(msg) ? msg : fallbackMessage;
  res.status(status).json({ error: clientMsg });
}
