import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api, tokenStore } from '../../api/client';
import { logger } from '../../utils/logger';

// ── Session hint ──────────────────────────────────────────────────────────────
// Non-sensitive localStorage flag. JS cannot read the HttpOnly refresh cookie,
// so without this flag we'd call /auth/refresh on every load — including
// first-time visitors who have no cookie, producing a noisy 401.
export const SESSION_HINT_KEY = 'rb_has_session';
export const sessionHint = {
  set: () => localStorage.setItem(SESSION_HINT_KEY, '1'),
  clear: () => localStorage.removeItem(SESSION_HINT_KEY),
  exists: () => localStorage.getItem(SESSION_HINT_KEY) === '1',
};

// ── StrictMode guard ──────────────────────────────────────────────────────────
// React 18 StrictMode fires effects twice in dev. Both runs would send a
// concurrent /auth/refresh; the first rotates the token, making the second
// receive 401. A module-level flag (reset on real page loads) prevents this.
let _rehydrateInitiated = false;

// ── Check for OAuth redirect param at module load time ────────────────────────
// Google OAuth redirects to /?oauth=1. We detect it here (before React renders)
// so rehydrating can start as true immediately — no flash of unauthenticated UI.
const _hasOAuthParam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('oauth');
if (_hasOAuthParam) sessionHint.set();

// ── State ─────────────────────────────────────────────────────────────────────
export interface AuthState {
  isLoggedIn: boolean;
  /** True while /auth/refresh is in-flight on page load */
  rehydrating: boolean;
  loading: boolean;
  error: string;
  userId: string | null;
}

const initialState: AuthState = {
  isLoggedIn: false,
  rehydrating: sessionHint.exists(), // true only when a session might exist
  loading: false,
  error: '',
  userId: null,
};

// ── Thunks ────────────────────────────────────────────────────────────────────

/** Called once on app mount to restore a session from the HttpOnly cookie. */
export const rehydrateSession = createAsyncThunk('auth/rehydrate', async (_, { rejectWithValue }) => {
  // Clean up the ?oauth=1 param added by the Google OAuth callback
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('oauth')) {
    const url = new URL(window.location.href);
    url.searchParams.delete('oauth');
    window.history.replaceState(null, '', url.toString());
  }

  if (!sessionHint.exists()) return rejectWithValue('no_hint');

  if (_rehydrateInitiated) return rejectWithValue('already_initiated');
  _rehydrateInitiated = true;

  try {
    const res = await api.rehydrate();
    tokenStore.set(res.accessToken);
    logger.info('Session rehydrated from refresh cookie');
    return res;
  } catch (e) {
    sessionHint.clear();
    logger.info('No active session — showing login');
    return rejectWithValue(e);
  }
});

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await api.login(credentials);
      tokenStore.set(res.accessToken);
      sessionHint.set();
      logger.info('User logged in', { userId: res.userId });
      return res;
    } catch (e) {
      logger.warn('Login failed', { event: 'auth.login.failure' });
      return rejectWithValue(e);
    }
  },
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (data: { name: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await api.register(data);
      tokenStore.set(res.accessToken);
      sessionHint.set();
      logger.info('User registered', { userId: res.userId });
      return res;
    } catch (e) {
      logger.warn('Registration failed', { event: 'auth.register.failure' });
      return rejectWithValue(e);
    }
  },
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await api.logout().catch(() => logger.warn('Logout request failed', { event: 'auth.logout.failure' }));
  tokenStore.clear();
  sessionHint.clear();
  logger.info('User logged out');
});

// ── Slice ─────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Fired by the global unauthorized handler in client.ts when a silent token
     * refresh fails mid-session (e.g. the refresh cookie expired while the app
     * was open). Forces the user back to logged-out state without an API call.
     */
    forceLogout: (state) => {
      state.isLoggedIn = false;
      state.userId = null;
      state.rehydrating = false;
      tokenStore.clear();
      sessionHint.clear();
    },
  },
  extraReducers: (builder) => {
    // ── rehydrate ─────────────────────────────────────────────────────────────
    builder
      .addCase(rehydrateSession.fulfilled, (state, action) => {
        state.isLoggedIn = true;
        state.rehydrating = false;
        // userId not returned by /auth/refresh; mark as logged in, profile will supply it
        state.userId = null;
      })
      .addCase(rehydrateSession.rejected, (state) => {
        state.isLoggedIn = false;
        state.rehydrating = false;
      });

    // ── login ─────────────────────────────────────────────────────────────────
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isLoggedIn = true;
        state.userId = action.payload.userId;
      })
      .addCase(loginUser.rejected, (state) => {
        state.loading = false;
      });

    // ── register ──────────────────────────────────────────────────────────────
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isLoggedIn = true;
        state.userId = action.payload.userId;
      })
      .addCase(registerUser.rejected, (state) => {
        state.loading = false;
      });

    // ── logout ────────────────────────────────────────────────────────────────
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.isLoggedIn = false;
      state.userId = null;
    });
  },
});

export const { forceLogout } = authSlice.actions;

/** @internal Test-only: resets the StrictMode rehydration guard between test cases. */
export const __resetRehydrateGuard = () => {
  _rehydrateInitiated = false;
};

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectIsLoggedIn = (state: { auth: AuthState }) => state.auth.isLoggedIn;
export const selectRehydrating = (state: { auth: AuthState }) => state.auth.rehydrating;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectUserId = (state: { auth: AuthState }) => state.auth.userId;

export default authSlice.reducer;
