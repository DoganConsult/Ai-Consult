import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="not-found">
      <h1>404</h1>
      <p>Page not found</p>
      <a routerLink="/dashboard">Go to Dashboard</a>
    </div>
  `,
  styles: [`
    .not-found { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    h1 { font-size: 72px; font-weight: 800; color: var(--dos-text-muted); margin: 0; }
    p { font-size: 16px; color: var(--dos-text-muted); margin: 8px 0 24px; }
    a { color: var(--dos-primary); font-weight: 600; }
  `],
})
export class NotFoundComponent {}
