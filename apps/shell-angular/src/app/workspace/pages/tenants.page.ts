import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, TenantRow } from '../admin-api.service';

@Component({
  selector: 'dgn-tenants',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-h">Tenants</h1>
    <p class="page-sub">Provision, edit, and archive tenants. Requires <code>platform_admin</code>.</p>

    <div class="panel">
      <h3>Provision tenant</h3>
      <div class="grid2">
        <div class="field"><label>name</label><input [(ngModel)]="cName"/></div>
        <div class="field"><label>slug</label><input [(ngModel)]="cSlug"/></div>
        <div class="field"><label>tier</label>
          <select [(ngModel)]="cTier">
            <option>starter</option><option>growth</option>
            <option>enterprise</option><option>sovereign</option>
          </select>
        </div>
        <div class="field"><label>isolation_mode</label>
          <select [(ngModel)]="cIso">
            <option>shared_db</option><option>dedicated_db</option><option>dedicated_cluster</option>
          </select>
        </div>
      </div>
      <div class="actions">
        <button class="btn-pri" type="button" [disabled]="busy()" (click)="create()">Provision</button>
      </div>
      @if (msg()) { <div class="ok" style="margin-top:.75rem">{{ msg() }}</div> }
      @if (err()) { <div class="err" style="margin-top:.75rem">{{ err() }}</div> }
    </div>

    <div class="panel">
      <div class="toolbar">
        <h3 style="margin:0">Existing tenants</h3>
        <button class="btn-mini" type="button" (click)="reload()">Refresh</button>
      </div>
      @if (rows().length === 0) { <div class="empty">No tenants.</div> }
      @else {
        <table>
          <thead><tr>
            <th>id</th><th>slug</th><th>name</th><th>status</th>
            <th>tier</th><th>isolation</th><th></th>
          </tr></thead>
          <tbody>
            @for (t of rows(); track t.id) {
              <tr>
                <td><code>{{ t.id }}</code></td>
                <td>{{ t.slug }}</td>
                <td>
                  @if (editId() === t.id) { <input [(ngModel)]="eName"/> }
                  @else { {{ t.name ?? '—' }} }
                </td>
                <td>
                  @if (editId() === t.id) {
                    <select [(ngModel)]="eStatus">
                      <option>active</option><option>suspended</option><option>archived</option>
                    </select>
                  } @else {
                    <span class="badge"
                      [class.up]="t.status === 'active'"
                      [class.warn]="t.status === 'suspended'"
                      [class.down]="t.status === 'archived'">{{ t.status }}</span>
                  }
                </td>
                <td>
                  @if (editId() === t.id) {
                    <select [(ngModel)]="eTier">
                      <option>starter</option><option>growth</option>
                      <option>enterprise</option><option>sovereign</option>
                    </select>
                  } @else { <code>{{ t.tier }}</code> }
                </td>
                <td>
                  @if (editId() === t.id) {
                    <select [(ngModel)]="eIso">
                      <option>shared_db</option><option>dedicated_db</option><option>dedicated_cluster</option>
                    </select>
                  } @else { <code>{{ t.isolation_mode }}</code> }
                </td>
                <td style="white-space:nowrap">
                  @if (editId() === t.id) {
                    <button class="btn-pri" type="button" (click)="save(t)">Save</button>
                    <button class="btn-mini" type="button" (click)="cancelEdit()">Cancel</button>
                  } @else {
                    <button class="btn-mini" type="button" (click)="edit(t)">Edit</button>
                    <button class="btn-dng" type="button" (click)="archive(t)">Archive</button>
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
export class TenantsPage implements OnInit {
  private readonly api = inject(AdminApiService);
  cName = ''; cSlug = ''; cTier = 'starter'; cIso = 'shared_db';
  eName = ''; eStatus = 'active'; eTier = 'starter'; eIso = 'shared_db';
  readonly busy = signal(false);
  readonly msg = signal<string | null>(null);
  readonly err = signal<string | null>(null);
  readonly rows = signal<TenantRow[]>([]);
  readonly editId = signal<string | null>(null);

  ngOnInit(): void { void this.reload(); }

  async create(): Promise<void> {
    this.busy.set(true); this.msg.set(null); this.err.set(null);
    const r = await this.api.createTenant({
      name: this.cName.trim(), slug: this.cSlug.trim(),
      tier: this.cTier, isolation_mode: this.cIso,
    });
    this.busy.set(false);
    if (r.ok && r.data) { this.msg.set(`tenant id=${r.data.id}`); void this.reload(); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async reload(): Promise<void> {
    const r = await this.api.listTenants();
    if (r.ok && r.data) { this.rows.set(r.data.tenants); this.err.set(null); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  edit(t: TenantRow): void {
    this.editId.set(t.id);
    this.eName = t.name ?? ''; this.eStatus = t.status ?? 'active';
    this.eTier = t.tier ?? 'starter'; this.eIso = t.isolation_mode ?? 'shared_db';
  }
  cancelEdit(): void { this.editId.set(null); }
  async save(t: TenantRow): Promise<void> {
    const r = await this.api.patchTenant(t.id, {
      name: this.eName, status: this.eStatus, tier: this.eTier, isolation_mode: this.eIso,
    });
    if (r.ok) { this.editId.set(null); void this.reload(); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async archive(t: TenantRow): Promise<void> {
    const r = await this.api.archiveTenant(t.id);
    if (r.ok) void this.reload();
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
