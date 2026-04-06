/**
 * Co-located tests for logger.service.ts
 * Tests the structured JSON logger used across 148+ files.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, type LogLevel } from './logger.service';

describe('logger.service', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it('emits structured JSON with required fields on info()', () => {
    logger.info('test message', { tenantId: 't1' });

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const output = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output.trim());

    expect(parsed).toMatchObject({
      level: 'info',
      message: 'test message',
      service: 'shahin-grc-backend',
      tenantId: 't1',
    });
    expect(parsed.timestamp).toBeDefined();
  });

  it('routes error and fatal to stderr', () => {
    logger.error('something broke');
    logger.fatal('system down');

    expect(stderrSpy).toHaveBeenCalledTimes(2);
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('routes warn to stderr', () => {
    logger.warn('warning message');
    expect(stderrSpy).toHaveBeenCalledTimes(1);
  });

  it('child logger merges default metadata', () => {
    const child = logger.child({ module: 'audit', correlationId: 'abc' });
    child.info('child message', { extra: true });

    const output = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output.trim());
    expect(parsed.module).toBe('audit');
    expect(parsed.correlationId).toBe('abc');
    expect(parsed.extra).toBe(true);
  });

  it('includes environment field from NODE_ENV', () => {
    logger.info('env check');
    const output = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output.trim());
    expect(parsed.environment).toBeDefined();
  });
});
