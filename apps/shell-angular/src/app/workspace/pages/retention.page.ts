import { Component, inject, signal } from '@angular/core';
import { AdminApiService } from '../admin-api.service';

@Component({
  selector: 'dgn-retention',
  standalone: true,
  template: `
    <h1 class="page-h">Retention sweep</h1>
    <p class="page-sub">
      Drop audit partitions older than the per-tier retention window. Requires <code>platform_admin</code>.
    </p>
    <div class="panel">
      <div class="actions">
        <button class="btn-pri" type="button" [disabled]="busy()" (click)="run()">Run sweep</button>
      </div>
      @if (msg()) { <div class="ok" style="margin-top:.75rem">{{ msg() }}</div> }
      @if (err()) { <div class="err" style="margin-top:.75rem">{{ err() }}</div> }
    </div>
  `,
})
export class RetentionPage {
  private readonly api = inject(AdminApiService);
  readonly busy = signal(false);
  readonly msg = signal<string | null>(null);
  readonly err = signal<string | null>(null);

  async run(): Promise<void> {
    this.busy.set(true); this.msg.set(null); this.err.set(null);
    const r = await this.api.retentionSweep();
    this.busy.set(false);
    if (r.ok && r.data) {
      const note = r.data.skipped ? ` (skipped: ${r.data.skipped})` : '';
      this.msg.set(`partitions dropped: ${r.data.dropped}${note}`);
    } else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
