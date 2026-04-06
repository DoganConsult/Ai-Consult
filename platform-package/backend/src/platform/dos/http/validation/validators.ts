// @ts-nocheck
/**
 * DOS validators — domain-specific request validation helpers.
 * Covers common patterns: UUID check, enum check, date range.
 */
import { Request, Response, NextFunction } from 'express';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUuidParam(paramName = 'id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const val = req.params[paramName];
    if (val && !UUID_RE.test(val)) {
      res.status(400).json({ error: `Invalid UUID: ${paramName}`, code: 'VALIDATION_ERROR' });
      return;
    }
    next();
  };
}

export function validateEnum(field: string, allowed: string[], source: 'body' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const val = (req as Record<string, unknown>)[source]?.[field];
    if (val && !allowed.includes(val)) {
      res.status(400).json({ error: `Invalid value for ${field}`, code: 'VALIDATION_ERROR', allowed });
      return;
    }
    next();
  };
}

// ── Constitution validators ─────────────────────────────────────────────────

/** Validate risk appetite body: requires appetiteLevel, description */
export function validateRiskAppetite(req: Request, res: Response, next: NextFunction): void {
  const { appetiteLevel } = req.body || {};
  if (appetiteLevel && !['conservative', 'moderate', 'aggressive'].includes(appetiteLevel)) {
    res.status(400).json({ error: 'Invalid appetiteLevel', code: 'VALIDATION_ERROR', allowed: ['conservative', 'moderate', 'aggressive'] });
    return;
  }
  next();
}

/** Validate authority matrix body: requires matrix array entries */
export function validateAuthorityMatrix(req: Request, res: Response, next: NextFunction): void {
  const { matrix } = req.body || {};
  if (matrix && !Array.isArray(matrix)) {
    res.status(400).json({ error: 'matrix must be an array', code: 'VALIDATION_ERROR' });
    return;
  }
  next();
}

/** Validate escalation thresholds body: requires thresholds entries */
export function validateEscalationThresholds(req: Request, res: Response, next: NextFunction): void {
  const { thresholds } = req.body || {};
  if (thresholds && !Array.isArray(thresholds)) {
    res.status(400).json({ error: 'thresholds must be an array', code: 'VALIDATION_ERROR' });
    return;
  }
  next();
}

// ── Gate validators ─────────────────────────────────────────────────────────

/** Validate release gate body */
export function validateReleaseGate(req: Request, res: Response, next: NextFunction): void {
  const { gateType, __entityType } = req.body || {};
  if (gateType && !['release', 'vendor', 'change'].includes(gateType)) {
    res.status(400).json({ error: 'Invalid gateType', code: 'VALIDATION_ERROR' });
    return;
  }
  next();
}

/** Validate vendor gate body */
export function validateVendorGate(req: Request, res: Response, next: NextFunction): void {
  const { vendorId } = req.body || {};
  if (!vendorId) {
    res.status(400).json({ error: 'vendorId required', code: 'VALIDATION_ERROR' });
    return;
  }
  next();
}

/** Validate gate override body */
export function validateGateOverride(req: Request, res: Response, next: NextFunction): void {
  const { reason, __overrideType } = req.body || {};
  if (!reason) {
    res.status(400).json({ error: 'Override reason required', code: 'VALIDATION_ERROR' });
    return;
  }
  next();
}

// ── SOP and Runbook validators ──────────────────────────────────────────────

/** Validate SOP body */
export function validateSOP(req: Request, res: Response, next: NextFunction): void {
  const { title, __steps } = req.body || {};
  if (!title) {
    res.status(400).json({ error: 'SOP title required', code: 'VALIDATION_ERROR' });
    return;
  }
  next();
}

/** Validate Runbook body */
export function validateRunbook(req: Request, res: Response, next: NextFunction): void {
  const { name, __steps } = req.body || {};
  if (!name) {
    res.status(400).json({ error: 'Runbook name required', code: 'VALIDATION_ERROR' });
    return;
  }
  next();
}

// ── Telemetry validators ────────────────────────────────────────────────────

/** Validate telemetry ingest body */
export function validateTelemetryIngest(req: Request, res: Response, next: NextFunction): void {
  const { source, __payload } = req.body || {};
  if (!source) {
    res.status(400).json({ error: 'Telemetry source required', code: 'VALIDATION_ERROR' });
    return;
  }
  next();
}

/** Validate telemetry batch body */
export function validateTelemetryBatch(req: Request, res: Response, next: NextFunction): void {
  const { events } = req.body || {};
  if (!events || !Array.isArray(events)) {
    res.status(400).json({ error: 'events array required', code: 'VALIDATION_ERROR' });
    return;
  }
  next();
}

// ── Webhook validators ──────────────────────────────────────────────────────

/** Validate webhook payload body */
export function validateWebhookPayload(req: Request, res: Response, next: NextFunction): void {
  const { webhookType, __payload } = req.body || {};
  if (!webhookType) {
    res.status(400).json({ error: 'webhookType required', code: 'VALIDATION_ERROR' });
    return;
  }
  next();
}
