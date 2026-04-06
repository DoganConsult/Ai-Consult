/**
 * Allowlist of `app.use("<prefix>", ...)` mount paths in server.ts that start with `/api`.
 * Product routes mounted via DB catalog are not listed here.
 *
 * When adding a new explicit mount in server.ts, update this array and
 * docs/PLATFORM_ROUTE_EXCEPTIONS.md. CI compares this set to a regex parse of server.ts.
 */
export const EXPLICIT_API_MOUNT_PREFIXES: readonly string[] = [
  '/api',
  '/api/admin/modules',
  '/api/admin/subscriptions',
  '/api/agent-metrics',
  '/api/agents/audit',
  '/api/agents/health',
  '/api/ai-rbac',
  '/api/auth',
  '/api/consultant-center',
  '/api/dead-letter-queue',
  '/api/dynamic-rbac',
  '/api/handoff-queue',
  '/api/invitations',
  '/api/local-knowledge',
  '/api/mcp',
  '/api/module-metrics',
  '/api/module-status',
  '/api/monitoring',
  '/api/onboarding',
  '/api/onboarding/config',
  '/api/ontology',
  '/api/openclaw',
  '/api/payment',
  '/api/personal-agent',
  '/api/provisioning',
  '/api/provisioning/v2',
  '/api/public',
  '/api/quotes',
  '/api/regulator-portal',
  '/api/subscription',
  '/api/trace-correlation',
  '/api/ui-config',
  '/api/v1',
  '/api/vendor-portal',
  '/api/webhooks',
] as const;
