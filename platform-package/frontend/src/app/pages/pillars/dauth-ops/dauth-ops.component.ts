import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { PillarsService } from '../../../core/pillars/pillars.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-pillars-dauth',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, ButtonModule, TabsModule],
  template: `
    <div class="risk-card" [class]="'band-' + (risk()?.band || 'low')">
      <div class="score-big">{{ risk()?.score ?? 0 }}</div>
      <div class="score-meta">
        <div class="band">{{ (risk()?.band || 'low') | uppercase }} RISK</div>
        <div class="pills">
          <span>Open high/critical: <strong>{{ risk()?.open_high ?? 0 }}</strong></span>
          <span>Last 1h: <strong>{{ risk()?.last_1h ?? 0 }}</strong></span>
          <span>Last 24h: <strong>{{ risk()?.last_24h ?? 0 }}</strong></span>
        </div>
      </div>
      <p-button label="Refresh" icon="pi pi-refresh" size="small" [outlined]="true" (onClick)="refresh()" class="ml-auto" />
    </div>

    <p-tabs value="sessions">
      <p-tablist>
        <p-tab value="sessions"><i class="pi pi-user"></i> Active Sessions</p-tab>
        <p-tab value="jit"><i class="pi pi-bolt"></i> JIT Elevations</p-tab>
        <p-tab value="sod"><i class="pi pi-ban"></i> SoD Blocks</p-tab>
      </p-tablist>
      <p-tabpanels>
        <p-tabpanel value="sessions">
          <p-table [value]="sessions()" styleClass="p-datatable-sm">
            <ng-template #header>
              <tr>
                <th>Session ID</th>
                <th>User</th>
                <th>IP</th>
                <th>User Agent</th>
                <th>Last seen</th>
                <th style="width:120px"></th>
              </tr>
            </ng-template>
            <ng-template #body let-s>
              <tr>
                <td class="mono">{{ s.id }}</td>
                <td class="mono">{{ s.user_id }}</td>
                <td class="mono muted">{{ s.ip || '--' }}</td>
                <td class="mono muted truncate">{{ s.user_agent || '--' }}</td>
                <td class="mono">{{ (s.last_seen_at || s.created_at) | date:'short' }}</td>
                <td><p-button label="Revoke" icon="pi pi-times" size="small" severity="danger" [text]="true" (onClick)="revoke(s.id)" /></td>
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr><td colspan="6" class="muted">{{ sessionsNote() || 'No active sessions' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabpanel>

        <p-tabpanel value="jit">
          <p-table [value]="jit()" styleClass="p-datatable-sm">
            <ng-template #header>
              <tr><th>User</th><th>Role</th><th>Reason</th><th>Granted</th><th>Expires</th></tr>
            </ng-template>
            <ng-template #body let-e>
              <tr>
                <td class="mono">{{ e.user_id }}</td>
                <td><p-tag [value]="e.role || e.target_role" severity="warn" /></td>
                <td class="muted">{{ e.reason || '--' }}</td>
                <td class="mono">{{ e.granted_at || e.created_at | date:'short' }}</td>
                <td class="mono">{{ e.expires_at | date:'short' }}</td>
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr><td colspan="5" class="muted">{{ jitNote() || 'No active elevations' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabpanel>

        <p-tabpanel value="sod">
          <p-table [value]="sod()" styleClass="p-datatable-sm">
            <ng-template #header>
              <tr><th>Time</th><th>Severity</th><th>Title</th><th>User</th></tr>
            </ng-template>
            <ng-template #body let-b>
              <tr>
                <td class="mono">{{ b.ts | date:'short' }}</td>
                <td><p-tag [value]="b.severity" [severity]="b.severity === 'critical' || b.severity === 'high' ? 'danger' : 'warn'" /></td>
                <td class="fw-600">{{ b.title }}</td>
                <td class="mono">{{ b.user_id || '--' }}</td>
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr><td colspan="4" class="muted">No SoD violations in window</td></tr>
            </ng-template>
          </p-table>
        </p-tabpanel>
      </p-tabpanels>
    </p-tabs>
  `,
  styles: [`
    .risk-card { display: flex; gap: 20px; align-items: center; padding: 16px 20px; border-radius: 8px;
                 background: #f0f9ff; border: 1px solid #bae6fd; margin-bottom: 16px; }
    .risk-card.band-medium { background: #fef3c7; border-color: #fcd34d; }
    .risk-card.band-high { background: #ffedd5; border-color: #fdba74; }
    .risk-card.band-critical { background: #fee2e2; border-color: #fca5a5; }
    .score-big { font-size: 48px; font-weight: 800; color: #0f172a; line-height: 1; }
    .score-meta .band { font-size: 14px; font-weight: 700; letter-spacing: 0.04em; color: #0f172a; }
    .score-meta .pills { display: flex; gap: 16px; margin-top: 6px; font-size: 12px; color: #475569; }
    .ml-auto { margin-left: auto; }
    .fw-600 { font-weight: 600; }
    .mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
    .muted { color: #64748b; }
    .truncate { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `],
})
export class DauthOpsComponent implements OnInit, OnDestroy {
  private api = inject(PillarsService);
  risk = signal<{ score: number; band: string; open_high: number; last_1h: number; last_24h: number } | null>(null);
  sessions = signal<any[]>([]);
  sessionsNote = signal<string>('');
  jit = signal<any[]>([]);
  jitNote = signal<string>('');
  sod = signal<any[]>([]);
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.refresh();
    this.timer = setInterval(() => this.refresh(), 20000);
  }
  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }

  refresh(): void {
    this.api.dauthRisk().subscribe({ next: (r) => this.risk.set(r) });
    this.api.dauthSessions().subscribe({
      next: (r) => { this.sessions.set(r.sessions); this.sessionsNote.set(r.note || ''); },
    });
    this.api.dauthJit().subscribe({
      next: (r) => { this.jit.set(r.elevations); this.jitNote.set(r.note || ''); },
    });
    this.api.dauthSod().subscribe({ next: (r) => this.sod.set(r.blocks) });
  }

  revoke(id: string): void {
    this.api.dauthRevokeSession(id).subscribe({ next: () => this.refresh() });
  }
}
