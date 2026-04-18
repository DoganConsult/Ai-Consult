import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:3100';
const TOKEN = __ENV.TOKEN || '';

const platformLatency = new Trend('platform_latency_ms', true);
const readyLatency = new Trend('ready_latency_ms', true);
const whoamiLatency = new Trend('whoami_latency_ms', true);
const errors = new Rate('errors');

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<300', 'p(99)<500'],
    platform_latency_ms: ['p(99)<200'],
    ready_latency_ms: ['p(99)<400'],
    errors: ['rate<0.01'],
  },
  scenarios: {
    smoke: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 20,
      maxVUs: 50,
      exec: 'smoke',
    },
    load: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 300,
      stages: [
        { target: 200, duration: '1m' },
        { target: 200, duration: '3m' },
        { target: 0, duration: '30s' },
      ],
      exec: 'load',
      startTime: '40s',
    },
  },
};

const authHeaders = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

export function smoke() {
  group('smoke', () => {
    const r = http.get(`${BASE}/platform`);
    platformLatency.add(r.timings.duration);
    check(r, { '200 platform': (x) => x.status === 200 }) || errors.add(1);

    const r2 = http.get(`${BASE}/kernel/ready`);
    readyLatency.add(r2.timings.duration);
    check(r2, { 'ready 200/503': (x) => x.status === 200 || x.status === 503 }) || errors.add(1);
  });
  sleep(0.1);
}

export function load() {
  const r = http.get(`${BASE}/platform`);
  platformLatency.add(r.timings.duration);
  if (r.status !== 200) errors.add(1);

  if (TOKEN) {
    const w = http.get(`${BASE}/pillars/dauth/whoami`, { headers: authHeaders });
    whoamiLatency.add(w.timings.duration);
    if (w.status !== 200) errors.add(1);
  }
  sleep(0.05);
}
