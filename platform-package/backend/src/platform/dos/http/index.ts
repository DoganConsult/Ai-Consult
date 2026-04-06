/**
 * DOS HTTP utilities — canonical exports for route infrastructure.
 *
 * Law 9: Organized by concern — middleware/, validation/, error-handling/, rate-limiting/, guards/.
 * Law 1: One utility per concern.
 * Law 14: Each subdirectory stays under the 15-file hard cap.
 */

// Error handling
export { asyncHandler } from './error-handling/async-handler';

// Validation
export { validate } from './validation/validate';
export { mandatoryFields } from './validation/mandatory-fields';
export { validateUuidParam, validateEnum } from './validation/validators';

// Rate limiting
export { rateLimiter } from './rate-limiting/rate-limiter';

// Middleware
export { auditMiddleware, setAuditData } from './middleware/audit';
export { moduleStack } from './middleware/module-stack';
export { automationMiddleware } from './middleware/automation';
export { requireTenant } from './middleware/tenant';
export { scopeContext } from './middleware/scope-context';

// Guards (security-concern middleware)
export { tenantGuard } from './guards/tenant-guard';
export { moduleGuard } from './guards/module-guard';
export { fieldRbac } from './guards/field-rbac';
export { lifecycleGate } from './guards/lifecycle-gate';
export { requireOwnership } from './guards/require-ownership';
