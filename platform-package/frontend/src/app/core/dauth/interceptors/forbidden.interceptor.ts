import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { PlatformAuthService } from '../services/platform-auth.service';

/**
 * Surfaces 401/403 responses consistently: 401 logs the user out,
 * 403 shows a toast and stays on the page. Other errors pass through.
 */
export const forbiddenInterceptor: HttpInterceptorFn = (req, next) => {
  const msg = inject(MessageService, { optional: true });
  const router = inject(Router);
  const auth = inject(PlatformAuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        auth.logout();
        router.navigateByUrl('/login');
      } else if (err.status === 403) {
        const required = (err.error?.required as string[] | undefined)?.join(', ') || '';
        msg?.add({
          severity: 'warn',
          summary: 'Permission denied',
          detail: required ? `Requires: ${required}` : 'You are not authorized to perform this action.',
          life: 5000,
        });
      }
      return throwError(() => err);
    }),
  );
};
