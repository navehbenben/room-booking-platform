import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../../api/client', () => ({
  api: {
    rehydrate: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  },
  tokenStore: {
    set: vi.fn(),
    clear: vi.fn(),
    getAccess: vi.fn(() => ''),
  },
  setUnauthorizedHandler: vi.fn(),
}));

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { useAuth } from '../useAuth';
import { api, tokenStore } from '../../api/client';

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls api.rehydrate() on mount', async () => {
    vi.mocked(api.rehydrate).mockResolvedValue({ accessToken: 'tok' });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.rehydrating).toBe(false));
    expect(api.rehydrate).toHaveBeenCalledTimes(1);
  });

  it('rehydrating is true during rehydration, false after', async () => {
    let resolve!: (v: { accessToken: string }) => void;
    vi.mocked(api.rehydrate).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { result } = renderHook(() => useAuth());
    expect(result.current.rehydrating).toBe(true);
    act(() => resolve({ accessToken: 'tok' }));
    await waitFor(() => expect(result.current.rehydrating).toBe(false));
  });

  it('isLoggedIn becomes true after successful rehydration', async () => {
    vi.mocked(api.rehydrate).mockResolvedValue({ accessToken: 'tok' });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.rehydrating).toBe(false));
    expect(result.current.isLoggedIn).toBe(true);
  });

  it('login() stores accessToken via tokenStore.set', async () => {
    vi.mocked(api.rehydrate).mockRejectedValue(new Error('no session'));
    vi.mocked(api.login).mockResolvedValue({ userId: 'u1', accessToken: 'access-tok' });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.rehydrating).toBe(false));
    await act(() => result.current.login('a@b.com', 'pass'));
    expect(tokenStore.set).toHaveBeenCalledWith('access-tok');
    expect(result.current.isLoggedIn).toBe(true);
  });

  it('logout() calls api.logout and sets isLoggedIn=false', async () => {
    vi.mocked(api.rehydrate).mockResolvedValue({ accessToken: 'tok' });
    vi.mocked(api.logout).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoggedIn).toBe(true));
    await act(() => result.current.logout());
    expect(api.logout).toHaveBeenCalledTimes(1);
    expect(result.current.isLoggedIn).toBe(false);
  });

  it('isLoggedIn stays false when login fails', async () => {
    vi.mocked(api.rehydrate).mockRejectedValue(new Error('no session'));
    vi.mocked(api.login).mockRejectedValue({
      error: { code: 'INVALID_CREDENTIALS', message: 'Wrong password' },
    });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.rehydrating).toBe(false));
    await act(async () => {
      try {
        await result.current.login('a@b.com', 'wrong');
      } catch {
        // login re-throws — expected
      }
    });
    expect(result.current.isLoggedIn).toBe(false);
  });
});
