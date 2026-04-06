import type { AuthActor, ConfigScopeType } from './config.types';

export const CONFIG_PERMISSIONS = {
  definitionRead: 'platform.config.definition.read',
  definitionCreate: 'platform.config.definition.create',
  definitionUpdate: 'platform.config.definition.update',
  definitionDelete: 'platform.config.definition.delete',
  valueRead: 'platform.config.value.read',
  valueWrite: 'platform.config.value.write',
  valueDelete: 'platform.config.value.delete',
  lockRead: 'platform.config.lock.read',
  lockWrite: 'platform.config.lock.write',
  auditRead: 'platform.config.audit.read',
  bootstrapExecute: 'platform.config.bootstrap.execute',
  resolveRead: 'platform.config.resolve.read',
} as const;

export function hasPermission(actor: AuthActor | undefined, permission: string): boolean {
  return !!actor?.permissions?.includes(permission);
}

export function assertPermission(actor: AuthActor | undefined, permission: string): void {
  if (!hasPermission(actor, permission)) {
    const err = new Error(`Missing permission: ${permission}`);
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
}

export function assertScopeAccess(
  actor: AuthActor | undefined,
  target: { scopeType: ConfigScopeType; scopeId: string },
): void {
  if (!actor) {
    const err = new Error('Unauthenticated');
    (err as Error & { status?: number }).status = 401;
    throw err;
  }

  if (actor.permissions?.includes('*')) return;

  if (target.scopeType === 'tenant' && actor.tenantId && actor.tenantId !== target.scopeId) {
    const err = new Error('Cross-tenant config access denied');
    (err as Error & { status?: number }).status = 403;
    throw err;
  }

  if (
    target.scopeType === 'organization' &&
    actor.organizationId &&
    actor.organizationId !== target.scopeId &&
    !actor.permissions?.includes(CONFIG_PERMISSIONS.definitionUpdate)
  ) {
    const err = new Error('Cross-organization config access denied');
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
}
