import { CustomThrottlerGuard } from './custom-throttler.guard';

describe('CustomThrottlerGuard', () => {
  let guard: CustomThrottlerGuard;

  beforeEach(() => {
    // Bypass the ThrottlerGuard constructor (which requires NestJS DI) via prototype delegation
    guard = Object.create(CustomThrottlerGuard.prototype) as CustomThrottlerGuard;
  });

  it('returns "user:{userId}" when req.user.userId is set', async () => {
    const req = { user: { userId: 'u-123' }, ip: '1.2.3.4' };
    const tracker = await (guard as any).getTracker(req);
    expect(tracker).toBe('user:u-123');
  });

  it('returns "ip:{ip}" when user is not authenticated', async () => {
    const req = { ip: '1.2.3.4' };
    const tracker = await (guard as any).getTracker(req);
    expect(tracker).toBe('ip:1.2.3.4');
  });

  it('falls back to socket.remoteAddress when req.ip is undefined', async () => {
    const req = { socket: { remoteAddress: '5.6.7.8' } };
    const tracker = await (guard as any).getTracker(req);
    expect(tracker).toBe('ip:5.6.7.8');
  });

  it('falls back to "ip:unknown" when all IP sources are undefined', async () => {
    const req = {};
    const tracker = await (guard as any).getTracker(req);
    expect(tracker).toBe('ip:unknown');
  });

  it('returns "ip:{ip}" when user has no userId', async () => {
    const req = { user: {}, ip: '9.9.9.9' };
    const tracker = await (guard as any).getTracker(req);
    expect(tracker).toBe('ip:9.9.9.9');
  });
});
