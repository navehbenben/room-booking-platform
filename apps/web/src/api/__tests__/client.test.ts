import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { api, tokenStore } from '../client';

function okResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// tokenStore
// ---------------------------------------------------------------------------
describe('tokenStore', () => {
  afterEach(() => tokenStore.clear());

  it('set and getAccess round-trip', () => {
    tokenStore.set('my-token');
    expect(tokenStore.getAccess()).toBe('my-token');
  });

  it('clear resets the token to empty string', () => {
    tokenStore.set('tok');
    tokenStore.clear();
    expect(tokenStore.getAccess()).toBe('');
  });
});

// ---------------------------------------------------------------------------
// api.login
// ---------------------------------------------------------------------------
describe('api.login', () => {
  beforeEach(() => {
    tokenStore.clear();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs to /auth/login and returns { userId, accessToken }', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ userId: 'u1', accessToken: 'tok' }));
    const result = await api.login({ email: 'a@b.com', password: 'pass' });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result).toEqual({ userId: 'u1', accessToken: 'tok' });
  });
});

// ---------------------------------------------------------------------------
// api.search
// ---------------------------------------------------------------------------
describe('api.search', () => {
  beforeEach(() => {
    tokenStore.clear();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('GETs /rooms/search with correct query params', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ results: [], total: 0, page: 1, limit: 50 }));
    await api.search({
      start: '2024-01-01T10:00:00Z',
      end: '2024-01-01T11:00:00Z',
      capacity: 4,
    });
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain('/rooms/search');
    expect(url).toContain('capacity=4');
    expect(url).toContain('start=');
    expect(url).toContain('end=');
  });
});

// ---------------------------------------------------------------------------
// 401 retry logic
// ---------------------------------------------------------------------------
describe('401 retry logic', () => {
  beforeEach(() => {
    tokenStore.clear();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('on 401 calls /auth/refresh then retries original request with new token', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(okResponse({}, 401))                                          // original → 401
      .mockResolvedValueOnce(okResponse({ accessToken: 'new-token' }))                    // /auth/refresh → 200
      .mockResolvedValueOnce(okResponse({ results: [], total: 0, page: 1, limit: 50 }));  // retry → 200

    await api.search({ start: '2024-01-01T10:00:00Z', end: '2024-01-01T11:00:00Z' });

    expect(fetch).toHaveBeenCalledTimes(3);
    expect((vi.mocked(fetch).mock.calls[1][0] as string)).toContain('/auth/refresh');

    const retryHeaders = vi.mocked(fetch).mock.calls[2][1]?.headers as Record<string, string>;
    expect(retryHeaders?.Authorization).toBe('Bearer new-token');
  });

  it('on 401 when refresh also fails, throws without infinite retry', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(okResponse({}, 401))   // original → 401
      .mockResolvedValueOnce(okResponse({}, 401));   // refresh → 401 (treated as error since skipRefresh=true)

    await expect(
      api.search({ start: '2024-01-01T10:00:00Z', end: '2024-01-01T11:00:00Z' }),
    ).rejects.toBeDefined();

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// api.book — Idempotency-Key header
// ---------------------------------------------------------------------------
describe('api.book', () => {
  beforeEach(() => {
    tokenStore.clear();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('includes idempotency-key header', async () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    );
    vi.mocked(fetch).mockResolvedValue(okResponse({ bookingId: 'b1', status: 'CONFIRMED' }));

    await api.book({ roomId: 'r1', start: '2024-01-01T10:00:00Z', end: '2024-01-01T11:00:00Z' });

    const headers = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers?.['idempotency-key']).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });
});
