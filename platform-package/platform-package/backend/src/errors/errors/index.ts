/**
 * Application error class hierarchy for standardized bilingual error handling.
 * All application errors extend AppError and carry an HTTP status code,
 * machine-readable error code, bilingual messages, and optional details.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly messageAr?: string;
  public readonly details?: any[];

  constructor(statusCode: number, message: string, code: string, details?: any[], messageAr?: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.messageAr = messageAr;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(404, `${entity} with id '${id}' not found`, 'NOT_FOUND', undefined, `${entity} بالمعرف '${id}' غير موجود`);
  }
}

export class ValidationError extends AppError {
  constructor(details: Array<{ path: string; message: string; expected?: string }>) {
    super(400, 'Validation failed', 'VALIDATION_ERROR', details, 'فشل التحقق من الصحة');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(403, message, 'FORBIDDEN', undefined, 'تم رفض الوصول');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, messageAr?: string) {
    super(409, message, 'CONFLICT', undefined, messageAr || 'تعارض في البيانات');
  }
}

export class TenantIsolationError extends AppError {
  constructor() {
    super(403, 'Tenant isolation violation', 'TENANT_ISOLATION', undefined, 'انتهاك عزل المستأجر');
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super(429, 'Too many requests', 'RATE_LIMIT_EXCEEDED', undefined, 'عدد كبير جداً من الطلبات');
  }
}
