import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, SchemaChangeRow } from '../admin-api.service';

@Component({
  selector: 'dgn-schema-designer',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-h">Schema designer</h1>
    <p class="page-sub">Allowlist: create_table, add_column, create_index, add_check. Schema must match <code>tenant_*</code> or <code>product_*</code>.</p>

    <div class="panel">
      <h3>Submit DDL</h3>
      <div class="field"><label>schema</label><input [(ngModel)]="cSchema" placeholder="product_consult"/></div>
      <div class="field"><label>ddl (max 32KB, max 50 stmts)</label>
        <textarea [(ngModel)]="cDdl" rows="8"
          placeholder="create table if not exists product_consult.foo (id uuid primary key);"></textarea>
      </div>
      <div class="actions">
        <button class="btn-pri" type="button" [disabled]="busy()" (click)="submit()">Submit</button>
      </div>
      @if (msg()) { <div class="ok" style="margin-top:.75rem">{{ msg() }}</div> }
      @if (err()) { <div class="err" style="margin-top:.75rem">{{ err() }}</div> }
    </div>

    <div class="panel">
      <div class="toolbar">
        <h3 style="margin:0">Changes</h3>
        <button class="btn-mini" type="button" (click)="reload()">Refresh</button>
      </div>
      @if (rows().length === 0) { <div class="empty">No changes.</div> }
      @else {
        <table>
          <thead><tr><th>id</th><th>schema</th><th>sha256</th><th>shadow_ok</th><th>applied</th>
            <th>at</th><th></th></tr></thead>
          <tbody>
            @for (c of rows(); track c.id) {
              <tr>
                <td><code>{{ c.id.slice(0,8) }}</code></td>
                <td>{{ c.schema_name }}</td>
                <td><code>{{ c.ddl_sha256.slice(0,12) }}</code></td>
                <td><span class="badge" [class.up]="c.shadow_ok" [class.down]="!c.shadow_ok">{{ c.shadow_ok }}</span></td>
                <td><span class="badge" [class.up]="c.applied" [class.down]="!c.applied">{{ c.applied }}</span></td>
                <td>{{ c.applied_at ?? c.created_at }}</td>
                <td>
                  @if (!c.shadow_ok) { <button class="btn-mini" type="button" (click)="shadow(c)">Shadow apply</button> }
                  @if (c.shadow_ok && !c.applied) { <button class="btn-pri" type="button" (click)="apply(c)">Apply</button> }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class SchemaDesignerPage implements OnInit {
  private readonly api = inject(AdminApiService);
  cSchema = ''; cDdl = '';
  readonly busy = signal(false);
  readonly msg = signal<string | null>(null);
  readonly err = signal<string | null>(null);
  readonly rows = signal<SchemaChangeRow[]>([]);

  ngOnInit(): void { void this.reload(); }
  async reload(): Promise<void> {
    const r = await this.api.listSchemaChanges();
    if (r.ok && r.data) { this.rows.set(r.data.changes); this.err.set(null); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async submit(): Promise<void> {
    this.busy.set(true); this.msg.set(null); this.err.set(null);
    const r = await this.api.submitSchemaChange({ schema: this.cSchema.trim(), ddl: this.cDdl });
    this.busy.set(false);
    if (r.ok && r.data) { this.msg.set(`id=${r.data.id} sha256=${r.data.sha256.slice(0,12)}…`); void this.reload(); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async shadow(c: SchemaChangeRow): Promise<void> {
    const r = await this.api.shadowApplySchemaChange(c.id);
    if (r.ok && r.data?.ok) { this.msg.set(`shadow ok for ${c.id.slice(0,8)}`); void this.reload(); }
    else this.err.set(`shadow failed: ${r.data?.error ?? r.error ?? r.status}`);
  }
  async apply(c: SchemaChangeRow): Promise<void> {
    if (!confirm(`Apply DDL ${c.ddl_sha256.slice(0,12)}? Forward only.`)) return;
    const r = await this.api.applySchemaChange(c.id);
    if (r.ok) { this.msg.set(`applied ${c.id.slice(0,8)}`); void this.reload(); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
