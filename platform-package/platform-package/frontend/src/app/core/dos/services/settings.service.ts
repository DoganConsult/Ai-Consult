import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface AccessContract {
  permissions: string[];
  roles: string[];
  modules: string[];
  version: string;
  [key: string]: any;
}

export interface DeadLetterEntry {
  id: string;
  queue: string;
  payload: any;
  error: string;
  failed_at: string;
  retry_count: number;
  [key: string]: any;
}

export interface DlqStats {
  totalMessages: number;
  byQueue: Record<string, number>;
  oldestMessage?: string;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getAccessContract(): Observable<AccessContract> {
    return this.http.get<AccessContract>(`${this.base}/me/access-contract`);
  }

  getAccessContractVersion(): Observable<any> {
    return this.http.get(`${this.base}/me/access-contract/version`);
  }

  getNavContract(): Observable<any> {
    return this.http.get(`${this.base}/me/access-contract/nav`);
  }

  getPermissions(): Observable<any> {
    return this.http.get(`${this.base}/me/access-contract/perms`);
  }

  getDlq(): Observable<DeadLetterEntry[]> {
    return this.http.get<DeadLetterEntry[]>(`${this.base}/dead-letter-queue`);
  }

  getDlqStats(): Observable<DlqStats> {
    return this.http.get<DlqStats>(`${this.base}/dead-letter-queue/stats`);
  }

  getTraceByCorrelationId(correlationId: string): Observable<any> {
    return this.http.get(`${this.base}/trace-correlation/by-correlation-id/${correlationId}`);
  }

  getTraceByOtel(traceId: string): Observable<any> {
    return this.http.get(`${this.base}/trace-correlation/by-otel-trace/${traceId}`);
  }

  getMyProfile(): Observable<any> {
    return this.http.get(`${this.base}/me`);
  }

  updateMyProfile(data: Record<string, any>): Observable<any> {
    return this.http.patch(`${this.base}/me`, data);
  }
}
