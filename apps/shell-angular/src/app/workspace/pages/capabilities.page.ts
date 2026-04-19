import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminApiService } from '../admin-api.service';

@Component({
  selector: 'dgn-capabilities',
  standalone: true,
  template: `
    <h1 class="page-h">Kernel capabilities</h1>
    <p class="page-sub">Live snapshot of <code>/kernel/capabilities</code> — pillars, products, modules, routes.</p>
    <div class="panel">
      <div class="toolbar">
        <h3 style="margin:0">Capabilities snapshot</h3>
        <button class="btn-mini" type="button" (click)="reload()">Refresh</button>
      </div>
      @if (errMsg()) { <div class="err">{{ errMsg() }}</div> }
      <pre>{{ text() }}</pre>
    </div>
  `,
})
export class CapabilitiesPage implements OnInit {
  private readonly api = inject(AdminApiService);
  readonly text = signal('loading…');
  readonly errMsg = signal<string | null>(null);
  ngOnInit(): void { void this.reload(); }
  async reload(): Promise<void> {
    const r = await this.api.capabilities();
    if (r.ok) { this.text.set(JSON.stringify(r.data, null, 2)); this.errMsg.set(null); }
    else { this.text.set(''); this.errMsg.set(`HTTP ${r.status}: ${r.error ?? ''}`); }
  }
}
