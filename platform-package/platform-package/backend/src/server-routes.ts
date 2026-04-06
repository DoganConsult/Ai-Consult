import express, { Request, Response } from 'express';
import path from 'path';

import authRoutes from './platform/dauth/routes/auth.routes';
import provisioningRoutes from './platform/dos/provisioning/routes/provisioning.routes';
import invitationRoutes from './platform/dauth/routes/invitation.routes';
import emailVerificationRoutes from './platform/dauth/routes/email-verification.routes';
import deadLetterQueueRoutes from './platform/dos/http/health/dead-letter-queue.routes';
import traceCorrelationRoutes from './platform/dos/http/health/trace-correlation.routes';
import subscriptionLifecycleRoutes from './platform/dos/lifecycle/routes/subscription-lifecycle.routes';
import healthRoutes from './platform/dos/http/health/health.routes';
import clientErrorRoutes from './platform/dos/http/health/client-error.routes';
import workspaceAuditRoutes from './platform/dos/tenancy/routes/workspace-audit.routes';
import meRoutes from './platform/dauth/routes/me.routes';
import accessContractRoutes from './platform/dauth/routes/access-contract.routes';
import actorIdentityRoutes from './platform/dauth/routes/actor-identity.routes';
import schemaGovernanceRoutes from './platform/dos/tenancy/routes/schema-governance.routes';
import publicContentRoutes from './platform/dos/provisioning/routes/public-content.routes';
import workspaceRoutes from './platform/dos/tenancy/routes/workspace.routes';
import tenantConfigRoutes from './platform/dos/tenancy/routes/tenant-config.routes';
import tenantHomeRoutes from './platform/dos/tenancy/routes/tenant-home.routes';
import workspaceHomeRoutes from './platform/dos/tenancy/routes/workspace-home.routes';
import workspaceLifecycleRoutes from './platform/dos/workspace/routes/workspace-lifecycle.routes';
import jobsRoutes from './platform/dos/http/health/jobs.routes';
import eventDlqRoutes from './platform/dos/http/health/event-dlq.routes';
import runtimeHealthRoutes from './platform/dos/http/health/runtime-health.routes';
import serviceHealthRoutes from './platform/dos/http/health/service-health.routes';
import authzExplainRoutes from './platform/dauth/routes/authz-explain.routes';
import permissionDerivationRoutes from './platform/dauth/routes/permission-derivation.routes';
import bootstrapRoutes from './platform/dos/provisioning/routes/bootstrap.routes';
import bootstrapManifestRoutes from './platform/dos/provisioning/routes/bootstrap-manifest.routes';
import packManagementRoutes from './platform/dos/provisioning/routes/pack-management.routes';
import platformAdminRoutes from './platform/dos/admin/platform-admin.routes';

import { tenantGuard } from './platform/dos/http/guards/tenant-guard';
import { resolveTenantFromHost } from './platform/dos/http/middleware/tenant';
import { subscriptionStatusGuard } from './platform/dos/http/guards/module-guard';
import { rateLimiter } from './platform/dos/http/rate-limiting/rate-limiter';
import { tenantQuarantineGuard } from './platform/dos/http/guards/tenant-guard';
import { tenantRateLimiter } from './platform/dos/http/rate-limiting/rate-limiter';
import { tenantRoutingMiddleware } from './platform/dos/http/middleware/tenant';
import { membershipContextMiddleware } from './platform/dos/http/middleware/scope-context';
import { errorHandler } from './platform/dos/http/error-handling/async-handler';

import { logger } from './platform/dos/observability/logger.service';

export function mountRoutes(app: express.Express): void {
  app.use("/api", healthRoutes);

  app.use("/api/platform/client-errors", clientErrorRoutes);

  const clientIp = (req: Request): string => {
    const cfIp = req.headers?.['cf-connecting-ip'] as string;
    const xff = req.headers?.['x-forwarded-for'];
    const forwardedIp = typeof xff === 'string' ? xff.split(',')[0].trim() : undefined;
    return cfIp || forwardedIp || req.ip || req.socket?.remoteAddress || 'any';
  };
  const apiLimiter = rateLimiter({ windowMs: 60_000, maxRequests: 600, namespace: 'api', keyGenerator: clientIp });
  const authLimiter = rateLimiter({ windowMs: 60_000, maxRequests: 60, namespace: 'auth', keyGenerator: clientIp });

  app.use("/api", apiLimiter);
  app.use("/api/auth", (req, res, next) => {
    if (req.path === '/userinfo' && req.method === 'GET') return next();
    if (req.path === '/register' && req.method === 'POST') return next();
    return authLimiter(req, res, next);
  });

  app.use("/api/invitations", rateLimiter({ namespace: 'invitations', maxRequests: 20, windowMs: 60_000 }), invitationRoutes);

  app.use("/api", resolveTenantFromHost);
  app.use("/api", tenantRoutingMiddleware());
  app.use("/api", tenantGuard);
  app.use("/api", subscriptionStatusGuard());
  app.use("/api", tenantQuarantineGuard());
  app.use("/api", tenantRateLimiter());
  app.use("/api", membershipContextMiddleware());

  app.use("/api/auth", authRoutes);

  app.use("/api/provisioning", provisioningRoutes);
  app.use("/api/auth", emailVerificationRoutes);
  app.use("/api/dead-letter-queue", deadLetterQueueRoutes);
  app.use("/api/trace-correlation", traceCorrelationRoutes);
  app.use("/api/subscription", subscriptionLifecycleRoutes as any);
  app.use("/api/admin/subscriptions", subscriptionLifecycleRoutes as any);

  app.use("/api", workspaceAuditRoutes);

  try {
    const { agentRouter } = require('./platform/dos/agents');
    app.use("/api/platform/agents", agentRouter);
  } catch { /* DOS agent stack not available */ }

  try {
    const { gatewayHealth } = require('./platform/dos/ai-gateway');
    const { authenticate } = require('./platform/dauth');
    app.get("/api/platform/ai-gateway/health", authenticate, async (_req: any, res: any) => {
      try { res.json(await gatewayHealth()); } catch { res.status(500).json({ error: 'gateway_health_failed' }); }
    });
  } catch { /* AI gateway not available */ }

  app.use("/api/me", meRoutes);
  app.use("/api/me/access-contract", accessContractRoutes);

  app.use("/api/public", publicContentRoutes);

  app.use("/api/identity", actorIdentityRoutes);

  app.use("/api/platform/schema", schemaGovernanceRoutes);

  app.use("/api/workspaces", workspaceRoutes);
  app.use("/api/tenant", tenantConfigRoutes);
  app.use("/api/tenant/home", tenantHomeRoutes);
  app.use("/api/workspace/home", workspaceHomeRoutes);
  app.use("/api/workspace/lifecycle", workspaceLifecycleRoutes);
  app.use("/api/platform/jobs", jobsRoutes);
  app.use("/api/platform/event-dlq", eventDlqRoutes);
  app.use("/api/platform/runtime-health", runtimeHealthRoutes);
  app.use("/api/platform/service-health", serviceHealthRoutes);
  app.use("/api/authz/explain", authzExplainRoutes);
  app.use("/api/authz/permissions", permissionDerivationRoutes);
  app.use("/api/provisioning/bootstrap", bootstrapRoutes);
  app.use("/api/provisioning/manifests", bootstrapManifestRoutes);
  app.use("/api/provisioning/packs", packManagementRoutes);
  app.use("/api/platform/admin", platformAdminRoutes);
}

export function mountFinalHandlers(app: express.Express): void {
  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({ error: "NOT_FOUND", message: "API route not found", statusCode: 404 });
  });

  const frontendDist = path.resolve(__dirname, '../../frontend/dist/dos-platform/browser');
  app.use(express.static(frontendDist, { maxAge: '1d', etag: true }));
  app.get('*', (_req: Request, res: Response) => {
    const indexPath = path.join(frontendDist, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) res.status(404).json({ error: 'Frontend not built. Run: cd frontend && pnpm build' });
    });
  });

  app.use(errorHandler);
}
