import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApiService, KernelReady } from '../admin-api.service';
import { AuthService } from '../../auth/auth.service';
import type { DauthStats, DosStats, DsocStats, DnocStats } from '../stats-types';
import { KpiTile } from '../charts.component';

@Component({
  selector: 'dgn-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, KpiTile],
  template: `
    <h1 class="page-h">Dogan AI OS · 4D operator overview</h1>
    <p class="page-sub">
      Signed in as <strong>{{ session()?.email ?? '(unknown)' }}</strong>
      · tenant <code>{{ session()?.tenantId ?? '(none)' }}</code>
      · roles <code>{{ (session()?.roles ?? []).join(', ') || '(none)' }}</code>.
      Click any pillar to drill into its dashboard.
    </p>

    <div class="pillars">
      <a routerLink="/workspace/dauth" class="pillar p-dauth">
        <div class="head"><span class="dot"></span><h3>DAuth · Identity</h3></div>
        @if (dauth(); as st) {
          <div class="kg">
            <dgn-kpi label="Users" [value]="st.counters.users" [sub]="st.counters.users_active + ' active'"/>
            <dgn-kpi label="Sessions" [value]="st.counters.sessions_active"/>
            <dgn-kpi label="API keys" [value]="st.counters.api_keys_active"/>
            <dgn-kpi label="SoD open" [value]="st.counters.sod_violations_open"/>
          </div>
        } @else { <div class="empty">{{ dauthErr() ?? 'Loading…' }}</div> }
        <div class="cta">Open DAuth dashboard →</div>
      </a>

      <a routerLink="/workspace/dos" class="pillar p-dos">
        <div class="head"><span class="dot"></span><h3>DOS · Operating System</h3></div>
        @if (dos(); as st) {
          <div class="kg">
            <dgn-kpi label="Tenants" [value]="st.tenants.total"/>
            <dgn-kpi label="Products" [value]="st.inventory.products"/>
            <dgn-kpi label="Modules" [value]="st.inventory.modules"/>
            <dgn-kpi label="Flags on" [value]="st.config.flags_enabled"/>
          </div>
        } @else { <div class="empty">{{ dosErr() ?? 'Loading…' }}</div> }
        <div class="cta">Open DOS dashboard →</div>
      </a>

      <a routerLink="/workspace/dsoc" class="pillar p-dsoc">
        <div class="head"><span class="dot"></span><h3>DSOC · Security Ops</h3></div>
        @if (dsoc(); as st) {
          <div class="kg">
            <dgn-kpi label="Open alerts" [value]="st.counters.alerts_open"/>
            <dgn-kpi label="Audit (24h)" [value]="st.counters.audit_24h"/>
            <dgn-kpi label="Sev 7d" [value]="sevTotal(st)"/>
            <dgn-kpi label="Categories" [value]="st.alerts_7d_by_category.length"/>
          </div>
        } @else { <div class="empty">{{ dsocErr() ?? 'Loading…' }}</div> }
        <div class="cta">Open DSOC dashboard →</div>
      </a>

      <a routerLink="/workspace/dnoc" class="pillar p-dnoc">
        <div class="head"><span class="dot"></span><h3>DNOC · Reliability</h3></div>
        @if (dnoc(); as st) {
          <div class="kg">
            <dgn-kpi label="Components" [value]="st.summary.up + ' / ' + st.summary.total"/>
            <dgn-kpi label="DB conns" [value]="dbConn(st)"/>
            <dgn-kpi label="Top table" [value]="bytes(st.db.topTables[0]?.bytes ?? 0)"/>
            <dgn-kpi label="Probes" [value]="st.components.length"/>
          </div>
        } @else { <div class="empty">{{ dnocErr() ?? readyFallback() }}</div> }
        <div class="cta">Open DNOC dashboard →</div>
      </a>
    </div>

    <div class="panel">
      <h3>Kernel readiness</h3>
      @if (ready(); as r) {
        <div style="font-size:.75rem;color:#525252;margin-bottom:.5rem">{{ r.ts }}</div>
        <table>
          <thead><tr><th>component</th><th>status</th><th>latency</th><th>error</th></tr></thead>
          <tbody>
            @for (c of components(r); track c.name) {
              <tr>
                <td><strong>{{ c.name }}</strong></td>
                <td><span class="badge" [class.up]="c.ok" [class.down]="!c.ok">{{ c.ok ? 'UP' : 'DOWN' }}</span></td>
                <td>{{ c.latencyMs ?? '—' }} ms</td>
                <td><code>{{ c.error ?? '' }}</code></td>
              </tr>
            }
          </tbody>
        </table>
      } @else { <div class="empty">Loading…</div> }
    </div>
  `,
  styles: [`
    .pillars { display:grid; grid-template-columns: repeat(2, 1fr); gap:1rem; margin-bottom:1rem; }
    @media (max-width: 1100px) { .pillars { grid-template-columns: 1fr; } }
    .pillar { display:block; background:#fff; border:1px solid #e0e0e0; padding:1rem 1.25rem;
      text-decoration:none; color:inherit; border-left:4px solid #0f62fe; transition:background .1s; }
    .pillar:hover { background:#f4f4f4; }
    .pillar.p-dauth { border-left-color:#0f62fe; }
    .pillar.p-dos   { border-left-color:#8a3ffc; }
    .pillar.p-dsoc  { border-left-color:#da1e28; }
    .pillar.p-dnoc  { border-left-color:#198038; }
    .head { display:flex; align-items:center; gap:.5rem; margin-bottom:.75rem; }
    .head h3 { margin:0; font-size:1rem; font-weight:600; }
    .dot { display:inline-block; width:10px; height:10px; border-radius:50%; background:currentColor; }
    .p-dauth .dot { color:#0f62fe; }
    .p-dos   .dot { color:#8a3ffc; }
    .p-dsoc  .dot { color:#da1e28; }
    .p-dnoc  .dot { color:#198038; }
    .kg { display:grid; grid-template-columns: repeat(4, 1fr); gap:.5rem; }
    @media (max-width: 700px) { .kg { grid-template-columns: repeat(2, 1fr); } }
    .cta { margin-top:.75rem; font-size:.8125rem; color:#0f62fe; font-weight:500; }
  `],
})
export class OverviewPage implements OnInit {
  private readonly api = inject(AdminApiService);
  readonly session = inject(AuthService).session;

  readonly dauth = signal<DauthStats | null>(null);
  readonly dos   = signal<DosStats   | null>(null);
  readonly dsoc  = signal<DsocStats  | null>(null);
  readonly dnoc  = signal<DnocStats  | null>(null);
  readonly dauthErr = signal<string | null>(null);
  readonly dosErr   = signal<string | null>(null);
  readonly dsocErr  = signal<string | null>(null);
  readonly dnocErr  = signal<string | null>(null);
  readonly ready = signal<KernelReady | null>(null);

  async ngOnInit(): Promise<void> {
    const [a, b, c, d, r] = await Promise.all([
      this.api.dauthStats(), this.api.dosStats(),
      this.api.dsocStats(),  this.api.dnocStats(), this.api.ready(),
    ]);
    if (a.ok && a.data) this.dauth.set(a.data); else this.dauthErr.set(`HTTP ${a.status}: ${a.error ?? ''}`);
    if (b.ok && b.data) this.dos.set(b.data);   else this.dosErr.set(`HTTP ${b.status}: ${b.error ?? ''}`);
    if (c.ok && c.data) this.dsoc.set(c.data);  else this.dsocErr.set(`HTTP ${c.status}: ${c.error ?? ''}`);
    if (d.ok && d.data) this.dnoc.set(d.data);  else this.dnocErr.set(`HTTP ${d.status}: ${d.error ?? ''}`);
    if (r.ok && r.data) this.ready.set(r.data);
    else this.ready.set({ ready: false, components: {}, ts: new Date().toISOString() });
  }

  components(r: KernelReady) {
    return Object.entries(r.components).map(([name, v]) => ({ name, ...v }));
  }
  sevTotal(st: DsocStats): number { return st.alerts_7d_by_severity.reduce((s, r) => s + r.c, 0); }
  dbConn(st: DnocStats): number { return st.db.connections.reduce((a, c) => a + c.c, 0); }
  bytes(n: number): string {
    const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0; let v = n;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(1)} ${u[i]}`;
  }
  readyFallback(): string { return 'Loading…'; }
}
