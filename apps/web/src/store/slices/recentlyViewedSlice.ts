import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// GDPR note: stores only non-personal room metadata (no user data).
// Users can clear via clearAll(); the GDPR page also invokes this on erasure.
const LS_KEY = 'rb_recently_viewed';
const MAX_ITEMS = 8;

export interface RecentlyViewedRoom {
  roomId: string;
  name: string;
  capacity: number;
  features: string[];
}

function readFromStorage(): RecentlyViewedRoom[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export interface RecentlyViewedState {
  rooms: RecentlyViewedRoom[];
}

const recentlyViewedSlice = createSlice({
  name: 'recentlyViewed',
  initialState: (): RecentlyViewedState => ({ rooms: readFromStorage() }),
  reducers: {
    addRoom: (state, action: PayloadAction<RecentlyViewedRoom>) => {
      const filtered = state.rooms.filter((r) => r.roomId !== action.payload.roomId);
      const next = [action.payload, ...filtered].slice(0, MAX_ITEMS);
      state.rooms = next;
      // localStorage write uses `next` (plain array), not the Immer draft
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {}
    },
    clearAll: (state) => {
      state.rooms = [];
      try {
        localStorage.removeItem(LS_KEY);
      } catch {}
    },
  },
});

export const { addRoom, clearAll } = recentlyViewedSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectRecentlyViewed = (state: { recentlyViewed: RecentlyViewedState }) => state.recentlyViewed.rooms;

export default recentlyViewedSlice.reducer;
