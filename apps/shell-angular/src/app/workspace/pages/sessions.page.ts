import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, SessionRow } from '../admin-api.service';

@Component({
  selector: 'dgn-sessions',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-h">Sessions</h1>
    <p class="page-sub">Active sessions for the current tenant. Create a tracked session row or revoke an existing one.</p>

    <div class="grid2">
      <div class="panel">
        <h3>Create session row</h3>
        <div class="field"><label>user_id (uuid)</label><input [(ngModel)]="userId"/></div>
        <div class="field"><label>expires_at (ISO 8601)</label><input [(ngModel)]="expiresAt" placeholder="2026-12-31T23:59:59Z"/></div>
        <div class="field"><label>kc_session_id (optional)</label><input [(ngModel)]="kcSid"/></div>
        <div class="field"><label>risk_band (optional)</label>
          <select [(ngModel)]="riskBand">
            <option value="">(none)</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
        </div>
        <div class="actions">
          <button class="btn-pri" type="button" [disabled]="busy()" (click)="create()">Create</button>
        </div>
        @if (msg()) { <div class="ok" style="margin-top:.75rem">{{ msg() }}</div> }
        @if (err()) { <div class="err" style="margin-top:.75rem">{{ err() }}</div> }
      </div>

      <div class="panel">
        <h3>Active sessions</h3>
        <div class="toolbar">
          <span style="font-size:.8125rem;color:#525252">{{ rows().length }} session(s)</span>
          <button class="btn-mini" type="button" (click)="reload()">Refresh</button>
        </div>
        @if (rows().length === 0) { <div class="empty">No active sessions.</div> }
        @else {
          <table>
            <thead><tr><th>id</th><th>user</th><th>expires</th><th>risk</th><th></th></tr></thead>
            <tbody>
              @for (s of rows(); track s.id) {
                <tr>
                  <td><code>{{ s.id }}</code></td>
                  <td><code>{{ s.user_id }}</code></td>
                  <td>{{ s.expires_at }}</td>
                  <td><span class="badge"
                    [class.warn]="s.risk_band === 'medium'"
                    [class.high]="s.risk_band === 'high'"
                    [class.crit]="s.risk_band === 'critical'">{{ s.risk_band ?? '—' }}</span></td>
                  <td><button class="btn-dng" type="button" (click)="revoke(s.id)">Revoke</button></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `,
})
export class SessionsPage implements OnInit {
  private readonly api = inject(AdminApiService);
  userId = ''; expiresAt = ''; kcSid = ''; riskBand = '';
  readonly busy = signal(false);
  readonly msg = signal<string | null>(null);
  readonly err = signal<string | null>(null);
  readonly rows = signal<SessionRow[]>([]);

  ngOnInit(): void { void this.reload(); }

  async create(): Promise<void> {
    this.busy.set(true); this.msg.set(null); this.err.set(null);
    const r = await this.api.createSession({
      user_id: this.userId.trim(), expires_at: this.expiresAt.trim(),
      kc_session_id: this.kcSid.trim() || undefined,
      risk_band: this.riskBand || undefined,
    });
    this.busy.set(false);
    if (r.ok && r.data) { this.msg.set(`session_id=${r.data.session_id}`); void this.reload(); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }

  async revoke(id: string): Promise<void> {
    const r = await this.api.revokeSession(id);
    if (r.ok) void this.reload();
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }

  async reload(): Promise<void> {
    const r = await this.api.listSessions();
    if (r.ok && r.data) this.rows.set(r.data.sessions);
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
