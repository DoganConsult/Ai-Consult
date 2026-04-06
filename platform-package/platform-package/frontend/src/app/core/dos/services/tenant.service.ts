import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface ProvisioningJob {
  id: string;
  tenantId: string;
  tenantCode: string;
  status: string;
  stages: any[];
  startedAt: string;
  completedAt?: string;
  error?: string;
  [key: string]: any;
}

export interface SchemaStatus {
  tenantId: string;
  schemaName: string;
  migrationsApplied: number;
  migrationsAvailable: number;
  isDrifted: boolean;
  lastMigration?: string;
  [key: string]: any;
}

export interface SchemaDrift {
  hasDrift: boolean;
  tenants: Array<{ tenantId: string; missing: string[]; extra: string[] }>;
}

export interface SchemaHealthGate {
  passed: boolean;
  checks: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class TenantService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getProvisioningJobs(): Observable<ProvisioningJob[]> {
    return this.http.get<ProvisioningJob[]>(`${this.base}/provisioning/jobs`);
  }

  seedBaseline(payload: { tenantCode: string; adminEmail: string; adminPassword?: string }): Observable<ProvisioningJob> {
    return this.http.post<ProvisioningJob>(`${this.base}/provisioning/seed-baseline`, payload);
  }

  getJobStatus(jobId: string): Observable<ProvisioningJob> {
    return this.http.get<ProvisioningJob>(`${this.base}/provisioning/jobs/${jobId}/status`);
  }

  retryJob(jobId: string): Observable<any> {
    return this.http.post(`${this.base}/provisioning/jobs/${jobId}/retry`, {});
  }

  retryJobStage(jobId: string, stage: string): Observable<any> {
    return this.http.post(`${this.base}/provisioning/jobs/${jobId}/retry-stage`, { stage });
  }

  getSchemaStatus(): Observable<SchemaStatus[]> {
    return this.http.get<SchemaStatus[]>(`${this.base}/platform/schema/status`);
  }

  getTenantSchemaStatus(tenantId: string): Observable<SchemaStatus> {
    return this.http.get<SchemaStatus>(`${this.base}/platform/schema/status/${tenantId}`);
  }

  getSchemaDrift(): Observable<SchemaDrift> {
    return this.http.get<SchemaDrift>(`${this.base}/platform/schema/drift`);
  }

  catchUpTenant(tenantId: string): Observable<any> {
    return this.http.post(`${this.base}/platform/schema/catch-up/${tenantId}`, {});
  }

  catchUpAll(): Observable<any> {
    return this.http.post(`${this.base}/platform/schema/catch-up`, {});
  }

  getSchemaHealthGate(): Observable<SchemaHealthGate> {
    return this.http.get<SchemaHealthGate>(`${this.base}/platform/schema/health-gate`);
  }
}
