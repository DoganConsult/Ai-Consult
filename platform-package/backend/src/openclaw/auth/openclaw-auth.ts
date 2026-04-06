// @ts-nocheck
import { catchHandler, EC } from '../../platform/dos/resilience/resilient-catch';
// ============================================
// OpenClaw Authentication Middleware
// Validates API keys and tenant access for external users
// ============================================

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { getOpenClawConfig } from '../config/openclaw.config';
import { query } from '../../config/database/database';
import { logger } from '../../platform/dos/observability/logger.service';
import { getFirstRow } from '../../shared/data/db-utils';

export interface OpenClawRequest extends Request {
  openclawApiKey?: string;
  openclawTenantId?: string;
  openclawUserId?: string;
}

/**
 * Authenticate OpenClaw request
 * Supports API key authentication for external users
 */
export async function authenticateOpenClawRequest(
  req: OpenClawRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const config = getOpenClawConfig();

  if (!config.authRequired) {
    return next();
  }

  try {
    // Extract API key from header
    const apiKeyHeader = config.apiKeyHeader.toLowerCase();
    const apiKey = req.headers[apiKeyHeader] as string ||
                   req.headers[apiKeyHeader.replace(/-/g, '_')] as string ||
                   req.query.apiKey as string;

    if (!apiKey) {
      res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Authentication required',
          data: `Missing ${config.apiKeyHeader} header`,
        },
        id: null,
      });
      return;
    }

    // Validate API key and get associated tenant/user
    const validation = await validateOpenClawApiKey(apiKey);

    if (!validation.valid) {
      res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Invalid API key',
        },
        id: null,
      });
      return;
    }

    // Attach context to request
    req.openclawApiKey = apiKey;
    req.openclawTenantId = validation.tenantId;
    req.openclawUserId = validation.userId;

    // Override tenantId in params if provided
    if (req.body?.params && !req.body.params.tenantId && validation.tenantId) {
      req.body.params.tenantId = validation.tenantId;
    }

    next();
  } catch (err: unknown) {
    logger.error('[OpenClaw] Auth error', { error: String(err) });
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
        data: String(err),
      },
      id: null,
    });
  }
}

/**
 * Validate OpenClaw API key
 * In production, this should query a dedicated api_keys table
 * For now, we'll use a simple environment variable or database lookup
 */
async function validateOpenClawApiKey(apiKey: string): Promise<{
  valid: boolean;
  tenantId?: string;
  userId?: string;
}> {
  // Option 1: Check environment variable (for development)
  const envApiKey = process.env.OPENCLAW_API_KEY;
  if (envApiKey && apiKey === envApiKey) {
    return {
      valid: true,
      tenantId: process.env.OPENCLAW_DEFAULT_TENANT_ID,
      userId: process.env.OPENCLAW_DEFAULT_USER_ID,
    };
  }

  // Option 2: Query database for API key (production)
  try {
    // Hash the provided API key with SHA-256
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');
    
    // Check if openclaw_api_keys table exists
    const result = await query(
      `SELECT 
         api_key_id,
         tenant_id, 
         user_id, 
         expires_at,
         is_active,
         rate_limit_per_minute,
         rate_limit_per_hour
       FROM openclaw_api_keys
       WHERE api_key_hash = $1
         AND is_active = true
         AND (expires_at IS NULL OR expires_at > NOW())
       LIMIT 1`,
      [apiKeyHash],
    );

    if (result.rows.length > 0) {
      const row = getFirstRow(result);
      
      // Update last_used_at and usage_count
      await query(
        `UPDATE openclaw_api_keys
         SET last_used_at = NOW(),
             usage_count = usage_count + 1,
             updated_at = NOW()
         WHERE api_key_id = $1`,
        [row.api_key_id],
      ).catch(catchHandler(EC.EVENT_BUS, {})); // Non-fatal if update fails
      
      return {
        valid: true,
        tenantId: row.tenant_id,
        userId: row.user_id,
      };
    }
  } catch (err: unknown) {
    // Table might not exist yet - that's okay for development
    logger.debug('[OpenClaw] API key table not found, using env fallback', { error: String(err) });
  }

  return { valid: false };
}
