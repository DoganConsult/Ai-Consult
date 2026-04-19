import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { PillarsService } from '../../../core/pillars/pillars.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-pillars-overview',
  standalone: true,
  imports: [CommonModule, CardModule, TagModule, ButtonModule, RouterLink],
  template: `
    <div class="grid">
      <p-card header="DNOC — Network">
        <div class="row"><span>Prometheus</span>
          <p-tag [value]="dnoc()?.prometheus ? 'UP' : 'DOWN'"
                 [severity]="dnoc()?.prometheus ? 'success' : 'danger'" /></div>
        <div class="row"><span>Alertmanager</span>
          <p-tag [value]="dnoc()?.alertmanager ? 'UP' : 'DOWN'"
                 [severity]="dnoc()?.alertmanager ? 'success' : 'danger'" /></div>
        <div class="row"><span>DB latency</span>
          <strong>{{ dnoc()?.database?.latencyMs ?? '—' }}ms</strong></div>
        <a routerLink="../dnoc" class="more">Open DNOC →</a>
      </p-card>

      <p-card header="DSOC — Security">
        <div class="row"><span>Open alerts</span><strong>{{ openAlerts() }}</strong></div>
        <div class="row"><span>Risk score</span>
          <p-tag [value]="(risk()?.score ?? 0) + ' (' + (risk()?.band ?? '—') + ')'"
                 [severity]="riskSeverity()" /></div>
        <div class="row"><span>Last 1h</span><strong>{{ risk()?.last_1h ?? 0 }}</strong></div>
        <a routerLink="../dsoc" class="more">Open DSOC →</a>
      </p-card>

      <p-card header="DAuth — Identity">
        <div class="row"><span>Open high+critical</span><strong>{{ risk()?.open_high ?? 0 }}</strong></div>
        <div class="row"><span>Risk band</span>
          <p-tag [value]="risk()?.band ?? '—'" [severity]="riskSeverity()" /></div>
        <a routerLink="../dauth" class="more">Open DAuth →</a>
      </p-card>

      <p-card header="DOS — Tenancy">
        <div class="row"><span>Tenants</span><strong>{{ dos()?.tenants?.total ?? '—' }}</strong></div>
        <div class="row"><span>Active</span><strong>{{ dos()?.tenants?.active ?? '—' }}</strong></div>
        <div class="row"><span>RLS policies</span><strong>{{ dos()?.rlsPolicies ?? '—' }}</strong></div>
        <a routerLink="../dos" class="more">Open DOS →</a>
      </p-card>
    </div>

    <div class="footer">
      <p-button label="Refresh" icon="pi pi-refresh" size="small" [outlined]="true"
                (onClick)="refresh()" [loading]="loading()" />
      <span class="ts" *ngIf="ts()">updated {{ ts() | date:'mediumTime' }}</span>
    </div>
  `,
  styles: [`
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; }
    .row span { color: #64748b; font-size: 0.85rem; }
    .more { display: inline-block; margin-top: 8px; color: #0ea5e9; text-decoration: none; font-size: 0.9rem; }
    .footer { margin-top: 16px; display: flex; gap: 12px; align-items: center; }
    .ts { color: #94a3b8; font-size: 0.8rem; }
  `],
})
export class OperatorOverviewComponent implements OnInit, OnDestroy {
  private svc = inject(PillarsService);
  dnoc = signal<any>(null);
  risk = signal<any>(null);
  dos = signal<any>(null);
  openAlerts = signal<number>(0);
  loading = signal<boolean>(false);
  ts = signal<string | null>(null);
  private sub?: Subscription;
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.refresh();
    this.timer = setInterval(() => this.refresh(), 30_000);
  }
  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.sub?.unsubscribe();
  }
  refresh(): void {
    this.loading.set(true);
    this.sub?.unsubscribe();
    this.sub = forkJoin({
      dnoc: this.svc.dnocHealth(),
      risk: this.svc.dauthRisk(),
      dos: this.svc.dosOverview(),
      summary: this.svc.dsocSummary(),
    }).subscribe({
      next: (r) => {
        this.dnoc.set(r.dnoc);
        this.risk.set(r.risk);
        this.dos.set(r.dos);
        const open = (r.summary?.buckets ?? []).filter((b: any) => b.status === 'open')
          .reduce((s: number, b: any) => s + (b.n ?? 0), 0);
        this.openAlerts.set(open);
        this.ts.set(new Date().toISOString());
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
  riskSeverity(): 'success' | 'info' | 'warning' | 'danger' {
    const b = this.risk()?.band;
    if (b === 'critical') return 'danger';
    if (b === 'high') return 'warning';
    if (b === 'medium') return 'info';
    return 'success';
  }
}
