import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  rehydrateSession,
  loginUser,
  registerUser,
  logoutUser,
  selectIsLoggedIn,
  selectRehydrating,
  selectAuthLoading,
} from '../store/slices/authSlice';
import { clearProfile } from '../store/slices/profileSlice';

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
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const rehydrating = useAppSelector(selectRehydrating);
  const loading = useAppSelector(selectAuthLoading);

  useEffect(() => {
    // Attempt to restore the session from the HttpOnly refresh cookie.
    // The thunk handles: sessionHint check, StrictMode guard, URL cleanup.
    dispatch(rehydrateSession());
  }, [dispatch]);

  const login = async (email: string, password: string): Promise<void> => {
    const result = await dispatch(loginUser({ email, password }));
    if (loginUser.rejected.match(result)) {
      // Re-throw the original ApiError so LoginForm can show the correct message
      throw result.payload;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<void> => {
    const result = await dispatch(registerUser({ name, email, password }));
    if (registerUser.rejected.match(result)) {
      throw result.payload;
    }
  };

  const logout = async (): Promise<void> => {
    await dispatch(logoutUser());
    dispatch(clearProfile());
  };

  return { isLoggedIn, rehydrating, loading, error: '', login, register, logout };
}
