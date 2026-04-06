import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface HealthResponse {
  status: string;
  version: string;
  uptime: number;
  timestamp: string;
  memory: { heapUsedMB: number; heapTotalMB: number; rssMB: number };
  [key: string]: any;
}

export interface DeepHealthResponse {
  status: string;
  checks: Record<string, { status: string; latency_ms?: number; message?: string; [key: string]: any }>;
  [key: string]: any;
}

export interface WorkflowHealthResponse {
  status: string;
  activeExecutions: number;
  pendingSteps: number;
  dlqCount: number;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class HealthService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.base}/health`);
  }

  getDeepHealth(): Observable<DeepHealthResponse> {
    return this.http.get<DeepHealthResponse>(`${this.base}/health/deep`);
  }

  getReadiness(): Observable<any> {
    return this.http.get(`${this.base}/health/ready`);
  }

  getLiveness(): Observable<any> {
    return this.http.get(`${this.base}/health/live`);
  }

  getMetrics(): Observable<any> {
    return this.http.get(`${this.base}/metrics`);
  }

  getCacheHealth(): Observable<any> {
    return this.http.get(`${this.base}/health/cache`);
  }

  getMemoryTrend(): Observable<any> {
    return this.http.get(`${this.base}/health/memory-trend`);
  }

  getWorkflowHealth(): Observable<WorkflowHealthResponse> {
    return this.http.get<WorkflowHealthResponse>(`${this.base}/health/workflow`);
  }

  getDlqStats(): Observable<any> {
    return this.http.get(`${this.base}/health/workflow/dlq`);
  }

  getErrorSummary(): Observable<any> {
    return this.http.get(`${this.base}/errors/summary`);
  }

  getRecentErrors(): Observable<any> {
    return this.http.get(`${this.base}/errors/recent`);
  }

  getComplianceHealth(): Observable<any> {
    return this.http.get(`${this.base}/health/compliance`);
  }

  getAiDiagnostics(): Observable<any> {
    return this.http.get(`${this.base}/health/ai-os-diagnostics`);
  }

  getPreflight(): Observable<any> {
    return this.http.get(`${this.base}/preflight`);
  }
}
