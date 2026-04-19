import { Component, Input, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DynamicTableSpec } from '../services/lowcode.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-dynamic-table',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule],
  template: `
    @if (spec(); as s) {
      <p-table [value]="data()" [rows]="30" [paginator]="data().length > 30" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
        <ng-template #header>
          <tr>
            @for (c of s.columns; track c.key) { <th [style.width]="c.width || null">{{ c.label }}</th> }
          </tr>
        </ng-template>
        <ng-template #body let-row>
          <tr>
            @for (c of s.columns; track c.key) {
              <td [ngSwitch]="c.format">
                <span *ngSwitchCase="'date'" class="mono small">{{ row[c.key] ? (row[c.key] | date:'short') : '--' }}</span>
                <pre *ngSwitchCase="'json'" class="json">{{ stringify(row[c.key]) }}</pre>
                <p-tag *ngSwitchCase="'tag'" [value]="row[c.key] || '--'" severity="info" />
                <span *ngSwitchDefault>{{ row[c.key] }}</span>
              </td>
            }
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr><td [attr.colspan]="s.columns.length" class="empty-msg">No rows</td></tr>
        </ng-template>
      </p-table>
    }
  `,
  styles: [`
    .mono { font-family: monospace; } .small { font-size: 12px; }
    .json { margin: 0; font-family: monospace; font-size: 11px; white-space: pre-wrap; max-width: 400px; max-height: 100px; overflow: auto; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
  `],
})
export class DynamicTableComponent {
  private _spec = signal<DynamicTableSpec | null>(null);
  private _data = signal<any[]>([]);

  @Input() set tableSpec(v: DynamicTableSpec | null | undefined) { this._spec.set(v ?? null); }
  @Input() set rows(v: any[] | null | undefined) { this._data.set(Array.isArray(v) ? v : []); }

  spec = this._spec.asReadonly();
  data = this._data.asReadonly();

  stringify(v: any): string { try { return typeof v === 'string' ? v : JSON.stringify(v, null, 2); } catch { return String(v); } }
}
