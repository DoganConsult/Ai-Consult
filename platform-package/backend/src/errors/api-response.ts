/**
 * Standardized API response envelope utilities.
 *
 * All success responses share the shape:
 *   { success: true, data: T, meta: ResponseMeta }
 *
 * Paginated responses extend meta with page/pageSize/total/totalPages.
 * Delete/action responses use { success: true, meta } without a data key.
 *
 * Error responses are produced by errorHandler (error-handler.ts) and follow:
 *   { success: false, error: string, message: string, statusCode, correlationId }
 */

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
}

export interface PaginatedMeta extends ResponseMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginatedMeta;
}

export interface ApiActionResponse {
  success: true;
  message: string;
  meta: ResponseMeta;
}

/**
 * Build the base meta object from an Express request (reads correlationId set by requestLogger).
 */
export function buildMeta(req: { correlationId?: string; [key: string]: unknown }): ResponseMeta {
  return {
    requestId: req.correlationId || 'any',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Wrap data in the standard success envelope.
 */
export function ok<T>(data: T, req: Record<string, any>): ApiSuccessResponse<T> {
  return { success: true, data, meta: buildMeta(req as { [key: string]: unknown; correlationId?: string }) };
}

/**
 * Wrap a list result in the paginated envelope.
 */
export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
  req: any,
): ApiPaginatedResponse<T> {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  return {
    success: true,
    data,
    meta: {
      ...buildMeta(req as { [key: string]: unknown; correlationId?: string }),
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

/**
 * Wrap an action result (create, update, delete) with a message.
 */
export function action(message: string, req: Record<string, any>): ApiActionResponse {
  return { success: true, message, meta: buildMeta(req as { [key: string]: unknown; correlationId?: string }) };
}

/**
 * Express middleware that attaches res.ok(), res.created(), and res.paginated()
 * helpers so route handlers can use `res.ok(data)` instead of `res.json(ok(data, req))`.
 */
export function responseHelpers() {
  return (req: any, res: any, next: any) => {
    res.ok = (data: any) => {
      res.status(200).json(ok(data, req));
    };
    res.created = (data: any) => {
      res.status(201).json(ok(data, req));
    };
    res.paginated = (data: any[], total: number, page: number, pageSize: number) => {
      res.status(200).json(paginated(data, total, page, pageSize, req));
    };
    next();
  };
}
