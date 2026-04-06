import { logger } from '../../../../utils/logger';
// ============================================
// Platform — Module Service Contracts
// Standardized interfaces for cross-module service communication
// Ensures consistent function signatures, return types, and error handling
// ============================================

/**
 * Standard scope user for RBAC-aware service calls
 */
export interface ScopeUser {
  userId: string;
  role: string;
  permissions?: string[];
  orgUnitId?: number | null;
}

/**
 * Standard pagination parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
}

/**
 * Standard paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Standard query parameters for list operations
 */
export interface ListQueryParams extends PaginationParams {
  status?: string;
  category?: string;
  owner?: string;
  frameworkId?: string;
  [key: string]: unknown; // Allow additional filters
}

/**
 * Standard service function signature for CRUD operations
 */
export interface ServiceFunction<_TParams = any, TResult = any> {
  (tenantId: string, ...args: unknown[]): Promise<TResult>;
}

/**
 * Standard create operation contract
 */
export interface CreateOperation<TData, TResult> {
  (tenantId: string, data: TData): Promise<TResult>;
}

/**
 * Standard update operation contract
 */
export interface UpdateOperation<TData, TResult> {
  (tenantId: string, entityId: string, update: Partial<TData>): Promise<TResult>;
}

/**
 * Standard get operation contract
 */
export interface GetOperation<TResult> {
  (tenantId: string, entityId: string, scopeUser?: ScopeUser): Promise<TResult>;
}

/**
 * Standard list operation contract
 */
export interface ListOperation<TResult> {
  (
    tenantId: string,
    scopeUser?: ScopeUser,
    queryParams?: ListQueryParams
  ): Promise<PaginatedResult<TResult>>;
}

/**
 * Standard delete operation contract
 */
export interface DeleteOperation {
  (tenantId: string, entityId: string, scopeUser?: ScopeUser): Promise<void>;
}

/**
 * Standard service response wrapper
 * Provides consistent structure for all service responses
 */
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: string;
    executionTimeMs?: number;
    tenantId?: string;
    [key: string]: unknown;
  };
}

/**
 * Standard error codes for service operations
 */
export enum ServiceErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
}

/**
 * Standard service error
 */
export class ServiceError extends Error {
  constructor(
    public code: ServiceErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

/**
 * Standard function metadata for service discovery
 */
export interface FunctionMetadata {
  name: string;
  description?: string;
  parameters: ParameterMetadata[];
  returnType?: string;
  requiresAuth?: boolean;
  requiredPermissions?: string[];
  deprecated?: boolean;
  version?: string;
}

/**
 * Parameter metadata for function documentation
 */
export interface ParameterMetadata {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: unknown;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

/**
 * Standard service contract interface
 * Defines the structure that all module services should follow
 */
export interface ModuleServiceContract {
  /**
   * Module code (e.g., 'risk', 'compliance', 'evidence')
   */
  moduleCode: string;

  /**
   * Service name (usually same as moduleCode, but can be different for multiple services per module)
   */
  serviceName: string;

  /**
   * Available functions in this service
   */
  availableFunctions: string[];

  /**
   * Function metadata for documentation and validation.
   * Required for all registered services (Law 5: Explicit Contracts).
   * Must contain metadata for every function listed in availableFunctions.
   */
  functionMetadata: Map<string, FunctionMetadata>;

  /**
   * Health check function
   */
  healthCheck: () => Promise<boolean>;

  /**
   * Service instance (the actual service module)
   */
  serviceInstance: unknown;

  /**
   * Additional metadata
   */
  metadata?: {
    description?: string;
    version?: string;
    dependencies?: string[]; // Module codes this service depends on
    provides?: string[]; // Capabilities this service provides
    [key: string]: unknown;
  };
}

/**
 * Standard CRUD service contract
 * Defines the minimum set of operations a CRUD service should provide
 */
export interface CrudServiceContract<TEntity, TCreateData, TUpdateData> {
  create: CreateOperation<TCreateData, TEntity>;
  get: GetOperation<TEntity>;
  list: ListOperation<TEntity>;
  update: UpdateOperation<TUpdateData, TEntity>;
  delete: DeleteOperation;
}

/**
 * Standard query service contract
 * For services that provide query/search capabilities
 */
export interface QueryServiceContract<TResult> {
  query: (
    tenantId: string,
    query: string,
    scopeUser?: ScopeUser,
    options?: PaginationParams
  ) => Promise<PaginatedResult<TResult>>;

  search: (
    tenantId: string,
    searchTerm: string,
    scopeUser?: ScopeUser,
    filters?: Record<string, any>
  ) => Promise<PaginatedResult<TResult>>;
}

/**
 * Standard aggregation service contract
 * For services that provide aggregation/analytics capabilities
 */
export interface AggregationServiceContract {
  aggregate: (
    tenantId: string,
    aggregationType: 'count' | 'sum' | 'avg' | 'min' | 'max',
    field: string,
    filters?: Record<string, any>,
    scopeUser?: ScopeUser
  ) => Promise<number>;

  groupBy: (
    tenantId: string,
    groupByField: string,
    aggregationType: 'count' | 'sum' | 'avg',
    aggregateField?: string,
    filters?: Record<string, any>,
    scopeUser?: ScopeUser
  ) => Promise<Record<string, number>>;
}

/**
 * Standard relationship service contract
 * For services that manage relationships between entities
 */
export interface RelationshipServiceContract {
  getRelationships: (
    tenantId: string,
    entityId: string,
    entityType: string,
    relationshipType?: string
  ) => Promise<any[]>;

  createRelationship: (
    tenantId: string,
    fromEntityId: string,
    fromEntityType: string,
    toEntityId: string,
    toEntityType: string,
    relationshipType: string,
    metadata?: Record<string, any>
  ) => Promise<unknown>;

  deleteRelationship: (
    tenantId: string,
    relationshipId: string
  ) => Promise<void>;
}

/**
 * Standard export service contract
 * For services that provide data export capabilities
 */
export interface ExportServiceContract {
  export: (
    tenantId: string,
    format: 'json' | 'csv' | 'xlsx' | 'pdf',
    filters?: Record<string, any>,
    scopeUser?: ScopeUser
  ) => Promise<{
    format: string;
    data?: unknown;
    url?: string;
    filename?: string;
  }>;
}

/**
 * Standard validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
}

/**
 * Standard validation function contract
 */
export interface ValidationFunction<T> {
  (data: T): ValidationResult | Promise<ValidationResult>;
}

/**
 * Helper function to create a standardized service response
 */
export function createServiceResponse<T>(
  data: T,
  metadata?: Record<string, any>
): ServiceResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Helper function to create a standardized error response
 */
export function createErrorResponse(
  code: ServiceErrorCode,
  message: string,
  details?: any
): ServiceResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    metadata: {
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Type guard to check if a response is successful
 */
export function isSuccessResponse<T>(
  response: ServiceResponse<T>
): response is ServiceResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Type guard to check if a response is an error
 */
export function isErrorResponse(
  response: ServiceResponse
): response is ServiceResponse & { success: false; error: NonNullable<ServiceResponse['error']> } {
  return response.success === false && response.error !== undefined;
}

/**
 * Standard function parameter conventions
 * Documents the expected parameter order for service functions
 */
export const FUNCTION_PARAMETER_CONVENTIONS = {
  /**
   * Standard parameter order for most service functions:
   * 1. tenantId (required, always first)
   * 2. entityId or identifier (if applicable)
   * 3. data/update object (if applicable)
   * 4. scopeUser (optional, for RBAC)
   * 5. queryParams/options (optional, for filtering/pagination)
   */
  STANDARD: [
    'tenantId: string (required)',
    'entityId?: string (if applicable)',
    'data?: object (if applicable)',
    'scopeUser?: ScopeUser (optional)',
    'queryParams?: object (optional)',
  ],

  /**
   * Parameter order for list/query functions:
   * 1. tenantId (required)
   * 2. scopeUser (optional)
   * 3. queryParams (optional)
   */
  LIST: [
    'tenantId: string (required)',
    'scopeUser?: ScopeUser (optional)',
    'queryParams?: ListQueryParams (optional)',
  ],

  /**
   * Parameter order for create functions:
   * 1. tenantId (required)
   * 2. data (required)
   */
  CREATE: [
    'tenantId: string (required)',
    'data: object (required)',
  ],

  /**
   * Parameter order for update functions:
   * 1. tenantId (required)
   * 2. entityId (required)
   * 3. update (required)
   */
  UPDATE: [
    'tenantId: string (required)',
    'entityId: string (required)',
    'update: Partial<Data> (required)',
  ],

  /**
   * Parameter order for get functions:
   * 1. tenantId (required)
   * 2. entityId (required)
   * 3. scopeUser (optional)
   */
  GET: [
    'tenantId: string (required)',
    'entityId: string (required)',
    'scopeUser?: ScopeUser (optional)',
  ],
} as const;

/**
 * Standard return type conventions
 */
export const RETURN_TYPE_CONVENTIONS = {
  /**
   * CRUD operations return the entity directly
   */
  CRUD: 'Promise<TEntity>',

  /**
   * List operations return paginated results
   */
  LIST: 'Promise<PaginatedResult<TEntity>>',

  /**
   * Query operations return paginated results
   */
  QUERY: 'Promise<PaginatedResult<TResult>>',

  /**
   * Aggregation operations return numbers or grouped data
   */
  AGGREGATION: 'Promise<number | Record<string, number>>',

  /**
   * Relationship operations return relationship objects or arrays
   */
  RELATIONSHIP: 'Promise<any[] | any>',
} as const;

/**
 * Validate a ModuleServiceContract before registration.
 * Logs warnings for incomplete or missing functionMetadata.
 * (Law 5: Explicit Contracts -- metadata is mandatory)
 */
export function validateServiceContract(contract: ModuleServiceContract): void {
  if (!contract.functionMetadata || contract.functionMetadata.size === 0) {
    logger.warn(
      `[ServiceContract] Module "${contract.moduleCode}" registered without functionMetadata. ` +
      `All services MUST provide functionMetadata for every available function (Law 5: Explicit Contracts).`,
    );
  } else {
    // Check that every availableFunction has a corresponding metadata entry
    for (const fn of contract.availableFunctions) {
      if (!contract.functionMetadata.has(fn)) {
        logger.warn(
          `[ServiceContract] Module "${contract.moduleCode}" is missing functionMetadata for "${fn}". ` +
          `All available functions must have explicit metadata (Law 5: Explicit Contracts).`,
        );
      }
    }
  }
}
