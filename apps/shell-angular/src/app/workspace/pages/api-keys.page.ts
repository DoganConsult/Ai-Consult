import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, ApiKeyRow } from '../admin-api.service';

@Component({
  selector: 'dgn-api-keys',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-h">API keys</h1>
    <p class="page-sub">Mint <code>dga_</code> tokens scoped to the current tenant. Hashes are SHA-256, raw token is shown once.</p>

    <div class="grid2">
      <div class="panel">
        <h3>Mint API key</h3>
        <div class="field"><label>label</label><input [(ngModel)]="label" placeholder="ci-runner"/></div>
        <div class="field"><label>scopes (comma)</label><input [(ngModel)]="scopes" placeholder="read,write"/></div>
        <div class="field"><label>expires_at (optional ISO 8601)</label><input [(ngModel)]="expiresAt"/></div>
        <div class="field"><label>ip_allowlist (comma CIDR/IP)</label><input [(ngModel)]="ipAllow"/></div>
        <div class="field"><label>user_id (optional uuid)</label><input [(ngModel)]="userId"/></div>
        <div class="actions">
          <button class="btn-pri" type="button" [disabled]="busy()" (click)="mint()">Mint key</button>
        </div>
        @if (token()) {
          <div class="ok" style="margin-top:.75rem">key_id={{ keyId() }}</div>
          <div style="margin-top:.5rem"><strong>Raw token (shown once):</strong></div>
          <pre>{{ token() }}</pre>
        }
        @if (err()) { <div class="err" style="margin-top:.75rem">{{ err() }}</div> }
      </div>

      <div class="panel">
        <h3>Existing keys</h3>
        <div class="toolbar">
          <span style="font-size:.8125rem;color:#525252">{{ rows().length }} key(s)</span>
          <button class="btn-mini" type="button" (click)="reload()">Refresh</button>
        </div>
        @if (rows().length === 0) { <div class="empty">No keys provisioned.</div> }
        @else {
          <table>
            <thead><tr><th>id</th><th>label</th><th>scopes</th><th>expires</th><th>revoked</th><th></th></tr></thead>
            <tbody>
              @for (k of rows(); track k.id) {
                <tr>
                  <td><code>{{ k.id }}</code></td>
                  <td>{{ k.label ?? '—' }}</td>
                  <td><code>{{ k.scopes.join(',') }}</code></td>
                  <td>{{ k.expires_at ?? '—' }}</td>
                  <td>{{ k.revoked_at ?? '—' }}</td>
                  <td>
                    @if (!k.revoked_at) {
                      <button class="btn-dng" type="button" (click)="revoke(k.id)">Revoke</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `,
})
export class ApiKeysPage implements OnInit {
  private readonly api = inject(AdminApiService);
  label = ''; scopes = ''; expiresAt = ''; ipAllow = ''; userId = '';
  readonly busy = signal(false);
  readonly token = signal<string | null>(null);
  readonly keyId = signal<string | null>(null);
  readonly err = signal<string | null>(null);
  readonly rows = signal<ApiKeyRow[]>([]);

  ngOnInit(): void { void this.reload(); }

  async mint(): Promise<void> {
    this.busy.set(true); this.token.set(null); this.err.set(null);
    const scopes = this.scopes.split(',').map((s) => s.trim()).filter(Boolean);
    const ip = this.ipAllow.split(',').map((s) => s.trim()).filter(Boolean);
    const r = await this.api.createApiKey({
      label: this.label.trim(), scopes,
      expires_at: this.expiresAt.trim() || undefined,
      ip_allowlist: ip.length > 0 ? ip : undefined,
      user_id: this.userId.trim() || undefined,
    });
    this.busy.set(false);
    if (r.ok && r.data) { this.keyId.set(r.data.key_id); this.token.set(r.data.token); void this.reload(); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }

  async revoke(id: string): Promise<void> {
    const r = await this.api.revokeApiKey(id);
    if (r.ok) void this.reload();
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }

  async reload(): Promise<void> {
    const r = await this.api.listApiKeys();
    if (r.ok && r.data) this.rows.set(r.data.api_keys);
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
