import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, JitGrantRow } from '../admin-api.service';

@Component({
  selector: 'dgn-jit',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-h">JIT elevation</h1>
    <p class="page-sub">Time-bounded grant (1..480 min). Step-up &le; 600s. Append-only revoke.</p>

    <div class="panel">
      <h3>Grant</h3>
      <div class="grid2">
        <div class="field"><label>user_id (uuid)</label><input [(ngModel)]="cUser"/></div>
        <div class="field"><label>role</label><input [(ngModel)]="cRole" placeholder="operator"/></div>
        <div class="field"><label>ticket_ref</label><input [(ngModel)]="cTicket" placeholder="OPS-123"/></div>
        <div class="field"><label>ttl_minutes</label><input type="number" [(ngModel)]="cTtl" min="1" max="480"/></div>
      </div>
      <div class="actions"><button class="btn-pri" type="button" [disabled]="busy()" (click)="grant()">Grant</button></div>
      @if (msg()) { <div class="ok" style="margin-top:.75rem">{{ msg() }}</div> }
      @if (err()) { <div class="err" style="margin-top:.75rem">{{ err() }}</div> }
    </div>

    <div class="panel">
      <div class="toolbar"><h3 style="margin:0">Grants</h3>
        <button class="btn-mini" type="button" (click)="reload()">Refresh</button></div>
      @if (rows().length === 0) { <div class="empty">No grants.</div> }
      @else {
        <table>
          <thead><tr><th>user</th><th>role</th><th>ticket</th><th>granted_by</th>
            <th>granted</th><th>expires</th><th>revoked</th><th></th></tr></thead>
          <tbody>
            @for (g of rows(); track g.id) {
              <tr>
                <td><code>{{ g.user_id.slice(0,8) }}</code></td>
                <td>{{ g.role }}</td><td>{{ g.ticket_ref }}</td>
                <td><code>{{ g.granted_by.slice(0,8) }}</code></td>
                <td>{{ g.granted_at }}</td><td>{{ g.expires_at }}</td>
                <td>{{ g.revoked_at ?? '—' }}</td>
                <td>
                  @if (!g.revoked_at) { <button class="btn-dng" type="button" (click)="revoke(g)">Revoke</button> }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class JitPage implements OnInit {
  private readonly api = inject(AdminApiService);
  cUser=''; cRole=''; cTicket=''; cTtl=60;
  readonly busy = signal(false);
  readonly msg = signal<string | null>(null);
  readonly err = signal<string | null>(null);
  readonly rows = signal<JitGrantRow[]>([]);

  ngOnInit(): void { void this.reload(); }
  async reload(): Promise<void> {
    const r = await this.api.listJit();
    if (r.ok && r.data) { this.rows.set(r.data.grants); this.err.set(null); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async grant(): Promise<void> {
    this.busy.set(true); this.msg.set(null); this.err.set(null);
    const r = await this.api.grantJit({
      user_id: this.cUser.trim(), role: this.cRole.trim(),
      ticket_ref: this.cTicket.trim(), ttl_minutes: Number(this.cTtl),
    });
    this.busy.set(false);
    if (r.ok && r.data) { this.msg.set(`id=${r.data.id}`); void this.reload(); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async revoke(g: JitGrantRow): Promise<void> {
    const reason = prompt('Revoke reason (6..1024)') ?? '';
    if (reason.length < 6) return;
    const r = await this.api.revokeJit({ id: g.id, reason });
    if (r.ok) void this.reload(); else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
