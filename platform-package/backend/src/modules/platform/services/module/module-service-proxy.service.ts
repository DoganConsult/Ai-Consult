// @ts-nocheck
import { logger } from '../../../../utils/logger';
// ============================================
// Platform — Module Service Proxy
// Safe cross-module service calls with error handling and fallbacks
// ============================================

import { getModuleService, isModuleServiceAvailable } from './module-service-registry.service';
import { recordRuntimeDependency } from './module-dependency-tracker.service';

/**
 * Options for module service calls
 */
export interface ModuleServiceCallOptions {
  timeout?: number; // Timeout in milliseconds (default: 30000)
  retries?: number; // Number of retries on failure (default: 0)
  fallback?: () => Promise<unknown>; // Fallback function if call fails
  logErrors?: boolean; // Whether to log errors (default: true)
  fromModule?: string; // Module making the call (for dependency tracking)
}

/**
 * Result of a module service call
 */
export interface ModuleServiceCallResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  moduleCode: string;
  functionName: string;
}

/**
 * Batch call definition
 */
export interface ModuleServiceBatchCall {
  moduleCode: string;
  functionName: string;
  params: unknown[];
  options?: ModuleServiceCallOptions;
  fromModule?: string; // Module making the call (for dependency tracking)
}

/**
 * Call a module service function safely
 */
export async function callModuleService<T = any>(
  moduleCode: string,
  functionName: string,
  params: unknown[] = [],
  options: ModuleServiceCallOptions = {}
): Promise<T | null> {
  const {
    timeout = 30000,
    retries = 0,
    fallback,
    logErrors = true,
  } = options;

  // Check if service is available
  const isAvailable = await isModuleServiceAvailable(moduleCode);
  if (!isAvailable) {
    if (logErrors) {
      logger.warn(`Module service ${moduleCode} is not available`);
    }
    if (fallback) {
      try {
        return await fallback();
      } catch (error: unknown) {
        if (logErrors) {
          logger.error(`Fallback for ${moduleCode}.${functionName} failed:`, error);
        }
      }
    }
    return null;
  }

  // Get service contract
  const contract = getModuleService(moduleCode);
  if (!contract) {
    if (logErrors) {
      logger.warn(`Module service contract not found for ${moduleCode}`);
    }
    if (fallback) {
      try {
        return await fallback();
      } catch (error: unknown) {
        if (logErrors) {
          logger.error(`Fallback for ${moduleCode}.${functionName} failed:`, error);
        }
      }
    }
    return null;
  }

  // Check if function exists
  if (!contract.availableFunctions.includes(functionName)) {
    if (logErrors) {
      logger.warn(`Function ${functionName} not available in module ${moduleCode}`);
    }
    if (fallback) {
      try {
        return await fallback();
      } catch (error: unknown) {
        if (logErrors) {
          logger.error(`Fallback for ${moduleCode}.${functionName} failed:`, error);
        }
      }
    }
    return null;
  }

  // Get function from service instance
  const serviceFunction = contract.serviceInstance?.[functionName];
  if (typeof serviceFunction !== 'function') {
    if (logErrors) {
      logger.warn(`Function ${functionName} is not callable in module ${moduleCode}`);
    }
    if (fallback) {
      try {
        return await fallback();
      } catch (error: unknown) {
        if (logErrors) {
          logger.error(`Fallback for ${moduleCode}.${functionName} failed:`, error);
        }
      }
    }
    return null;
  }

  // Record runtime dependency if fromModule is provided
  if (options.fromModule && options.fromModule !== moduleCode) {
    recordRuntimeDependency(options.fromModule, moduleCode, `proxy.call.${functionName}`);
  }

  // Execute with timeout and retries
  let __lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await Promise.race([
        serviceFunction(...params),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
        ),
      ]);
      return result as T;
    } catch (error: unknown) {
      lastError = error as Error;
      if (logErrors && attempt === retries) {
        logger.error(`Module service call failed: ${moduleCode}.${functionName}`, error);
      }
      // If not last attempt, wait a bit before retry
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  // All retries failed, try fallback
  if (fallback) {
    try {
      return await fallback();
    } catch (error: unknown) {
      if (logErrors) {
        logger.error(`Fallback for ${moduleCode}.${functionName} failed:`, error);
      }
    }
  }

  return null;
}

/**
 * Call a module service function and return detailed result
 */
export async function callModuleServiceWithResult<T = any>(
  moduleCode: string,
  functionName: string,
  params: unknown[] = [],
  options: ModuleServiceCallOptions = {}
): Promise<ModuleServiceCallResult<T>> {
  const data = await callModuleService<T>(moduleCode, functionName, params, {
    ...options,
    logErrors: false, // We'll handle logging in the result
  });

  if (data !== null) {
    return {
      success: true,
      data,
      error: null,
      moduleCode,
      functionName,
    };
  }

  return {
    success: false,
    data: null,
    error: `Failed to call ${moduleCode}.${functionName}`,
    moduleCode,
    functionName,
  };
}

/**
 * Batch call multiple module services
 */
export async function callModuleServices<T = any>(
  calls: ModuleServiceBatchCall[]
): Promise<Map<string, T | null>> {
  const results = new Map<string, T | null>();

  // Execute calls in parallel
  const promises = calls.map(async (call) => {
    const key = `${call.moduleCode}:${call.functionName}`;
    const result = await callModuleService<T>(
      call.moduleCode,
      call.functionName,
      call.params,
      {
        ...call.options,
        fromModule: call.fromModule || call.options?.fromModule,
      }
    );
    return [key, result] as [string, T | null];
  });

  const resolved = await Promise.all(promises);
  for (const [key, result] of resolved) {
    results.set(key, result);
  }

  return results;
}

/**
 * Call with fallback: try primary module, fallback to secondary if unavailable
 */
export async function withModuleFallback<T>(
  primaryModuleCode: string,
  primaryFunction: string,
  primaryParams: any[],
  fallbackModuleCode: string,
  fallbackFunction: string,
  fallbackParams: any[],
  options: ModuleServiceCallOptions = {}
): Promise<T | null> {
  // Try primary first
  const primaryResult = await callModuleService<T>(
    primaryModuleCode,
    primaryFunction,
    primaryParams,
    { ...options, logErrors: false }
  );

  if (primaryResult !== null) {
    return primaryResult;
  }

  // Primary failed, try fallback
  return await callModuleService<T>(
    fallbackModuleCode,
    fallbackFunction,
    fallbackParams,
    options
  );
}

/**
 * Call with multiple fallbacks in order
 */
export async function withModuleFallbacks<T>(
  calls: Array<{ moduleCode: string; functionName: string; params: unknown[] }>,
  options: ModuleServiceCallOptions = {}
): Promise<T | null> {
  for (const call of calls) {
    const result = await callModuleService<T>(
      call.moduleCode,
      call.functionName,
      call.params,
      { ...options, logErrors: false }
    );

    if (result !== null) {
      return result;
    }
  }

  // All fallbacks failed
  if (options.logErrors !== false) {
    logger.warn(`All fallback calls failed for ${calls.map(c => `${c.moduleCode}.${c.functionName}`).join(', ')}`);
  }

  return null;
}
