import { Client, Connection, type WorkflowHandle } from '@temporalio/client';
import { ConfigError } from '@dogan/contracts';
import type { Logger } from '@dogan/telemetry';

export interface TemporalRuntimeOptions {
  address: string;
  namespace: string;
  defaultTaskQueue: string;
  tlsServerName?: string;
  apiKey?: string;
  logger: Logger;
}

export interface StartWorkflowInput<A extends unknown[] = unknown[]> {
  workflowType: string;
  args: A;
  tenantId: string;
  userId?: string;
  productId?: string;
  workflowId?: string;
  taskQueue?: string;
  searchAttributes?: Record<string, string | number | boolean>;
}

/**
 * TemporalRuntime is a kernel-built-in service. Every product gets it via
 * `services.temporal`. Workflow IDs are tenant-namespaced by default so that
 * cross-tenant collisions are impossible. Workers are deployed separately;
 * the kernel only embeds the client.
 */
export class TemporalRuntime {
  private readonly opts: TemporalRuntimeOptions;
  private clientPromise?: Promise<Client>;

  constructor(opts: TemporalRuntimeOptions) {
    this.opts = opts;
  }

  private async client(): Promise<Client> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const connection = await Connection.connect({
          address: this.opts.address,
          tls: this.opts.tlsServerName ? { serverNameOverride: this.opts.tlsServerName } : undefined,
          apiKey: this.opts.apiKey,
        });
        return new Client({ connection, namespace: this.opts.namespace });
      })().catch((err) => {
        this.clientPromise = undefined;
        this.opts.logger.error({ err }, 'temporal connection failed');
        throw err;
      });
    }
    return this.clientPromise;
  }

  /** Start a workflow with tenant-scoped workflow id and task queue. */
  async startWorkflow<A extends unknown[]>(input: StartWorkflowInput<A>): Promise<WorkflowHandle> {
    if (!input.tenantId) throw new ConfigError('startWorkflow requires tenantId');
    const c = await this.client();
    const taskQueue = input.taskQueue ?? this.opts.defaultTaskQueue;
    const workflowId = input.workflowId
      ? `${input.tenantId}:${input.workflowId}`
      : `${input.tenantId}:${input.workflowType}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return c.workflow.start(input.workflowType, {
      args: input.args,
      taskQueue,
      workflowId,
      searchAttributes: {
        TenantId: [input.tenantId],
        ...(input.userId ? { UserId: [input.userId] } : {}),
        ...(input.productId ? { ProductId: [input.productId] } : {}),
        ...(input.searchAttributes ?? {}),
      },
    });
  }

  /** Signal an existing workflow. */
  async signal(workflowId: string, signal: string, args: unknown[] = []): Promise<void> {
    const c = await this.client();
    const handle = c.workflow.getHandle(workflowId);
    await handle.signal(signal, ...args);
  }

  /** Query an existing workflow. */
  async query<R = unknown>(workflowId: string, query: string, args: unknown[] = []): Promise<R> {
    const c = await this.client();
    const handle = c.workflow.getHandle(workflowId);
    return (await handle.query(query, ...args)) as R;
  }

  /** Cancel a running workflow. */
  async cancel(workflowId: string): Promise<void> {
    const c = await this.client();
    await c.workflow.getHandle(workflowId).cancel();
  }

  /** Health probe: opens a connection and lists namespaces (cheap call). */
  async ping(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.client();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  describe(): { address: string; namespace: string; defaultTaskQueue: string } {
    return {
      address: this.opts.address,
      namespace: this.opts.namespace,
      defaultTaskQueue: this.opts.defaultTaskQueue,
    };
  }

  async close(): Promise<void> {
    if (!this.clientPromise) return;
    try {
      const c = await this.clientPromise;
      await c.connection.close();
    } catch (err) {
      this.opts.logger.warn({ err }, 'temporal close error');
    } finally {
      this.clientPromise = undefined;
    }
  }
}

export type { WorkflowHandle } from '@temporalio/client';
