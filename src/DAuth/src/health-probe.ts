import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Database } from '@dogan/db';
import type { NatsRuntime } from '@dogan/events';
import type { DauthMetrics } from '@dogan/telemetry';

export interface ComponentProbe { ok: boolean; error?: string; detail?: Record<string, unknown> }

export interface HealthProbesOptions {
  db: Kysely<Database>;
  nats: NatsRuntime;
  keycloakUrl: string;
  openFgaUrl: string;
  metrics: DauthMetrics;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export async function probeAll(opts: HealthProbesOptions): Promise<Record<string, ComponentProbe>> {
  const out: Record<string, ComponentProbe> = {};
  out.postgres = await probePostgres(opts.db);
  out.nats = await opts.nats.ping();
  out.keycloak = await probeHttp(opts.fetchImpl ?? fetch, opts.keycloakUrl, opts.timeoutMs ?? 3_000);
  out.openfga = await probeHttp(opts.fetchImpl ?? fetch, `${opts.openFgaUrl}/healthz`, opts.timeoutMs ?? 3_000);
  for (const [k, v] of Object.entries(out)) {
    opts.metrics.healthUp.labels(k).set(v.ok ? 1 : 0);
  }
  return out;
}

async function probePostgres(db: Kysely<Database>): Promise<ComponentProbe> {
  try {
    const r = await sql<{ one: number }>`select 1 as one`.execute(db);
    return { ok: r.rows.length === 1 };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

async function probeHttp(f: typeof fetch, url: string, timeoutMs: number): Promise<ComponentProbe> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await f(url, { signal: ac.signal });
    return { ok: r.ok || r.status === 200, detail: { status: r.status, url } };
  } catch (err) {
    return { ok: false, error: (err as Error).message, detail: { url } };
  } finally {
    clearTimeout(t);
  }
}
