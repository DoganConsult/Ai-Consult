import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { environment } from '@env/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InputTextModule, ButtonModule, MessageModule],
  template: `
    <div class="fp-page">
      <div class="fp-left">
        <div class="brand-block">
          <i class="pi pi-shield" style="font-size: 36px"></i>
          <h1>Dogan-AI-OS</h1>
          <p>Password Recovery</p>
        </div>
      </div>
      <div class="fp-right">
        <div class="fp-card">
          @if (sent()) {
            <div class="sent-block">
              <i class="pi pi-envelope" style="font-size: 48px; color: var(--dos-primary)"></i>
              <h2>Check Your Email</h2>
              <p>If an account exists for <strong>{{ email }}</strong>, a password reset link has been sent.</p>
              <p-button label="Back to Login" icon="pi pi-arrow-left" routerLink="/login" styleClass="w-full" [outlined]="true" />
            </div>
          } @else {
            <h2>Reset Password</h2>
            <p class="subtitle">Enter your email address and we'll send you a reset link</p>
            <form (ngSubmit)="onSubmit()" class="fp-form">
              <div class="field">
                <label for="email">Email Address</label>
                <input pInputText id="email" type="email" [(ngModel)]="email" name="email" autocomplete="email" placeholder="admin&#64;dogan-ai.com" class="w-full" required />
              </div>
              @if (error()) {
                <p-message severity="error" [text]="error()" styleClass="w-full" />
              }
              <p-button type="submit" label="Send Reset Link" icon="pi pi-send" [loading]="loading()" styleClass="w-full" />
              <div class="back-link">
                <a routerLink="/login"><i class="pi pi-arrow-left"></i> Back to login</a>
              </div>
            </form>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fp-page { display: flex; min-height: 100vh; }
    .fp-left {
      flex: 0 0 400px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      display: flex; align-items: center; justify-content: center; padding: 48px;
    }
    .brand-block { color: #f8fafc; }
    .brand-block h1 { font-size: 28px; font-weight: 800; margin: 16px 0 8px; }
    .brand-block > p { font-size: 14px; color: #94a3b8; }
    .fp-right {
      flex: 1; display: flex; align-items: center; justify-content: center;
      padding: 48px; background: var(--dos-bg);
    }
    .fp-card { width: 100%; max-width: 420px; }
    h2 { font-size: 24px; font-weight: 700; color: var(--dos-text); margin: 0 0 4px; }
    .subtitle { font-size: 14px; color: var(--dos-text-muted); margin: 0 0 28px; }
    .fp-form { display: flex; flex-direction: column; gap: 20px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 13px; font-weight: 600; color: #475569; }
    .back-link { text-align: center; }
    .back-link a { font-size: 13px; color: var(--dos-primary); display: inline-flex; align-items: center; gap: 6px; }
    .sent-block { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; padding: 40px 0; }
    .sent-block p { color: var(--dos-text-muted); max-width: 340px; line-height: 1.5; }
    .w-full { width: 100%; }
    @media (max-width: 768px) {
      .fp-page { flex-direction: column; }
      .fp-left { flex: none; padding: 24px; }
      .fp-right { padding: 24px; }
    }
  `],
})
export class ForgotPasswordComponent {
  private http = inject(HttpClient);

  email = '';
  error = signal('');
  loading = signal(false);
  sent = signal(false);

  onSubmit(): void {
    this.error.set('');
    if (!this.email) {
      this.error.set('Email is required');
      return;
    }
    this.loading.set(true);
    this.http.post(`${environment.apiUrl}/auth/forgot-password`, { email: this.email }).subscribe({
      next: () => {
        this.sent.set(true);
        this.loading.set(false);
      },
      error: () => {
        this.sent.set(true);
        this.loading.set(false);
      },
    });
  }
}
