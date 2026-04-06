import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface PlatformJob {
  name: string;
  schedule?: string;
  lastRun?: string;
  nextRun?: string;
  status: string;
  isRunning?: boolean;
  [key: string]: any;
}

export interface JobHistoryEntry {
  name: string;
  startedAt: string;
  completedAt?: string;
  status: string;
  duration_ms?: number;
  error?: string;
  [key: string]: any;
}

export interface EventDlqEntry {
  id: string;
  event_type: string;
  payload: any;
  error: string;
  failed_at: string;
  retry_count: number;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class JobsService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  listJobs(): Observable<PlatformJob[]> {
    return this.http.get<PlatformJob[]>(`${this.base}/platform/jobs`);
  }

  getJobHistory(name: string, limit = 50): Observable<JobHistoryEntry[]> {
    return this.http.get<JobHistoryEntry[]>(`${this.base}/platform/jobs/${name}/history`, { params: { limit: limit.toString() } });
  }

  triggerJob(name: string): Observable<any> {
    return this.http.post(`${this.base}/platform/jobs/${name}/trigger`, {});
  }

  getEventDlq(): Observable<EventDlqEntry[]> {
    return this.http.get<EventDlqEntry[]>(`${this.base}/platform/event-dlq`);
  }

  retryEventDlq(id: string): Observable<any> {
    return this.http.post(`${this.base}/platform/event-dlq/${id}/retry`, {});
  }

  getRuntimeHealth(): Observable<any> {
    return this.http.get(`${this.base}/platform/runtime-health/health`);
  }

  getModuleHealth(moduleCode: string): Observable<any> {
    return this.http.get(`${this.base}/platform/runtime-health/health/${moduleCode}`);
  }

  getServiceHealth(): Observable<any> {
    return this.http.get(`${this.base}/platform/service-health`);
  }
}
