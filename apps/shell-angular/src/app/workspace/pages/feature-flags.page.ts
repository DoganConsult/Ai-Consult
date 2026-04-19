import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, FeatureFlagRow } from '../admin-api.service';

@Component({
  selector: 'dgn-feature-flags',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-h">Feature flags</h1>
    <p class="page-sub">Per-tenant or platform-wide feature flag with rollout %, owner, default, and removal date.</p>

    <div class="panel">
      <h3>Upsert flag</h3>
      <div class="grid2">
        <div class="field"><label>scope</label>
          <select [(ngModel)]="cScope">
            <option value="tenant">tenant</option>
            <option value="platform">platform</option>
          </select>
        </div>
        <div class="field"><label>code</label><input [(ngModel)]="cCode" placeholder="dauth.passkeys"/></div>
        <div class="field"><label>enabled</label>
          <select [(ngModel)]="cEnabled">
            <option [ngValue]="true">true</option><option [ngValue]="false">false</option>
          </select>
        </div>
        <div class="field"><label>rollout_percent</label><input type="number" [(ngModel)]="cRollout" min="0" max="100"/></div>
        <div class="field"><label>owner</label><input [(ngModel)]="cOwner" placeholder="dauth-team"/></div>
        <div class="field"><label>default_value</label>
          <select [(ngModel)]="cDefault">
            <option [ngValue]="true">true</option><option [ngValue]="false">false</option>
          </select>
        </div>
        <div class="field"><label>remove_after (YYYY-MM-DD)</label><input [(ngModel)]="cRemoveAfter"/></div>
        <div class="field"><label>description</label><input [(ngModel)]="cDesc"/></div>
      </div>
      <div class="actions">
        <button class="btn-pri" type="button" [disabled]="busy()" (click)="upsert()">Upsert</button>
      </div>
      @if (msg()) { <div class="ok" style="margin-top:.75rem">{{ msg() }}</div> }
      @if (err()) { <div class="err" style="margin-top:.75rem">{{ err() }}</div> }
    </div>

    <div class="panel">
      <div class="toolbar">
        <h3 style="margin:0">Flags</h3>
        <div>
          <select [(ngModel)]="filterScope" (change)="reload()">
            <option value="">all</option>
            <option value="platform">platform</option>
            <option value="tenant">tenant</option>
          </select>
          <button class="btn-mini" type="button" (click)="reload()">Refresh</button>
        </div>
      </div>
      @if (rows().length === 0) { <div class="empty">No flags.</div> }
      @else {
        <table>
          <thead><tr>
            <th>tenant</th><th>code</th><th>enabled</th><th>rollout</th>
            <th>owner</th><th>default</th><th>remove_after</th><th></th>
          </tr></thead>
          <tbody>
            @for (f of rows(); track f.id) {
              <tr>
                <td><code>{{ f.tenant_id ?? 'platform' }}</code></td>
                <td><code>{{ f.code }}</code></td>
                <td><span class="badge" [class.up]="f.enabled" [class.down]="!f.enabled">{{ f.enabled }}</span></td>
                <td>{{ f.rollout_percent }}%</td>
                <td>{{ f.owner }}</td>
                <td>{{ f.default_value }}</td>
                <td>{{ f.remove_after ?? '—' }}</td>
                <td><button class="btn-dng" type="button" (click)="del(f)">Delete</button></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class FeatureFlagsPage implements OnInit {
  private readonly api = inject(AdminApiService);
  cScope: 'platform' | 'tenant' = 'tenant';
  cCode = ''; cEnabled = false; cRollout = 0; cOwner = '';
  cDefault = false; cRemoveAfter = ''; cDesc = '';
  filterScope: '' | 'platform' | 'tenant' = '';
  readonly busy = signal(false);
  readonly msg = signal<string | null>(null);
  readonly err = signal<string | null>(null);
  readonly rows = signal<FeatureFlagRow[]>([]);

  ngOnInit(): void { void this.reload(); }
  async reload(): Promise<void> {
    const r = await this.api.listFlags(this.filterScope || undefined);
    if (r.ok && r.data) { this.rows.set(r.data.flags); this.err.set(null); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async upsert(): Promise<void> {
    this.busy.set(true); this.msg.set(null); this.err.set(null);
    const r = await this.api.upsertFlag({
      scope: this.cScope, code: this.cCode.trim(), enabled: this.cEnabled,
      rollout_percent: Number(this.cRollout), owner: this.cOwner.trim(),
      default_value: this.cDefault,
      remove_after: this.cRemoveAfter.trim() || undefined,
      description: this.cDesc.trim() || undefined,
    });
    this.busy.set(false);
    if (r.ok && r.data) { this.msg.set(`id=${r.data.id}`); void this.reload(); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async del(f: FeatureFlagRow): Promise<void> {
    const r = await this.api.deleteFlag(f.id);
    if (r.ok) void this.reload();
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
