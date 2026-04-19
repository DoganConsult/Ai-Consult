import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { StepperModule } from 'primeng/stepper';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { HasPermissionDirective } from '../../core/dauth/directives/has-permission.directive';
import { LowcodeService, PageSpec, EndpointSpec } from '../../core/dos/services/lowcode.service';

/**
 * End-to-end wizard: given a table name + basic metadata, create a
 * `query_table` endpoint, an `insert_table` endpoint, and a `list` page
 * that binds both. One click to stand up a new zero-code admin module.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-module-builder',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, InputTextModule, TextareaModule,
    SelectModule, StepperModule, ToastModule, PageHeaderComponent, HasPermissionDirective,
  ],
  providers: [MessageService],
  template: `
    <dos-page-header title="Module Builder" subtitle="Scaffold a full admin module (endpoints + page) from a table spec" />
    <p-toast />

    <div *dosHasPermission="['platform.config.write','platform.schema.manage']" class="wizard">
      <p-stepper [(value)]="step" linear="true">
        <p-step value="1">Module</p-step>
        <p-step value="2">Data</p-step>
        <p-step value="3">Layout</p-step>
        <p-step value="4">Confirm</p-step>

        <p-stepPanel value="1">
          <div class="grid">
            <label>Module Code <input pInputText [(ngModel)]="model.code" placeholder="e.g. crm.contacts" /></label>
            <label>Module Name <input pInputText [(ngModel)]="model.name" placeholder="e.g. Contacts" /></label>
            <label>Section <input pInputText [(ngModel)]="model.section" placeholder="catalog | governance | ai | custom" /></label>
            <label>Icon <input pInputText [(ngModel)]="model.icon" placeholder="pi pi-address-book" /></label>
          </div>
          <div class="step-actions"><p-button label="Next" (onClick)="step = '2'" [disabled]="!model.code || !model.name" /></div>
        </p-stepPanel>

        <p-stepPanel value="2">
          <div class="grid">
            <label>Source Table <input pInputText [(ngModel)]="model.table" placeholder="e.g. contacts" /></label>
            <label>Schema <input pInputText [(ngModel)]="model.schema" value="public" /></label>
            <label class="full">Columns (comma-separated, leave empty for *) <input pInputText [(ngModel)]="model.columns" /></label>
            <label class="full">Order By <input pInputText [(ngModel)]="model.orderBy" placeholder="e.g. created_at DESC" /></label>
            <label class="full">Writable Columns (comma-separated) <input pInputText [(ngModel)]="model.writable" placeholder="e.g. name,email,phone" /></label>
            <label class="full">Required Permissions (comma-separated) <input pInputText [(ngModel)]="model.requires" placeholder="platform.config.read" /></label>
          </div>
          <div class="step-actions">
            <p-button label="Back" (onClick)="step = '1'" [text]="true" />
            <p-button label="Next" (onClick)="step = '3'" [disabled]="!model.table" />
          </div>
        </p-stepPanel>

        <p-stepPanel value="3">
          <div class="grid">
            <label class="full">Page Route <input pInputText [(ngModel)]="model.route" placeholder="e.g. contacts" /></label>
            <label>Page Layout
              <p-select [(ngModel)]="model.layout" [options]="layouts" optionLabel="label" optionValue="value" />
            </label>
            <label>Publish immediately
              <p-select [(ngModel)]="model.publish" [options]="publishOptions" optionLabel="label" optionValue="value" />
            </label>
          </div>
          <div class="step-actions">
            <p-button label="Back" (onClick)="step = '2'" [text]="true" />
            <p-button label="Next" (onClick)="step = '4'" />
          </div>
        </p-stepPanel>

        <p-stepPanel value="4">
          <div class="confirm">
            <h3>Will create:</h3>
            <ul>
              <li>Endpoint <code class="mono">{{ model.code }}.list</code> → GET query_table <code class="mono">{{ model.table }}</code></li>
              <li>Endpoint <code class="mono">{{ model.code }}.create</code> → POST insert_table <code class="mono">{{ model.table }}</code></li>
              <li>Page <code class="mono">{{ model.code }}</code> → /{{ model.route }} ({{ model.layout }})</li>
            </ul>
            <pre class="preview">{{ preview() | json }}</pre>
          </div>
          <div class="step-actions">
            <p-button label="Back" (onClick)="step = '3'" [text]="true" />
            <p-button label="Scaffold Module" icon="pi pi-cog" (onClick)="scaffold()" [disabled]="busy()" />
          </div>
        </p-stepPanel>
      </p-stepper>
    </div>
  `,
  styles: [`
    .wizard { max-width: 960px; margin-top: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px 0; }
    .grid label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-weight: 600; }
    .grid label.full { grid-column: 1 / span 2; }
    .step-actions { display: flex; gap: 8px; justify-content: flex-end; padding: 12px 0; }
    .confirm { padding: 12px 0; }
    .confirm h3 { margin: 0 0 8px; font-size: 15px; }
    .confirm ul { margin: 0 0 12px 20px; font-size: 13px; }
    .confirm li { padding: 3px 0; }
    .mono { font-family: monospace; font-size: 12px; background: var(--dos-bg); padding: 1px 5px; border-radius: 3px; }
    .preview { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 6px; font-size: 11px; max-height: 260px; overflow: auto; }
  `],
})
export class ModuleBuilderComponent {
  private svc = inject(LowcodeService);
  private msg = inject(MessageService);

  step: string | number = '1';
  busy = signal(false);

  layouts = [
    { label: 'List', value: 'list' }, { label: 'Form', value: 'form' },
    { label: 'Detail', value: 'detail' }, { label: 'Dashboard', value: 'dashboard' },
  ];
  publishOptions = [
    { label: 'Draft', value: false }, { label: 'Published', value: true },
  ];

  model = {
    code: '', name: '', section: 'custom', icon: 'pi pi-th-large',
    table: '', schema: 'public', columns: '', orderBy: '', writable: '',
    requires: 'platform.config.read',
    route: '', layout: 'list' as const, publish: true,
  };

  preview() {
    const requires = (this.model.requires || '').split(',').map((s) => s.trim()).filter(Boolean);
    const cols = (this.model.columns || '').split(',').map((s) => s.trim()).filter(Boolean);
    const writable = (this.model.writable || '').split(',').map((s) => s.trim()).filter(Boolean);
    const listEndpoint: EndpointSpec = {
      code: `${this.model.code}.list`, method: 'GET',
      path: `/${this.model.code.replace(/[^A-Za-z0-9]/g, '-')}/list`,
      description: `List ${this.model.table}`,
      requires, handler_type: 'query_table',
      handler_spec: { table: this.model.table, columns: cols, order_by: this.model.orderBy || null, limit: 200 },
      status: this.model.publish ? 'published' : 'draft',
    };
    const createEndpoint: EndpointSpec = {
      code: `${this.model.code}.create`, method: 'POST',
      path: `/${this.model.code.replace(/[^A-Za-z0-9]/g, '-')}/create`,
      description: `Create ${this.model.table}`,
      requires: [...requires, 'platform.config.write'],
      handler_type: 'insert_table',
      handler_spec: { table: this.model.table, columns: writable },
      status: this.model.publish ? 'published' : 'draft',
    };
    const page: PageSpec = {
      code: this.model.code,
      title: this.model.name,
      subtitle: `Auto-scaffolded from ${this.model.schema}.${this.model.table}`,
      icon: this.model.icon,
      route: this.model.route || this.model.code.replace(/\./g, '-'),
      section: this.model.section,
      requires,
      layout: this.model.layout,
      status: this.model.publish ? 'published' : 'draft',
      data_source: { endpoint_code: listEndpoint.code },
      form_spec: writable.length > 0 ? {
        title: `New ${this.model.name}`,
        submit_label: 'Create',
        submit_endpoint_code: createEndpoint.code,
        fields: writable.map((k) => ({ key: k, type: 'text' as const, label: k, required: false })),
      } : null,
      table_spec: cols.length > 0
        ? { columns: cols.map((k) => ({ key: k, label: k })) }
        : { columns: [{ key: 'id', label: 'ID' }, { key: 'created_at', label: 'Created', format: 'date' as const }] },
    };
    return { listEndpoint, createEndpoint, page };
  }

  async scaffold(): Promise<void> {
    const p = this.preview();
    this.busy.set(true);
    try {
      await this.svc.createEndpoint(p.listEndpoint).toPromise().catch(() => this.svc.updateEndpoint(p.listEndpoint.code, p.listEndpoint).toPromise());
      await this.svc.createEndpoint(p.createEndpoint).toPromise().catch(() => this.svc.updateEndpoint(p.createEndpoint.code, p.createEndpoint).toPromise());
      await this.svc.createPage(p.page).toPromise().catch(() => this.svc.updatePage(p.page.code, p.page).toPromise());
      this.msg.add({ severity: 'success', summary: `Module ${this.model.code} scaffolded`, detail: 'Refresh permissions or re-login to see it in the menu.' });
    } catch (err: any) {
      this.msg.add({ severity: 'error', summary: 'Scaffold failed', detail: err?.message });
    } finally {
      this.busy.set(false);
    }
  }
}
