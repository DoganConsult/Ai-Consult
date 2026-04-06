import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="badge" [ngClass]="'badge--' + severity">{{ label }}</span>`,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.5;
    }
    .badge--success { background: #dcfce7; color: #166534; }
    .badge--danger { background: #fee2e2; color: #991b1b; }
    .badge--warning { background: #fef3c7; color: #92400e; }
    .badge--info { background: #dbeafe; color: #1e40af; }
    .badge--neutral { background: #f1f5f9; color: #475569; }
  `],
})
export class StatusBadgeComponent {
  @Input() label = '';
  @Input() severity: 'success' | 'danger' | 'warning' | 'info' | 'neutral' = 'neutral';
}
