import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, RoleAssignment } from '../admin-api.service';

@Component({
  selector: 'dgn-roles',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-h">Roles &amp; SoD preflight</h1>
    <p class="page-sub">Grant or revoke a role; preflight a pending grant against active SoD rules.</p>

    <div class="grid2">
      <div class="panel">
        <h3>Grant / revoke</h3>
        <div class="field"><label>user_id (uuid)</label><input [(ngModel)]="userId"/></div>
        <div class="field"><label>role</label><input [(ngModel)]="role" placeholder="contracts.approver"/></div>
        <div class="field"><label>scope</label>
          <select [(ngModel)]="scope">
            <option value="platform">platform</option>
            <option value="tenant">tenant</option>
            <option value="product">product</option>
            <option value="module">module</option>
          </select>
        </div>
        <div class="field"><label>scope_id (optional)</label><input [(ngModel)]="scopeId"/></div>
        <div class="actions">
          <button class="btn-pri" type="button" [disabled]="busyG()" (click)="grant()">Grant</button>
          <button class="btn-sec" type="button" [disabled]="busyR()" (click)="revoke()">Revoke</button>
        </div>
        @if (msg()) { <div class="ok" style="margin-top:.75rem">{{ msg() }}</div> }
        @if (err()) { <div class="err" style="margin-top:.75rem">{{ err() }}</div> }
      </div>

      <div class="panel">
        <h3>SoD preflight</h3>
        <div class="field"><label>user_id (uuid)</label><input [(ngModel)]="pfUserId"/></div>
        <div class="field"><label>pending_role</label><input [(ngModel)]="pfRole"/></div>
        <div class="actions">
          <button class="btn-pri" type="button" [disabled]="busyP()" (click)="preflight()">Run preflight</button>
        </div>
        @if (pfErr()) { <div class="err" style="margin-top:.75rem">{{ pfErr() }}</div> }
        <pre style="margin-top:.5rem">{{ pfOut() }}</pre>
      </div>
    </div>

    <div class="panel">
      <div class="toolbar">
        <h3 style="margin:0">Active assignments</h3>
        <button class="btn-mini" type="button" (click)="reload()">Refresh</button>
      </div>
      @if (rows().length === 0) { <div class="empty">No assignments.</div> }
      @else {
        <table>
          <thead><tr><th>id</th><th>user_id</th><th>role</th><th>scope</th><th>scope_id</th><th>granted_at</th></tr></thead>
          <tbody>
            @for (a of rows(); track a.id) {
              <tr>
                <td><code>{{ a.id }}</code></td>
                <td><code>{{ a.user_id }}</code></td>
                <td><code>{{ a.role }}</code></td>
                <td>{{ a.scope }}</td>
                <td><code>{{ a.scope_id ?? '—' }}</code></td>
                <td>{{ a.granted_at }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class RolesPage implements OnInit {
  private readonly api = inject(AdminApiService);
  userId = ''; role = ''; scope = 'tenant'; scopeId = '';
  pfUserId = ''; pfRole = '';
  readonly busyG = signal(false);
  readonly busyR = signal(false);
  readonly busyP = signal(false);
  readonly msg = signal<string | null>(null);
  readonly err = signal<string | null>(null);
  readonly pfOut = signal('');
  readonly pfErr = signal<string | null>(null);
  readonly rows = signal<RoleAssignment[]>([]);

  ngOnInit(): void { void this.reload(); }
  async reload(): Promise<void> {
    const r = await this.api.listRoleAssignments();
    if (r.ok && r.data) this.rows.set(r.data.assignments);
  }

  private body() {
    return {
      user_id: this.userId.trim(), role: this.role.trim(),
      scope: this.scope, scope_id: this.scopeId.trim() || undefined,
    };
  }
  async grant(): Promise<void> {
    this.busyG.set(true); this.msg.set(null); this.err.set(null);
    const r = await this.api.grantRole(this.body());
    this.busyG.set(false);
    if (r.ok) this.msg.set('role granted'); else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async revoke(): Promise<void> {
    this.busyR.set(true); this.msg.set(null); this.err.set(null);
    const r = await this.api.revokeRole(this.body());
    this.busyR.set(false);
    if (r.ok) this.msg.set('role revoked'); else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async preflight(): Promise<void> {
    this.busyP.set(true); this.pfErr.set(null); this.pfOut.set('');
    const r = await this.api.sodPreflight({ user_id: this.pfUserId.trim(), pending_role: this.pfRole.trim() });
    this.busyP.set(false);
    if (r.ok) this.pfOut.set(JSON.stringify(r.data, null, 2));
    else this.pfErr.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
