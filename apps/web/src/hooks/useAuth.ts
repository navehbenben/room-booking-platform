import { useState, useEffect } from 'react';
import { api, tokenStore, setUnauthorizedHandler } from '../api/client';
import { logger } from '../utils/logger';

// A non-sensitive localStorage hint that tells us a session *might* exist.
// JS can never read the HttpOnly refresh cookie, so without this flag we'd
// have to call /auth/refresh on every page load — even for first-time visitors
// who have no cookie at all — producing a noisy 401 in the console.
// The flag stores no secrets: the real auth is still the HttpOnly cookie.
const SESSION_HINT_KEY = 'rb_has_session';
const sessionHint = {
  set: () => localStorage.setItem(SESSION_HINT_KEY, '1'),
  clear: () => localStorage.removeItem(SESSION_HINT_KEY),
  exists: () => localStorage.getItem(SESSION_HINT_KEY) === '1',
};

// Module-level guard: React 18 Strict Mode runs useEffect twice in development,
// which would fire two concurrent /auth/refresh requests. The second call gets
// 401 because the first one already rotated (revoked) the refresh token.
// A module-level flag (reset on every real page load) ensures only one
// rehydration attempt is ever made per page load, regardless of StrictMode.
let _rehydrateInitiated = false;

export interface AuthState {
  isLoggedIn: boolean;
  rehydrating: boolean;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): AuthState {
  // Start as logged-out; rehydration below will flip to true if a valid
  // HttpOnly refresh cookie exists. This avoids any flash of authenticated
  // content before the token is confirmed.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [rehydrating, setRehydrating] = useState(() => {
    // Google OAuth redirects back with ?oauth=1 — set the hint now so the
    // effect below treats this as a session that needs rehydration.
    if (new URLSearchParams(window.location.search).has('oauth')) {
      sessionHint.set();
    }
    return sessionHint.exists();
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear();
      sessionHint.clear();
      setIsLoggedIn(false);
      logger.warn('Session expired — user signed out automatically');
    });

    // Clean up the ?oauth=1 param Google OAuth adds — it's served its purpose.
    if (new URLSearchParams(window.location.search).has('oauth')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('oauth');
      window.history.replaceState(null, '', url.toString());
    }

    // Only attempt rehydration if the hint flag says a session might exist.
    // First-time visitors have no flag → skip the call entirely (no 401).
    if (!sessionHint.exists()) {
      setRehydrating(false);
      return;
    }

    // StrictMode guard: don't fire a second concurrent refresh (would 401 due to rotation).
    if (_rehydrateInitiated) return;
    _rehydrateInitiated = true;

    // The access token is in-memory only and does not survive page reloads —
    // ask the server to issue a new one using the HttpOnly refresh cookie.
    api
      .rehydrate()
      .then((res) => {
        tokenStore.set(res.accessToken);
        setIsLoggedIn(true);
        logger.info('Session rehydrated from refresh cookie');
      })
      .catch(() => {
        // Cookie expired or revoked — clear the hint so we don't retry next load
        sessionHint.clear();
        logger.info('No active session — showing login');
      })
      .finally(() => {
        setRehydrating(false);
      });
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setError('');
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      tokenStore.set(res.accessToken);
      sessionHint.set();
      setIsLoggedIn(true);
      logger.info('User logged in', { userId: res.userId });
    } catch (e) {
      logger.warn('Login failed', { event: 'auth.login.failure' });
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<void> => {
    setError('');
    setLoading(true);
    try {
      const res = await api.register({ name, email, password });
      tokenStore.set(res.accessToken);
      sessionHint.set();
      setIsLoggedIn(true);
      logger.info('User registered', { userId: res.userId });
    } catch (e) {
      logger.warn('Registration failed', { event: 'auth.register.failure' });
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    // Server reads the HttpOnly cookie, revokes the token DB-side, and clears the cookie
    await api.logout().catch((_e) => logger.warn('Logout request failed', { event: 'auth.logout.failure' }));
    tokenStore.clear();
    sessionHint.clear();
    setIsLoggedIn(false);
    logger.info('User logged out');
  };

  return { isLoggedIn, rehydrating, loading, error, login, register, logout };
}
