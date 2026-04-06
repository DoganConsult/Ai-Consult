/**
 * Stub: api-response
 * TODO: Replace with real implementation
 */

export async function asyncHandler(..._args: any[]): Promise<unknown> {
  console.warn('[asyncHandler] called but not implemented');
  return null as any;
}

export function ok(data: any, meta?: Record<string, any>): { success: true; data: unknown; meta?: Record<string, any> } { return { success: true, data, ...(meta ? { meta } : {}) }; }
export function paginated(data: any[], total: number, page: number, limit: number): { success: true; data: any[]; meta: { total: number; page: number; limit: number; totalPages: number } } { return { success: true, data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }; }
export function action(message: string, details?: Record<string, any>): { success: true; message: string; details?: Record<string, any> } { return { success: true, message, ...(details ? { details } : {}) }; }
export function buildMeta(total: number, page: number, limit: number): { total: number; page: number; limit: number; totalPages: number } { return { total, page, limit, totalPages: Math.ceil(total / limit) }; }
