import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'dgn-callback',
  standalone: true,
  template: `
    <div class="container">
      <div class="card">
        <h2>Signing you in…</h2>
        @if (errorMsg()) {
          <p class="muted">Login failed: {{ errorMsg() }}</p>
          <a class="btn" href="/">Return home</a>
        } @else {
          <p class="muted">Exchanging authorization code with Keycloak.</p>
        }
      </div>
    </div>
  `,
})
export class CallbackComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly errorMsg = signal<string | null>(null);

  constructor() {
    const query = new URLSearchParams(window.location.search);
    this.auth.handleCallback(query)
      .then((returnUrl) => this.router.navigateByUrl(returnUrl))
      .catch((err: Error) => this.errorMsg.set(err.message));
  }
}
