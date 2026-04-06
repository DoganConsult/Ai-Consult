import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class RbacService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  explainAuthz(params: { actorId?: string; permission?: string }): Observable<any> {
    return this.http.get(`${this.base}/authz/explain/check`, { params: params as any });
  }

  getPermissionTree(): Observable<any> {
    return this.http.get(`${this.base}/authz/permissions/tree`);
  }

  getAccessProfiles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/identity/access-profiles`);
  }

  getFunctionalRoles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/identity/functional-roles`);
  }
}
