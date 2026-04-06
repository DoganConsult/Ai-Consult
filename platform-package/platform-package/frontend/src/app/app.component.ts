import { Component, inject, OnInit, PLATFORM_ID, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConnectivityService } from './core/dos/shell/connectivity.service';
import { PlatformAuthService } from './core/dauth/services/platform-auth.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, ToastModule, ConfirmDialogModule],
  template: `
    <a href="#main-content" class="skip-link">Skip to main content</a>
    @if (connectivity.isOffline()) {
      <div class="offline-banner" role="alert">You are offline. Some features may be unavailable.</div>
    }
    <p-toast />
    <p-confirmDialog />
    <router-outlet />
  `,
  styles: [`
    .offline-banner {
      background: var(--dos-warning);
      color: #1e293b;
      text-align: center;
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 500;
    }
  `],
})
export class AppComponent implements OnInit {
  readonly connectivity = inject(ConnectivityService);
  readonly authService = inject(PlatformAuthService);
  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
  }
}
