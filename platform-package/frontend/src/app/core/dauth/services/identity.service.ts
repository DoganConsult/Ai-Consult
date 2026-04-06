import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface Actor {
  actor_id: string;
  user_id?: string;
  actor_type: string;
  display_name: string;
  email?: string;
  status: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface ActorPermission {
  permission_code: string;
  source: string;
  granted_at: string;
}

export interface AccessProfile {
  profile_code: string;
  display_name: string;
  permission_count: number;
  [key: string]: any;
}

export interface FunctionalRole {
  role_code: string;
  display_name: string;
  category: string;
  [key: string]: any;
}

export interface CreateActorInput {
  display_name: string;
  email: string;
  actor_type?: string;
  [key: string]: any;
}

export interface UserWorkload {
  user_id: string;
  total_tasks: number;
  overdue: number;
  capacity_score: number;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class IdentityService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/identity`;

  listActors(params?: { actor_type?: string; status?: string; limit?: number; offset?: number }): Observable<Actor[]> {
    let hp = new HttpParams();
    if (params?.actor_type) hp = hp.set('actor_type', params.actor_type);
    if (params?.status) hp = hp.set('status', params.status);
    if (params?.limit) hp = hp.set('limit', params.limit.toString());
    if (params?.offset) hp = hp.set('offset', params.offset.toString());
    return this.http.get<Actor[]>(`${this.base}/actors`, { params: hp });
  }

  getActor(actorId: string): Observable<Actor> {
    return this.http.get<Actor>(`${this.base}/actors/${actorId}`);
  }

  createActor(input: CreateActorInput): Observable<Actor> {
    return this.http.post<Actor>(`${this.base}/actors`, input);
  }

  deleteActor(actorId: string): Observable<any> {
    return this.http.delete(`${this.base}/actors/${actorId}`);
  }

  getActorPermissions(actorId: string): Observable<ActorPermission[]> {
    return this.http.get<ActorPermission[]>(`${this.base}/actors/${actorId}/permissions`);
  }

  getAccessProfiles(): Observable<AccessProfile[]> {
    return this.http.get<AccessProfile[]>(`${this.base}/access-profiles`);
  }

  getFunctionalRoles(): Observable<FunctionalRole[]> {
    return this.http.get<FunctionalRole[]>(`${this.base}/functional-roles`);
  }

  getUserWorkload(userId: string): Observable<UserWorkload> {
    return this.http.get<UserWorkload>(`${this.base}/users/${userId}/workload`);
  }

  getActorCompleteness(actorId: string): Observable<any> {
    return this.http.get(`${this.base}/actors/${actorId}/completeness`);
  }

  getUserAvailability(userId: string): Observable<any> {
    return this.http.get(`${this.base}/users/${userId}/availability`);
  }

  getUserPreferences(userId: string): Observable<any> {
    return this.http.get(`${this.base}/users/${userId}/preferences`);
  }

  updateUserPreferences(userId: string, prefs: Record<string, any>): Observable<any> {
    return this.http.put(`${this.base}/users/${userId}/preferences`, prefs);
  }

  getOrgProfile(): Observable<any> {
    return this.http.get(`${this.base}/org-profile`);
  }
}
