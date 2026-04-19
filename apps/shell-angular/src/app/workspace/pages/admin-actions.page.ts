import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, AdminActionRow } from '../admin-api.service';

@Component({
  selector: 'dgn-admin-actions',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-h">Admin actions · 4-eyes</h1>
    <p class="page-sub">Hash-chained, append-only ledger. Approver must differ from requester. Step-up &le; 600s.</p>

    <div class="panel">
      <h3>Request action</h3>
      <div class="grid2">
        <div class="field"><label>category</label><input [(ngModel)]="cCategory" placeholder="tenant"/></div>
        <div class="field"><label>action</label><input [(ngModel)]="cAction" placeholder="archive"/></div>
        <div class="field"><label>target_type</label><input [(ngModel)]="cTargetType" placeholder="tenant"/></div>
        <div class="field"><label>target_id</label><input [(ngModel)]="cTargetId" placeholder="uuid"/></div>
        <div class="field" style="grid-column:1/-1"><label>reason (6..1024)</label>
          <input [(ngModel)]="cReason" placeholder="why"/></div>
      </div>
      <div class="actions">
        <button class="btn-pri" type="button" [disabled]="busy()" (click)="request()">Request</button>
      </div>
      @if (msg()) { <div class="ok" style="margin-top:.75rem">{{ msg() }}</div> }
      @if (err()) { <div class="err" style="margin-top:.75rem">{{ err() }}</div> }
    </div>

    <div class="panel">
      <div class="toolbar">
        <h3 style="margin:0">Action log</h3>
        <div>
          <button class="btn-mini" type="button" (click)="reload()">Refresh</button>
          <button class="btn-mini" type="button" (click)="verify()">Verify chain</button>
        </div>
      </div>
      @if (chain()) { <div class="ok" style="margin-bottom:.5rem">chain ok={{ chain()!.ok }} brokenAt={{ chain()!.brokenAt ?? '—' }}</div> }
      @if (rows().length === 0) { <div class="empty">No actions.</div> }
      @else {
        <table>
          <thead><tr>
            <th>id</th><th>ts</th><th>state</th><th>category</th><th>action</th>
            <th>target</th><th>actor</th><th>approver</th><th>reason</th><th></th>
          </tr></thead>
          <tbody>
            @for (a of rows(); track a.id) {
              <tr>
                <td><code title="{{ a.hash }}">{{ a.id.slice(0,8) }}</code></td>
                <td>{{ a.ts }}</td>
                <td><span class="badge" [class.up]="a.state==='executed'||a.state==='approved'" [class.down]="a.state==='rejected'||a.state==='expired'">{{ a.state }}</span></td>
                <td>{{ a.category }}</td><td>{{ a.action }}</td>
                <td>{{ a.target_type }}/{{ a.target_id ?? '—' }}</td>
                <td><code>{{ a.actor_id.slice(0,8) }}</code></td>
                <td>{{ a.approver_id ? a.approver_id.slice(0,8) : '—' }}</td>
                <td>{{ a.reason }}</td>
                <td>
                  @if (a.state==='requested') {
                    <button class="btn-mini" type="button" (click)="approve(a)">Approve</button>
                    <button class="btn-dng" type="button" (click)="reject(a)">Reject</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class AdminActionsPage implements OnInit {
  private readonly api = inject(AdminApiService);
  cCategory = ''; cAction = ''; cTargetType = ''; cTargetId = ''; cReason = '';
  readonly busy = signal(false);
  readonly msg = signal<string | null>(null);
  readonly err = signal<string | null>(null);
  readonly rows = signal<AdminActionRow[]>([]);
  readonly chain = signal<{ ok: boolean; brokenAt?: string } | null>(null);

  ngOnInit(): void { void this.reload(); }
  async reload(): Promise<void> {
    const r = await this.api.listAdminActions();
    if (r.ok && r.data) { this.rows.set(r.data.actions); this.err.set(null); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async verify(): Promise<void> {
    const r = await this.api.verifyAuditChain();
    if (r.ok && r.data) this.chain.set(r.data);
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async request(): Promise<void> {
    this.busy.set(true); this.msg.set(null); this.err.set(null);
    const r = await this.api.requestAdminAction({
      category: this.cCategory.trim(), action: this.cAction.trim(),
      target_type: this.cTargetType.trim(), target_id: this.cTargetId.trim() || undefined,
      reason: this.cReason.trim(),
    });
    this.busy.set(false);
    if (r.ok && r.data) { this.msg.set(`requested id=${r.data.id}`); void this.reload(); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async approve(a: AdminActionRow): Promise<void> {
    const reason = prompt('Approval reason (6..1024)') ?? '';
    if (reason.length < 6) return;
    const r = await this.api.approveAdminAction({ id: a.id, reason });
    if (r.ok) void this.reload(); else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async reject(a: AdminActionRow): Promise<void> {
    const reason = prompt('Reject reason (6..1024)') ?? '';
    if (reason.length < 6) return;
    const r = await this.api.rejectAdminAction({ id: a.id, reason });
    if (r.ok) void this.reload(); else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
