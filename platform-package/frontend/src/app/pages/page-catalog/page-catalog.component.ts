import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { HasPermissionDirective } from '../../core/dauth/directives/has-permission.directive';
import { LowcodeService, PageSpec, PageLayout, PageStatus } from '../../core/dos/services/lowcode.service';

const LAYOUTS: Array<{ label: string; value: PageLayout }> = [
  { label: 'List', value: 'list' },
  { label: 'Form', value: 'form' },
  { label: 'Detail', value: 'detail' },
  { label: 'Dashboard', value: 'dashboard' },
  { label: 'Custom', value: 'custom' },
];

const STATUSES: Array<{ label: string; value: PageStatus }> = [
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Archived', value: 'archived' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-page-catalog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, TagModule, ButtonModule, InputTextModule,
    TextareaModule, SelectModule, DialogModule, ToastModule, TabsModule,
    PageHeaderComponent, HasPermissionDirective,
  ],
  providers: [MessageService],
  template: `
    <dos-page-header title="Page Catalog" subtitle="Author platform-admin pages without code — specs persisted in page_catalog" />
    <p-toast />
    <div class="toolbar">
      <p-button label="Refresh" icon="pi pi-refresh" (onClick)="load()" [outlined]="true" size="small" />
      <p-button *dosHasPermission="['platform.config.write','platform.schema.manage']" label="New Page" icon="pi pi-plus" (onClick)="openNew()" size="small" />
    </div>

    <p-table [value]="pages()" [rows]="30" [paginator]="pages().length > 30" styleClass="p-datatable-sm p-datatable-striped">
      <ng-template #header>
        <tr>
          <th>Code</th><th>Title</th><th>Route</th><th style="width:120px">Layout</th>
          <th style="width:120px">Status</th><th style="width:100px">Version</th><th style="width:160px">Actions</th>
        </tr>
      </ng-template>
      <ng-template #body let-p>
        <tr>
          <td class="mono fw-600">{{ p.code }}</td>
          <td>{{ p.title }}</td>
          <td class="mono">{{ p.route }}</td>
          <td><p-tag [value]="p.layout" severity="info" /></td>
          <td><p-tag [value]="p.status" [severity]="p.status === 'published' ? 'success' : 'secondary'" /></td>
          <td class="mono">v{{ p.version }}</td>
          <td>
            <p-button *dosHasPermission="['platform.config.write','platform.schema.manage']" icon="pi pi-pencil" (onClick)="openEdit(p)" [text]="true" size="small" />
            <p-button *dosHasPermission="'platform.schema.manage'" icon="pi pi-trash" (onClick)="remove(p)" [text]="true" size="small" severity="danger" />
          </td>
        </tr>
      </ng-template>
      <ng-template #emptymessage><tr><td colspan="7" class="empty-msg">No pages defined</td></tr></ng-template>
    </p-table>

    <p-dialog [header]="form.mode === 'edit' ? 'Edit Page' : 'New Page'" [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '780px' }">
      <p-tabs value="0">
        <p-tabpanel value="0">
          <ng-template #header><span>Core</span></ng-template>
          <div class="grid">
            <label>Code <input pInputText [(ngModel)]="form.code" [disabled]="form.mode === 'edit'" /></label>
            <label>Title <input pInputText [(ngModel)]="form.title" /></label>
            <label>Route <input pInputText [(ngModel)]="form.route" placeholder="e.g. p/my-page" /></label>
            <label>Section <input pInputText [(ngModel)]="form.section" placeholder="catalog | governance | ai" /></label>
            <label>Icon <input pInputText [(ngModel)]="form.icon" placeholder="pi pi-file" /></label>
            <label>Layout <p-select [(ngModel)]="form.layout" [options]="layouts" optionLabel="label" optionValue="value" /></label>
            <label>Status <p-select [(ngModel)]="form.status" [options]="statuses" optionLabel="label" optionValue="value" /></label>
            <label class="full">Subtitle <input pInputText [(ngModel)]="form.subtitle" /></label>
            <label class="full">Requires (JSON array of permission codes)
              <textarea pTextarea rows="2" [(ngModel)]="form.requiresRaw" spellcheck="false"></textarea>
            </label>
          </div>
        </p-tabpanel>
        <p-tabpanel value="1">
          <ng-template #header><span>Data Source</span></ng-template>
          <div class="grid">
            <label class="full">Endpoint Code (from API Builder) <input pInputText [(ngModel)]="form.dataEndpoint" placeholder="endpoint.code" /></label>
            <label class="full">Params (JSON)
              <textarea pTextarea rows="3" [(ngModel)]="form.dataParamsRaw" spellcheck="false"></textarea>
            </label>
          </div>
        </p-tabpanel>
        <p-tabpanel value="2">
          <ng-template #header><span>Form Spec</span></ng-template>
          <textarea pTextarea rows="12" [(ngModel)]="form.formSpecRaw" spellcheck="false" class="wide mono"></textarea>
          <small class="help">Structure: <code>{{ formSpecExample }}</code></small>
        </p-tabpanel>
        <p-tabpanel value="3">
          <ng-template #header><span>Table Spec</span></ng-template>
          <textarea pTextarea rows="12" [(ngModel)]="form.tableSpecRaw" spellcheck="false" class="wide mono"></textarea>
          <small class="help">Structure: <code>{{ tableSpecExample }}</code></small>
        </p-tabpanel>
      </p-tabs>

      @if (parseError()) { <div class="err">{{ parseError() }}</div> }
      <div class="actions">
        <p-button label="Cancel" (onClick)="dialogOpen = false" [text]="true" />
        <p-button label="Save" icon="pi pi-check" (onClick)="save()" [disabled]="!form.code || !form.title || !form.route" />
      </div>
    </p-dialog>
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin: 20px 0 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .grid label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-weight: 600; }
    .grid label.full { grid-column: 1 / span 2; }
    .wide { width: 100%; }
    .mono { font-family: monospace; font-size: 12px; }
    .help { color: var(--dos-text-muted); font-size: 12px; margin-top: 6px; display: block; }
    .help code { background: var(--dos-bg); padding: 1px 4px; border-radius: 3px; }
    .err { color: #dc2626; font-size: 12px; margin-top: 10px; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .fw-600 { font-weight: 600; } .mono { font-family: monospace; font-size: 13px; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
  `],
})
export class PageCatalogComponent implements OnInit {
  private svc = inject(LowcodeService);
  private msg = inject(MessageService);

  pages = signal<PageSpec[]>([]);
  dialogOpen = false;
  parseError = signal<string | null>(null);

  layouts = LAYOUTS;
  statuses = STATUSES;
  formSpecExample = '{"title":"...","submit_label":"Save","submit_endpoint_code":"my.endpoint","fields":[{"key":"name","type":"text","label":"Name","required":true}]}';
  tableSpecExample = '{"row_key":"id","columns":[{"key":"id","label":"ID","width":"80px"},{"key":"created_at","label":"Created","format":"date"}]}';

  form = {
    mode: 'new' as 'new' | 'edit',
    code: '',
    title: '',
    subtitle: '',
    icon: 'pi pi-file',
    route: '',
    section: '',
    layout: 'list' as PageLayout,
    status: 'draft' as PageStatus,
    requiresRaw: '[]',
    dataEndpoint: '',
    dataParamsRaw: '{}',
    formSpecRaw: '',
    tableSpecRaw: '',
  };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.svc.listPages().subscribe({ next: (d) => this.pages.set(d), error: () => this.pages.set([]) });
  }

  openNew(): void {
    this.form = { mode: 'new', code: '', title: '', subtitle: '', icon: 'pi pi-file', route: '', section: '',
      layout: 'list', status: 'draft', requiresRaw: '[]', dataEndpoint: '', dataParamsRaw: '{}',
      formSpecRaw: '', tableSpecRaw: '' };
    this.parseError.set(null);
    this.dialogOpen = true;
  }

  openEdit(p: PageSpec): void {
    this.form = {
      mode: 'edit',
      code: p.code,
      title: p.title,
      subtitle: p.subtitle ?? '',
      icon: p.icon ?? 'pi pi-file',
      route: p.route,
      section: p.section ?? '',
      layout: p.layout,
      status: p.status,
      requiresRaw: JSON.stringify(p.requires ?? [], null, 2),
      dataEndpoint: (p.data_source as any)?.endpoint_code ?? '',
      dataParamsRaw: JSON.stringify((p.data_source as any)?.params ?? {}, null, 2),
      formSpecRaw: p.form_spec ? JSON.stringify(p.form_spec, null, 2) : '',
      tableSpecRaw: p.table_spec ? JSON.stringify(p.table_spec, null, 2) : '',
    };
    this.parseError.set(null);
    this.dialogOpen = true;
  }

  save(): void {
    let requires: string[] = [];
    let dataParams: Record<string, unknown> = {};
    let formSpec: any = null;
    let tableSpec: any = null;
    try {
      requires = JSON.parse(this.form.requiresRaw || '[]');
      dataParams = JSON.parse(this.form.dataParamsRaw || '{}');
      formSpec = this.form.formSpecRaw ? JSON.parse(this.form.formSpecRaw) : null;
      tableSpec = this.form.tableSpecRaw ? JSON.parse(this.form.tableSpecRaw) : null;
    } catch (e: any) {
      this.parseError.set(`Invalid JSON: ${e?.message}`);
      return;
    }

    const spec: PageSpec = {
      code: this.form.code,
      title: this.form.title,
      subtitle: this.form.subtitle || undefined,
      icon: this.form.icon || undefined,
      route: this.form.route,
      section: this.form.section || undefined,
      layout: this.form.layout,
      status: this.form.status,
      requires,
      data_source: this.form.dataEndpoint ? { endpoint_code: this.form.dataEndpoint, params: dataParams } : {},
      form_spec: formSpec,
      table_spec: tableSpec,
    };

    const obs = this.form.mode === 'edit' ? this.svc.updatePage(this.form.code, spec) : this.svc.createPage(spec);
    obs.subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: `${this.form.code} saved` }); this.dialogOpen = false; this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Save failed' }),
    });
  }

  remove(p: PageSpec): void {
    if (!confirm(`Delete page "${p.code}"?`)) return;
    this.svc.deletePage(p.code).subscribe({
      next: () => { this.msg.add({ severity: 'warn', summary: `${p.code} deleted` }); this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Delete failed' }),
    });
  }
}
