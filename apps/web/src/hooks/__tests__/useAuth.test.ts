import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

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
import authReducer, { __resetRehydrateGuard } from '../../store/slices/authSlice';
import profileReducer from '../../store/slices/profileSlice';

// ── localStorage mock ──────────────────────────────────────────────────────────
// sessionHint reads/writes localStorage. We stub it so:
//   • 'rb_has_session' = '1' → thunk proceeds to call api.rehydrate()
//   • clearing works properly after logout / failed rehydration
let _ls: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => _ls[key] ?? null,
  setItem: (key: string, value: string) => {
    _ls[key] = value;
  },
  removeItem: (key: string) => {
    delete _ls[key];
  },
  clear: () => {
    _ls = {};
  },
  get length() {
    return Object.keys(_ls).length;
  },
  key: (i: number) => Object.keys(_ls)[i] ?? null,
};

beforeAll(() => {
  vi.stubGlobal('localStorage', localStorageMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  // Ensure sessionHint is set so rehydrateSession thunk calls api.rehydrate()
  _ls = { 'rb_has_session': '1' };
  // Reset the StrictMode guard so each test gets a fresh attempt
  __resetRehydrateGuard();
  vi.clearAllMocks();
});

// Each test gets a fresh store with rehydrating:true (matches sessionHint being set).
// Including profileReducer so clearProfile() dispatched on logout is handled cleanly.
function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, profile: profileReducer },
    preloadedState: {
      auth: {
        isLoggedIn: false,
        rehydrating: true,
        loading: false,
        error: '',
        userId: null,
      },
    },
  });
}

function createWrapper() {
  const store = makeStore();
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);
  return Wrapper;
}

describe('useAuth', () => {
  it('calls api.rehydrate() on mount', async () => {
    vi.mocked(api.rehydrate).mockResolvedValue({ accessToken: 'tok' });
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
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
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    expect(result.current.rehydrating).toBe(true);
    act(() => resolve({ accessToken: 'tok' }));
    await waitFor(() => expect(result.current.rehydrating).toBe(false));
  });

  it('isLoggedIn becomes true after successful rehydration', async () => {
    vi.mocked(api.rehydrate).mockResolvedValue({ accessToken: 'tok' });
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.rehydrating).toBe(false));
    expect(result.current.isLoggedIn).toBe(true);
  });

  it('login() stores accessToken via tokenStore.set', async () => {
    vi.mocked(api.rehydrate).mockRejectedValue(new Error('no session'));
    vi.mocked(api.login).mockResolvedValue({ userId: 'u1', accessToken: 'access-tok' });
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.rehydrating).toBe(false));
    await act(() => result.current.login('a@b.com', 'pass'));
    expect(tokenStore.set).toHaveBeenCalledWith('access-tok');
    expect(result.current.isLoggedIn).toBe(true);
  });

  it('logout() calls api.logout and sets isLoggedIn=false', async () => {
    vi.mocked(api.rehydrate).mockResolvedValue({ accessToken: 'tok' });
    vi.mocked(api.logout).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
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
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
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
