import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MessageService, ConfirmationService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/infrastructure/error/global-error-handler.service';
import { PlatformAuthService } from './core/dauth/services/platform-auth.service';
import { PermissionService } from './core/dauth/services/permission.service';
import { DynamicRoutesService } from './core/dos/services/dynamic-routes.service';
import { authInterceptor } from './core/dauth/interceptors/auth.interceptor';
import { forbiddenInterceptor } from './core/dauth/interceptors/forbidden.interceptor';

function initAuth(auth: PlatformAuthService, perm: PermissionService, dynRoutes: DynamicRoutesService): () => Promise<void> {
  return async () => {
    await auth.init();
    if (auth.isLoggedIn()) {
      await perm.load();
      await dynRoutes.load();
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimationsAsync(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, forbiddenInterceptor])),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: { darkModeSelector: '.dos-dark' },
      },
    }),
    MessageService,
    ConfirmationService,
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    {
      provide: APP_INITIALIZER,
      useFactory: initAuth,
      deps: [PlatformAuthService, PermissionService, DynamicRoutesService],
      multi: true,
    },
  ],
};
