import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminApiService, KernelReady } from '../admin-api.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'dgn-overview',
  standalone: true,
  template: `
    <h1 class="page-h">Operator overview</h1>
    <p class="page-sub">DAuth-issued identity, kernel readiness, and platform banner.</p>

    <div class="grid2">
      <div class="panel">
        <h3>Identity</h3>
        <div><span class="badge">subject</span> <code>{{ session()?.subject }}</code></div>
        <div style="margin-top:.5rem"><span class="badge">tenant</span> <code>{{ session()?.tenantId ?? '(none)' }}</code></div>
        <div style="margin-top:.5rem"><span class="badge">email</span> {{ session()?.email ?? '(none)' }}</div>
        <div style="margin-top:.5rem"><span class="badge">roles</span> <code>{{ (session()?.roles ?? []).join(', ') || '(none)' }}</code></div>
        <div style="margin-top:.5rem"><span class="badge">products</span> <code>{{ (session()?.products ?? []).join(', ') || '(none)' }}</code></div>
      </div>

      <div class="panel">
        <h3>Whoami (DAuth)</h3>
        <pre>{{ whoamiText() }}</pre>
      </div>

      <div class="panel">
        <h3>Platform banner</h3>
        <pre>{{ platformText() }}</pre>
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
                  <td>{{ c.name }}</td>
                  <td><span class="badge" [class.up]="c.ok" [class.down]="!c.ok">{{ c.ok ? 'UP' : 'DOWN' }}</span></td>
                  <td>{{ c.latencyMs ?? '—' }} ms</td>
                  <td><code>{{ c.error ?? '' }}</code></td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div class="empty">Loading…</div>
        }
      </div>
    </div>
  `,
})
export class OverviewPage implements OnInit {
  private readonly api = inject(AdminApiService);
  readonly session = inject(AuthService).session;
  readonly whoamiText = signal('loading…');
  readonly platformText = signal('loading…');
  readonly ready = signal<KernelReady | null>(null);

  async ngOnInit(): Promise<void> {
    const [w, p, r] = await Promise.all([this.api.whoami(), this.api.platform(), this.api.ready()]);
    this.whoamiText.set(this.fmt(w));
    this.platformText.set(this.fmt(p));
    if (r.ok && r.data) this.ready.set(r.data);
    else this.ready.set({ ready: false, components: {}, ts: new Date().toISOString() });
  }

  components(r: KernelReady) {
    return Object.entries(r.components).map(([name, v]) => ({ name, ...v }));
  }

  private fmt(r: { ok: boolean; status: number; data?: unknown; error?: string }): string {
    if (r.ok) return JSON.stringify(r.data, null, 2);
    return `HTTP ${r.status}: ${r.error ?? ''}`;
  }
}
