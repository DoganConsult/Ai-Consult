// ============================================
// OpenClaw Native Server
// Native HTTP/WebSocket MCP server for external users
// Integrated with LangChain, LangGraph, Temporal, LangSmith
// ============================================

import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer as createHttpServer, Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { getOpenClawConfig } from './config/openclaw.config';
import { createOpenClawMcpServer } from './mcp/openclaw-mcp-server';
import { createEnhancedOpenClawMcpServer } from './mcp/enhanced-openclaw-mcp-server';
import { authenticateOpenClawRequest } from './auth/openclaw-auth';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { errorHandler } from './middleware/error-handler';
import { logger } from '../platform/dos/observability/logger.service';
import { toErrorMessage } from '../errors/http-error.util';

export interface OpenClawServer {
  httpServer: HttpServer;
  wsServer: WebSocketServer | null;
  agUIWsServer: WebSocketServer | null;
  app: Express;
  port: number;
  host: string;
}

/**
 * Create and configure OpenClaw native server
 */
export function createOpenClawServer(): OpenClawServer {
  const config = getOpenClawConfig();

  if (!config.enabled) {
    throw new Error('OpenClaw server is disabled. Set OPENCLAW_ENABLED=true to enable.');
  }

  const app = express();
  const httpServer = createHttpServer(app);

  // ── Middleware ──────────────────────────────────────────────────────────

  // CORS -- block wildcard in production to prevent credential leakage
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && config.corsOrigins.includes('*')) {
    throw new Error(
      '[OpenClaw] FATAL: Wildcard CORS origin (*) is not allowed in production. ' +
      'Set OPENCLAW_CORS_ORIGINS to specific allowed origins.'
    );
  }

  app.use(cors({
    origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', config.apiKeyHeader, 'X-Correlation-ID'],
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const correlationId = req.headers['x-correlation-id'] as string || `oc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    logger.info('[OpenClaw] Request', {
      method: req.method,
      path: req.path,
      correlationId,
      ip: req.ip,
    });
    next();
  });

  // Rate limiting
  if (config.rateLimitEnabled) {
    app.use(rateLimitMiddleware(config.rateLimitWindowMs, config.rateLimitMaxRequests));
  }

  // Authentication
  if (config.authRequired) {
    app.use(authenticateOpenClawRequest);
  }

  // ── Health Check ─────────────────────────────────────────────────────────

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      server: 'openclaw',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      integrations: {
        langgraph: config.langgraphEnabled,
        temporal: config.temporalEnabled,
        langfuse: config.langfuseEnabled,
      },
    });
  });

  // ── MCP Protocol Endpoint (HTTP) ──────────────────────────────────────

  app.post('/mcp', async (req: Request, res: Response) => {
    try {
      // Use enhanced MCP server with full GRC system integration
      const mcpServer = createEnhancedOpenClawMcpServer();
      const response = await handleMcpRequest(mcpServer, req.body, req);
      res.json(response);
    } catch (err: unknown) {
      logger.error('[OpenClaw] MCP request error', { error: toErrorMessage(err) });
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: toErrorMessage(err),
        },
        id: req.body?.id || null,
      });
    }
  });

  // ── WebSocket Server (if enabled) ──────────────────────────────────────

  let wsServer: WebSocketServer | null = null;

  if (config.transport === 'websocket' || config.transport === 'both') {
    wsServer = new WebSocketServer({
      server: httpServer,
      path: '/mcp/ws',
    });

    wsServer.on('connection', (ws: WebSocket, req: Request) => {
      logger.info('[OpenClaw] WebSocket connection established', {
        remoteAddress: req.socket.remoteAddress,
        path: req.url,
      });

      // Use enhanced MCP server with full GRC system integration
      const mcpServer = createEnhancedOpenClawMcpServer();

      ws.on('message', async (data: Buffer) => {
        try {
          const request = JSON.parse(data.toString());
          
          // Check if this is an AG-UI subscription request
          if (request.method === 'ag-ui/subscribe') {
            const { subscribeToAGUIEvents } = require('./ag-ui/ag-ui-streaming');
            const subscriptionId = subscribeToAGUIEvents(ws, request.params || {});
            ws.send(JSON.stringify({
              jsonrpc: '2.0',
              result: { subscriptionId },
              id: request.id,
            }));
            return;
          }

          // Otherwise, handle as MCP request
          const response = await handleMcpRequest(mcpServer, request, req);
          ws.send(JSON.stringify(response));
        } catch (err: unknown) {
          logger.error('[OpenClaw] WebSocket message error', { error: toErrorMessage(err) });
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal error',
              data: toErrorMessage(err),
            },
            id: null,
          }));
        }
      });

      ws.on('close', () => {
        logger.info('[OpenClaw] WebSocket connection closed');
      });

      ws.on('error', (err: Error) => {
        logger.error('[OpenClaw] WebSocket error', { error: toErrorMessage(err) });
      });
    });
  }

  // ── AG-UI Streaming WebSocket (separate endpoint) ──────────────────────

  let agUIWsServer: WebSocketServer | null = null;

  if (config.transport === 'websocket' || config.transport === 'both') {
    agUIWsServer = new WebSocketServer({
      server: httpServer,
      path: '/ag-ui/stream',
    });

    agUIWsServer.on('connection', (ws: WebSocket, req: Request) => {
      logger.info('[AG-UI] WebSocket connection established', {
        remoteAddress: req.socket.remoteAddress,
      });

      // Parse query params for subscription
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const agentId = url.searchParams.get('agentId') || undefined;
      const runId = url.searchParams.get('runId') || undefined;
      const eventTypes = url.searchParams.get('eventTypes')?.split(',') || undefined;

      const { subscribeToAGUIEvents } = require('./ag-ui/ag-ui-streaming');
      const subscriptionId = subscribeToAGUIEvents(ws, {
        agentId,
        runId,
        eventTypes,
      });

      logger.info('[AG-UI] Subscription created', { subscriptionId, agentId, runId });
    });
  }

  // ── Error Handler ──────────────────────────────────────────────────────

  app.use(errorHandler);

  return {
    httpServer,
    wsServer,
    agUIWsServer,
    app,
    port: config.port,
    host: config.host,
  };
}

/**
 * Handle MCP JSON-RPC request
 */
async function handleMcpRequest(
  mcpServer: ReturnType<typeof createOpenClawMcpServer>,
  request: Record<string, any>,
  req: Request,
): Promise<unknown> {
  const { method, params, id } = request;

  // Extract context from request
  const context = {
    correlationId: req.headers['x-correlation-id'] as string,
    apiKey: req.headers[getOpenClawConfig().apiKeyHeader.toLowerCase()] as string,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };

  try {
    let result: unknown;

    // Enrich params with context
    const enrichedParams = {
      ...(params || {}),
      _context: context,
    };

    // Route to appropriate handler based on method
    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            resources: {},
            tools: {},
            prompts: {},
          },
          serverInfo: {
            name: 'openclaw-server',
            version: '1.0.0',
          },
        };
        break;

      case 'resources/list':
        result = {
          resources: await mcpServer.listResources(enrichedParams),
        };
        break;

      case 'resources/read':
        result = {
          contents: await mcpServer.readResource(enrichedParams),
        };
        break;

      case 'tools/list':
        result = {
          tools: await mcpServer.listTools(enrichedParams),
        };
        break;

      case 'tools/call':
        result = await mcpServer.callTool(enrichedParams);
        break;

      case 'prompts/list':
        result = {
          prompts: await mcpServer.listPrompts(enrichedParams),
        };
        break;

      case 'prompts/get':
        result = await mcpServer.getPrompt(enrichedParams);
        break;

      default:
        throw new Error(`Unknown method: ${method}`);
    }

    return {
      jsonrpc: '2.0',
      result,
      id,
    };
  } catch (err: unknown) {
    const errorMsg = toErrorMessage(err);
    logger.error('[OpenClaw] MCP method error', { method, error: errorMsg });
    return {
      jsonrpc: '2.0',
      error: {
        code: -32601,
        message: 'Method error',
        data: errorMsg,
      },
      id,
    };
  }
}

/**
 * Start OpenClaw server
 */
export async function startOpenClawServer(): Promise<OpenClawServer> {
  const config = getOpenClawConfig();

  if (!config.enabled) {
    logger.info('[OpenClaw] Server is disabled');
    throw new Error('OpenClaw server is disabled');
  }

  const server = createOpenClawServer();

  return new Promise((resolve, reject) => {
    server.httpServer.listen(server.port, server.host, () => {
      logger.info(`[OpenClaw] Server started`, {
        host: server.host,
        port: server.port,
        transport: config.transport,
        langgraph: config.langgraphEnabled,
        temporal: config.temporalEnabled,
        langfuse: config.langfuseEnabled,
      });
      resolve(server);
    });

    server.httpServer.on('error', (err: Error) => {
      logger.error('[OpenClaw] Server error', { error: toErrorMessage(err) });
      reject(err);
    });
  });
}

/**
 * Stop OpenClaw server gracefully
 */
export async function stopOpenClawServer(server: OpenClawServer): Promise<void> {
  return new Promise((resolve) => {
    if (server.wsServer) {
      server.wsServer.close(() => {
        logger.info('[OpenClaw] WebSocket server closed');
      });
    }

    server.httpServer.close(() => {
      logger.info('[OpenClaw] HTTP server closed');
      resolve();
    });
  });
}
