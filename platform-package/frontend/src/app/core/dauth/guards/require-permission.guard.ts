import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';
import { PlatformAuthService } from '../services/platform-auth.service';

/**
 * Route guard that checks `data.requires: string[]` against the current
 * user's permission set (OR-semantics). Super admins bypass the check.
 */
export const requirePermission: CanActivateFn = async (route) => {
  const auth = inject(PlatformAuthService);
  const perm = inject(PermissionService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);

  if (!perm.loaded()) await perm.load();

  const requires = (route.data?.['requires'] as string[] | undefined) ?? [];
  if (perm.hasAny(requires)) return true;
  return router.createUrlTree(['/overview']);
};
