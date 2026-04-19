import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { HasPermissionDirective } from '../../core/dauth/directives/has-permission.directive';
import { LowcodeService } from '../../core/dos/services/lowcode.service';

const TYPES = [
  'text', 'varchar', 'integer', 'bigint', 'numeric', 'boolean',
  'timestamptz', 'date', 'uuid', 'jsonb', 'serial', 'bigserial',
].map((v) => ({ label: v, value: v }));

const CHANGE_TYPES = [
  { label: 'Add column', value: 'add_column' },
  { label: 'Create table', value: 'create_table' },
  { label: 'Create index', value: 'create_index' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-schema-designer',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, TagModule, ButtonModule, InputTextModule,
    TextareaModule, SelectModule, TabsModule, DialogModule, ToastModule,
    PageHeaderComponent, HasPermissionDirective,
  ],
  providers: [MessageService],
  template: `
    <dos-page-header title="Schema Designer" subtitle="Additive-only DDL (add column / create table / create index). Every change is sha256-tracked in schema_changes." />
    <p-toast />
    <p-tabs value="0">
      <p-tabpanel value="0">
        <ng-template #header><span><i class="pi pi-search"></i> Introspect</span></ng-template>
        <div class="toolbar">
          <input pInputText [(ngModel)]="schema" placeholder="schema name" />
          <p-button label="List Tables" icon="pi pi-refresh" (onClick)="loadTables()" size="small" />
        </div>
        <div class="two-col">
          <p-table [value]="tables()" [rows]="40" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true" scrollHeight="420px">
            <ng-template #header><tr><th>Table</th></tr></ng-template>
            <ng-template #body let-t>
              <tr (click)="loadColumns(t.table_name)" class="clickable">
                <td class="mono">{{ t.table_name }}</td>
              </tr>
            </ng-template>
          </p-table>
          <p-table [value]="columns()" [rows]="40" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true" scrollHeight="420px">
            <ng-template #header><tr><th>Column</th><th>Type</th><th>Nullable</th></tr></ng-template>
            <ng-template #body let-c>
              <tr><td class="mono">{{ c.column_name }}</td><td class="mono">{{ c.data_type }}</td><td>{{ c.is_nullable }}</td></tr>
            </ng-template>
          </p-table>
        </div>
      </p-tabpanel>

      <p-tabpanel value="1">
        <ng-template #header><span><i class="pi pi-plus"></i> Author Change</span></ng-template>
        <div class="grid">
          <label>Change Type <p-select [(ngModel)]="change.type" [options]="changeTypes" optionLabel="label" optionValue="value" /></label>
          <label>Schema <input pInputText [(ngModel)]="change.schema" /></label>
          <label>Table <input pInputText [(ngModel)]="change.table" /></label>

          @if (change.type === 'add_column') {
            <label>Column <input pInputText [(ngModel)]="change.column" /></label>
            <label>Data Type <p-select [(ngModel)]="change.data_type" [options]="types" optionLabel="label" optionValue="value" /></label>
            <label>Nullable <p-select [(ngModel)]="change.nullable" [options]="boolOptions" optionLabel="label" optionValue="value" /></label>
            <label class="full">Default <input pInputText [(ngModel)]="change.default" placeholder="e.g. NOW() or 'draft'" /></label>
          }

          @if (change.type === 'create_table') {
            <label class="full">Columns (JSON array of {{ '{' }}name, data_type, nullable?, primary_key?, default?{{ '}' }})
              <textarea pTextarea rows="8" [(ngModel)]="change.columnsRaw" class="mono"></textarea>
            </label>
          }

          @if (change.type === 'create_index') {
            <label>Index Name <input pInputText [(ngModel)]="change.index_name" /></label>
            <label>Unique <p-select [(ngModel)]="change.unique" [options]="boolOptions" optionLabel="label" optionValue="value" /></label>
            <label class="full">Columns (comma-separated) <input pInputText [(ngModel)]="change.indexColumnsRaw" /></label>
          }
        </div>

        <div class="actions">
          <p-button *dosHasPermission="'platform.schema.manage'" label="Plan (Dry Run)" icon="pi pi-eye" (onClick)="plan()" [outlined]="true" />
          <p-button *dosHasPermission="'platform.schema.manage'" label="Execute" icon="pi pi-play" (onClick)="execute()" severity="danger" [disabled]="!plannedDdl()" />
        </div>

        @if (plannedDdl(); as d) {
          <div class="ddl-preview">
            <div class="ddl-head">DDL preview <span class="sha">sha256: {{ plannedSha() }}</span></div>
            <pre>{{ d }}</pre>
          </div>
        }
      </p-tabpanel>

      <p-tabpanel value="2">
        <ng-template #header><span><i class="pi pi-history"></i> History</span></ng-template>
        <p-table [value]="history()" [rows]="30" styleClass="p-datatable-sm p-datatable-striped">
          <ng-template #header>
            <tr><th>When</th><th>Change</th><th>Target</th><th style="width:110px">Status</th><th>DDL sha256</th></tr>
          </ng-template>
          <ng-template #body let-h>
            <tr>
              <td class="mono small">{{ h.executed_at | date:'short' }}</td>
              <td class="mono">{{ h.change_type }}</td>
              <td class="mono">{{ h.target_schema }}.{{ h.target_table }}</td>
              <td><p-tag [value]="h.status" [severity]="h.status === 'applied' ? 'success' : 'danger'" /></td>
              <td class="mono small">{{ h.ddl_sha256 }}</td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="5" class="empty-msg">No changes recorded</td></tr></ng-template>
        </p-table>
      </p-tabpanel>
    </p-tabs>
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin: 20px 0 12px; align-items: center; }
    .two-col { display: grid; grid-template-columns: 1fr 2fr; gap: 16px; }
    .clickable { cursor: pointer; }
    .clickable:hover { background: var(--dos-bg); }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
    .grid label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-weight: 600; }
    .grid label.full { grid-column: 1 / span 2; }
    .actions { display: flex; gap: 8px; margin-top: 14px; }
    .ddl-preview { margin-top: 16px; border: 1px solid var(--dos-border); border-radius: 8px; overflow: hidden; }
    .ddl-head { background: #1e293b; color: #f8fafc; padding: 8px 12px; font-size: 12px; display: flex; justify-content: space-between; }
    .sha { font-family: monospace; font-size: 11px; opacity: 0.7; }
    .ddl-preview pre { margin: 0; padding: 12px; background: #0f172a; color: #e2e8f0; font-family: monospace; font-size: 12px; white-space: pre-wrap; }
    .mono { font-family: monospace; font-size: 13px; } .small { font-size: 12px; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
  `],
})
export class SchemaDesignerComponent implements OnInit {
  private svc = inject(LowcodeService);
  private msg = inject(MessageService);

  schema = 'public';
  tables = signal<any[]>([]);
  columns = signal<any[]>([]);
  history = signal<any[]>([]);

  types = TYPES;
  changeTypes = CHANGE_TYPES;
  boolOptions = [{ label: 'Yes', value: true }, { label: 'No', value: false }];

  change: any = {
    type: 'add_column', schema: 'public', table: '',
    column: '', data_type: 'text', nullable: true, default: '',
    columnsRaw: '', index_name: '', unique: false, indexColumnsRaw: '',
  };
  plannedDdl = signal<string | null>(null);
  plannedSha = signal<string | null>(null);

  ngOnInit(): void {
    this.loadTables();
    this.loadHistory();
  }

  loadTables(): void {
    this.svc.listSchemaTables(this.schema).subscribe({ next: d => this.tables.set(d), error: () => this.tables.set([]) });
  }

  loadColumns(table: string): void {
    this.change.table = table;
    this.svc.listSchemaColumns(this.schema, table).subscribe({ next: d => this.columns.set(d), error: () => this.columns.set([]) });
  }

  loadHistory(): void {
    this.svc.schemaHistory().subscribe({ next: d => this.history.set(d), error: () => this.history.set([]) });
  }

  private buildPayload(): any {
    const base: any = { type: this.change.type, schema: this.change.schema, table: this.change.table };
    if (this.change.type === 'add_column') {
      Object.assign(base, {
        column: this.change.column, data_type: this.change.data_type,
        nullable: this.change.nullable, default: this.change.default || undefined,
      });
    } else if (this.change.type === 'create_table') {
      try { base.columns = JSON.parse(this.change.columnsRaw || '[]'); }
      catch { throw new Error('Invalid columns JSON'); }
    } else if (this.change.type === 'create_index') {
      base.index_name = this.change.index_name;
      base.unique = this.change.unique;
      base.columns = (this.change.indexColumnsRaw || '').split(',').map((c: string) => c.trim()).filter(Boolean);
    }
    return base;
  }

  plan(): void {
    let payload: any;
    try { payload = this.buildPayload(); } catch (e: any) { this.msg.add({ severity: 'error', summary: e.message }); return; }
    this.svc.planSchemaChange(payload).subscribe({
      next: (d: any) => { this.plannedDdl.set(d.ddl); this.plannedSha.set(d.ddl_sha256); },
      error: (e: any) => { this.plannedDdl.set(null); this.plannedSha.set(null); this.msg.add({ severity: 'error', summary: e?.error?.error || 'Plan failed' }); },
    });
  }

  execute(): void {
    if (!this.plannedDdl()) return;
    if (!confirm('Execute this DDL against the live database?')) return;
    let payload: any;
    try { payload = this.buildPayload(); } catch (e: any) { this.msg.add({ severity: 'error', summary: e.message }); return; }
    this.svc.executeSchemaChange(payload).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'DDL applied' }); this.plannedDdl.set(null); this.loadHistory(); },
      error: (e: any) => this.msg.add({ severity: 'error', summary: e?.error?.error || 'Execute failed' }),
    });
  }
}
