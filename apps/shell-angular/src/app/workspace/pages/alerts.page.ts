import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminApiService, AlertRow } from '../admin-api.service';

@Component({
  selector: 'dgn-alerts',
  standalone: true,
  template: `
    <h1 class="page-h">Security alerts (DSOC)</h1>
    <p class="page-sub">Latest 500 alerts for the current tenant. Acknowledge, resolve, or suppress in place.</p>

    <div class="panel">
      <div class="toolbar">
        <span style="font-size:.8125rem;color:#525252">{{ rows().length }} alert(s)</span>
        <button class="btn-mini" type="button" (click)="reload()">Refresh</button>
      </div>
      @if (err()) { <div class="err">{{ err() }}</div> }
      @if (rows().length === 0) { <div class="empty">No alerts.</div> }
      @else {
        <table>
          <thead>
            <tr>
              <th>ts</th><th>sev</th><th>category</th><th>title</th>
              <th>status</th><th>actions</th>
            </tr>
          </thead>
          <tbody>
            @for (a of rows(); track a.id) {
              <tr>
                <td>{{ a.ts }}</td>
                <td><span class="badge"
                  [class.warn]="a.severity === 'warn'"
                  [class.high]="a.severity === 'high'"
                  [class.crit]="a.severity === 'critical'">{{ a.severity }}</span></td>
                <td><code>{{ a.category }}</code></td>
                <td>{{ a.title }}</td>
                <td><span class="badge"
                  [class.up]="a.status === 'resolved'"
                  [class.down]="a.status === 'open'">{{ a.status }}</span></td>
                <td>
                  <button class="btn-mini" type="button" (click)="ack(a, 'ack')">Ack</button>
                  <button class="btn-mini" type="button" (click)="ack(a, 'resolved')">Resolve</button>
                  <button class="btn-mini" type="button" (click)="ack(a, 'suppressed')">Suppress</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class AlertsPage implements OnInit {
  private readonly api = inject(AdminApiService);
  readonly rows = signal<AlertRow[]>([]);
  readonly err = signal<string | null>(null);

  ngOnInit(): void { void this.reload(); }

  async reload(): Promise<void> {
    const r = await this.api.listAlerts();
    if (r.ok && r.data) { this.rows.set(r.data.alerts); this.err.set(null); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }

  async ack(a: AlertRow, status: 'ack' | 'resolved' | 'suppressed'): Promise<void> {
    const r = await this.api.ackAlert({ alert_id: Number(a.id), status });
    if (r.ok) void this.reload();
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
