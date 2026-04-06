import type { AuthenticatedRequest } from './express.types';
import type { IncomingMessage } from 'http';

declare global {
  namespace Express {
    interface Request {
      // ── Auth / Identity (DAuth) ──────────────────────────────────────────
      user?: AuthenticatedRequest['user'];
      /** Tenant ID injected by tenantGuard middleware */
      tenantId?: string;
      /** Schema name derived from tenantId (e.g. "tenant_abc123") */
      tenantSchema?: string;
      /** Shorthand for req.user?.userId — set by authentication middleware */
      userId?: string;
      /** Role of the authenticated user in this tenant context */
      userRole?: string;
      /** All resolved permission codes for the current user+tenant */
      permissions?: string[];
      /** Populated by externalAuthGuard for scoped JWT sessions */
      externalScope?: {
        tenantId: string;
        entityType: string;
        entityId: string;
        role: string;
        permissions: string[];
      };
      /** Auth context object set by auth middleware */
      auth?: {
        userId: string;
        tenantId: string;
        role: string;
        permissions?: string[];
        [key: string]: unknown;
      };

      // ── Request Context ───────────────────────────────────────────────────
      /** Distributed trace / request correlation ID */
      correlationId?: string;
      /** Active locale resolved by i18n middleware */
      lang?: string;
      /** Module code resolved by module routing middleware */
      moduleCode?: string;
      /** Tenant ID after resolving from path params / headers */
      resolvedTenantId?: string;
      /** Client IP extracted by IP-parsing middleware */
      clientIp?: string;
      /** AI operation mode set by the AI middleware layer */
      aiOperationMode?: string;
      /** Lifecycle auth context for multi-step approval flows */
      lifecycleAuth?: Record<string, unknown>;
      /** Requesting user ID for delegated actions */
      requestingUserId?: string;
      /** Ownership field identifier for entity-ownership checks */
      ownershipField?: string;
      /** Active module scope for filtering */
      scope?: string;
      /** Tenant object (alias for tenantId in some legacy routes) */
      tenant?: string;
      /** API key when authenticating via API key header */
      apiKey?: string;

      // ── File Uploads ──────────────────────────────────────────────────────
      /** Single uploaded file (set by multer single()) */
      file?: Express.Multer.File;
      /** Multiple uploaded files (set by multer array()/fields()) */
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };

      // ── WebSocket / Raw Transport ─────────────────────────────────────────
      /** Underlying socket for websocket upgrade requests */
      socket?: IncomingMessage['socket'];

      // ── Internal DOS Metadata ─────────────────────────────────────────────
      /** Internal catalog flag set by route catalog middleware */
      _catalogAll?: boolean;
      /** Product key resolved by product routing middleware */
      resolvedProductKey?: string;
    }

    interface Response {
      /** Send a 200 JSON response with standard envelope */
      ok(data: unknown): void;
      /** Send a 201 JSON response with standard envelope */
      created(data: unknown): void;
      /** Send a 200 JSON response confirming deletion */
      deleted(message: string): void;
      /** Send a paginated JSON response with standard envelope */
      paginated(data: unknown[], total: number, page: number, pageSize: number): void;
    }
  }
}

export {};
