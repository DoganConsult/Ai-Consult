import { Pool } from 'pg';
import { safeQuery } from "../../../config/db/query";
import { logger } from '../../../platform/dos/observability/logger.service';
import { recordLearningMetric } from "./dogan-learning.service";

export type GuardianEventType = "success" | "failure" | "heartbeat" | "anomaly" | "remediation";
export type GuardianSeverity = "debug" | "info" | "warn" | "error" | "critical";

export interface GuardianHealth {
  guardianName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastTickMs: number;
  lastError?: string;
  tickCount: number;
  uptimeMs: number;
}

export abstract class BaseDoganGuardian {
  abstract readonly guardianName: string;
  abstract readonly intervalMs: number;

  protected readonly pool: Pool;
  private tickCount = 0;
  private startedAt = Date.now();
  private lastTickMs = 0;
  private lastError?: string;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  get name(): string {
    return this.guardianName;
  }

  protected log(level: GuardianSeverity, message: string, extra?: Record<string, any>): void {
    const entry = { guardian: this.guardianName, ...extra };
    switch (level) {
      case 'error': case 'critical': logger.error(`[DoganGuardian] ${message}`, entry); break;
      case 'warn': logger.warn(`[DoganGuardian] ${message}`, entry); break;
      default: logger.info(`[DoganGuardian] ${message}`, entry); break;
    }
  }

  protected async persistEvent(
    eventType: GuardianEventType | string,
    severity: GuardianSeverity,
    payload: Record<string, any> = {},
    errorMessage?: string,
  ): Promise<void> {
    try {
      await safeQuery(
        `INSERT INTO public.dogan_guardian_events (guardian_name, event_type, severity, payload, error_message)
         VALUES ($1, $2, $3, $4::jsonb, $5)`,
        [this.guardianName, eventType, severity, JSON.stringify(payload), errorMessage ?? null],
      );
    } catch (e) {
      logger.warn("[DoganGuardian] persistEvent failed", { guardian: this.guardianName, error: String(e) });
    }
  }

  protected async metric(key: string, value: number, dimensions: Record<string, any> = {}): Promise<void> {
    await recordLearningMetric(this.guardianName, key, value, dimensions);
  }

  abstract execute(): Promise<void>;

  async run(): Promise<void> {
    const start = Date.now();
    this.tickCount++;
    try {
      await this.execute();
      this.lastTickMs = Date.now() - start;
      this.lastError = undefined;
      await this.persistEvent("success", "info", { durationMs: this.lastTickMs });
      await this.metric("tick_duration_ms", this.lastTickMs, { result: "ok" });
    } catch (err: unknown) {
      this.lastTickMs = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      this.lastError = msg;
      await this.persistEvent("failure", "error", { durationMs: this.lastTickMs }, msg);
      await this.metric("tick_duration_ms", this.lastTickMs, { result: "error" });
      logger.error(`[DoganGuardian] ${this.guardianName} failed`, { error: msg });
    }
  }

  private timer?: ReturnType<typeof setInterval>;

  async start(): Promise<void> {
    this.log('info', `Starting guardian ${this.guardianName} (interval=${this.intervalMs}ms)`);
    await this.run();
    this.timer = setInterval(() => this.run(), this.intervalMs);
  }

  async stop(): Promise<void> {
    this.log('info', `Stopping guardian ${this.guardianName}`);
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  health(): GuardianHealth {
    return {
      guardianName: this.guardianName,
      status: this.lastError ? 'unhealthy' : this.lastTickMs > this.intervalMs ? 'degraded' : 'healthy',
      lastTickMs: this.lastTickMs,
      lastError: this.lastError,
      tickCount: this.tickCount,
      uptimeMs: Date.now() - this.startedAt,
    };
  }

  getHealth(): GuardianHealth {
    return this.health();
  }
}

export { BaseDoganGuardian as BaseDoganGuardianWorker };
