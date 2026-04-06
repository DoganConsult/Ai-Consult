import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private _offline = signal(typeof navigator !== 'undefined' && !navigator.onLine);

  readonly isOffline = this._offline.asReadonly();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this._offline.set(false));
      window.addEventListener('offline', () => this._offline.set(true));
    }
  }
}
