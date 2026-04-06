-- Add missing route_aliases used by automationMiddleware() in route files
-- so resolveByRoute() finds a descriptor for every CUD route (EventBus + dashboard).
-- New aliases: tenant-email-config, member-lifecycle (workspaces).

UPDATE module_workflow_registry SET
  route_aliases = ARRAY[
    'workspaces', 'admin', 'agrc-os', 'activity-feed', 'feature-tables',
    'tenant-config', 'tenant-email-config', 'security-config', 'platform-config',
    'analytics', 'dashboard', 'workspace-lifecycle', 'mobile', 'tier', 'event-dlq',
    'workspace', 'tenant-home', 'field-rbac', 'modules', 'products',
    'bulk-import', 'business_unit', 'organization', 'location', 'department',
    'ai-squad', 'knowledge', 'member-lifecycle'
  ]
WHERE module_code = 'workspaces';
