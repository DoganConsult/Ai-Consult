import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../admin-api.service';
import type { DsocStats } from '../stats-types';
import { KpiTile, BarChart, Sparkline, Donut } from '../charts.component';

@Component({
  selector: 'dgn-dsoc-dashboard',
  standalone: true,
  imports: [RouterLink, KpiTile, BarChart, Sparkline, Donut],
  template: `
    <h1 class="page-h">DSOC · Security Operations dashboard</h1>
    <p class="page-sub">Tenant-scoped alerts, audit trail, and retention. Click into the lists to triage.</p>

    @if (s(); as st) {
      <div class="kgrid">
        <a routerLink="/workspace/dsoc/alerts"><dgn-kpi label="Open alerts" [value]="st.counters.alerts_open"/></a>
        <a routerLink="/workspace/dsoc/audit"><dgn-kpi label="Audit (24h)" [value]="st.counters.audit_24h"/></a>
        <a routerLink="/workspace/dsoc/retention"><dgn-kpi label="Retention" value="sweep"/></a>
      </div>

      <div class="grid2">
        <div class="panel">
          <h3>Alerts (14 days)</h3>
          <dgn-spark [data]="trend(st.alerts_14d_by_day)" color="#da1e28"/>
        </div>
        <div class="panel">
          <h3>Audit log (24h)</h3>
          <dgn-spark [data]="trend(st.audit_24h_by_hour)" color="#198038"/>
        </div>
        <div class="panel">
          <h3>Alerts by severity (7d)</h3>
          <dgn-donut [data]="sev(st)" caption="alerts"/>
        </div>
        <div class="panel">
          <h3>Alerts by status (7d)</h3>
          <dgn-donut [data]="status(st)" caption="alerts"/>
        </div>
        <div class="panel" style="grid-column:1 / -1">
          <h3>Top alert categories (7d)</h3>
          <dgn-bar [data]="bars(st.alerts_7d_by_category, 'category')"/>
        </div>
      </div>
      <div class="ts">refreshed {{ st.ts }}</div>
    } @else if (err()) { <div class="err">{{ err() }}</div> }
    @else { <div class="empty">Loading…</div> }
  `,
  styles: [`
    .kgrid { display:grid; grid-template-columns: repeat(3, 1fr); gap:.75rem; margin-bottom:1rem; }
    .kgrid a { text-decoration:none; }
    .ts { font-size:.6875rem; color:#8d8d8d; margin-top:.5rem; }
  `],
})
export class DsocDashboardPage implements OnInit {
  private readonly api = inject(AdminApiService);
  readonly s = signal<DsocStats | null>(null);
  readonly err = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const r = await this.api.dsocStats();
    if (r.ok && r.data) this.s.set(r.data);
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  trend(rows: { bucket: string; c: number }[]) {
    return rows.map((b) => ({ label: b.bucket, value: b.c }));
  }
  sev(st: DsocStats) {
    const colors: Record<string, string> = {
      info:'#0f62fe', low:'#198038', medium:'#f1c21b', high:'#ff832b', critical:'#da1e28',
    };
    return st.alerts_7d_by_severity.map((r) => ({ label: r.severity, value: r.c, color: colors[r.severity] }));
  }
  status(st: DsocStats) {
    const colors: Record<string, string> = {
      new:'#da1e28', ack:'#f1c21b', resolved:'#198038', suppressed:'#8d8d8d',
    };
    return st.alerts_7d_by_status.map((r) => ({ label: r.status, value: r.c, color: colors[r.status] }));
  }
  bars(rows: Record<string, unknown>[], key: string) {
    return rows.map((r) => ({ label: String(r[key]), value: Number(r['c'] ?? 0) }));
  }
}
