import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Database } from '@dogan/db';
import type { NatsRuntime } from '@dogan/events';

export interface ProbeResult {
  ok: boolean;
  latencyMs?: number;
  error?: string;
  detail?: Record<string, unknown>;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value?: T; error?: Error; ms: number }> {
  const t0 = Date.now();
  try {
    const value = await fn();
    return { value, ms: Date.now() - t0 };
  } catch (err) {
    return { error: err as Error, ms: Date.now() - t0 };
  }
}

export async function probePostgres(db: Kysely<Database>): Promise<ProbeResult> {
  const r = await timed(() => sql<{ one: number }>`select 1 as one`.execute(db));
  if (r.error) return { ok: false, error: r.error.message, latencyMs: r.ms };
  return { ok: true, latencyMs: r.ms };
}

export async function probeNats(nats: NatsRuntime): Promise<ProbeResult> {
  const r = await timed(() => nats.ping());
  if (r.error) return { ok: false, error: r.error.message, latencyMs: r.ms };
  return { ok: Boolean(r.value?.ok), error: r.value?.error, latencyMs: r.ms };
}

export async function probeHttp(
  url: string,
  timeoutMs = 3_000,
  expectStatus: number[] = [200, 204],
): Promise<ProbeResult> {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), timeoutMs);
  const r = await timed(async () => {
    const res = await fetch(url, { signal: ac.signal });
    return res;
  });
  clearTimeout(to);
  if (r.error) return { ok: false, error: r.error.message, latencyMs: r.ms, detail: { url } };
  const ok = expectStatus.includes(r.value!.status) || (r.value!.status >= 200 && r.value!.status < 400);
  return { ok, latencyMs: r.ms, detail: { url, status: r.value!.status } };
}

export async function probeTcp(host: string, port: number, timeoutMs = 2_000): Promise<ProbeResult> {
  const { Socket } = await import('node:net');
  const t0 = Date.now();
  return await new Promise<ProbeResult>((resolve) => {
    const s = new Socket();
    let done = false;
    const finish = (ok: boolean, error?: string): void => {
      if (done) return;
      done = true;
      try { s.destroy(); } catch { /* ignore */ }
      resolve({ ok, error, latencyMs: Date.now() - t0, detail: { host, port } });
    };
    s.setTimeout(timeoutMs);
    s.once('connect', () => finish(true));
    s.once('timeout', () => finish(false, 'timeout'));
    s.once('error', (e) => finish(false, e.message));
    s.connect(port, host);
  });
}
