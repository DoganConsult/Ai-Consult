import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface DnocHealth {
  ts: string;
  prometheus: boolean;
  alertmanager: boolean;
  database: { up: boolean; latencyMs: number };
  services: Array<{ name: string; instance?: string; status: string }>;
}

export interface SecurityAlert {
  id: number | string;
  ts: string;
  tenant_id?: string;
  user_id?: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical' | string;
  source: string;
  category: string;
  title: string;
  detail: Record<string, unknown>;
  event_id?: string;
  status: 'open' | 'ack' | 'resolved' | 'suppressed' | string;
  acked_by?: string;
  acked_at?: string;
}

export interface AuditEvent {
  id: number | string;
  ts: string;
  tenant_id?: string;
  user_id?: string;
  action: string;
  target: string;
  status_code?: number;
  client_ip?: string;
  request_id?: string;
  meta?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class PillarsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/pillars`;

  // DNOC
  dnocHealth(): Observable<DnocHealth> { return this.http.get<DnocHealth>(`${this.base}/dnoc/health`); }
  dnocSlo(): Observable<any> { return this.http.get<any>(`${this.base}/dnoc/slo`); }
  dnocAlerts(): Observable<{ alerts: any[]; source: string }> { return this.http.get<any>(`${this.base}/dnoc/alerts`); }
  dnocRunbooks(): Observable<{ runbooks: Array<{ name: string; path: string }> }> {
    return this.http.get<any>(`${this.base}/dnoc/runbooks`);
  }

  // DSOC
  dsocAlerts(params?: { severity?: string; status?: string }): Observable<{ alerts: SecurityAlert[] }> {
    let qs = '';
    if (params) {
      const p = new URLSearchParams();
      if (params.severity) p.set('severity', params.severity);
      if (params.status) p.set('status', params.status);
      qs = p.toString() ? `?${p.toString()}` : '';
    }
    return this.http.get<any>(`${this.base}/dsoc/alerts${qs}`);
  }
  dsocSummary(): Observable<{ buckets: Array<{ severity: string; status: string; n: number }> }> {
    return this.http.get<any>(`${this.base}/dsoc/alerts/summary`);
  }
  dsocAck(id: string | number): Observable<any> { return this.http.post(`${this.base}/dsoc/alerts/${id}/ack`, {}); }
  dsocResolve(id: string | number): Observable<any> { return this.http.post(`${this.base}/dsoc/alerts/${id}/resolve`, {}); }
  dsocSuppress(id: string | number): Observable<any> { return this.http.post(`${this.base}/dsoc/alerts/${id}/suppress`, {}); }
  dsocAudit(q?: string): Observable<{ events: AuditEvent[] }> {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    return this.http.get<any>(`${this.base}/dsoc/audit${qs}`);
  }
  dsocChainVerify(): Observable<any> { return this.http.get<any>(`${this.base}/dsoc/chain/verify`); }

  // DAuth
  dauthSessions(): Observable<{ sessions: any[]; note?: string }> { return this.http.get<any>(`${this.base}/dauth/sessions`); }
  dauthRevokeSession(id: string): Observable<any> { return this.http.post(`${this.base}/dauth/sessions/${id}/revoke`, {}); }
  dauthJit(): Observable<{ elevations: any[]; note?: string }> { return this.http.get<any>(`${this.base}/dauth/jit/active`); }
  dauthSod(): Observable<{ blocks: any[] }> { return this.http.get<any>(`${this.base}/dauth/sod/blocked`); }
  dauthRisk(): Observable<{ score: number; band: string; open_high: number; last_24h: number; last_1h: number }> {
    return this.http.get<any>(`${this.base}/dauth/risk/score`);
  }

  // DOS
  dosOverview(): Observable<any> { return this.http.get<any>(`${this.base}/dos/overview`); }
  dosTenants(): Observable<{ tenants: any[] }> { return this.http.get<any>(`${this.base}/dos/tenants`); }
  dosModules(): Observable<{ modules: any[] }> { return this.http.get<any>(`${this.base}/dos/modules`); }
  dosProducts(): Observable<{ products: any[] }> { return this.http.get<any>(`${this.base}/dos/products`); }
  dosRuntime(): Observable<any> { return this.http.get<any>(`${this.base}/dos/runtime`); }
}
