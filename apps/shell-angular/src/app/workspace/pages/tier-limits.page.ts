import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, TierRow } from '../admin-api.service';

interface Editable extends TierRow { _featuresJson: string; }

@Component({
  selector: 'dgn-tier-limits',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-h">Tier limits</h1>
    <p class="page-sub">Edit per-tier quotas and feature switches. Requires <code>platform_admin</code>.</p>

    <div class="panel">
      <div class="toolbar">
        <h3 style="margin:0">Tiers</h3>
        <button class="btn-mini" type="button" (click)="reload()">Refresh</button>
      </div>
      @if (rows().length === 0) { <div class="empty">No tier rows.</div> }
      @else {
        <table>
          <thead><tr>
            <th>tier</th><th>max_users</th><th>max_api_keys</th><th>max_sessions</th>
            <th>allow_dedicated</th><th>features (JSON)</th><th></th>
          </tr></thead>
          <tbody>
            @for (t of rows(); track t.tier) {
              <tr>
                <td><code>{{ t.tier }}</code></td>
                <td><input type="number" [(ngModel)]="t.max_users" style="width:7rem"/></td>
                <td><input type="number" [(ngModel)]="t.max_api_keys" style="width:7rem"/></td>
                <td><input type="number" [(ngModel)]="t.max_sessions" style="width:8rem"/></td>
                <td>
                  <select [(ngModel)]="t.allow_dedicated">
                    <option [ngValue]="true">true</option><option [ngValue]="false">false</option>
                  </select>
                </td>
                <td><textarea [(ngModel)]="t._featuresJson" rows="3" style="width:100%"></textarea></td>
                <td><button class="btn-pri" type="button" (click)="save(t)">Save</button></td>
              </tr>
            }
          </tbody>
        </table>
      }
      @if (msg()) { <div class="ok" style="margin-top:.75rem">{{ msg() }}</div> }
      @if (err()) { <div class="err" style="margin-top:.75rem">{{ err() }}</div> }
    </div>
  `,
})
export class TierLimitsPage implements OnInit {
  private readonly api = inject(AdminApiService);
  readonly rows = signal<Editable[]>([]);
  readonly msg = signal<string | null>(null);
  readonly err = signal<string | null>(null);

  ngOnInit(): void { void this.reload(); }

  async reload(): Promise<void> {
    const r = await this.api.listTierLimits();
    if (r.ok && r.data) {
      this.rows.set(r.data.tiers.map((t) => ({ ...t, _featuresJson: JSON.stringify(t.features, null, 2) })));
      this.err.set(null);
    } else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async save(t: Editable): Promise<void> {
    let features: Record<string, unknown>;
    try { features = JSON.parse(t._featuresJson); }
    catch (e) { this.err.set('invalid features JSON: ' + (e as Error).message); return; }
    const r = await this.api.putTierLimit(t.tier, {
      max_users: Number(t.max_users), max_api_keys: Number(t.max_api_keys),
      max_sessions: Number(t.max_sessions), allow_dedicated: Boolean(t.allow_dedicated),
      features,
    });
    if (r.ok) { this.msg.set(`saved · ${t.tier}`); this.err.set(null); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
