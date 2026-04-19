import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PlatformAdminService, GovernanceMatrix } from '../../core/dos/services/platform-admin.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-governance-matrix',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, PageHeaderComponent],
  template: `
    <dos-page-header title="Governance Matrix" subtitle="Ownership layers, governors, and the authorization chain" />
    @if (data(); as d) {
      <section class="block">
        <h2>Authorization Chain</h2>
        <div class="chain">
          @for (step of d.authorizationChain; track step; let i = $index) {
            <span class="chip">{{ i + 1 }}. {{ step }}</span>
            @if (i < d.authorizationChain.length - 1) { <i class="pi pi-chevron-right"></i> }
          }
        </div>
      </section>

      <section class="block">
        <h2>Levels &amp; Governors</h2>
        <p-table [value]="d.levels" styleClass="p-datatable-sm p-datatable-striped">
          <ng-template #header>
            <tr><th style="width:140px">Level</th><th style="width:200px">Governor</th><th>Controls</th></tr>
          </ng-template>
          <ng-template #body let-row>
            <tr>
              <td><p-tag [value]="row.level" severity="info" /></td>
              <td class="mono fw-600">{{ row.governor }}</td>
              <td>
                <div class="controls">
                  @for (c of row.controls; track c) {
                    <span class="control-chip">{{ c }}</span>
                  }
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </section>

      <section class="block">
        <h2>Access Profiles</h2>
        <div class="profiles">
          @for (p of d.accessProfiles; track p) {
            <span class="profile-chip">{{ p }}</span>
          }
        </div>
      </section>
    } @else {
      <div class="empty-msg">Loading governance matrix…</div>
    }
  `,
  styles: [`
    .block { margin: 20px 0; }
    h2 { font-size: 15px; font-weight: 700; margin: 0 0 10px; color: var(--dos-text); }
    .chain { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .chip { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .controls { display: flex; flex-wrap: wrap; gap: 6px; }
    .control-chip { background: var(--dos-bg); border: 1px solid var(--dos-border); padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .profiles { display: flex; flex-wrap: wrap; gap: 8px; }
    .profile-chip { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; font-family: monospace; }
    .fw-600 { font-weight: 600; } .mono { font-family: monospace; font-size: 13px; }
    .empty-msg { text-align: center; padding: 40px; color: var(--dos-text-muted); }
  `],
})
export class GovernanceMatrixComponent implements OnInit {
  private svc = inject(PlatformAdminService);
  data = signal<GovernanceMatrix | null>(null);
  ngOnInit(): void {
    this.svc.getGovernanceMatrix().subscribe({ next: d => this.data.set(d), error: () => this.data.set(null) });
  }
}
