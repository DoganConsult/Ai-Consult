export class KernelError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly meta?: Record<string, unknown>;

  constructor(code: string, message: string, status = 500, meta?: Record<string, unknown>) {
    super(message);
    this.name = 'KernelError';
    this.code = code;
    this.status = status;
    this.meta = meta;
  }
}

export class UnauthorizedError extends KernelError {
  constructor(message = 'unauthorized') {
    super('unauthorized', message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends KernelError {
  constructor(message = 'forbidden') {
    super('forbidden', message, 403);
    this.name = 'ForbiddenError';
  }
}

export class TenantContextMissingError extends KernelError {
  constructor() {
    super('tenant_context_missing', 'tenant context not set on request', 400);
    this.name = 'TenantContextMissingError';
  }
}

export class ConfigError extends KernelError {
  constructor(message: string) {
    super('config_error', message, 500);
    this.name = 'ConfigError';
  }
}
