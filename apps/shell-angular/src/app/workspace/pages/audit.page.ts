import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminApiService, AuditRow } from '../admin-api.service';

@Component({
  selector: 'dgn-audit',
  standalone: true,
  template: `
    <h1 class="page-h">Audit log (DSOC)</h1>
    <p class="page-sub">Append-only mutating-verb trail for the current tenant. 500 most recent rows.</p>

    <div class="panel">
      <div class="toolbar">
        <span style="font-size:.8125rem;color:#525252">{{ rows().length }} row(s)</span>
        <button class="btn-mini" type="button" (click)="reload()">Refresh</button>
      </div>
      @if (err()) { <div class="err">{{ err() }}</div> }
      @if (rows().length === 0) { <div class="empty">No audit rows.</div> }
      @else {
        <table>
          <thead>
            <tr>
              <th>ts</th><th>user</th><th>action</th><th>target</th>
              <th>status</th><th>req</th><th>ip</th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.id) {
              <tr>
                <td>{{ r.ts }}</td>
                <td><code>{{ r.user_id ?? '—' }}</code></td>
                <td><code>{{ r.action }}</code></td>
                <td><code>{{ r.target }}</code></td>
                <td><span class="badge"
                  [class.up]="(r.status_code ?? 500) < 400"
                  [class.warn]="(r.status_code ?? 0) >= 400 && (r.status_code ?? 0) < 500"
                  [class.down]="(r.status_code ?? 0) >= 500">{{ r.status_code ?? '—' }}</span></td>
                <td><code>{{ r.request_id ?? '—' }}</code></td>
                <td><code>{{ r.client_ip ?? '—' }}</code></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class AuditPage implements OnInit {
  private readonly api = inject(AdminApiService);
  readonly rows = signal<AuditRow[]>([]);
  readonly err = signal<string | null>(null);

  ngOnInit(): void { void this.reload(); }

  async reload(): Promise<void> {
    const r = await this.api.listAudit();
    if (r.ok && r.data) { this.rows.set(r.data.audit); this.err.set(null); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
