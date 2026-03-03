import { createSlice, createAsyncThunk, current } from '@reduxjs/toolkit';
import { api } from '../../api/client';
import type { UserProfile } from '../../types';

export interface ProfileState {
  data: UserProfile | null;
  /** Snapshot of profile.name before an optimistic update, used for rollback */
  nameSnapshot: string | null | undefined;
  loading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  data: null,
  nameSnapshot: undefined,
  loading: false,
  error: null,
};

// ── Thunks ────────────────────────────────────────────────────────────────────

/** Fetches the user's profile. Skipped if data is already loaded. */
export const fetchProfile = createAsyncThunk(
  'profile/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await api.getProfile();
    } catch (e) {
      return rejectWithValue(e);
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as { profile: ProfileState };
      // Skip if already loaded and no error — acts as a session-scoped cache
      return state.profile.data === null;
    },
  },
);

/** Optimistically updates the display name. Rolls back on failure. */
export const updateProfileName = createAsyncThunk('profile/updateName', async (name: string, { rejectWithValue }) => {
  try {
    return await api.updateProfile({ name });
  } catch (e) {
    return rejectWithValue(e);
  }
});

export const changeProfilePassword = createAsyncThunk(
  'profile/changePassword',
  async (payload: { currentPassword: string; newPassword: string }, { rejectWithValue }) => {
    try {
      await api.changePassword(payload);
    } catch (e) {
      return rejectWithValue(e);
    }
  },
);

// ── Slice ─────────────────────────────────────────────────────────────────────
const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    /** Clears the profile cache — called on logout so the next login gets fresh data */
    clearProfile: (state) => {
      state.data = null;
      state.error = null;
      state.nameSnapshot = undefined;
    },
  },
  extraReducers: (builder) => {
    // ── fetchProfile ──────────────────────────────────────────────────────────
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.data = action.payload as UserProfile;
        state.loading = false;
      })
      .addCase(fetchProfile.rejected, (state) => {
        state.loading = false;
        state.error = 'Failed to load profile';
      });

    // ── updateProfileName ─────────────────────────────────────────────────────
    builder
      .addCase(updateProfileName.pending, (state, action) => {
        // Snapshot current name for rollback, then apply optimistic update
        state.nameSnapshot = state.data?.name;
        if (state.data) state.data.name = action.meta.arg;
      })
      .addCase(updateProfileName.fulfilled, (state, action) => {
        state.data = action.payload as UserProfile;
        state.nameSnapshot = undefined;
      })
      .addCase(updateProfileName.rejected, (state) => {
        // Roll back the optimistic update
        if (state.data && state.nameSnapshot !== undefined) {
          state.data.name = state.nameSnapshot;
        }
        state.nameSnapshot = undefined;
      });

    // ── changeProfilePassword — no state change on success ───────────────────
    // (no extraReducers needed; errors are surfaced via rejectWithValue)
  },
});

export const { clearProfile } = profileSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectProfile = (state: { profile: ProfileState }) => state.profile.data;
export const selectProfileLoading = (state: { profile: ProfileState }) => state.profile.loading;
export const selectProfileError = (state: { profile: ProfileState }) => state.profile.error;

export default profileSlice.reducer;
