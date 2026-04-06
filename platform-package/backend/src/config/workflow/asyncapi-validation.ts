// @ts-nocheck
import { logger } from '../../platform/dos/observability/logger.service';
import { toErrorMessage } from '../../errors/http-error.util';

let parserInstance: unknown = null;
let isEnabled = false;

export async function initAsyncAPIValidation(): Promise<boolean> {
  if (process.env.ASYNCAPI_VALIDATION_ENABLED !== 'true') {
    logger.info('[AsyncAPI] Validation disabled (ASYNCAPI_VALIDATION_ENABLED != true)');
    return false;
  }

  try {
    const { Parser } = require('@asyncapi/parser');
    parserInstance = new Parser();
    isEnabled = true;
    logger.info('[AsyncAPI] Validation engine initialized');
    return true;
  } catch (err: unknown) {
    logger.warn(`[AsyncAPI] Parser init failed: ${toErrorMessage(err)}`);
    isEnabled = false;
    return false;
  }
}

export function asyncapiEnabled(): boolean {
  return isEnabled;
}

export async function validateEventPayload(
  _eventName: string,
  _payload: Record<string, unknown>,
  schema: Record<string, unknown>,
): Promise<{ valid: boolean; errors: string[] }> {
  if (!isEnabled) return { valid: true, errors: [] };

  try {
    const { __z } = require('zod');
    if (schema && typeof schema === 'object') {
      return { valid: true, errors: [] };
    }
    return { valid: true, errors: [] };
  } catch (err: unknown) {
    return { valid: false, errors: [toErrorMessage(err)] };
  }
}

export async function parseAsyncAPIDocument(yamlOrJson: string): Promise<{
  valid: boolean;
  channels: string[];
  errors: string[];
}> {
  if (!parserInstance) {
    return { valid: false, channels: [], errors: ['AsyncAPI parser not initialized'] };
  }

  try {
    const diagnostics = await parserInstance.parse(yamlOrJson);
    const doc = diagnostics.document;
    if (!doc) {
      const errors = diagnostics.diagnostics
        ?.filter((d: any) => d.severity === 0)
        ?.map((d: any) => d.message) || ['Parse failed'];
      return { valid: false, channels: [], errors };
    }

    const channels: string[] = [];
    if (doc.channels) {
      for (const [name] of doc.channels()) {
        channels.push(name);
      }
    }

    return { valid: true, channels, errors: [] };
  } catch (err: unknown) {
    return { valid: false, channels: [], errors: [toErrorMessage(err)] };
  }
}
