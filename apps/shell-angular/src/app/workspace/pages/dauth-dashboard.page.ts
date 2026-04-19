import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../admin-api.service';
import type { DauthStats } from '../stats-types';
import { KpiTile, BarChart, Sparkline, Donut } from '../charts.component';

@Component({
  selector: 'dgn-dauth-dashboard',
  standalone: true,
  imports: [RouterLink, KpiTile, BarChart, Sparkline, Donut],
  template: `
    <h1 class="page-h">DAuth · Identity dashboard</h1>
    <p class="page-sub">Tenant-scoped identity, sessions, risk and ABAC/SoD posture. Click any tile to drill in.</p>

    @if (s(); as st) {
      <div class="kgrid">
        <a routerLink="/workspace/dauth/users"><dgn-kpi label="Users" [value]="st.counters.users" [sub]="st.counters.users_active + ' active'"/></a>
        <a routerLink="/workspace/dauth/sessions"><dgn-kpi label="Active sessions" [value]="st.counters.sessions_active"/></a>
        <a routerLink="/workspace/dauth/api-keys"><dgn-kpi label="API keys" [value]="st.counters.api_keys_active"/></a>
        <a routerLink="/workspace/dauth/roles"><dgn-kpi label="Role assignments" [value]="st.counters.role_assignments"/></a>
        <a routerLink="/workspace/dauth/abac"><dgn-kpi label="ABAC policies" [value]="st.counters.abac_policies"/></a>
        <a routerLink="/workspace/dauth/sod"><dgn-kpi label="SoD rules" [value]="st.counters.sod_rules" [sub]="st.counters.sod_violations_open + ' open violations'"/></a>
      </div>

      <div class="grid2">
        <div class="panel">
          <h3>Auth events · last 24h</h3>
          <dgn-spark [data]="trend(st)" color="#0f62fe"/>
          <div style="margin-top:.75rem">
            <dgn-bar [data]="byKindBars(st)"/>
          </div>
        </div>
        <div class="panel">
          <h3>Risk band distribution · last 24h</h3>
          <dgn-donut [data]="riskDonut(st)" caption="events"/>
        </div>
        <div class="panel" style="grid-column:1 / -1">
          <h3>Quick links</h3>
          <div class="links">
            <a routerLink="/workspace/dauth/tenants" class="link">Tenants</a>
            <a routerLink="/workspace/dauth/users" class="link">Users</a>
            <a routerLink="/workspace/dauth/roles" class="link">Roles &amp; SoD preflight</a>
            <a routerLink="/workspace/dauth/sessions" class="link">Sessions</a>
            <a routerLink="/workspace/dauth/api-keys" class="link">API keys</a>
            <a routerLink="/workspace/dauth/abac" class="link">ABAC policies</a>
            <a routerLink="/workspace/dauth/sod" class="link">SoD rules</a>
            <a routerLink="/workspace/dauth/tier-limits" class="link">Tier limits</a>
          </div>
        </div>
      </div>
      <div class="ts">refreshed {{ st.ts }}</div>
    } @else if (err()) { <div class="err">{{ err() }}</div> }
    @else { <div class="empty">Loading…</div> }
  `,
  styles: [`
    .kgrid { display:grid; grid-template-columns: repeat(6, 1fr); gap:.75rem; margin-bottom:1rem; }
    @media (max-width: 1100px) { .kgrid { grid-template-columns: repeat(3, 1fr); } }
    .kgrid a { text-decoration:none; }
    .links { display:flex; flex-wrap:wrap; gap:.5rem; }
    .link  { padding:.375rem .75rem; border:1px solid #e0e0e0; background:#fff; color:#0f62fe; text-decoration:none; font-size:.8125rem; }
    .link:hover { background:#edf5ff; }
    .ts { font-size:.6875rem; color:#8d8d8d; margin-top:.5rem; }
  `],
})
export class DauthDashboardPage implements OnInit {
  private readonly api = inject(AdminApiService);
  readonly s = signal<DauthStats | null>(null);
  readonly err = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const r = await this.api.dauthStats();
    if (r.ok && r.data) this.s.set(r.data);
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  trend(st: DauthStats) { return st.events_24h_by_hour.map((b) => ({ label: b.bucket, value: b.c })); }
  byKindBars(st: DauthStats) { return st.events_24h_by_kind.map((k) => ({ label: k.kind, value: k.c })); }
  riskDonut(st: DauthStats) {
    const colors: Record<string, string> = {
      low:'#198038', medium:'#f1c21b', high:'#ff832b', critical:'#da1e28',
    };
    return st.risk_24h_by_band.map((b) => ({ label: b.band, value: b.c, color: colors[b.band] }));
  }
}
