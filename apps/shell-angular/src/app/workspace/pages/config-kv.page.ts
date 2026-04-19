import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, ConfigKvRow } from '../admin-api.service';

@Component({
  selector: 'dgn-config-kv',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-h">Config KV</h1>
    <p class="page-sub">Typed key/value config. <code>scope=platform</code> requires platform_admin; <code>scope=tenant</code> writes against the active tenant.</p>

    <div class="panel">
      <h3>Upsert entry</h3>
      <div class="grid2">
        <div class="field"><label>scope</label>
          <select [(ngModel)]="cScope">
            <option value="tenant">tenant</option>
            <option value="platform">platform</option>
          </select>
        </div>
        <div class="field"><label>key</label><input [(ngModel)]="cKey" placeholder="kernel.maintenance"/></div>
        <div class="field" style="grid-column:1 / -1"><label>value (JSON)</label>
          <textarea [(ngModel)]="cValue" rows="3" placeholder='{"enabled": false}'></textarea>
        </div>
        <div class="field" style="grid-column:1 / -1"><label>description</label>
          <input [(ngModel)]="cDesc"/>
        </div>
      </div>
      <div class="actions">
        <button class="btn-pri" type="button" [disabled]="busy()" (click)="upsert()">Upsert</button>
      </div>
      @if (msg()) { <div class="ok" style="margin-top:.75rem">{{ msg() }}</div> }
      @if (err()) { <div class="err" style="margin-top:.75rem">{{ err() }}</div> }
    </div>

    <div class="panel">
      <div class="toolbar">
        <h3 style="margin:0">Entries</h3>
        <div>
          <select [(ngModel)]="filterScope" (change)="reload()">
            <option value="">all</option>
            <option value="platform">platform</option>
            <option value="tenant">tenant</option>
          </select>
          <button class="btn-mini" type="button" (click)="reload()">Refresh</button>
        </div>
      </div>
      @if (rows().length === 0) { <div class="empty">No entries.</div> }
      @else {
        <table>
          <thead><tr><th>scope</th><th>tenant</th><th>key</th><th>value</th><th>description</th><th>updated_at</th><th></th></tr></thead>
          <tbody>
            @for (e of rows(); track e.id) {
              <tr>
                <td><span class="badge">{{ e.scope }}</span></td>
                <td><code>{{ e.tenant_id ?? '—' }}</code></td>
                <td><code>{{ e.key }}</code></td>
                <td><pre style="margin:0;max-height:120px">{{ fmt(e.value) }}</pre></td>
                <td>{{ e.description ?? '—' }}</td>
                <td>{{ e.updated_at }}</td>
                <td><button class="btn-dng" type="button" (click)="del(e)">Delete</button></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class ConfigKvPage implements OnInit {
  private readonly api = inject(AdminApiService);
  cScope: 'platform' | 'tenant' = 'tenant';
  cKey = ''; cValue = '{}'; cDesc = '';
  filterScope: '' | 'platform' | 'tenant' = '';
  readonly busy = signal(false);
  readonly msg = signal<string | null>(null);
  readonly err = signal<string | null>(null);
  readonly rows = signal<ConfigKvRow[]>([]);

  ngOnInit(): void { void this.reload(); }
  fmt(v: unknown): string { try { return JSON.stringify(v, null, 2); } catch { return String(v); } }

  async reload(): Promise<void> {
    const r = await this.api.listConfigKv(this.filterScope || undefined);
    if (r.ok && r.data) { this.rows.set(r.data.entries); this.err.set(null); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async upsert(): Promise<void> {
    this.busy.set(true); this.msg.set(null); this.err.set(null);
    let value: unknown;
    try { value = JSON.parse(this.cValue); }
    catch (e) { this.busy.set(false); this.err.set('invalid JSON: ' + (e as Error).message); return; }
    const r = await this.api.upsertConfigKv({
      scope: this.cScope, key: this.cKey.trim(), value,
      description: this.cDesc.trim() || undefined,
    });
    this.busy.set(false);
    if (r.ok && r.data) { this.msg.set(`id=${r.data.id}`); void this.reload(); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async del(e: ConfigKvRow): Promise<void> {
    const r = await this.api.deleteConfigKv(e.id);
    if (r.ok) void this.reload();
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
