vi.mock('@datadog/browser-logs', () => ({
  datadogLogs: {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  },
}));

import { logger } from '../logger';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('logger.info calls console.info', () => {
    logger.info('test info message');
    expect(console.info).toHaveBeenCalledTimes(1);
    const arg = (console.info as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.message).toBe('test info message');
    expect(arg.level).toBe('info');
  });

  it('logger.warn calls console.warn', () => {
    logger.warn('test warn message');
    expect(console.warn).toHaveBeenCalledTimes(1);
    const arg = (console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.message).toBe('test warn message');
    expect(arg.level).toBe('warn');
  });

  it('logger.error calls console.error', () => {
    logger.error('test error message');
    expect(console.error).toHaveBeenCalledTimes(1);
    const arg = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.message).toBe('test error message');
    expect(arg.level).toBe('error');
  });

  it('logger.error includes error stack when passed an Error object', () => {
    const err = new Error('boom');
    logger.error('something failed', err);
    const arg = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.errorMessage).toBe('boom');
    expect(arg.stack).toBe(err.stack);
  });

  it('logger.info includes extra context fields', () => {
    logger.info('user action', { userId: 'u-1', event: 'click' });
    const arg = (console.info as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.userId).toBe('u-1');
    expect(arg.event).toBe('click');
  });

  it('log entries include service, level, ts, and url fields', () => {
    logger.warn('check fields');
    const arg = (console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.service).toBe('room-booking-web');
    expect(arg.ts).toBeDefined();
    expect(arg.url).toBeDefined();
  });
});
