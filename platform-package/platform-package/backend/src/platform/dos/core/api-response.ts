/**
 * API response helpers and async handler wrapper.
 */
import { Request, Response, NextFunction } from 'express';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function ok(data: any, meta?: Record<string, any>): { success: true; data: unknown; meta?: Record<string, any> } { return { success: true, data, ...(meta ? { meta } : {}) }; }
export function paginated(data: any[], total: number, page: number, limit: number): { success: true; data: any[]; meta: { total: number; page: number; limit: number; totalPages: number } } { return { success: true, data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }; }
export function action(message: string, details?: Record<string, any>): { success: true; message: string; details?: Record<string, any> } { return { success: true, message, ...(details ? { details } : {}) }; }
export function buildMeta(total: number, page: number, limit: number): { total: number; page: number; limit: number; totalPages: number } { return { total, page, limit, totalPages: Math.ceil(total / limit) }; }
