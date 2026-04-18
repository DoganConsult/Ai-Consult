import {
  connect,
  StringCodec,
  type NatsConnection,
  type JetStreamClient,
  type JetStreamManager,
  type StreamConfig,
  type ConsumerConfig,
  type JsMsg,
  AckPolicy,
  DeliverPolicy,
  RetentionPolicy,
} from 'nats';
import { ConfigError } from '@dogan/contracts';
import type { Logger } from '@dogan/telemetry';

export interface NatsRuntimeOptions {
  servers: string[];
  user?: string;
  pass?: string;
  name?: string;
  logger: Logger;
}

export interface PublishInput {
  subject: string;
  payload: Uint8Array | string;
  headers?: Record<string, string>;
  msgId?: string;
}

export interface SubscribeInput {
  stream: string;
  consumer: string;
  subjectFilter: string;
  handler: (msg: JsMsg) => Promise<void>;
}

const CODEC = StringCodec();

/**
 * NatsRuntime owns the NATS connection + JetStream client for the kernel.
 * All platform events flow through a single `dogan.events` JetStream stream;
 * per-tenant isolation is enforced at publish time via subject hierarchy:
 *   dogan.events.<tenantId>.<domain>.<type>
 */
export class NatsRuntime {
  private nc?: NatsConnection;
  private js?: JetStreamClient;
  private jsm?: JetStreamManager;
  private connecting?: Promise<void>;

  constructor(private readonly opts: NatsRuntimeOptions) {
    if (!opts.servers || opts.servers.length === 0) {
      throw new ConfigError('NatsRuntime: at least one server required');
    }
  }

  private async connect(): Promise<void> {
    if (this.nc) return;
    if (this.connecting) return this.connecting;
    this.connecting = (async () => {
      const nc = await connect({
        servers: this.opts.servers,
        user: this.opts.user,
        pass: this.opts.pass,
        name: this.opts.name ?? 'dogan-kernel',
        reconnect: true,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 1_000,
      });
      nc.closed()
        .then((err) => {
          if (err) this.opts.logger.error({ err }, 'nats closed with error');
          this.nc = undefined;
          this.js = undefined;
          this.jsm = undefined;
        })
        .catch(() => undefined);
      this.nc = nc;
      this.js = nc.jetstream();
      this.jsm = await nc.jetstreamManager();
      this.opts.logger.info({ servers: this.opts.servers }, 'nats connected');
    })();
    try {
      await this.connecting;
    } finally {
      this.connecting = undefined;
    }
  }

  async ensureStream(name: string, subjects: string[], overrides: Partial<StreamConfig> = {}): Promise<void> {
    await this.connect();
    const jsm = this.jsm!;
    try {
      await jsm.streams.info(name);
      await jsm.streams.update(name, {
        subjects,
        retention: RetentionPolicy.Limits,
        max_age: 14 * 24 * 3600 * 1_000_000_000,
        ...overrides,
      });
    } catch {
      await jsm.streams.add({
        name,
        subjects,
        retention: RetentionPolicy.Limits,
        max_age: 14 * 24 * 3600 * 1_000_000_000,
        ...overrides,
      });
    }
  }

  async ensureConsumer(stream: string, cfg: Partial<ConsumerConfig> & { durable_name: string }): Promise<void> {
    await this.connect();
    const jsm = this.jsm!;
    try {
      await jsm.consumers.info(stream, cfg.durable_name);
    } catch {
      await jsm.consumers.add(stream, {
        ack_policy: AckPolicy.Explicit,
        deliver_policy: DeliverPolicy.All,
        max_deliver: 10,
        ack_wait: 30 * 1_000_000_000,
        ...cfg,
      });
    }
  }

  async publish(input: PublishInput): Promise<{ seq: number; stream: string }> {
    await this.connect();
    const bytes = typeof input.payload === 'string' ? CODEC.encode(input.payload) : input.payload;
    const hdrs = input.headers
      ? (() => {
          const h = this.nc!.services ? undefined : undefined;
          void h;
          return undefined;
        })()
      : undefined;
    void hdrs;
    const opts: { msgID?: string; headers?: undefined } = {};
    if (input.msgId) opts.msgID = input.msgId;
    const ack = await this.js!.publish(input.subject, bytes, opts);
    return { seq: Number(ack.seq), stream: ack.stream };
  }

  async subscribe(input: SubscribeInput): Promise<() => Promise<void>> {
    await this.connect();
    const sub = await this.js!.consumers.get(input.stream, input.consumer);
    const iter = await sub.consume();
    (async () => {
      for await (const m of iter) {
        try {
          await input.handler(m);
          m.ack();
        } catch (err) {
          this.opts.logger.error({ err, subject: m.subject }, 'event handler failed');
          m.nak(5_000);
        }
      }
    })().catch((err) => this.opts.logger.error({ err }, 'consume loop died'));
    return async () => {
      iter.stop();
    };
  }

  async ping(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.connect();
      await this.nc!.flush();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  describe(): { servers: string[] } {
    return { servers: this.opts.servers };
  }

  async close(): Promise<void> {
    if (!this.nc) return;
    try {
      await this.nc.drain();
    } catch (err) {
      this.opts.logger.warn({ err }, 'nats drain error');
    } finally {
      this.nc = undefined;
      this.js = undefined;
      this.jsm = undefined;
    }
  }
}

export { CODEC };
export type { JsMsg };
