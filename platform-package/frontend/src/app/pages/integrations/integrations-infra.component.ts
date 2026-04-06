import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { JobsService } from '../../core/dos/services/jobs.service';
import { HealthService } from '../../core/dos/services/health.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-integrations-infra',
  standalone: true,
  imports: [CommonModule, TagModule, ButtonModule, TabsModule, PageHeaderComponent],
  template: `
    <dos-page-header title="Integrations & Infrastructure" subtitle="Service health, queue/cache status, storage backends, and infrastructure probes" />

    <p-tabs>
      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-server"></i> Service Health</span></ng-template>
        <div class="tab-body">
          <p-button label="Refresh" icon="pi pi-refresh" (onClick)="load()" [outlined]="true" size="small" />
          <div class="kv-grid">
            @for (kv of serviceHealth(); track kv.key) {
              <div class="kv-card">
                <span class="kv-key">{{ kv.key }}</span>
                <span class="kv-val">{{ kv.value }}</span>
              </div>
            }
            @if (serviceHealth().length === 0) {
              <div class="empty-msg">Loading service health...</div>
            }
          </div>
        </div>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-database"></i> Cache Health</span></ng-template>
        <div class="tab-body">
          <div class="kv-grid">
            @for (kv of cacheHealth(); track kv.key) {
              <div class="kv-card">
                <span class="kv-key">{{ kv.key }}</span>
                <span class="kv-val">{{ kv.value }}</span>
              </div>
            }
            @if (cacheHealth().length === 0) {
              <div class="empty-msg">No cache data</div>
            }
          </div>
        </div>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-heart"></i> Runtime Health</span></ng-template>
        <div class="tab-body">
          @if (runtimeHealth()) {
            <pre class="json-block">{{ runtimeHealth() | json }}</pre>
          } @else {
            <div class="empty-msg">Loading runtime health...</div>
          }
        </div>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-check-circle"></i> Preflight</span></ng-template>
        <div class="tab-body">
          @if (preflight()) {
            <pre class="json-block">{{ preflight() | json }}</pre>
          } @else {
            <div class="empty-msg">Loading preflight data...</div>
          }
        </div>
      </p-tabpanel>
    </p-tabs>
  `,
  styles: [`
    .tab-body { padding: 16px 0; }
    .kv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; margin-top: 16px; }
    .kv-card { display: flex; justify-content: space-between; padding: 12px 16px; background: var(--dos-surface); border: 1px solid var(--dos-border); border-radius: 8px; }
    .kv-key { font-size: 13px; font-weight: 600; } .kv-val { font-size: 13px; font-family: monospace; color: var(--dos-text-muted); }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); grid-column: 1 / -1; }
    .json-block { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; font-size: 12px; max-height: 500px; overflow: auto; white-space: pre-wrap; }
  `],
})
export class IntegrationsInfraComponent implements OnInit {
  private jobsSvc = inject(JobsService);
  private healthSvc = inject(HealthService);

  serviceHealth = signal<Array<{ key: string; value: string }>>([]);
  cacheHealth = signal<Array<{ key: string; value: string }>>([]);
  runtimeHealth = signal<any>(null);
  preflight = signal<any>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.jobsSvc.getServiceHealth().subscribe({ next: d => this.serviceHealth.set(this.flatten(d)), error: () => this.serviceHealth.set([]) });
    this.healthSvc.getCacheHealth().subscribe({ next: d => this.cacheHealth.set(this.flatten(d)), error: () => this.cacheHealth.set([]) });
    this.jobsSvc.getRuntimeHealth().subscribe({ next: d => this.runtimeHealth.set(d), error: () => {} });
    this.healthSvc.getPreflight().subscribe({ next: d => this.preflight.set(d), error: () => {} });
  }

  private flatten(obj: any): Array<{ key: string; value: string }> {
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj).slice(0, 20).map(([k, v]) => ({ key: k.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), value: typeof v === 'object' ? JSON.stringify(v) : String(v) }));
  }
}
