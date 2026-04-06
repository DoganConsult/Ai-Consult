import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '@env/environment';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable({ providedIn: 'root' })
export class PlatformAuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _loggedIn = signal(false);
  private _token = signal<string | null>(null);

  readonly isLoggedIn = this._loggedIn.asReadonly();

  get token(): string | null {
    return this._token();
  }

  async init(): Promise<void> {
    const stored = this.getStoredToken();
    if (stored) {
      this._token.set(stored);
      this._loggedIn.set(true);
    }
  }

  login(email: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.post<AuthTokens>(`${environment.apiUrl}/auth/login`, { email, password })
        .subscribe({
          next: (res) => {
            this._token.set(res.accessToken);
            this._loggedIn.set(true);
            this.storeToken(res.accessToken);
            resolve();
          },
          error: reject,
        });
    });
  }

  logout(): void {
    this._token.set(null);
    this._loggedIn.set(false);
    this.clearToken();
    this.router.navigateByUrl('/login');
  }

  scheduleTokenRefresh(): void {
    // placeholder for token refresh scheduling
  }

  refreshIfExpiringSoon(): void {
    // placeholder for proactive refresh
  }

  private getStoredToken(): string | null {
    try { return localStorage.getItem('dos_access_token'); } catch { return null; }
  }

  private storeToken(token: string): void {
    try { localStorage.setItem('dos_access_token', token); } catch { /* unavailable */ }
  }

  private clearToken(): void {
    try { localStorage.removeItem('dos_access_token'); } catch { /* unavailable */ }
  }
}
