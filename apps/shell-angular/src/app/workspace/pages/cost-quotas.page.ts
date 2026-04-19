import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, CostQuotaRow } from '../admin-api.service';

@Component({
  selector: 'dgn-cost-quotas',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-h">Cost quotas</h1>
    <p class="page-sub">Per-tenant per-agent token + USD caps for AI invocations.</p>

    <div class="panel">
      <h3>Upsert quota</h3>
      <div class="grid2">
        <div class="field"><label>scope_type</label>
          <select [(ngModel)]="cType"><option>tenant</option><option>agent</option></select>
        </div>
        <div class="field"><label>scope_ref</label><input [(ngModel)]="cRef"/></div>
        <div class="field"><label>period</label>
          <select [(ngModel)]="cPeriod"><option>day</option><option>month</option></select>
        </div>
        <div class="field"><label>token_cap</label><input type="number" [(ngModel)]="cTok"/></div>
        <div class="field"><label>usd_cap</label><input type="number" step="0.01" [(ngModel)]="cUsd"/></div>
        <div class="field"><label>enabled</label>
          <select [(ngModel)]="cEnabled"><option [ngValue]="true">true</option><option [ngValue]="false">false</option></select>
        </div>
      </div>
      <div class="actions"><button class="btn-pri" type="button" [disabled]="busy()" (click)="upsert()">Upsert</button></div>
      @if (msg()) { <div class="ok" style="margin-top:.75rem">{{ msg() }}</div> }
      @if (err()) { <div class="err" style="margin-top:.75rem">{{ err() }}</div> }
    </div>

    <div class="panel">
      <div class="toolbar"><h3 style="margin:0">Quotas</h3>
        <button class="btn-mini" type="button" (click)="reload()">Refresh</button></div>
      @if (rows().length === 0) { <div class="empty">No quotas.</div> }
      @else {
        <table>
          <thead><tr><th>tenant</th><th>scope_type</th><th>scope_ref</th><th>period</th>
            <th>token_cap</th><th>usd_cap</th><th>enabled</th><th>updated</th></tr></thead>
          <tbody>
            @for (q of rows(); track q.id) {
              <tr>
                <td><code>{{ q.tenant_id.slice(0,8) }}</code></td>
                <td>{{ q.scope_type }}</td><td>{{ q.scope_ref }}</td><td>{{ q.period }}</td>
                <td>{{ q.token_cap ?? '—' }}</td><td>{{ q.usd_cap ?? '—' }}</td>
                <td><span class="badge" [class.up]="q.enabled" [class.down]="!q.enabled">{{ q.enabled }}</span></td>
                <td>{{ q.updated_at }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class CostQuotasPage implements OnInit {
  private readonly api = inject(AdminApiService);
  cType: 'tenant'|'agent' = 'tenant'; cRef = ''; cPeriod: 'day'|'month' = 'day';
  cTok = 0; cUsd = 0; cEnabled = true;
  readonly busy = signal(false);
  readonly msg = signal<string | null>(null);
  readonly err = signal<string | null>(null);
  readonly rows = signal<CostQuotaRow[]>([]);

  ngOnInit(): void { void this.reload(); }
  async reload(): Promise<void> {
    const r = await this.api.listCostQuotas();
    if (r.ok && r.data) { this.rows.set(r.data.quotas); this.err.set(null); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async upsert(): Promise<void> {
    this.busy.set(true); this.msg.set(null); this.err.set(null);
    const r = await this.api.upsertCostQuota({
      scope_type: this.cType, scope_ref: this.cRef.trim(), period: this.cPeriod,
      token_cap: this.cTok > 0 ? Number(this.cTok) : undefined,
      usd_cap: this.cUsd > 0 ? Number(this.cUsd) : undefined,
      enabled: this.cEnabled,
    });
    this.busy.set(false);
    if (r.ok && r.data) { this.msg.set(`id=${r.data.id}`); void this.reload(); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
