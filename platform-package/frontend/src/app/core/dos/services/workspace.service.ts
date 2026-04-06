import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface Workspace {
  id: string;
  name: string;
  code: string;
  status: string;
  mode?: string;
  created_at: string;
  [key: string]: any;
}

export interface WorkspaceHome {
  workspace: Workspace;
  recentActivity?: any[];
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list(): Observable<Workspace[]> {
    return this.http.get<Workspace[]>(`${this.base}/workspaces`);
  }

  create(payload: { name: string; code?: string }): Observable<Workspace> {
    return this.http.post<Workspace>(`${this.base}/workspaces`, payload);
  }

  activate(payload: { workspaceId: string }): Observable<any> {
    return this.http.post(`${this.base}/workspaces/activate`, payload);
  }

  update(id: string, payload: Record<string, any>): Observable<Workspace> {
    return this.http.put<Workspace>(`${this.base}/workspaces/${id}`, payload);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.base}/workspaces/${id}`);
  }

  getScopes(id: string): Observable<any> {
    return this.http.get(`${this.base}/workspaces/${id}/scopes`);
  }

  getHome(): Observable<WorkspaceHome> {
    return this.http.get<WorkspaceHome>(`${this.base}/workspace/home`);
  }

  getRecentActivity(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/workspace/home/recent-activity`);
  }
}
