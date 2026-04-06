/**
 * Express Async Error Patch
 *
 * Monkey-patches Express 4's Layer.handle to automatically catch rejected
 * promises from async route handlers and forward them to next(err).
 *
 * Eliminates the need for explicit try/catch blocks or asyncHandler()
 * wrappers in route files. Any async handler that throws or rejects will
 * have its error forwarded to the global error handler middleware.
 *
 * MUST be imported BEFORE any routes are registered:
 *   import './async-error-patch';
 *
 * Compatible with Express 4.x. Express 5 handles this natively.
 *
 * @owner DOS
 * @removal-date n/a — required until Express 5 migration
 */

/* eslint-disable @typescript-eslint/no-var-requires */
let Layer;
try {
  Layer = require('express/lib/router/layer');
} catch (e) {}

if (Layer) {
  const originalHandle = Layer.prototype.handle_request;

  Layer.prototype.handle_request = function patchedHandle(
    req: any, res: any, next: any,
  ) {
    if (this.method && this.handle.length > 3) {
      return originalHandle.call(this, req, res, next);
    }
    try {
      const result = originalHandle.call(this, req, res, next);
      if (result && typeof result.catch === 'function') {
        result.catch(next);
      }
    } catch (err) {
      next(err);
    }
  };

  const originalHandleError = Layer.prototype.handle_error;

  Layer.prototype.handle_error = function patchedHandleError(
    error: any, req: any, res: any, next: any,
  ) {
    try {
      const result = originalHandleError.call(this, error, req, res, next);
      if (result && typeof result.catch === 'function') {
        result.catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
}
