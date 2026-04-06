import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface TenantConfig {
  [key: string]: any;
}

export interface ConfigHistoryEntry {
  version: number;
  changed_by: string;
  changed_at: string;
  diff?: any;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class TenantConfigService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenant`;

  getConfig(): Observable<TenantConfig> {
    return this.http.get<TenantConfig>(`${this.base}/config`);
  }

  updateConfig(data: Record<string, any>): Observable<any> {
    return this.http.patch(`${this.base}/config`, data);
  }

  getConfigHistory(): Observable<ConfigHistoryEntry[]> {
    return this.http.get<ConfigHistoryEntry[]>(`${this.base}/config/history`);
  }

  rollbackConfig(version: number): Observable<any> {
    return this.http.post(`${this.base}/config/rollback/${version}`, {});
  }

  getMutationHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/history`);
  }

  getRaci(): Observable<any> {
    return this.http.get(`${this.base}/raci`);
  }
}
