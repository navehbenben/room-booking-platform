import { useState, useEffect } from 'react';
import { api, tokenStore, setUnauthorizedHandler } from '../api/client';
import { logger } from '../utils/logger';

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
  const [rehydrating, setRehydrating] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear();
      setIsLoggedIn(false);
      logger.warn('Session expired — user signed out automatically');
    });

    // On every page load, attempt to restore the session using the HttpOnly
    // refresh cookie. The access token is in-memory only and does not survive
    // page reloads — this is the spec-mandated rehydration path.
    api
      .rehydrate()
      .then((res) => {
        tokenStore.set(res.accessToken);
        setIsLoggedIn(true);
        logger.info('Session rehydrated from refresh cookie');
      })
      .catch(() => {
        // No valid cookie or cookie expired — stay logged out
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
      // Refresh token is set as HttpOnly cookie by the server — never touched here
      tokenStore.set(res.accessToken);
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
      // Refresh token is set as HttpOnly cookie by the server — never touched here
      tokenStore.set(res.accessToken);
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
    setIsLoggedIn(false);
    logger.info('User logged out');
  };

  return { isLoggedIn, rehydrating, loading, error, login, register, logout };
}
