import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { DynamicFormComponent } from '../../core/dos/components/dynamic-form.component';
import { DynamicTableComponent } from '../../core/dos/components/dynamic-table.component';
import { LowcodeService, PageSpec } from '../../core/dos/services/lowcode.service';

/**
 * Catch-all component that renders a page declared in `page_catalog`.
 * Resolves the spec via route data (set by DynamicRoutesService) or code param,
 * then dispatches on `layout` to show a form, a list, or both.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-dynamic-page',
  standalone: true,
  imports: [CommonModule, ButtonModule, ToastModule, PageHeaderComponent, DynamicFormComponent, DynamicTableComponent],
  providers: [MessageService],
  template: `
    @if (spec(); as p) {
      <dos-page-header [title]="p.title" [subtitle]="p.subtitle || ''" />
      <p-toast />
      @if (p.layout === 'list' || p.layout === 'detail') {
        <div class="toolbar">
          <p-button label="Refresh" icon="pi pi-refresh" (onClick)="loadData()" [outlined]="true" size="small" />
        </div>
        @if (p.table_spec) {
          <dos-dynamic-table [tableSpec]="p.table_spec" [rows]="rows()" />
        } @else {
          <div class="empty">No table spec configured.</div>
        }
      }
      @if (p.layout === 'form' && p.form_spec) {
        <dos-dynamic-form [formSpec]="p.form_spec" (submit)="onSubmitForm($event)" />
      }
      @if (p.layout === 'dashboard') {
        <div class="dash"><pre>{{ rows() | json }}</pre></div>
      }
    } @else if (error()) {
      <div class="error-block">
        <h2>Page unavailable</h2>
        <p>{{ error() }}</p>
      </div>
    } @else {
      <div class="loading">Loading…</div>
    }
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin: 20px 0 12px; }
    .empty { padding: 20px; color: var(--dos-text-muted); font-style: italic; }
    .loading, .error-block { padding: 40px; text-align: center; color: var(--dos-text-muted); }
    .error-block h2 { color: #dc2626; }
    .dash pre { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; font-size: 12px; max-height: 500px; overflow: auto; }
  `],
})
export class DynamicPageComponent {
  private route = inject(ActivatedRoute);
  private svc = inject(LowcodeService);
  private msg = inject(MessageService);

  spec = signal<PageSpec | null>(null);
  rows = signal<any[]>([]);
  error = signal<string | null>(null);

  constructor() {
    // Resolve spec from route data (injected by DynamicRoutesService) or by code param.
    const preload = (this.route.snapshot.data as any)?.pageSpec as PageSpec | undefined;
    if (preload) {
      this.spec.set(preload);
      this.loadData();
    } else {
      const code = this.route.snapshot.paramMap.get('code');
      if (!code) { this.error.set('No page code provided.'); return; }
      this.svc.getPage(code).subscribe({
        next: (p) => { this.spec.set(p); this.loadData(); },
        error: () => this.error.set(`Page "${code}" not found.`),
      });
    }
  }

  loadData(): void {
    const p = this.spec();
    if (!p) return;
    const ds = p.data_source || {};
    if (!ds.endpoint_code) return;
    this.svc.invokeEndpoint(ds.endpoint_code, 'GET', undefined, ds.params as any).subscribe({
      next: (d: any) => this.rows.set(Array.isArray(d) ? d : d ? [d] : []),
      error: () => this.rows.set([]),
    });
  }

  onSubmitForm(value: Record<string, any>): void {
    const p = this.spec();
    if (!p?.form_spec?.submit_endpoint_code) {
      this.msg.add({ severity: 'warn', summary: 'No submit endpoint configured' });
      return;
    }
    this.svc.invokeEndpoint(p.form_spec.submit_endpoint_code, 'POST', value).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Saved' }); this.loadData(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Submit failed' }),
    });
  }
}
