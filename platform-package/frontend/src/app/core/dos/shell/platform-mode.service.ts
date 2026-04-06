import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PlatformModeService {
  private _mode = signal<'standalone' | 'saas' | 'on-prem'>('standalone');

  readonly mode = this._mode.asReadonly();

  setMode(mode: 'standalone' | 'saas' | 'on-prem'): void {
    this._mode.set(mode);
  }
}
