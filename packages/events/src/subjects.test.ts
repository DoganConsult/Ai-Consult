import { describe, expect, it } from 'vitest';
import { tenantSubject, consumerName, DOGAN_EVENTS_STREAM, DOGAN_EVENTS_SUBJECT } from './subjects.js';

describe('subjects', () => {
  it('builds tenant subject', () => {
    const s = tenantSubject('tenant-123', 'dauth', 'user.provisioned');
    expect(s).toBe('dogan.events.tenant-123.dauth.user.provisioned');
  });
  it('sanitizes unsafe characters', () => {
    const s = tenantSubject('t', 'dauth', 'bad/type>');
    expect(s).not.toMatch(/[/>]/);
  });
  it('stream constants match expected values', () => {
    expect(DOGAN_EVENTS_STREAM).toBe('DOGAN_EVENTS');
    expect(DOGAN_EVENTS_SUBJECT).toBe('dogan.events.>');
  });
  it('consumer name format', () => {
    expect(consumerName('dauth', 'relay')).toBe('dogan-dauth-relay');
  });
});
