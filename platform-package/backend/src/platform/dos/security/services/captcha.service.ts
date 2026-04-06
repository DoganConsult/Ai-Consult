import { create } from 'svg-captcha';
import { v4 as uuid } from 'uuid';

const TTL_MS = 5 * 60 * 1000;

interface CaptchaEntry {
  answer: string;
  expiresAt: number;
}

const store = new Map<string, CaptchaEntry>();

function cleanup(): void {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expiresAt <= now) {
      store.delete(id);
    }
  }
}

setInterval(cleanup, 60 * 1000).unref?.();

export function generateCaptcha(): { captchaId: string; svg: string } {
  cleanup();
  const captcha = create({
    size: 5,
    noise: 2,
    color: false,
    background: '#f0f0f0',
    charPreset: 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789',
  });
  const captchaId = uuid();
  store.set(captchaId, { answer: captcha.text.toLowerCase(), expiresAt: Date.now() + TTL_MS });
  return { captchaId, svg: captcha.data };
}

export function verifyCaptcha(captchaId: string, code: string): boolean {
  const entry = store.get(captchaId);
  if (!entry) return false;
  store.delete(captchaId);
  if (entry.expiresAt <= Date.now()) return false;
  return entry.answer === code.toLowerCase().trim();
}
