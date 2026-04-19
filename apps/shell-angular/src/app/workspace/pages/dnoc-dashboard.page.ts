import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../admin-api.service';
import type { DnocStats } from '../stats-types';
import { KpiTile, BarChart, Donut } from '../charts.component';

@Component({
  selector: 'dgn-dnoc-dashboard',
  standalone: true,
  imports: [RouterLink, KpiTile, BarChart, Donut],
  template: `
    <h1 class="page-h">DNOC · Network &amp; Reliability dashboard</h1>
    <p class="page-sub">Live readiness probes, component latency, DB connection state, and top heavy tables. Auto-refreshes every 15s.</p>

    @if (s(); as st) {
      <div class="kgrid">
        <dgn-kpi label="Components UP" [value]="st.summary.up + ' / ' + st.summary.total"/>
        <a routerLink="/workspace/dnoc/readiness"><dgn-kpi label="Readiness page" value="open"/></a>
        <dgn-kpi label="DB connections" [value]="dbConn(st)"/>
        <dgn-kpi label="Top table size" [value]="bytes(st.db.topTables[0]?.bytes ?? 0)"/>
      </div>

      <div class="grid2">
        <div class="panel">
          <h3>Probe status</h3>
          <dgn-donut [data]="probeDonut(st)" caption="probes"/>
        </div>
        <div class="panel">
          <h3>Probe latency (ms)</h3>
          <dgn-bar [data]="latencyBars(st)"/>
        </div>
        <div class="panel">
          <h3>DB connections by state</h3>
          <dgn-bar [data]="connBars(st)"/>
        </div>
        <div class="panel">
          <h3>Top tables by total size</h3>
          <dgn-bar [data]="tableBars(st)"/>
        </div>
        <div class="panel" style="grid-column:1 / -1">
          <h3>Components</h3>
          <table>
            <thead><tr><th>name</th><th>status</th><th>latency</th><th>error</th></tr></thead>
            <tbody>
              @for (c of st.components; track c.name) {
                <tr>
                  <td><strong>{{ c.name }}</strong></td>
                  <td><span class="badge" [class.up]="c.ok" [class.down]="!c.ok">{{ c.ok ? 'UP' : 'DOWN' }}</span></td>
                  <td>{{ c.latencyMs }} ms</td>
                  <td><code>{{ c.error ?? '' }}</code></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
      <div class="ts">refreshed {{ st.ts }}</div>
    } @else if (err()) { <div class="err">{{ err() }}</div> }
    @else { <div class="empty">Loading…</div> }
  `,
  styles: [`
    .kgrid { display:grid; grid-template-columns: repeat(4, 1fr); gap:.75rem; margin-bottom:1rem; }
    @media (max-width: 1100px) { .kgrid { grid-template-columns: repeat(2, 1fr); } }
    .kgrid a { text-decoration:none; }
    .ts { font-size:.6875rem; color:#8d8d8d; margin-top:.5rem; }
  `],
})
export class DnocDashboardPage implements OnInit, OnDestroy {
  private readonly api = inject(AdminApiService);
  readonly s = signal<DnocStats | null>(null);
  readonly err = signal<string | null>(null);
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void { void this.reload(); this.timer = setInterval(() => void this.reload(), 15_000); }
  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }

  async reload(): Promise<void> {
    const r = await this.api.dnocStats();
    if (r.ok && r.data) { this.s.set(r.data); this.err.set(null); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  dbConn(st: DnocStats): number { return st.db.connections.reduce((a, c) => a + c.c, 0); }
  bytes(n: number): string {
    const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0; let v = n;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(1)} ${u[i]}`;
  }
  probeDonut(st: DnocStats) {
    return [
      { label: 'UP',   value: st.summary.up,                       color: '#198038' },
      { label: 'DOWN', value: st.summary.total - st.summary.up,    color: '#da1e28' },
    ];
  }
  latencyBars(st: DnocStats) {
    return st.components.map((c) => ({ label: c.name, value: c.latencyMs, color: c.ok ? '#0f62fe' : '#da1e28' }));
  }
  connBars(st: DnocStats) {
    return st.db.connections.map((c) => ({ label: c.state, value: c.c }));
  }
  tableBars(st: DnocStats) {
    return st.db.topTables.map((t) => ({ label: t.table, value: Math.round(t.bytes / 1024) }));
  }
}
