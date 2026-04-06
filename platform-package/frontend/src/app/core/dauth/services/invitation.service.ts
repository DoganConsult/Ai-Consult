import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface Invitation {
  invitation_id: string;
  token: string;
  email: string;
  role?: string;
  status: string;
  expires_at: string;
  created_at: string;
  accepted_at?: string;
  [key: string]: any;
}

export interface CreateInvitationInput {
  email: string;
  role?: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class InvitationService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/invitations`;

  list(): Observable<Invitation[]> {
    return this.http.get<Invitation[]>(this.base);
  }

  create(input: CreateInvitationInput): Observable<Invitation> {
    return this.http.post<Invitation>(this.base, input);
  }

  resend(invitationId: string): Observable<any> {
    return this.http.post(`${this.base}/resend`, { invitationId });
  }

  revoke(invitationId: string): Observable<any> {
    return this.http.delete(`${this.base}/by-id/${invitationId}`);
  }

  validate(token: string): Observable<any> {
    return this.http.post(`${this.base}/validate`, { token });
  }
}
