import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { workspaceStyles } from './workspace.styles';

@Component({
  selector: 'dgn-workspace',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  styles: [workspaceStyles],
  template: `
    <div class="ws-shell">
      <aside class="ws-side">
        <div class="brand">Dogan <small>AI OS</small></div>
        <div class="pillar-label">Overview</div>
        <a routerLink="/workspace/overview" routerLinkActive="active">4D operator overview</a>
        <div class="pillar-label">DAuth · Identity</div>
        <a routerLink="/workspace/dauth" routerLinkActive="active" [routerLinkActiveOptions]="exact">Dashboard</a>
        <a routerLink="/workspace/dauth/tenants" routerLinkActive="active">Tenants</a>
        <a routerLink="/workspace/dauth/users" routerLinkActive="active">Users</a>
        <a routerLink="/workspace/dauth/roles" routerLinkActive="active">Roles &amp; SoD preflight</a>
        <a routerLink="/workspace/dauth/sessions" routerLinkActive="active">Sessions</a>
        <a routerLink="/workspace/dauth/api-keys" routerLinkActive="active">API keys</a>
        <a routerLink="/workspace/dauth/abac" routerLinkActive="active">ABAC policies</a>
        <a routerLink="/workspace/dauth/sod" routerLinkActive="active">SoD rules</a>
        <a routerLink="/workspace/dauth/tier-limits" routerLinkActive="active">Tier limits</a>
        <div class="pillar-label">DOS · Operating System</div>
        <a routerLink="/workspace/dos" routerLinkActive="active" [routerLinkActiveOptions]="exact">Dashboard</a>
        <a routerLink="/workspace/dos/config-kv" routerLinkActive="active">Config KV</a>
        <a routerLink="/workspace/dos/feature-flags" routerLinkActive="active">Feature flags</a>
        <a routerLink="/workspace/dos/inventory" routerLinkActive="active">Inventory</a>
        <a routerLink="/workspace/dos/capabilities" routerLinkActive="active">Kernel capabilities</a>
        <div class="pillar-label">DSOC · Security</div>
        <a routerLink="/workspace/dsoc" routerLinkActive="active" [routerLinkActiveOptions]="exact">Dashboard</a>
        <a routerLink="/workspace/dsoc/alerts" routerLinkActive="active">Security alerts</a>
        <a routerLink="/workspace/dsoc/audit" routerLinkActive="active">Audit log</a>
        <a routerLink="/workspace/dsoc/retention" routerLinkActive="active">Retention sweep</a>
        <div class="pillar-label">DNOC · Reliability</div>
        <a routerLink="/workspace/dnoc" routerLinkActive="active" [routerLinkActiveOptions]="exact">Dashboard</a>
        <a routerLink="/workspace/dnoc/readiness" routerLinkActive="active">Readiness &amp; metrics</a>
        <div class="footer">
          DAuth-issued session<br/>
          Pillars: DAuth · DOS · DSOC · DNOC
        </div>
      </aside>
      <main class="ws-main">
        <div class="ws-topbar">
          <div class="who">
            <strong>{{ session()?.email ?? '(unknown)' }}</strong>
            <span> · tid </span>
            <code>{{ session()?.tenantId ?? '(none)' }}</code>
            <span> · roles </span>
            <code>{{ (session()?.roles ?? []).join(',') || '(none)' }}</code>
          </div>
          <button type="button" (click)="logout()">Sign out</button>
        </div>
        <div class="ws-content">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class WorkspaceComponent {
  private readonly auth = inject(AuthService);
  readonly session = this.auth.session;
  readonly exact = { exact: true };
  logout(): void { void this.auth.logout(); }
}
