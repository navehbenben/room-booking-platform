import { configureStore } from '@reduxjs/toolkit';
import authReducer, { forceLogout } from './slices/authSlice';
import profileReducer, { clearProfile } from './slices/profileSlice';
import searchReducer from './slices/searchSlice';
import recentlyViewedReducer from './slices/recentlyViewedSlice';
import { tokenStore, setUnauthorizedHandler } from '../api/client';
import { sessionHint } from './slices/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
    search: searchReducer,
    recentlyViewed: recentlyViewedReducer,
  },
});

// Wire up the global unauthorized handler so that when a silent mid-session
// token refresh fails (e.g. the refresh cookie expired while the tab was open),
// the Redux store is updated and the user sees the logged-out UI immediately.
setUnauthorizedHandler(() => {
  tokenStore.clear();
  sessionHint.clear();
  store.dispatch(forceLogout());
  store.dispatch(clearProfile());
});

// ── Types ─────────────────────────────────────────────────────────────────────
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
