import path from 'path';
import express, { Request, Response, Router } from 'express';

// ── DAuth: Identity & authentication routes ──────────────────────────────────
import authRoutes from './platform/dauth/routes/auth.routes';
import invitationRoutes from './platform/dauth/routes/invitation.routes';
import emailVerificationRoutes from './platform/dauth/routes/email-verification.routes';
import meRoutes from './platform/dauth/routes/me.routes';
import accessContractRoutes from './platform/dauth/routes/access-contract.routes';
import actorIdentityRoutes from './platform/dauth/routes/actor-identity.routes';
import authzExplainRoutes from './platform/dauth/routes/authz-explain.routes';
import permissionDerivationRoutes from './platform/dauth/routes/permission-derivation.routes';

// ── DOS: Tenancy & workspace ─────────────────────────────────────────────────
import workspaceAuditRoutes from './platform/dos/tenancy/routes/workspace-audit.routes';
import schemaGovernanceRoutes from './platform/dos/tenancy/routes/schema-governance.routes';
import workspaceRoutes from './platform/dos/tenancy/routes/workspace.routes';
import tenantConfigRoutes from './platform/dos/tenancy/routes/tenant-config.routes';
import tenantHomeRoutes from './platform/dos/tenancy/routes/tenant-home.routes';
import workspaceHomeRoutes from './platform/dos/tenancy/routes/workspace-home.routes';
import workspaceLifecycleRoutes from './platform/dos/workspace/routes/workspace-lifecycle.routes';

// ── DOS: Provisioning & bootstrap ────────────────────────────────────────────
import provisioningRoutes from './platform/dos/provisioning/routes/provisioning.routes';
import publicContentRoutes from './platform/dos/provisioning/routes/public-content.routes';
import bootstrapRoutes from './platform/dos/provisioning/routes/bootstrap.routes';
import bootstrapManifestRoutes from './platform/dos/provisioning/routes/bootstrap-manifest.routes';
import packManagementRoutes from './platform/dos/provisioning/routes/pack-management.routes';

// ── DOS: Subscription lifecycle ───────────────────────────────────────────────
// NOTE: Imported once and mounted at two paths intentionally.
// The router itself contains only relative sub-routes, so dual mounting is safe.
import subscriptionLifecycleRoutes from './platform/dos/lifecycle/routes/subscription-lifecycle.routes';

// ── DOS: Admin ────────────────────────────────────────────────────────────────
import platformAdminRoutes from './platform/dos/admin/platform-admin.routes';
import pageCatalogRoutes from './platform/dos/admin/lowcode/page-catalog.routes';
import dynamicEndpointsRoutes from './platform/dos/admin/lowcode/dynamic-endpoints.routes';
import aiAgentGraphsRoutes from './platform/dos/admin/lowcode/ai-agent-graphs.routes';
import pluginsRoutes from './platform/dos/admin/lowcode/plugins.routes';
import approvalsRoutes from './platform/dos/admin/lowcode/approvals.routes';
import schemaDesignerRoutes from './platform/dos/admin/lowcode/schema-designer.routes';
import openclawRoutes from './platform/openclaw/openclaw.routes';
import doganConsultRoutes from './products/dogan-consult/dogan-consult.routes';
import { sbgRoutes } from './products/sbg/sbg.routes';
import { erpRoutes } from './products/erp/erp.routes';
import { portalRoutes } from './products/erp/portals.routes';

// ── DOS: Observability & health ───────────────────────────────────────────────
import healthRoutes from './platform/dos/http/health/health.routes';
import clientErrorRoutes from './platform/dos/http/health/client-error.routes';
import deadLetterQueueRoutes from './platform/dos/http/health/dead-letter-queue.routes';
import traceCorrelationRoutes from './platform/dos/http/health/trace-correlation.routes';
import jobsRoutes from './platform/dos/http/health/jobs.routes';
import eventDlqRoutes from './platform/dos/http/health/event-dlq.routes';
import runtimeHealthRoutes from './platform/dos/http/health/runtime-health.routes';
import serviceHealthRoutes from './platform/dos/http/health/service-health.routes';
import autoTaskRoutes from './platform/dos/http/health/auto-task.routes';
import contractTestsRoutes from './platform/dos/http/health/contract-tests.routes';

// ── Middleware & guards ───────────────────────────────────────────────────────
import { tenantGuard, tenantQuarantineGuard } from './platform/dos/http/guards/tenant-guard';
import { resolveTenantFromHost, tenantRoutingMiddleware } from './platform/dos/http/middleware/tenant';
import { subscriptionStatusGuard } from './platform/dos/http/guards/module-guard';
import { rateLimiter, tenantRateLimiter } from './platform/dos/http/rate-limiting/rate-limiter';
import { membershipContextMiddleware } from './platform/dos/http/middleware/scope-context';
import { errorHandler, asyncHandler } from './platform/dos/http/error-handling/async-handler';
import { logger } from './platform/dos/observability/logger.service';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Extracts the real client IP, cloud-edge-aware (Cloudflare → XFF → socket). */
function clientIp(req: Request): string {
  const cfIp = req.headers?.['cf-connecting-ip'] as string | undefined;
  const xff = req.headers?.['x-forwarded-for'];
  const forwardedIp =
    typeof xff === 'string' ? xff.split(',')[0].trim() : undefined;
  return cfIp || forwardedIp || req.ip || req.socket?.remoteAddress || 'any';
}

// ─────────────────────────────────────────────────────────────────────────────
// Route mounting
// ─────────────────────────────────────────────────────────────────────────────

export function mountRoutes(app: express.Express): void {

  // ── 1. Health (no auth, no tenant, no limits) ──────────────────────────────
  app.use('/api', healthRoutes);

  // ── 2. Client-error intake (unauthenticated, global rate-limited) ──────────
  app.use('/api/platform/client-errors', clientErrorRoutes);

  // ── 3. Rate limiters ───────────────────────────────────────────────────────
  const apiLimiter = rateLimiter({
    windowMs: 60_000,
    maxRequests: 600,
    namespace: 'api',
    keyGenerator: clientIp,
  });

  const authLimiter = rateLimiter({
    windowMs: 60_000,
    maxRequests: 60,
    namespace: 'auth',
    keyGenerator: clientIp,
  });

  // Global API limiter — applied before any tenant context.
  app.use('/api', apiLimiter);

  // Auth limiter — bypass for read-only or registration endpoints.
  app.use('/api/auth', (req: Request, res: Response, next: express.NextFunction) => {
    const bypass =
      (req.path === '/userinfo' && req.method === 'GET') ||
      (req.path === '/register' && req.method === 'POST');
    return bypass ? next() : authLimiter(req, res, next);
  });

  // ── 4. Pre-tenant routes (no tenant resolution required) ───────────────────
  // These must come BEFORE tenantGuard so they reach the handler regardless of
  // whether a tenant can be resolved from the host (e.g., login, invitations).
  app.use('/api/auth', authRoutes);
  app.use('/api/auth', emailVerificationRoutes);
  app.use(
    '/api/invitations',
    rateLimiter({ namespace: 'invitations', maxRequests: 20, windowMs: 60_000 }),
    invitationRoutes,
  );

  // ── 5. Tenant resolution + guard chain ────────────────────────────────────
  app.use('/api', resolveTenantFromHost);
  app.use('/api', tenantRoutingMiddleware());

  // Expose OpenClaw public AI agent routes before auth guards
  app.use('/api/integration/openclaw', openclawRoutes);
  
  app.use('/api/products/dogan-consult', doganConsultRoutes);
  app.use('/api/products/sbg', sbgRoutes);
  app.use('/api/products/erp', erpRoutes);
  app.use('/api/products/erp/portals', portalRoutes);

  app.use('/api', tenantGuard);
  app.use('/api', subscriptionStatusGuard());
  app.use('/api', tenantQuarantineGuard());
  app.use('/api', tenantRateLimiter());
  app.use('/api', membershipContextMiddleware());

  // ── 6. Authenticated & tenant-scoped routes ────────────────────────────────

  // Provisioning
  app.use('/api/provisioning', provisioningRoutes);
  app.use('/api/provisioning/bootstrap', bootstrapRoutes);
  app.use('/api/provisioning/manifests', bootstrapManifestRoutes);
  app.use('/api/provisioning/packs', packManagementRoutes);

  // Observability / dead-letter
  app.use('/api/dead-letter-queue', deadLetterQueueRoutes);
  app.use('/api/trace-correlation', traceCorrelationRoutes);

  // Subscription lifecycle — two mount points, same router (router uses only
  // method + relative sub-paths, so dual mounting is safe and intentional).
  app.use('/api/subscription', subscriptionLifecycleRoutes);
  app.use('/api/admin/subscriptions', subscriptionLifecycleRoutes);

  // Workspace & audit
  app.use('/api', workspaceAuditRoutes);
  app.use('/api/workspaces', workspaceRoutes);
  app.use('/api/workspace/home', workspaceHomeRoutes);
  app.use('/api/workspace/lifecycle', workspaceLifecycleRoutes);

  // Tenant
  app.use('/api/tenant', tenantConfigRoutes);
  app.use('/api/tenant/home', tenantHomeRoutes);

  // Identity & access
  app.use('/api/me', meRoutes);
  app.use('/api/me/access-contract', accessContractRoutes);
  app.use('/api/identity', actorIdentityRoutes);
  app.use('/api/authz/explain', authzExplainRoutes);
  app.use('/api/authz/permissions', permissionDerivationRoutes);

  // Schema governance
  app.use('/api/platform/schema', schemaGovernanceRoutes);

  // Public content (tenant-scoped; unauthenticated but tenant-resolved)
  app.use('/api/public', publicContentRoutes);

  // Platform operations
  app.use('/api/platform/jobs', jobsRoutes);
  app.use('/api/platform/event-dlq', eventDlqRoutes);
  app.use('/api/platform/runtime-health', runtimeHealthRoutes);
  app.use('/api/platform/service-health', serviceHealthRoutes);
  app.use('/api/platform/admin', platformAdminRoutes);
  app.use('/api/platform/admin/pages', pageCatalogRoutes);
  app.use('/api/platform/admin/endpoints', dynamicEndpointsRoutes);
  app.use('/api/platform/admin/ai-graphs', aiAgentGraphsRoutes);
  app.use('/api/platform/admin/plugins', pluginsRoutes);
  app.use('/api/platform/admin/approvals', approvalsRoutes);
  app.use('/api/platform/admin/schema', schemaDesignerRoutes);
  // Previously orphaned routes (Law 6 fix — no hidden logic):
  app.use('/api/platform/auto-tasks', autoTaskRoutes);
  app.use('/api/platform/contract-tests', contractTestsRoutes);

  // ── 7. Optional / feature-flagged modules (fail-open with logged warnings) ─

  // DOS agent stack
  mountOptional(app, 'DOS agent stack', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { agentRouter } = require('./platform/dos/agents') as {
      agentRouter: Router;
    };
    app.use('/api/platform/agents', agentRouter);
  });

  // AI gateway health probe
  mountOptional(app, 'AI gateway', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { gatewayHealth } = require('./platform/dos/ai-gateway') as {
      gatewayHealth: () => Promise<unknown>;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { authenticate } = require('./platform/dauth') as {
      authenticate: express.RequestHandler;
    };

    app.get(
      '/api/platform/ai-gateway/health',
      authenticate,
      asyncHandler(async (_req: Request, res: Response) => {
        res.json(await gatewayHealth());
      }),
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Final handlers (404 catch-all, SPA, global error)
// ─────────────────────────────────────────────────────────────────────────────

export function mountFinalHandlers(app: express.Express): void {
  // API 404 — must come after all API routes, before SPA fallback.
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'API route not found',
      statusCode: 404,
    });
  });

  // SPA static assets & index.html fallback.
  // The wildcard is intentionally scoped to non-API paths via the /api 404
  // handler above — only requests that don't start with /api reach here.
  const frontendDist = path.resolve(
    __dirname,
    '../../frontend/dist/dos-platform/browser',
  );
  app.use(express.static(frontendDist, { maxAge: '1d', etag: true }));
  app.get(/^(.*)$/, (_req: Request, res: Response) => {
    const indexPath = path.join(frontendDist, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        res
          .status(404)
          .json({ error: 'Frontend not built. Run: cd frontend && pnpm build' });
      }
    });
  });

  // Global error handler — MUST be last (Express identifies error handlers by
  // their 4-argument signature).
  app.use(errorHandler);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempts to mount an optional subsystem route.
 * If the module is absent or throws during load, logs a structured warning
 * instead of silently swallowing the error.
 */
function mountOptional(
  app: express.Express,
  label: string,
  mount: () => void,
): void {
  try {
    mount();
  } catch (err) {
    logger.warn(`[server-routes] Optional module unavailable: ${label}`, {
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}
