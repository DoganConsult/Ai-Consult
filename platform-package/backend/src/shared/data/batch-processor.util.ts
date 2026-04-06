// @ts-nocheck
// ============================================
// Batch Processor Utility
// Processes large datasets in manageable chunks
// ============================================

import { recordBatchProcessing } from '../modules/governance-os/services/governance/governance-os-learning-metrics.service';

export interface BatchProcessorOptions {
  batchSize?: number;
  concurrency?: number;
  onProgress?: (processed: number, total: number) => void;
  onError?: (error: Error, batch: any[]) => void;
  operationType?: string; // For metrics tracking
}

/**
 * Process items in batches sequentially
 */
export async function processInBatches<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  options: BatchProcessorOptions = {}
): Promise<R[]> {
  const {
    batchSize = 1000,
    onProgress,
    onError,
    operationType = 'batch_process',
  } = options;

  const startTime = Date.now();
  const results: R[] = [];
  const total = items.length;

  try {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      try {
        const batchResults = await processor(batch);
        results.push(...batchResults);
        
        if (onProgress) {
          onProgress(Math.min(i + batchSize, total), total);
        }
      } catch (error) {
        if (onError) {
          onError(error as Error, batch);
        } else {
          throw error;
        }
      }
    }

    const durationMs = Date.now() - startTime;
    recordBatchProcessing(operationType, batchSize, durationMs, true, undefined);
    return results;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    recordBatchProcessing(operationType, batchSize, durationMs, false, error);
    throw error;
  }
}

/**
 * Process items in batches with concurrency control
 */
export async function processInBatchesParallel<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  options: BatchProcessorOptions = {}
): Promise<R[]> {
  const {
    batchSize = 1000,
    concurrency = 5,
    onProgress,
    onError,
    operationType = 'batch_process_parallel',
  } = options;

  const startTime = Date.now();
  const results: R[] = [];
  const batches: T[][] = [];
  
  // Split into batches
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  try {
    // Process batches with concurrency limit
    const semaphore = new Semaphore(concurrency);
    const promises = batches.map(async (batch, index) => {
      await semaphore.acquire();
      try {
        const batchResults = await processor(batch);
        results.push(...batchResults);
        
        if (onProgress) {
          onProgress((index + 1) * batchSize, items.length);
        }
      } catch (error) {
        if (onError) {
          onError(error as Error, batch);
        } else {
          throw error;
        }
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(promises);
    
    const durationMs = Date.now() - startTime;
    recordBatchProcessing(operationType, batchSize, durationMs, true, undefined);
    return results;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    recordBatchProcessing(operationType, batchSize, durationMs, false, error);
    throw error;
  }
}

/**
 * Simple semaphore for concurrency control
 */
class Semaphore {
  private available: number;
  private waiters: Array<() => void> = [];

  constructor(count: number) {
    this.available = count;
  }

  async acquire(): Promise<void> {
    if (this.available > 0) {
      this.available--;
      return;
    }

    return new Promise(resolve => {
      this.waiters.push(resolve);
    });
  }

  release(): void {
    if (this.waiters.length > 0) {
      const resolve = this.waiters.shift()!;
      resolve();
    } else {
      this.available++;
    }
  }
}

/**
 * Process items with rate limiting
 */
export async function processWithRateLimit<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    rateLimit?: number; // items per second
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<R[]> {
  const { rateLimit = 100, onProgress } = options;
  const results: R[] = [];
  const delay = 1000 / rateLimit;

  for (let i = 0; i < items.length; i++) {
    const result = await processor(items[i]);
    results.push(result);
    
    if (onProgress) {
      onProgress(i + 1, items.length);
    }

    // Rate limit (except for last item)
    if (i < items.length - 1) {
      await sleep(delay);
    }
  }

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
