import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ConsultationRequest {
  type: 'advisory' | 'proposal';
  name: string;
  email: string;
  organization?: string;
  serviceArea?: string;
  message?: string;
  lang?: string;
}

export interface ContactRequest {
  name: string;
  email: string;
  subject?: string;
  message: string;
  lang?: string;
}

export interface ApiResponse {
  id: number;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
  usage?: { input_tokens: number; output_tokens: number };
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = '/api';

  constructor(private http: HttpClient) {}

  submitConsultation(data: ConsultationRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/consultations`, data);
  }

  submitContact(data: ContactRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/contacts`, data);
  }

  sendChat(messages: ChatMessage[], lang: string, sessionId?: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/chat`, { messages, lang, sessionId });
  }

  sendOpenClawChat(messages: ChatMessage[], lang: string, routeContext: string, sessionId?: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/integration/openclaw/chat`, { messages, lang, routeContext, sessionId });
  }

  getHealth(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }
}
