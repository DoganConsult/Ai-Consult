import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../admin-api.service';
import type { DosStats } from '../stats-types';
import { KpiTile, BarChart, Donut } from '../charts.component';

@Component({
  selector: 'dgn-dos-dashboard',
  standalone: true,
  imports: [RouterLink, KpiTile, BarChart, Donut],
  template: `
    <h1 class="page-h">DOS · Operating System dashboard</h1>
    <p class="page-sub">Tenants, products, modules, and the platform Config Center.</p>

    @if (s(); as st) {
      <div class="kgrid">
        <a routerLink="/workspace/dauth/tenants"><dgn-kpi label="Tenants" [value]="st.tenants.total"/></a>
        <a routerLink="/workspace/dos/inventory"><dgn-kpi label="Products" [value]="st.inventory.products"/></a>
        <a routerLink="/workspace/dos/inventory"><dgn-kpi label="Modules" [value]="st.inventory.modules"/></a>
        <a routerLink="/workspace/dos/feature-flags"><dgn-kpi label="Feature flags" [value]="st.config.flags_platform + st.config.flags_tenant" [sub]="st.config.flags_enabled + ' enabled'"/></a>
        <a routerLink="/workspace/dos/config-kv"><dgn-kpi label="Config KV" [value]="st.config.kv_platform + st.config.kv_tenant" [sub]="st.config.kv_platform + ' platform · ' + st.config.kv_tenant + ' tenant'"/></a>
        <a routerLink="/workspace/dauth/tier-limits"><dgn-kpi label="Tier limits" value="manage"/></a>
      </div>

      <div class="grid2">
        <div class="panel">
          <h3>Tenants by tier</h3>
          <dgn-donut [data]="bars(st.tenants.by_tier, 'tier')" caption="tenants"/>
        </div>
        <div class="panel">
          <h3>Tenants by status</h3>
          <dgn-donut [data]="bars(st.tenants.by_status, 'status')" caption="tenants"/>
        </div>
        <div class="panel">
          <h3>Tenants by isolation mode</h3>
          <dgn-bar [data]="bars(st.tenants.by_isolation, 'isolation_mode')"/>
        </div>
        <div class="panel">
          <h3>Tenant subscriptions per product</h3>
          <dgn-bar [data]="bars(st.inventory.tenant_product_subscriptions, 'product_code')"/>
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
    .ts { font-size:.6875rem; color:#8d8d8d; margin-top:.5rem; }
  `],
})
export class DosDashboardPage implements OnInit {
  private readonly api = inject(AdminApiService);
  readonly s = signal<DosStats | null>(null);
  readonly err = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const r = await this.api.dosStats();
    if (r.ok && r.data) this.s.set(r.data);
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  bars(rows: Record<string, unknown>[], key: string) {
    return rows.map((r) => ({ label: String(r[key]), value: Number(r['c'] ?? 0) }));
  }
}
