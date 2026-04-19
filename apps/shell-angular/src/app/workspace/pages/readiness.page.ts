import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { AdminApiService, KernelReady } from '../admin-api.service';

@Component({
  selector: 'dgn-readiness',
  standalone: true,
  template: `
    <h1 class="page-h">Readiness &amp; metrics</h1>
    <p class="page-sub">Live 7-component readiness aggregator from the DNOC pillar. Refreshes every 10 seconds.</p>

    <div class="panel">
      <div class="toolbar">
        <h3 style="margin:0">Components</h3>
        <button class="btn-mini" type="button" (click)="reload()">Refresh now</button>
      </div>
      @if (ready(); as r) {
        <div style="font-size:.75rem;color:#525252;margin-bottom:.5rem">
          ready overall: <span class="badge" [class.up]="r.ready" [class.down]="!r.ready">{{ r.ready ? 'UP' : 'DEGRADED' }}</span>
          · {{ r.ts }}
        </div>
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
      } @else if (errMsg()) {
        <div class="err">{{ errMsg() }}</div>
      } @else {
        <div class="empty">Loading…</div>
      }
    </div>
  `,
})
export class ReadinessPage implements OnInit, OnDestroy {
  private readonly api = inject(AdminApiService);
  readonly ready = signal<KernelReady | null>(null);
  readonly errMsg = signal<string | null>(null);
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    void this.reload();
    this.timer = setInterval(() => void this.reload(), 10_000);
  }
  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }

  components(r: KernelReady) {
    return Object.entries(r.components).map(([name, v]) => ({ name, ...v }));
  }

  async reload(): Promise<void> {
    const r = await this.api.ready();
    if (r.ok && r.data) { this.ready.set(r.data); this.errMsg.set(null); }
    else this.errMsg.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
