import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';

interface KernelReady {
  ready: boolean;
  components: Record<string, { ok: boolean; latencyMs?: number; error?: string }>;
  ts: string;
}

@Component({
  selector: 'dgn-workspace',
  standalone: true,
  template: `
    <div class="container">
      <header style="display:flex;align-items:center;justify-content:space-between;padding:1rem 0;border-bottom:1px solid var(--border)">
        <div>
          <strong style="font-size:1.1rem">Dogan AI OS · Operator Workspace</strong>
          <div class="muted" style="font-size:0.85rem">DAuth-issued session</div>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center">
          <span class="muted" style="font-size:0.85rem">{{ session()?.email }}</span>
          <button class="btn ghost" (click)="logout()">Sign out</button>
        </div>
      </header>

      <section style="margin-top:1.5rem;display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
        <div class="card">
          <strong>Identity</strong>
          <div class="muted" style="font-size:0.85rem;margin-top:0.5rem">subject</div>
          <code style="font-size:0.8rem">{{ session()?.subject }}</code>
          <div class="muted" style="font-size:0.85rem;margin-top:0.5rem">tenant</div>
          <code style="font-size:0.8rem">{{ session()?.tenantId ?? '(none)' }}</code>
          <div class="muted" style="font-size:0.85rem;margin-top:0.5rem">roles</div>
          <code style="font-size:0.8rem">{{ (session()?.roles ?? []).join(', ') || '(none)' }}</code>
          <div class="muted" style="font-size:0.85rem;margin-top:0.5rem">products</div>
          <code style="font-size:0.8rem">{{ (session()?.products ?? []).join(', ') || '(none)' }}</code>
        </div>

        <div class="card">
          <strong>Whoami (DAuth)</strong>
          <pre style="font-size:0.78rem;white-space:pre-wrap;margin-top:0.5rem">{{ whoamiText() }}</pre>
        </div>

        <div class="card">
          <strong>Kernel readiness</strong>
          @if (ready(); as r) {
            <div class="muted" style="font-size:0.8rem">{{ r.ts }}</div>
            <ul style="margin:0.5rem 0;padding-left:1rem">
              @for (c of componentList(r); track c.name) {
                <li>{{ c.name }} — {{ c.ok ? 'UP' : 'DOWN' }}</li>
              }
            </ul>
          } @else {
            <span class="muted">loading…</span>
          }
        </div>
      </section>
    </div>
  `,
})
export class WorkspaceComponent implements OnInit {
  private readonly auth = inject(AuthService);
  readonly session = this.auth.session;
  readonly whoamiText = signal<string>('loading…');
  readonly ready = signal<KernelReady | null>(null);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadWhoami(), this.loadReady()]);
  }

  componentList(r: KernelReady): Array<{ name: string; ok: boolean }> {
    return Object.entries(r.components).map(([name, v]) => ({ name, ok: v.ok }));
  }

  private async loadWhoami(): Promise<void> {
    try {
      const r = await this.auth.authorizedFetch('/pillars/dauth/whoami');
      const txt = await r.text();
      this.whoamiText.set(r.ok ? this.pretty(txt) : 'HTTP ' + r.status + ': ' + txt);
    } catch (e) {
      this.whoamiText.set('error: ' + (e as Error).message);
    }
  }

  private async loadReady(): Promise<void> {
    try {
      const r = await this.auth.authorizedFetch('/kernel/ready');
      const j = (await r.json()) as KernelReady;
      this.ready.set(j);
    } catch {
      this.ready.set(null);
    }
  }

  private pretty(text: string): string {
    try { return JSON.stringify(JSON.parse(text), null, 2); } catch { return text; }
  }

  logout(): void { void this.auth.logout(); }
}
