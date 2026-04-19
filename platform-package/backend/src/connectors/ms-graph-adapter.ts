// ============================================
// Platform — Microsoft Graph connector
// Implements the canonical `PlatformConnector` contract
// for every Graph-backed capability (Outlook send,
// Teams channel post, SharePoint drive item listing).
//
// Token acquisition is delegated to `oauthTokenManager`
// (client-credentials strategy). All HTTP calls are
// tenant-scoped via the binding/registration pair.
//
// See: docs/PLATFORM-MS-INTEGRATIONS.md
//      docs/PLATFORM-ENRICHMENT-PLAN.md (Pillar 2)
// ============================================

import { logger } from '../platform/dos/observability/logger.service';
import {
  oauthTokenManager,
  type SecretResolver,
} from '../platform/dos/security/services/oauth-token-manager.service';
import type {
  ConnectorBinding,
  HealthResult,
  OAuthAppRegistration,
  PlatformConnector,
} from './types';

const GRAPH_API_BASE =
  process.env.GRAPH_API_ENDPOINT?.replace(/\/$/, '') ||
  'https://graph.microsoft.com/v1.0';

/** Minimal slice of the columns the adapter needs. */
export interface GraphAdapterDeps {
  /** Loads the binding's `oauth_app_registrations` row. */
  loadRegistration: (
    binding: ConnectorBinding,
  ) => Promise<OAuthAppRegistration>;
  /** Resolves Key Vault / encrypted-DB secrets by name. */
  resolveSecret: SecretResolver;
}

// === Public operation payloads ===

export interface SendMailOp {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  cc?: string[];
  importance?: 'low' | 'normal' | 'high';
}

export interface PostChannelMessageOp {
  teamId: string;
  channelId: string;
  /** HTML or adaptive-card JSON string. */
  contentType: 'html' | 'text';
  content: string;
}

export interface ListSiteItemsOp {
  siteId: string;
  /** Drive item id ('root' for the site drive root). */
  itemId?: string;
  top?: number;
}

// === Connector factory ===

export function createMsGraphConnector(
  code: string,
  deps: GraphAdapterDeps,
  requiredScopes: readonly string[],
): PlatformConnector {
  async function token(binding: ConnectorBinding): Promise<string> {
    const registration = await deps.loadRegistration(binding);
    const result = await oauthTokenManager.getAccessToken(
      binding,
      registration,
      deps.resolveSecret,
    );
    return result.accessToken;
  }

  async function graphFetch(
    binding: ConnectorBinding,
    path: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const accessToken = await token(binding);
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(`${GRAPH_API_BASE}${path}`, { ...init, headers });
  }

  async function sendMail(
    binding: ConnectorBinding,
    payload: SendMailOp,
  ): Promise<{ success: true }> {
    const toArr = Array.isArray(payload.to) ? payload.to : [payload.to];
    const body = {
      message: {
        subject: payload.subject,
        importance: payload.importance ?? 'normal',
        body: { contentType: 'HTML', content: payload.html },
        toRecipients: toArr.map(address => ({ emailAddress: { address } })),
        ...(payload.cc && payload.cc.length > 0
          ? {
              ccRecipients: payload.cc.map(address => ({
                emailAddress: { address },
              })),
            }
          : {}),
      },
      saveToSentItems: true,
    };
    const res = await graphFetch(
      binding,
      `/users/${encodeURIComponent(payload.from)}/sendMail`,
      { method: 'POST', body: JSON.stringify(body) },
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `[MsGraph] sendMail failed (${res.status}): ${errText.slice(0, 400)}`,
      );
    }
    return { success: true };
  }

  async function postChannelMessage(
    binding: ConnectorBinding,
    payload: PostChannelMessageOp,
  ): Promise<{ id: string }> {
    const body = {
      body: {
        contentType: payload.contentType,
        content: payload.content,
      },
    };
    const res = await graphFetch(
      binding,
      `/teams/${encodeURIComponent(payload.teamId)}/channels/${encodeURIComponent(
        payload.channelId,
      )}/messages`,
      { method: 'POST', body: JSON.stringify(body) },
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `[MsGraph] postChannelMessage failed (${res.status}): ${errText.slice(0, 400)}`,
      );
    }
    const json = (await res.json()) as { id?: string };
    if (!json.id) {
      throw new Error('[MsGraph] postChannelMessage: missing message id in response');
    }
    return { id: json.id };
  }

  async function listSiteItems(
    binding: ConnectorBinding,
    payload: ListSiteItemsOp,
  ): Promise<{ items: unknown[] }> {
    const itemPath = payload.itemId && payload.itemId !== 'root'
      ? `items/${encodeURIComponent(payload.itemId)}/children`
      : 'root/children';
    const topClause = payload.top ? `?$top=${encodeURIComponent(String(payload.top))}` : '';
    const res = await graphFetch(
      binding,
      `/sites/${encodeURIComponent(payload.siteId)}/drive/${itemPath}${topClause}`,
      { method: 'GET' },
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `[MsGraph] listSiteItems failed (${res.status}): ${errText.slice(0, 400)}`,
      );
    }
    const json = (await res.json()) as { value?: unknown[] };
    return { items: json.value ?? [] };
  }

  const OPS: Record<
    string,
    (binding: ConnectorBinding, payload: unknown) => Promise<unknown>
  > = {
    sendMail: (b, p) => sendMail(b, p as SendMailOp),
    postChannelMessage: (b, p) => postChannelMessage(b, p as PostChannelMessageOp),
    listSiteItems: (b, p) => listSiteItems(b, p as ListSiteItemsOp),
  };

  async function healthProbe(binding: ConnectorBinding): Promise<HealthResult> {
    const startedAt = Date.now();
    try {
      const res = await graphFetch(binding, '/$metadata?$top=1', { method: 'GET' });
      const latencyMs = Date.now() - startedAt;
      if (!res.ok) {
        return {
          status: 'failed',
          latencyMs,
          checkedAt: new Date(),
          error: `Graph probe returned ${res.status}`,
        };
      }
      return { status: 'healthy', latencyMs, checkedAt: new Date() };
    } catch (err: unknown) {
      logger.warn(
        `[MsGraph:${code}] health probe error binding=${binding.bindingId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return {
        status: 'failed',
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date(),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async function invoke<TIn = unknown, TOut = unknown>(
    op: string,
    binding: ConnectorBinding,
    payload: TIn,
  ): Promise<TOut> {
    const handler = OPS[op];
    if (!handler) {
      throw new Error(`[MsGraph:${code}] unknown op: ${op}`);
    }
    const result = await handler(binding, payload);
    return result as TOut;
  }

  return {
    code,
    vendor: 'microsoft',
    auth: 'client_credentials',
    requiredScopes,
    healthProbe,
    invoke,
  };
}
