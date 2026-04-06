// @ts-nocheck
import { logger } from '../../platform/dos/observability/logger.service';
import { toErrorMessage } from '../../errors/http-error.util';

export interface ExternalServiceConfig {
  enabled: boolean;
  url: string;
  apiKey: string;
  name: string;
}

const services: Record<string, ExternalServiceConfig> = {};

export function loadExternalServices(): void {
  services.cisoAssistant = {
    enabled: process.env.CISO_ASSISTANT_ENABLED === 'true',
    url: process.env.CISO_ASSISTANT_URL || 'http://localhost:8600',
    apiKey: process.env.CISO_ASSISTANT_API_KEY || '',
    name: 'CISO Assistant',
  };
  services.openproject = {
    enabled: process.env.OPENPROJECT_ENABLED === 'true',
    url: process.env.OPENPROJECT_URL || 'http://localhost:8602',
    apiKey: process.env.OPENPROJECT_API_KEY || '',
    name: 'OpenProject',
  };
  services.govready = {
    enabled: process.env.GOVREADY_ENABLED === 'true',
    url: process.env.GOVREADY_URL || 'http://localhost:8601',
    apiKey: process.env.GOVREADY_API_KEY || '',
    name: 'GovReady-Q',
  };

  for (const [_key, svc] of Object.entries(services)) {
    if (svc.enabled) {
      logger.info(`[ExternalServices] ${svc.name} enabled → ${svc.url}`);
    }
  }
}

export function getExternalService(name: 'cisoAssistant' | 'openproject' | 'govready'): ExternalServiceConfig | null {
  const svc = services[name];
  return svc?.enabled ? svc : null;
}

export function getAllExternalServices(): Record<string, ExternalServiceConfig> {
  return { ...services };
}

async function apiCall(
  service: ExternalServiceConfig,
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const url = `${service.url}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (service.apiKey) {
    headers['Authorization'] = `Token ${service.apiKey}`;
  }

  try {
    const fetchFn = (await import('node-fetch')).default;
    const response = await fetchFn(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      timeout: 15000,
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch (err: unknown) {
    logger.error(`[ExternalServices] ${service.name} call failed: ${method} ${path}`, { error: toErrorMessage(err) });
    return { ok: false, status: 0, data: { error: toErrorMessage(err) } };
  }
}

export async function healthCheck(name: 'cisoAssistant' | 'openproject' | 'govready'): Promise<boolean> {
  const svc = getExternalService(name);
  if (!svc) return false;

  const healthPaths: Record<string, string> = {
    cisoAssistant: '/api/health/',
    openproject: '/api/v3',
    govready: '/api/v2/',
  };

  const result = await apiCall(svc, healthPaths[name] || '/health');
  return result.ok;
}

export const cisoAssistantApi = {
  async getFrameworks(): Promise<unknown[]> {
    const svc = getExternalService('cisoAssistant');
    if (!svc) return [];
    const r = await apiCall(svc, '/api/frameworks/');
    return r.ok ? (r.data as Record<string, unknown>)?.results || [] : [];
  },
  async getRiskMatrices(): Promise<unknown[]> {
    const svc = getExternalService('cisoAssistant');
    if (!svc) return [];
    const r = await apiCall(svc, '/api/risk-matrices/');
    return r.ok ? (r.data as Record<string, unknown>)?.results || [] : [];
  },
  async getThreats(): Promise<unknown[]> {
    const svc = getExternalService('cisoAssistant');
    if (!svc) return [];
    const r = await apiCall(svc, '/api/threats/');
    return r.ok ? (r.data as Record<string, unknown>)?.results || [] : [];
  },
  async getRiskAssessments(): Promise<unknown[]> {
    const svc = getExternalService('cisoAssistant');
    if (!svc) return [];
    const r = await apiCall(svc, '/api/risk-assessments/');
    return r.ok ? (r.data as Record<string, unknown>)?.results || [] : [];
  },
  async getComplianceAssessments(): Promise<unknown[]> {
    const svc = getExternalService('cisoAssistant');
    if (!svc) return [];
    const r = await apiCall(svc, '/api/compliance-assessments/');
    return r.ok ? (r.data as Record<string, unknown>)?.results || [] : [];
  },
  async getControls(): Promise<unknown[]> {
    const svc = getExternalService('cisoAssistant');
    if (!svc) return [];
    const r = await apiCall(svc, '/api/applied-controls/');
    return r.ok ? (r.data as Record<string, unknown>)?.results || [] : [];
  },
  async getMetrics(): Promise<unknown> {
    const svc = getExternalService('cisoAssistant');
    if (!svc) return {};
    const r = await apiCall(svc, '/api/get_metrics/');
    return r.ok ? r.data : {};
  },
  async getLibraries(): Promise<unknown[]> {
    const svc = getExternalService('cisoAssistant');
    if (!svc) return [];
    const r = await apiCall(svc, '/api/stored-libraries/');
    return r.ok ? (r.data as Record<string, unknown>)?.results || [] : [];
  },
};

export const openProjectApi = {
  async getProjects(): Promise<unknown[]> {
    const svc = getExternalService('openproject');
    if (!svc) return [];
    const r = await apiCall(svc, '/api/v3/projects');
    return r.ok ? (r.data as Record<string, unknown>)?._embedded?.elements || [] : [];
  },
  async getWorkPackages(projectId?: string): Promise<unknown[]> {
    const svc = getExternalService('openproject');
    if (!svc) return [];
    const path = projectId
      ? `/api/v3/projects/${projectId}/work_packages`
      : '/api/v3/work_packages';
    const r = await apiCall(svc, path);
    return r.ok ? (r.data as Record<string, unknown>)?._embedded?.elements || [] : [];
  },
  async createWorkPackage(projectId: string, data: { subject: string; type?: string; description?: string }): Promise<unknown> {
    const svc = getExternalService('openproject');
    if (!svc) return null;
    const r = await apiCall(svc, `/api/v3/projects/${projectId}/work_packages`, 'POST', data);
    return r.ok ? r.data : null;
  },
  async getStatuses(): Promise<unknown[]> {
    const svc = getExternalService('openproject');
    if (!svc) return [];
    const r = await apiCall(svc, '/api/v3/statuses');
    return r.ok ? (r.data as Record<string, unknown>)?._embedded?.elements || [] : [];
  },
  async getTypes(): Promise<unknown[]> {
    const svc = getExternalService('openproject');
    if (!svc) return [];
    const r = await apiCall(svc, '/api/v3/types');
    return r.ok ? (r.data as Record<string, unknown>)?._embedded?.elements || [] : [];
  },
};

export const govReadyApi = {
  async getSystems(): Promise<unknown[]> {
    const svc = getExternalService('govready');
    if (!svc) return [];
    const r = await apiCall(svc, '/api/v2/systems/');
    return r.ok ? (r.data as Record<string, unknown>)?.results || [] : [];
  },
  async getControls(systemId?: string): Promise<unknown[]> {
    const svc = getExternalService('govready');
    if (!svc) return [];
    const path = systemId
      ? `/api/v2/systems/${systemId}/controls/`
      : '/api/v2/controls/';
    const r = await apiCall(svc, path);
    return r.ok ? (r.data as Record<string, unknown>)?.results || [] : [];
  },
  async getComponents(): Promise<unknown[]> {
    const svc = getExternalService('govready');
    if (!svc) return [];
    const r = await apiCall(svc, '/api/v2/components/');
    return r.ok ? (r.data as Record<string, unknown>)?.results || [] : [];
  },
  async getQuestionnaires(): Promise<unknown[]> {
    const svc = getExternalService('govready');
    if (!svc) return [];
    const r = await apiCall(svc, '/api/v2/tasks/');
    return r.ok ? (r.data as Record<string, unknown>)?.results || [] : [];
  },
  async getPoams(systemId: string): Promise<unknown[]> {
    const svc = getExternalService('govready');
    if (!svc) return [];
    const r = await apiCall(svc, `/api/v2/systems/${systemId}/poams/`);
    return r.ok ? (r.data as Record<string, unknown>)?.results || [] : [];
  },
};
