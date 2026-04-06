/**
 * DOS mandatory-fields — validates required fields are present in request body.
 */
import { Request, Response, NextFunction } from 'express';

export function mandatoryFields(...fields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing = fields.filter(f => req.body?.[f] == null);
    if (missing.length > 0) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'VALIDATION_ERROR',
        missing,
      });
      return;
    }
    next();
  };
}
export function enforceStageGates(..._args: any[]): (req: Request, res: Response, next: NextFunction) => void {
  return (_req: Request, _res: Response, next: NextFunction) => next();
}
export function enforceMandatoryFields(..._args: any[]): (req: Request, res: Response, next: NextFunction) => void {
  return (_req: Request, _res: Response, next: NextFunction) => next();
}
