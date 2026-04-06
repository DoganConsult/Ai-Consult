import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { PlatformAuthService } from '../../core/dauth/services/platform-auth.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InputTextModule, PasswordModule, ButtonModule, CheckboxModule, MessageModule],
  template: `
    <div class="login-page">
      <div class="login-left">
        <div class="brand-block">
          <div class="brand-logo">
            <i class="pi pi-shield" style="font-size: 36px"></i>
          </div>
          <h1>Dogan-AI-OS</h1>
          <p>Enterprise Platform Administration</p>
          <div class="brand-features">
            <div class="feature"><i class="pi pi-verified"></i><span>Multi-Tenant Identity</span></div>
            <div class="feature"><i class="pi pi-server"></i><span>Provisioning & Schema Governance</span></div>
            <div class="feature"><i class="pi pi-chart-line"></i><span>Observability & Health Monitoring</span></div>
            <div class="feature"><i class="pi pi-lock"></i><span>DAuth Access Control</span></div>
          </div>
        </div>
      </div>
      <div class="login-right">
        <div class="login-card">
          <h2>Platform Sign In</h2>
          <p class="subtitle">Enter your credentials to access the administration console</p>
          <form (ngSubmit)="onSubmit()" class="login-form">
            <div class="field">
              <label for="email">Email Address</label>
              <input pInputText id="email" type="email" [(ngModel)]="email" name="email" autocomplete="email" placeholder="admin&#64;dogan-ai.com" class="w-full" required />
            </div>
            <div class="field">
              <label for="password">Password</label>
              <p-password id="password" [(ngModel)]="password" name="password" [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" autocomplete="current-password" placeholder="Enter password" />
            </div>
            <div class="field-row">
              <p-checkbox [(ngModel)]="rememberMe" name="rememberMe" [binary]="true" label="Remember me" />
              <a routerLink="/forgot-password" class="forgot-link">Forgot password?</a>
            </div>
            @if (error()) {
              <p-message severity="error" [text]="error()" styleClass="w-full" />
            }
            <p-button type="submit" label="Sign In" icon="pi pi-sign-in" [loading]="loading()" styleClass="w-full" />
          </form>
          <div class="login-footer">
            <span>DOS Platform R1.5</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page { display: flex; min-height: 100vh; }
    .login-left {
      flex: 1; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      display: flex; align-items: center; justify-content: center; padding: 48px;
    }
    .brand-block { color: #f8fafc; max-width: 420px; }
    .brand-logo { margin-bottom: 16px; opacity: 0.9; }
    .brand-block h1 { font-size: 32px; font-weight: 800; letter-spacing: -0.03em; margin: 0 0 8px; }
    .brand-block > p { font-size: 16px; color: #94a3b8; margin: 0 0 40px; }
    .brand-features { display: flex; flex-direction: column; gap: 16px; }
    .feature { display: flex; align-items: center; gap: 12px; font-size: 14px; color: #cbd5e1; }
    .feature i { font-size: 18px; color: #60a5fa; width: 24px; text-align: center; }
    .login-right {
      flex: 1; display: flex; align-items: center; justify-content: center;
      padding: 48px; background: var(--dos-bg);
    }
    .login-card { width: 100%; max-width: 420px; }
    h2 { font-size: 24px; font-weight: 700; color: var(--dos-text); margin: 0 0 4px; }
    .subtitle { font-size: 14px; color: var(--dos-text-muted); margin: 0 0 32px; }
    .login-form { display: flex; flex-direction: column; gap: 20px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 13px; font-weight: 600; color: #475569; }
    .field-row { display: flex; justify-content: space-between; align-items: center; }
    .forgot-link { font-size: 13px; color: var(--dos-primary); }
    .login-footer { margin-top: 32px; text-align: center; font-size: 12px; color: var(--dos-text-muted); }
    .w-full { width: 100%; }
    @media (max-width: 768px) {
      .login-page { flex-direction: column; }
      .login-left { padding: 32px; min-height: auto; }
      .brand-features { display: none; }
      .login-right { padding: 24px; }
    }
  `],
})
export class LoginComponent {
  private auth = inject(PlatformAuthService);
  private router = inject(Router);

  email = '';
  password = '';
  rememberMe = false;
  error = signal('');
  loading = signal(false);

  async onSubmit(): Promise<void> {
    this.error.set('');
    if (!this.email || !this.password) {
      this.error.set('Email and password are required');
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.login(this.email, this.password);
      this.router.navigateByUrl('/overview');
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Invalid email or password');
    } finally {
      this.loading.set(false);
    }
  }
}
