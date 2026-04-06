// @ts-nocheck
// ============================================
// Platform — Module Service Composition
// Utilities for composing multiple service calls
// Supports pipelines, parallel execution, conditional flows, and transactions
// ============================================

import { callModuleService, ModuleServiceCallOptions } from './module-service-proxy.service';
import { ServiceResponse, createServiceResponse, createErrorResponse, ServiceErrorCode } from './module-service-contracts';

/**
 * Composition step definition
 */
export interface CompositionStep {
  id: string;
  moduleCode: string;
  functionName: string;
  params: unknown[];
  options?: ModuleServiceCallOptions;
  transform?: (result: any, previousResults: Record<string, any>) => any;
  condition?: (previousResults: Record<string, any>) => boolean;
  skipOnError?: boolean;
}

/**
 * Pipeline composition result
 */
export interface PipelineResult {
  success: boolean;
  results: Record<string, any>;
  errors: Record<string, string>;
  executionTimeMs: number;
  stepsExecuted: string[];
  stepsSkipped: string[];
}

/**
 * Parallel composition result
 */
export interface ParallelResult {
  success: boolean;
  results: Record<string, any>;
  errors: Record<string, string>;
  executionTimeMs: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
}

/**
 * Conditional composition result
 */
export interface ConditionalResult {
  branch: string;
  result: unknown;
  executionTimeMs: number;
}

/**
 * Transaction composition result
 */
export interface TransactionResult {
  success: boolean;
  committed: boolean;
  results: Record<string, any>;
  rollbackErrors?: Record<string, string>;
  executionTimeMs: number;
}

/**
 * Execute a pipeline of service calls sequentially
 * Each step receives results from previous steps
 */
export async function executePipeline(
  steps: CompositionStep[],
  initialContext: Record<string, any> = {}
): Promise<PipelineResult> {
  const startTime = Date.now();
  const results: Record<string, any> = { ...initialContext };
  const errors: Record<string, string> = {};
  const stepsExecuted: string[] = [];
  const stepsSkipped: string[] = [];

  for (const step of steps) {
    // Check condition if provided
    if (step.condition && !step.condition(results)) {
      stepsSkipped.push(step.id);
      continue;
    }

    try {
      // Build params with context substitution
      const params = step.params.map((param) => {
        if (typeof param === 'string' && param.startsWith('$')) {
          const key = param.substring(1);
          return results[key] !== undefined ? results[key] : param;
        }
        return param;
      });

      // Execute service call
      const result = await callModuleService(
        step.moduleCode,
        step.functionName,
        params,
        step.options
      );

      // Transform result if provided
      const transformedResult = step.transform
        ? step.transform(result, results)
        : result;

      results[step.id] = transformedResult;
      stepsExecuted.push(step.id);
    } catch (error) {
      const errorMessage = (error as Error)?.message || String(error);
      errors[step.id] = errorMessage;

      if (step.skipOnError) {
        stepsSkipped.push(step.id);
        continue;
      } else {
        // Stop pipeline on error unless skipOnError is true
        break;
      }
    }
  }

  const executionTimeMs = Date.now() - startTime;
  const success = Object.keys(errors).length === 0;

  return {
    success,
    results,
    errors,
    executionTimeMs,
    stepsExecuted,
    stepsSkipped,
  };
}

/**
 * Execute multiple service calls in parallel
 * All calls are executed concurrently
 */
export async function executeParallel(
  calls: CompositionStep[],
  options: {
    failFast?: boolean; // Stop on first error
    maxConcurrency?: number; // Limit concurrent calls
  } = {}
): Promise<ParallelResult> {
  const startTime = Date.now();
  const { failFast = false, maxConcurrency } = options;

  const results: Record<string, any> = {};
  const errors: Record<string, string> = {};

  // Execute with concurrency limit if specified
  if (maxConcurrency && maxConcurrency > 0) {
    const chunks: CompositionStep[][] = [];
    for (let i = 0; i < calls.length; i += maxConcurrency) {
      chunks.push(calls.slice(i, i + maxConcurrency));
    }

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (step) => {
        try {
          const result = await callModuleService(
            step.moduleCode,
            step.functionName,
            step.params,
            step.options
          );
          return { stepId: step.id, result, error: null };
        } catch (error) {
          return {
            stepId: step.id,
            result: null,
            error: (error as Error)?.message || String(error),
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);

      for (const { stepId, result, error } of chunkResults) {
        if (error) {
          errors[stepId] = error;
          if (failFast) {
            // Return early if failFast is enabled
            return {
              success: false,
              results,
              errors,
              executionTimeMs: Date.now() - startTime,
              totalCalls: calls.length,
              successfulCalls: Object.keys(results).length,
              failedCalls: Object.keys(errors).length,
            };
          }
        } else {
          results[stepId] = result;
        }
      }
    }
  } else {
    // Execute all calls concurrently
    const promises = calls.map(async (step) => {
      try {
        const result = await callModuleService(
          step.moduleCode,
          step.functionName,
          step.params,
          step.options
        );
        return { stepId: step.id, result, error: null };
      } catch (error) {
        return {
          stepId: step.id,
          result: null,
          error: (error as Error)?.message || String(error),
        };
      }
    });

    const allResults = await Promise.all(promises);

    for (const { stepId, result, error } of allResults) {
      if (error) {
        errors[stepId] = error;
        if (failFast) {
          // Return early if failFast is enabled
          return {
            success: false,
            results,
            errors,
            executionTimeMs: Date.now() - startTime,
            totalCalls: calls.length,
            successfulCalls: Object.keys(results).length,
            failedCalls: Object.keys(errors).length,
          };
        }
      } else {
        results[stepId] = result;
      }
    }
  }

  const executionTimeMs = Date.now() - startTime;
  const success = Object.keys(errors).length === 0;

  return {
    success,
    results,
    errors,
    executionTimeMs,
    totalCalls: calls.length,
    successfulCalls: Object.keys(results).length,
    failedCalls: Object.keys(errors).length,
  };
}

/**
 * Execute conditional composition (if-then-else pattern)
 */
export async function executeConditional(
  condition: (context: Record<string, any>) => boolean | Promise<boolean>,
  thenSteps: CompositionStep[],
  elseSteps: CompositionStep[] = [],
  context: Record<string, any> = {}
): Promise<ConditionalResult> {
  const startTime = Date.now();

  const conditionResult = await Promise.resolve(condition(context));
  const stepsToExecute = conditionResult ? thenSteps : elseSteps;
  const branch = conditionResult ? 'then' : 'else';

  if (stepsToExecute.length === 0) {
    return {
      branch,
      result: context,
      executionTimeMs: Date.now() - startTime,
    };
  }

  // Execute steps as a pipeline
  const pipelineResult = await executePipeline(stepsToExecute, context);

  return {
    branch,
    result: pipelineResult.results,
    executionTimeMs: Date.now() - startTime,
  };
}

/**
 * Execute transaction-like composition (all-or-nothing)
 * If any step fails, rollback functions are called
 */
export async function executeTransaction(
  steps: CompositionStep[],
  rollbackSteps: Map<string, CompositionStep> = new Map(),
  context: Record<string, any> = {}
): Promise<TransactionResult> {
  const startTime = Date.now();
  const results: Record<string, any> = { ...context };
  const executedSteps: string[] = [];
  const rollbackErrors: Record<string, string> = {};

  try {
    // Execute all steps
    for (const step of steps) {
      const params = step.params.map((param) => {
        if (typeof param === 'string' && param.startsWith('$')) {
          const key = param.substring(1);
          return results[key] !== undefined ? results[key] : param;
        }
        return param;
      });

      const result = await callModuleService(
        step.moduleCode,
        step.functionName,
        params,
        step.options
      );

      const transformedResult = step.transform
        ? step.transform(result, results)
        : result;

      results[step.id] = transformedResult;
      executedSteps.push(step.id);
    }

    // All steps succeeded
    return {
      success: true,
      committed: true,
      results,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    // Rollback executed steps in reverse order
    for (let i = executedSteps.length - 1; i >= 0; i--) {
      const stepId = executedSteps[i];
      const rollbackStep = rollbackSteps.get(stepId);

      if (rollbackStep) {
        try {
          await callModuleService(
            rollbackStep.moduleCode,
            rollbackStep.functionName,
            rollbackStep.params,
            rollbackStep.options
          );
        } catch (rollbackError: unknown) {
          rollbackErrors[stepId] =
            rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
        }
      }
    }

    return {
      success: false,
      committed: false,
      results,
      rollbackErrors,
      executionTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Execute a retry composition with exponential backoff
 */
export async function executeWithRetry<T>(
  step: CompositionStep,
  maxRetries: number = 3,
  initialDelayMs: number = 1000,
  backoffMultiplier: number = 2
): Promise<T | null> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await callModuleService(
        step.moduleCode,
        step.functionName,
        step.params,
        {
          ...step.options,
          retries: 0, // Don't use proxy retries, we handle it here
        }
      );

      return step.transform ? step.transform(result, {}) : result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delayMs = initialDelayMs * Math.pow(backoffMultiplier, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  return null;
}

/**
 * Execute a fan-out/fan-in pattern
 * Execute one call, then use its results to execute multiple parallel calls
 */
export async function executeFanOutFanIn(
  initialStep: CompositionStep,
  fanOutSteps: (results: any) => CompositionStep[],
  fanInTransform?: (results: Record<string, any>) => any,
  context: Record<string, any> = {}
): Promise<unknown> {
  // Execute initial step
  const initialResult = await callModuleService(
    initialStep.moduleCode,
    initialStep.functionName,
    initialStep.params,
    initialStep.options
  );

  const transformedInitial = initialStep.transform
    ? initialStep.transform(initialResult, context)
    : initialResult;

  const combinedContext = {
    ...context,
    [initialStep.id]: transformedInitial,
  };

  // Generate fan-out steps based on initial result
  const steps = fanOutSteps(transformedInitial);

  // Execute fan-out steps in parallel
  const parallelResult = await executeParallel(steps);

  // Combine results
  const allResults = {
    ...combinedContext,
    ...parallelResult.results,
  };

  // Apply fan-in transform if provided
  if (fanInTransform) {
    return fanInTransform(allResults);
  }

  return allResults;
}

/**
 * Execute a map-reduce pattern
 * Execute the same function across multiple inputs in parallel, then aggregate
 */
export async function executeMapReduce<TInput, TOutput, TAggregate>(
  inputs: TInput[],
  mapStep: (input: TInput, index: number) => CompositionStep,
  reduceTransform: (results: TOutput[]) => TAggregate
): Promise<TAggregate> {
  // Create steps for each input
  const steps = inputs.map((input, index) => mapStep(input, index));

  // Execute all steps in parallel
  const parallelResult = await executeParallel(steps);

  // Extract results in order
  const results: TOutput[] = steps.map(
    (step) => parallelResult.results[step.id]
  );

  // Apply reduce transform
  return reduceTransform(results);
}

/**
 * Execute a waterfall pattern
 * Each step receives the result of the previous step as its first parameter
 */
export async function executeWaterfall(
  steps: CompositionStep[],
  initialValue: unknown = null
): Promise<unknown> {
  let currentValue = initialValue;

  for (const step of steps) {
    const params = [currentValue, ...step.params];
    const result = await callModuleService(
      step.moduleCode,
      step.functionName,
      params,
      step.options
    );

    currentValue = step.transform
      ? step.transform(result, { previous: currentValue })
      : result;
  }

  return currentValue;
}

/**
 * Helper to create a composition step
 */
export function createStep(
  id: string,
  moduleCode: string,
  functionName: string,
  params: unknown[] = [],
  options?: Partial<CompositionStep>
): CompositionStep {
  return {
    id,
    moduleCode,
    functionName,
    params,
    ...options,
  };
}

/**
 * Helper to create a rollback step
 */
export function createRollbackStep(
  originalStepId: string,
  moduleCode: string,
  functionName: string,
  params: unknown[] = [],
  options?: ModuleServiceCallOptions
): CompositionStep {
  return {
    id: `rollback_${originalStepId}`,
    moduleCode,
    functionName,
    params,
    options,
  };
}
