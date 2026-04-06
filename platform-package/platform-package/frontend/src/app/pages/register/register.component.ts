import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { environment } from '@env/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InputTextModule, PasswordModule, ButtonModule, MessageModule],
  template: `
    <div class="register-page">
      <div class="register-left">
        <div class="brand-block">
          <i class="pi pi-shield" style="font-size: 36px"></i>
          <h1>Dogan-AI-OS</h1>
          <p>Create your platform administrator account</p>
        </div>
      </div>
      <div class="register-right">
        <div class="register-card">
          @if (success()) {
            <div class="success-block">
              <i class="pi pi-check-circle" style="font-size: 48px; color: var(--dos-success)"></i>
              <h2>Account Created</h2>
              <p>Your account has been registered. Check your email for verification instructions.</p>
              <p-button label="Go to Login" icon="pi pi-sign-in" routerLink="/login" styleClass="w-full" />
            </div>
          } @else {
            <h2>Create Account</h2>
            <p class="subtitle">Register a new platform administrator</p>
            <form (ngSubmit)="onSubmit()" class="register-form">
              <div class="field-row-2">
                <div class="field">
                  <label for="firstName">First Name</label>
                  <input pInputText id="firstName" [(ngModel)]="firstName" name="firstName" placeholder="First name" required />
                </div>
                <div class="field">
                  <label for="lastName">Last Name</label>
                  <input pInputText id="lastName" [(ngModel)]="lastName" name="lastName" placeholder="Last name" required />
                </div>
              </div>
              <div class="field">
                <label for="email">Email Address</label>
                <input pInputText id="email" type="email" [(ngModel)]="email" name="email" autocomplete="email" placeholder="admin&#64;dogan-ai.com" class="w-full" required />
              </div>
              <div class="field">
                <label for="password">Password</label>
                <p-password id="password" [(ngModel)]="password" name="password" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" placeholder="Min 8 chars, 1 uppercase, 1 number" />
              </div>
              <div class="field">
                <label for="confirmPassword">Confirm Password</label>
                <p-password id="confirmPassword" [(ngModel)]="confirmPassword" name="confirmPassword" [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" placeholder="Confirm password" />
              </div>
              @if (error()) {
                <p-message severity="error" [text]="error()" styleClass="w-full" />
              }
              <p-button type="submit" label="Create Account" icon="pi pi-user-plus" [loading]="loading()" styleClass="w-full" />
              <div class="login-link">
                <span>Already have an account?</span>
                <a routerLink="/login">Sign in</a>
              </div>
            </form>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .register-page { display: flex; min-height: 100vh; }
    .register-left {
      flex: 0 0 400px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      display: flex; align-items: center; justify-content: center; padding: 48px;
    }
    .brand-block { color: #f8fafc; }
    .brand-block h1 { font-size: 28px; font-weight: 800; margin: 16px 0 8px; }
    .brand-block > p { font-size: 14px; color: #94a3b8; }
    .register-right {
      flex: 1; display: flex; align-items: center; justify-content: center;
      padding: 48px; background: var(--dos-bg);
    }
    .register-card { width: 100%; max-width: 480px; }
    h2 { font-size: 24px; font-weight: 700; color: var(--dos-text); margin: 0 0 4px; }
    .subtitle { font-size: 14px; color: var(--dos-text-muted); margin: 0 0 28px; }
    .register-form { display: flex; flex-direction: column; gap: 18px; }
    .field { display: flex; flex-direction: column; gap: 6px; flex: 1; }
    .field label { font-size: 13px; font-weight: 600; color: #475569; }
    .field-row-2 { display: flex; gap: 12px; }
    .login-link { text-align: center; font-size: 13px; color: var(--dos-text-muted); }
    .login-link a { color: var(--dos-primary); margin-left: 4px; }
    .success-block { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; padding: 40px 0; }
    .success-block p { color: var(--dos-text-muted); max-width: 320px; }
    .w-full { width: 100%; }
    @media (max-width: 768px) {
      .register-page { flex-direction: column; }
      .register-left { flex: none; padding: 24px; }
      .register-right { padding: 24px; }
      .field-row-2 { flex-direction: column; gap: 18px; }
    }
  `],
})
export class RegisterComponent {
  private http = inject(HttpClient);

  firstName = '';
  lastName = '';
  email = '';
  password = '';
  confirmPassword = '';
  error = signal('');
  loading = signal(false);
  success = signal(false);

  onSubmit(): void {
    this.error.set('');
    if (!this.firstName || !this.lastName || !this.email || !this.password) {
      this.error.set('All fields are required');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }
    if (this.password.length < 8) {
      this.error.set('Password must be at least 8 characters');
      return;
    }
    this.loading.set(true);
    this.http.post(`${environment.apiUrl}/auth/register`, {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      password: this.password,
    }).subscribe({
      next: () => {
        this.success.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Registration failed');
        this.loading.set(false);
      },
    });
  }
}
