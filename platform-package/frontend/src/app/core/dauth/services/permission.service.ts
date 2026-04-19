import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';

export interface UserAccessSnapshot {
  userId: string;
  profiles: Array<{ code: string; name: string; [k: string]: any }>;
  roles: Array<{ code: string; [k: string]: any }>;
  delegations: any[];
  permissions: string[];
  isSuperAdmin: boolean;
}

/**
 * Permission-driven access control. Loads the current user's permissions
 * from the backend and exposes reactive checks used by guards, menus,
 * and component-level visibility.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/platform/admin`;

  private _snapshot = signal<UserAccessSnapshot | null>(null);
  private _loaded = signal(false);

  readonly snapshot = this._snapshot.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly permissions = computed(() => this._snapshot()?.permissions ?? []);
  readonly isSuperAdmin = computed(() => !!this._snapshot()?.isSuperAdmin);
  readonly profileCodes = computed(() => (this._snapshot()?.profiles ?? []).map(p => p.code));

  async load(): Promise<void> {
    try {
      const snap = await firstValueFrom(
        this.http.get<UserAccessSnapshot>(`${this.base}/user-access/me`)
      );
      this._snapshot.set(snap);
    } catch {
      this._snapshot.set(null);
    } finally {
      this._loaded.set(true);
    }
  }

  clear(): void {
    this._snapshot.set(null);
    this._loaded.set(false);
  }

  /** True if the user has any of the given permission codes (or is super admin). */
  hasAny(codes: string[] | undefined | null): boolean {
    if (!codes || codes.length === 0) return true;
    if (this.isSuperAdmin()) return true;
    const have = new Set(this.permissions());
    return codes.some(c => have.has(c));
  }

  /** True if the user has all of the given permission codes (or is super admin). */
  hasAll(codes: string[]): boolean {
    if (!codes || codes.length === 0) return true;
    if (this.isSuperAdmin()) return true;
    const have = new Set(this.permissions());
    return codes.every(c => have.has(c));
  }

  has(code: string): boolean {
    return this.hasAny([code]);
  }

  hasProfile(code: string): boolean {
    return this.profileCodes().includes(code);
  }
}
