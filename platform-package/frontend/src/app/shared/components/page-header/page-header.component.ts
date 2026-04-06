import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <h1>{{ title }}</h1>
      <p *ngIf="subtitle" class="subtitle">{{ subtitle }}</p>
    </div>
  `,
  styles: [`
    .page-header { padding: 24px 0 16px; }
    h1 { font-size: 22px; font-weight: 700; color: var(--dos-text); margin: 0; }
    .subtitle { font-size: 14px; color: var(--dos-text-muted); margin-top: 4px; }
  `],
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
}
