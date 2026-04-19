// ============================================
// Platform — Connector Framework (types)
// Shared contract implemented by every vendor adapter
// (Microsoft Graph, Google Workspace, Zoom, LinkedIn,
// Slack, etc.). See:
//   docs/PLATFORM-ENRICHMENT-PLAN.md (Pillar 2)
//   docs/PLATFORM-MS-INTEGRATIONS.md
//   docs/PLATFORM-COLLAB-CONNECTORS.md
// ============================================

export type ConnectorVendor =
  | 'microsoft'
  | 'google'
  | 'zoom'
  | 'linkedin'
  | 'slack'
  | 'other';

export type ConnectorAuthMode =
  | 'client_credentials'
  | 'auth_code'
  | 'on_behalf_of'
  | 'service_account_jwt'
  | 's2s_oauth'
  | 'api_key'
  | 'webhook';

export type ConnectorHealthStatus =
  | 'unknown'
  | 'healthy'
  | 'degraded'
  | 'failed';

/**
 * Persistent record describing a tenant's bound connector.
 * Shape matches the `integration_bindings` table (see
 * `config/db/schemas/integration-bindings.ts`).
 */
export interface ConnectorBinding {
  bindingId: string;
  tenantId: string;
  registrationId: string;
  vendor: ConnectorVendor;
  connectorCode: string;
  enabled: boolean;
  config: Record<string, unknown>;
  healthStatus: ConnectorHealthStatus;
  lastHealthAt?: Date;
}

/**
 * Persistent record describing the tenant's OAuth app
 * registration with the vendor. Shape matches the
 * `oauth_app_registrations` table.
 */
export interface OAuthAppRegistration {
  registrationId: string;
  tenantId: string;
  vendor: ConnectorVendor;
  externalTenantId: string | null;
  appClientId: string;
  secretNameKv: string;
  extraSecretNames: Record<string, string>;
  redirectUris: string[];
  consentedScopes: string[];
  authMode: ConnectorAuthMode;
  status: 'pending' | 'active' | 'revoked' | 'error';
}

export interface HealthResult {
  status: ConnectorHealthStatus;
  latencyMs?: number;
  checkedAt: Date;
  details?: Record<string, unknown>;
  error?: string;
}

/**
 * Canonical connector interface. Every vendor adapter in
 * `backend/src/connectors/` MUST implement this shape so
 * the Integration Hub, Admin UI, and audit trail treat
 * all vendors uniformly.
 */
export interface PlatformConnector {
  /** Stable machine code, e.g. 'graph_outlook', 'zoom_meetings'. */
  readonly code: string;
  /** Vendor family the connector belongs to. */
  readonly vendor: ConnectorVendor;
  /** Authentication mode used by the adapter. */
  readonly auth: ConnectorAuthMode;
  /** OAuth scopes / API permissions required for full function. */
  readonly requiredScopes: readonly string[];

  /**
   * Perform a live health probe against the vendor using the
   * supplied binding. Must never throw on expected failure —
   * return a `HealthResult` with status `'failed'` instead.
   */
  healthProbe(binding: ConnectorBinding): Promise<HealthResult>;

  /**
   * Invoke an operation against the vendor. `op` is a
   * connector-specific opcode (e.g. `'sendMail'`,
   * `'postChannelMessage'`). Adapters validate `payload`
   * before calling upstream APIs.
   */
  invoke<TIn = unknown, TOut = unknown>(
    op: string,
    binding: ConnectorBinding,
    payload: TIn,
  ): Promise<TOut>;
}

/**
 * In-memory registry that collects adapter implementations
 * at module load time. The Integration Hub controller looks
 * up adapters by `connector_code` from the binding row.
 */
class ConnectorRegistry {
  private readonly byCode = new Map<string, PlatformConnector>();

  register(connector: PlatformConnector): void {
    if (this.byCode.has(connector.code)) {
      throw new Error(
        `[ConnectorRegistry] duplicate connector code: ${connector.code}`,
      );
    }
    this.byCode.set(connector.code, connector);
  }

  get(code: string): PlatformConnector | undefined {
    return this.byCode.get(code);
  }

  require(code: string): PlatformConnector {
    const c = this.byCode.get(code);
    if (!c) {
      throw new Error(`[ConnectorRegistry] unknown connector code: ${code}`);
    }
    return c;
  }

  list(): PlatformConnector[] {
    return Array.from(this.byCode.values());
  }

  listByVendor(vendor: ConnectorVendor): PlatformConnector[] {
    return this.list().filter(c => c.vendor === vendor);
  }
}

export const connectorRegistry = new ConnectorRegistry();
