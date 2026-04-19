import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export type PageLayout = 'list' | 'form' | 'detail' | 'dashboard' | 'custom';
export type PageStatus = 'draft' | 'published' | 'archived';
export type EndpointMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
export type HandlerType = 'sql' | 'query_table' | 'insert_table' | 'update_table' | 'delete_table' | 'static_json';

export interface PageSpec {
  id?: string;
  code: string;
  title: string;
  subtitle?: string;
  icon?: string;
  route: string;
  section?: string;
  module_code?: string;
  product_code?: string;
  requires?: string[];
  layout: PageLayout;
  data_source?: { endpoint_code?: string; columns?: string[]; params?: Record<string, unknown> };
  form_spec?: DynamicFormSpec | null;
  table_spec?: DynamicTableSpec | null;
  status: PageStatus;
  version?: number;
}

export interface DynamicFormField {
  key: string;
  type: 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'date' | 'json';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string | number | boolean }>;
  help?: string;
}

export interface DynamicFormSpec {
  title?: string;
  submit_label?: string;
  submit_endpoint_code?: string;
  fields: DynamicFormField[];
}

export interface DynamicTableSpec {
  row_key?: string;
  columns: Array<{ key: string; label: string; width?: string; format?: 'date' | 'json' | 'tag' }>;
}

export interface EndpointSpec {
  id?: string;
  code: string;
  method: EndpointMethod;
  path: string;
  description?: string;
  requires?: string[];
  handler_type: HandlerType;
  handler_spec: Record<string, unknown>;
  input_schema?: Record<string, unknown>;
  rate_limit_rpm?: number;
  status: PageStatus;
  version?: number;
}

@Injectable({ providedIn: 'root' })
export class LowcodeService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/platform/admin`;

  // Pages
  listPages(): Observable<PageSpec[]> { return this.http.get<PageSpec[]>(`${this.base}/pages`); }
  listPublishedPages(): Observable<PageSpec[]> { return this.http.get<PageSpec[]>(`${this.base}/pages/published`); }
  getPage(code: string): Observable<PageSpec> { return this.http.get<PageSpec>(`${this.base}/pages/${code}`); }
  createPage(spec: PageSpec): Observable<PageSpec> { return this.http.post<PageSpec>(`${this.base}/pages`, spec); }
  updatePage(code: string, spec: Partial<PageSpec>): Observable<PageSpec> { return this.http.patch<PageSpec>(`${this.base}/pages/${code}`, spec); }
  deletePage(code: string): Observable<unknown> { return this.http.delete(`${this.base}/pages/${code}`); }
  getPageVersions(code: string): Observable<any[]> { return this.http.get<any[]>(`${this.base}/pages/${code}/versions`); }

  // Dynamic endpoints
  listEndpoints(): Observable<EndpointSpec[]> { return this.http.get<EndpointSpec[]>(`${this.base}/endpoints`); }
  createEndpoint(spec: EndpointSpec): Observable<EndpointSpec> { return this.http.post<EndpointSpec>(`${this.base}/endpoints`, spec); }
  updateEndpoint(code: string, spec: Partial<EndpointSpec>): Observable<EndpointSpec> { return this.http.patch<EndpointSpec>(`${this.base}/endpoints/${code}`, spec); }
  deleteEndpoint(code: string): Observable<unknown> { return this.http.delete(`${this.base}/endpoints/${code}`); }
  invokeEndpoint(code: string, method: EndpointMethod, body?: any, params?: Record<string, string>): Observable<any> {
    const url = `${this.base}/endpoints/invoke/${code}`;
    switch (method) {
      case 'GET': return this.http.get(url, { params });
      case 'DELETE': return this.http.delete(url, { params });
      case 'POST': return this.http.post(url, body ?? {}, { params });
      case 'PATCH': return this.http.patch(url, body ?? {}, { params });
      case 'PUT': return this.http.put(url, body ?? {}, { params });
    }
  }

  // AI agent graphs
  listAiGraphs(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/ai-graphs`); }
  getAiGraph(code: string): Observable<any> { return this.http.get(`${this.base}/ai-graphs/${code}`); }
  createAiGraph(spec: any): Observable<any> { return this.http.post(`${this.base}/ai-graphs`, spec); }
  updateAiGraph(code: string, spec: any): Observable<any> { return this.http.patch(`${this.base}/ai-graphs/${code}`, spec); }
  deleteAiGraph(code: string): Observable<unknown> { return this.http.delete(`${this.base}/ai-graphs/${code}`); }

  // Plugins
  listPlugins(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/plugins`); }
  registerPlugin(spec: any): Observable<any> { return this.http.post(`${this.base}/plugins/register`, spec); }
  verifyPlugin(code: string, verified: boolean): Observable<any> { return this.http.post(`${this.base}/plugins/${code}/verify`, { verified }); }
  installPlugin(code: string): Observable<any> { return this.http.post(`${this.base}/plugins/${code}/install`, {}); }
  uninstallPlugin(code: string): Observable<any> { return this.http.post(`${this.base}/plugins/${code}/uninstall`, {}); }

  // Approvals
  listApprovals(status?: string): Observable<any[]> {
    const params = status ? { status } : undefined;
    return this.http.get<any[]>(`${this.base}/approvals`, { params });
  }
  requestApproval(body: any): Observable<any> { return this.http.post(`${this.base}/approvals`, body); }
  approveApproval(id: string, reason?: string): Observable<any> { return this.http.post(`${this.base}/approvals/${id}/approve`, { decision_reason: reason }); }
  rejectApproval(id: string, reason?: string): Observable<any> { return this.http.post(`${this.base}/approvals/${id}/reject`, { decision_reason: reason }); }
  cancelApproval(id: string): Observable<any> { return this.http.post(`${this.base}/approvals/${id}/cancel`, {}); }

  // Workflows (low-code)
  listWorkflows(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/workflows`); }
  getWorkflow(code: string): Observable<any> { return this.http.get(`${this.base}/workflows/${code}`); }
  createWorkflow(spec: any): Observable<any> { return this.http.post(`${this.base}/workflows`, spec); }
  updateWorkflow(code: string, spec: any): Observable<any> { return this.http.patch(`${this.base}/workflows/${code}`, spec); }
  deleteWorkflow(code: string): Observable<unknown> { return this.http.delete(`${this.base}/workflows/${code}`); }

  // Schema designer
  listSchemaTables(schema = 'public'): Observable<any[]> { return this.http.get<any[]>(`${this.base}/schema/tables`, { params: { schema } }); }
  listSchemaColumns(schema: string, table: string): Observable<any[]> { return this.http.get<any[]>(`${this.base}/schema/tables/${schema}/${table}/columns`); }
  planSchemaChange(change: any): Observable<any> { return this.http.post(`${this.base}/schema/plan`, change); }
  executeSchemaChange(change: any): Observable<any> { return this.http.post(`${this.base}/schema/execute`, change); }
  schemaHistory(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/schema/history`); }
}
