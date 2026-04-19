import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, DynamicEndpointRow } from '../admin-api.service';

@Component({
  selector: 'dgn-dynamic-endpoints',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-h">Dynamic endpoints</h1>
    <p class="page-sub">Declarative endpoint specs (handler ref + JSON schemas). Path must start with <code>/dynamic/</code>.</p>

    <div class="panel">
      <h3>Create</h3>
      <div class="grid2">
        <div class="field"><label>code</label><input [(ngModel)]="cCode"/></div>
        <div class="field"><label>method</label>
          <select [(ngModel)]="cMethod">
            <option>GET</option><option>POST</option><option>PUT</option>
            <option>PATCH</option><option>DELETE</option>
          </select>
        </div>
        <div class="field"><label>path</label><input [(ngModel)]="cPath" placeholder="/dynamic/notes/list"/></div>
        <div class="field"><label>handler_ref</label>
          <select [(ngModel)]="cHandler">
            @for (h of handlers(); track h) { <option [value]="h">{{ h }}</option> }
          </select>
        </div>
        <div class="field"><label>permission_code</label><input [(ngModel)]="cPerm" placeholder="dos.dynamic.invoke"/></div>
        <div class="field"><label>tenant_scope</label>
          <select [(ngModel)]="cScope"><option>platform</option><option>tenant</option><option>user</option></select>
        </div>
        <div class="field"><label>rate_limit_per_min</label><input type="number" [(ngModel)]="cRate"/></div>
        <div class="field"><label>idempotency_required</label>
          <select [(ngModel)]="cIdem"><option [ngValue]="false">false</option><option [ngValue]="true">true</option></select>
        </div>
        <div class="field" style="grid-column:1/-1"><label>handler_args (JSON)</label>
          <input [(ngModel)]="cArgs" placeholder='{"sql":"select 1"}'/></div>
        <div class="field" style="grid-column:1/-1"><label>input_schema (JSON)</label>
          <input [(ngModel)]="cIn" placeholder='{"type":"object"}'/></div>
        <div class="field" style="grid-column:1/-1"><label>output_schema (JSON)</label>
          <input [(ngModel)]="cOut" placeholder='{"type":"object"}'/></div>
      </div>
      <div class="actions">
        <button class="btn-pri" type="button" [disabled]="busy()" (click)="create()">Create</button>
      </div>
      @if (msg()) { <div class="ok" style="margin-top:.75rem">{{ msg() }}</div> }
      @if (err()) { <div class="err" style="margin-top:.75rem">{{ err() }}</div> }
    </div>

    <div class="panel">
      <div class="toolbar">
        <h3 style="margin:0">Endpoints</h3>
        <button class="btn-mini" type="button" (click)="reload()">Refresh</button>
      </div>
      @if (rows().length === 0) { <div class="empty">No endpoints.</div> }
      @else {
        <table>
          <thead><tr><th>code</th><th>v</th><th>method</th><th>path</th><th>handler</th>
            <th>perm</th><th>scope</th><th>rate</th><th>enabled</th><th></th></tr></thead>
          <tbody>
            @for (e of rows(); track e.id) {
              <tr>
                <td><code>{{ e.code }}</code></td><td>{{ e.version }}</td>
                <td>{{ e.method }}</td><td><code>{{ e.path }}</code></td>
                <td>{{ e.handler_ref }}</td><td>{{ e.permission_code }}</td>
                <td>{{ e.tenant_scope }}</td><td>{{ e.rate_limit_per_min }}</td>
                <td><span class="badge" [class.up]="e.enabled" [class.down]="!e.enabled">{{ e.enabled }}</span></td>
                <td>
                  <button class="btn-mini" type="button" (click)="toggle(e)">{{ e.enabled?'Disable':'Enable' }}</button>
                  <button class="btn-dng" type="button" (click)="del(e)">Delete</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class DynamicEndpointsPage implements OnInit {
  private readonly api = inject(AdminApiService);
  cCode = ''; cMethod: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE' = 'GET';
  cPath = '/dynamic/'; cHandler = 'noop'; cPerm = ''; cScope: 'platform'|'tenant'|'user' = 'tenant';
  cRate = 60; cIdem = false; cArgs = '{}'; cIn = '{"type":"object"}'; cOut = '{"type":"object"}';
  readonly busy = signal(false);
  readonly msg = signal<string | null>(null);
  readonly err = signal<string | null>(null);
  readonly rows = signal<DynamicEndpointRow[]>([]);
  readonly handlers = signal<string[]>([]);

  ngOnInit(): void { void this.reload(); void this.loadHandlers(); }
  async loadHandlers(): Promise<void> {
    const r = await this.api.listDynamicHandlers();
    if (r.ok && r.data) this.handlers.set(r.data.allowlist);
  }
  async reload(): Promise<void> {
    const r = await this.api.listDynamicEndpoints();
    if (r.ok && r.data) { this.rows.set(r.data.endpoints); this.err.set(null); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async create(): Promise<void> {
    this.busy.set(true); this.msg.set(null); this.err.set(null);
    try {
      const r = await this.api.createDynamicEndpoint({
        code: this.cCode.trim(), method: this.cMethod, path: this.cPath.trim(),
        handler_ref: this.cHandler, handler_args: JSON.parse(this.cArgs || '{}'),
        permission_code: this.cPerm.trim(), tenant_scope: this.cScope,
        rate_limit_per_min: Number(this.cRate), idempotency_required: this.cIdem,
        input_schema: JSON.parse(this.cIn), output_schema: JSON.parse(this.cOut),
      });
      this.busy.set(false);
      if (r.ok && r.data) { this.msg.set(`id=${r.data.id}`); void this.reload(); }
      else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
    } catch (e) { this.busy.set(false); this.err.set((e as Error).message); }
  }
  async toggle(e: DynamicEndpointRow): Promise<void> {
    const r = await this.api.toggleDynamicEndpoint({ id: e.id, enabled: !e.enabled });
    if (r.ok) void this.reload(); else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async del(e: DynamicEndpointRow): Promise<void> {
    if (!confirm(`Delete ${e.code} v${e.version}?`)) return;
    const r = await this.api.deleteDynamicEndpoint(e.id);
    if (r.ok) void this.reload(); else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
